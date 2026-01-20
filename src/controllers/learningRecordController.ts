import { Response } from 'express';
import { completeLearningRecordService, reportLearningTimeService, updateLearningProgressService, submitReviewService, getLearningRecordListService, getLearningRecordService, getLearningHistoryListService, } from '../services/learningRecordService';
import { LearningRecordInfo } from '../types/learningRecordType';
import { ResourceInfo } from '../types/resourceType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 完成学习记录（文档/图片类型）
 * 适用于：resourceType = 0(其他) 或 1(文档) 的资源
 * 学生下载文档/图片资源后，直接标记为学习完成
 */
export async function completeLearningRecordController(req: AuthRequest, res: Response) {
    const studentId = req.user!.userId;
    const { resourceId } = req.body as { resourceId?: number };

    // 验证必需字段
    if (!resourceId) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'resourceId is required',
        };
        return res.status(400).json(response);
    }

    // 验证 resourceId
    if (typeof resourceId !== 'number' || resourceId <= 0) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid resourceId',
        };
        return res.status(400).json(response);
    }

    let data;
    try {
        data = await completeLearningRecordService(studentId, resourceId);
    } catch (error) {
        console.error('Complete learning record controller error:', error);
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: error instanceof Error ? error.message : 'Failed to complete learning record',
        };
        return res.status(400).json(response);
    }

    const response: ResponseType<LearningRecordInfo> = {
        code: StatusCode.SUCCESS,
        message: 'Learning record completed successfully',
        data: data,
    };
    return res.status(200).json(response);
}

/**
 * 上报学习时间增量（视频/音频类型）
 * 适用于：resourceType = 2(音频) 或 3(视频) 的资源
 * 前端以10-15秒为周期上报学习时间增量，服务端累计学习时长
 * 注意：此接口只累计时长，不更新进度。进度需要前端计算后调用 updateLearningProgress 更新
 */
export async function reportLearningTimeController(req: AuthRequest, res: Response) {
    const studentId = req.user!.userId;
    const { resourceId, timeIncrement } = req.body as { resourceId?: number; timeIncrement?: number };

    // 验证必需字段
    if (!resourceId) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'resourceId is required',
        };
        return res.status(400).json(response);
    }

    if (timeIncrement === undefined) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'timeIncrement is required',
        };
        return res.status(400).json(response);
    }

    // 验证 resourceId
    if (typeof resourceId !== 'number' || resourceId <= 0) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid resourceId',
        };
        return res.status(400).json(response);
    }

    // 验证 timeIncrement
    if (typeof timeIncrement !== 'number' || timeIncrement <= 0) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid timeIncrement. Must be a positive number',
        };
        return res.status(400).json(response);
    }

    let data;
    try {
        data = await reportLearningTimeService(studentId, resourceId, timeIncrement);
    } catch (error) {
        console.error('Report learning time controller error:', error);
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: error instanceof Error ? error.message : 'Failed to report learning time',
        };
        return res.status(400).json(response);
    }

    const response: ResponseType<LearningRecordInfo> = {
        code: StatusCode.SUCCESS,
        message: 'Learning time reported successfully',
        data: data,
    };
    return res.status(200).json(response);
}

/**
 * 更新学习进度（视频/音频类型）
 * 适用于：resourceType = 2(音频) 或 3(视频) 的资源
 * 前端根据实际资源时长计算进度后，调用此接口更新进度
 * 注意：后端无法获取资源时长，需要前端通过视频/音频元素的duration属性获取总时长后计算进度
 */
export async function updateLearningProgressController(req: AuthRequest, res: Response) {
  const studentId = req.user!.userId;
  const resourceId = parseInt(req.params.resourceId);
  const { progress } = req.body as { progress?: number };

  // 验证 resourceId
  if (!resourceId || isNaN(resourceId) || resourceId <= 0) {
    const response: ResponseType<LearningRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }

  // 验证必需字段
  if (progress === undefined) {
    const response: ResponseType<LearningRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'progress is required',
    };
    return res.status(400).json(response);
  }

    // 验证 progress
    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid progress. Must be between 0 and 100',
        };
        return res.status(400).json(response);
    }

    let data;
    try {
        data = await updateLearningProgressService(studentId, resourceId, progress);
    } catch (error) {
        console.error('Update learning progress controller error:', error);
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: error instanceof Error ? error.message : 'Failed to update learning progress',
        };
        return res.status(400).json(response);
    }

    const response: ResponseType<LearningRecordInfo> = {
        code: StatusCode.SUCCESS,
        message: 'Learning progress updated successfully',
        data: data,
    };
    return res.status(200).json(response);
}

