import { Request, Response } from 'express';
import { createCourseService, updateCourseService, getCourseListService, getCourseService } from '../services/courseService';
import { CourseInfo, CourseInfoQueryParams } from '../types/courseType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 创建课程
 * 教师创建新课程
 */
export async function createCourseController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const params = req.body as Partial<CourseInfo>;

  // 处理封面上传
  if (req.file) {
    params.coverImage = `/uploads/courses/${req.file.filename}`;
  }

  // 验证必需字段
  if (!params.courseName) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseName is required',
    };
    return res.status(400).json(response);
  }

  if (!params.courseStartTime) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseStartTime is required',
    };
    return res.status(400).json(response);
  }

  if (!params.courseEndTime) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseEndTime is required',
    };
    return res.status(400).json(response);
  }

  // 验证时间格式
  const startTime = new Date(params.courseStartTime);
  const endTime = new Date(params.courseEndTime);

  if (isNaN(startTime.getTime())) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseStartTime format',
    };
    return res.status(400).json(response);
  }

  if (isNaN(endTime.getTime())) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseEndTime format',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await createCourseService(teacherId, params);
  } catch (error) {
    console.error('Create course controller error:', error);
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create course',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CourseInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Course created successfully',
    data: data,
  };
  return res.status(201).json(response);
}

/**
 * 更新课程
 * 教师更新自己的课程信息
 */
export async function updateCourseController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const courseId = parseInt(req.params.courseId);
  const params = req.body as Partial<CourseInfo>;

  // 处理封面上传
  if (req.file) {
    params.coverImage = `/uploads/courses/${req.file.filename}`;
  }

  // 验证 courseId
  if (!courseId || isNaN(courseId) || courseId <= 0) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseId',
    };
    return res.status(400).json(response);
  }

  // 验证时间格式（如果提供了时间）
  if (params.courseStartTime) {
    const startTime = new Date(params.courseStartTime);
    if (isNaN(startTime.getTime())) {
      const response: ResponseType<CourseInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'Invalid courseStartTime format',
      };
      return res.status(400).json(response);
    }
  }

  if (params.courseEndTime) {
    const endTime = new Date(params.courseEndTime);
    if (isNaN(endTime.getTime())) {
      const response: ResponseType<CourseInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'Invalid courseEndTime format',
      };
      return res.status(400).json(response);
    }
  }

  let data;
  try {
    data = await updateCourseService(teacherId, courseId, params);
  } catch (error) {
    console.error('Update course controller error:', error);
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update course',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CourseInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Course updated successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取课程列表
 * 支持条件筛选和分页
 */
export async function getCourseListController(req: AuthRequest, res: Response) {
  const { teacherId, status, schoolName, schoolNames, teacherName, startDate, endDate } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: CourseInfoQueryParams = {};

  if (teacherId) {
    const teacherIdNum = parseInt(teacherId as string);
    if (!isNaN(teacherIdNum)) {
      params.teacherId = teacherIdNum;
    }
  }
  if (status !== undefined) {
    const statusNum = parseInt(status as string);
    if (!isNaN(statusNum)) {
      params.status = statusNum;
    }
  }
  if (schoolNames && Array.isArray(schoolNames)) {
    // 支持多个学校名称（数组格式）
    params.schoolNames = schoolNames.map(String);
  }
  if (schoolNames && typeof schoolNames === 'string') {
    // 支持多个学校名称（逗号分隔的字符串）
    params.schoolNames = String(schoolNames).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (schoolName && !schoolNames) {
    // 兼容单个学校名称查询
    params.schoolName = String(schoolName);
  }

  if (teacherName) {
    params.teacherName = teacherName as string;
  }

  if (startDate) {
    params.startDate = startDate as string;
  }

  if (endDate) {
    params.endDate = endDate as string;
  }

  let data;
  try {
    data = await getCourseListService(params, page, pageSize);
  } catch (error) {
    console.error('Get course list controller error:', error);
    const response: ResponseType<{ records: CourseInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get course list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: CourseInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get course list successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取课程详情
 * 根据课程ID获取课程信息
 */
export async function getCourseController(req: AuthRequest, res: Response) {
  const courseId = parseInt(req.params.courseId);

  // 验证 courseId
  if (!courseId || isNaN(courseId) || courseId <= 0) {
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getCourseService(courseId);
  } catch (error) {
    console.error('Get course controller error:', error);
    const response: ResponseType<CourseInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get course',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CourseInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get course successfully',
    data: data,
  };
  return res.status(200).json(response);
}