/**
 * 提交评价
 * 学生对资源进行评价和评分
 */
export async function submitReviewController(req: AuthRequest, res: Response) {
    const studentId = req.user!.userId;
    const { resourceId, review, rating } = req.body as { resourceId?: number; review?: string; rating?: number };

    // 验证必需字段
    if (!resourceId) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'resourceId is required',
        };
        return res.status(400).json(response);
    }

    if (!review) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'review is required',
        };
        return res.status(400).json(response);
    }

    if (rating === undefined) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'rating is required',
        };
        return res.status(400).json(response);
    }

    // 验证 resourceId
    if (typeof resourceId !== 'number' || resourceId <= 0) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid resourceId',
        };
        return res.status(400).json(response);
    }

    // 验证 rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: 'Invalid rating. Must be between 1 and 5',
        };
        return res.status(400).json(response);
    }

    let data;
    try {
        data = await submitReviewService(studentId, resourceId, review, rating);
    } catch (error) {
        console.error('Submit review controller error:', error);
        const response: ResponseType<LearningRecordInfo> = {
            code: StatusCode.BAD_REQUEST,
            message: error instanceof Error ? error.message : 'Failed to submit review',
        };
        return res.status(400).json(response);
    }

    const response: ResponseType<LearningRecordInfo> = {
        code: StatusCode.SUCCESS,
        message: 'Review submitted successfully',
        data: data,
    };
    return res.status(200).json(response);
}

/**
 * 获取学习记录列表
 * 支持条件筛选和分页
 */
export async function getLearningRecordListController(req: AuthRequest, res: Response) {
    const { studentId, resourceId } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const params: Partial<LearningRecordInfo> = {};

    if (studentId) {
        const studentIdNum = parseInt(studentId as string);
        if (!isNaN(studentIdNum)) {
            params.studentId = studentIdNum;
        }
    }

    if (resourceId) {
        const resourceIdNum = parseInt(resourceId as string);
        if (!isNaN(resourceIdNum)) {
            params.resourceId = resourceIdNum;
        }
    }

    let data;
    try {
        data = await getLearningRecordListService(params, page, pageSize);
    } catch (error) {
        console.error('Get learning record list controller error:', error);
        const response: ResponseType<{ records: LearningRecordInfo[]; total: number }> = {
            code: StatusCode.INTERNAL_SERVER_ERROR,
            message: 'Failed to get learning record list',
        };
        return res.status(500).json(response);
    }

    const response: ResponseType<{ records: LearningRecordInfo[]; total: number }> = {
        code: StatusCode.SUCCESS,
        message: 'Get learning record list successfully',
        data: data,
    };
    return res.status(200).json(response);
}

/**
 * 获取学习记录详情
 * 根据 recordId 获取学习记录信息
 */
export async function getLearningRecordController(req: AuthRequest, res: Response) {
  const recordId = parseInt(req.params.recordId);

  // 验证 recordId
  if (!recordId || isNaN(recordId) || recordId <= 0) {
    const response: ResponseType<LearningRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid recordId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getLearningRecordService(recordId);
  } catch (error) {
    console.error('Get learning record controller error:', error);
    const response: ResponseType<LearningRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get learning record',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<LearningRecordInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get learning record successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取学习历史课程列表
 * 返回当前登录用户已经学习过的课程（根据学习记录去重）
 */
export async function getLearningHistoryListController(req: AuthRequest, res: Response) {
  const studentId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  let data;
  try {
    data = await getLearningHistoryListService(studentId, page, pageSize);
  } catch (error) {
    console.error('Get learning history list controller error:', error);
    const response: ResponseType<{ records: ResourceInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get learning history list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: ResourceInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get learning history list successfully',
    data,
  };
  return res.status(200).json(response);
}
