import { CertificateInfo, CertificateInfoQueryParams } from '../types/certificateType';
import { ResourceInfo } from '../types/resourceType';
import { getCertificate, postCertificate, getCertificateList, updateCertificateNft } from '../models/certificateModel';
import { getUser } from '../models/userModel';
import { getCourse } from '../models/courseModel';
import { getResourceCertificateConfig } from '../models/resourceCertificateConfigModel';
import { getCertificateTemplate } from '../models/certificateTemplateModel';
import { getResourceList } from '../models/resourceModel';
import { getLearningRecordList } from '../models/learningRecordModel';
import { uploadFileToIPFS } from '../utils/pinataIpfs';
import { ROLE_STUDENT, ROLE_TEACHER } from '../middlewares/roleMiddleware';
import { generateCertificateImage } from '../utils/certificateTemplateDraw';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * 创建证书服务
 * 学生和教师领取证书的核心业务逻辑
 */
export async function createCertificateService(
  studentId: number,
  courseId: number
): Promise<CertificateInfo> {
  // 1. 检查用户是否存在且为学生或教师角色
  const student = await getUser({ userId: studentId });
  if (!student) {
    throw new Error('User not found');
  }
  if (student.role !== ROLE_STUDENT && student.role !== ROLE_TEACHER) {
    throw new Error('Only students and teachers can claim certificates');
  }

  // 2. 检查课程是否存在
  const course = await getCourse({ courseId });
  if (!course) {
    throw new Error('Course not found');
  }

  // 3. 查询教师的证书配置
  const certConfig = await getResourceCertificateConfig({ courseId });
  if (!certConfig || !certConfig.isEnabled) {
    throw new Error('Certificate not available for this course');
  }

  // 4. 查询证书模板
  const template = await getCertificateTemplate({ templateId: certConfig.templateId });
  if (!template || !template.isActive) {
    throw new Error('Certificate template not found or inactive');
  }

  // 5. 获取课程的所有资源
  const resources = await getResourceList({
    courseId
  }, 1, 1000);

  if (!resources.records || resources.records.length === 0) {
    throw new Error('No resources found for this course');
  }

  // 获取学生对这些资源的学习记录，找到第一个已完成的
  const resourceIds = resources.records.map((r: ResourceInfo) => r.resourceId);
  let completedRecord = null;

  // 逐个检查资源的学习记录，找到第一个已完成的
  for (const resourceId of resourceIds) {
    const learningRecords = await getLearningRecordList({
      studentId,
      resourceId
    }, 1, 1);

    if (learningRecords.records && learningRecords.records.length > 0) {
      const record = learningRecords.records[0];
      if (record.isCompleted === 1) {
        completedRecord = record;
        break;
      }
    }
  }

  if (!completedRecord) {
    throw new Error('No completed learning records found for this course');
  }

  const learningRecordId = completedRecord.recordId;

  // 6. 合并数据：模板 + 教师配置 + 学生信息
  const finalData = await mergeCertificateData(template.templateContent, certConfig.overrideFields, student, course);

  // 7. 使用canvas生成证书图片
  const imageBuffer = await generateCertificateImage(finalData);

  // 8. 保存图片到临时文件，然后上传到IPFS
  const tempFilePath = path.join(__dirname, '../../temp', `certificate-${studentId}-${courseId}-${Date.now()}.png`);
  await fs.promises.mkdir(path.dirname(tempFilePath), { recursive: true });
  await sharp(imageBuffer).png().toFile(tempFilePath);

  let ipfsHash: string;
  try {
    ipfsHash = await uploadFileToIPFS(tempFilePath, `certificate-${studentId}-${courseId}.png`);
  } finally {
    // 删除临时文件
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }

  // 9. 插入数据库（暂时不铸造NFT）
  const certificateData = await postCertificate({
    studentId,
    teacherId: course.teacherId,
    courseId,
    learningRecordId,
    ipfsHash,
    // certificateNftId 和 transactionHash 先不设置
  });

  return certificateData;
}

/**
 * 获取证书列表服务
 * 支持按学生ID、教师ID、课程ID、教师姓名、日期范围筛选
 */
export async function getCertificateListService(
  params: CertificateInfoQueryParams,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: CertificateInfo[]; total: number }> {
  return await getCertificateList(params, page, pageSize);
}

/**
 * 获取证书详情服务
 * 根据证书ID获取证书信息
 */
export async function getCertificateService(certificateId: number): Promise<CertificateInfo> {
  const certificate = await getCertificate({ certificateId });
  if (!certificate) {
    throw new Error('Certificate not found');
  }
  return certificate;
}

/**
 * 更新证书的链上信息（NFT TokenId 和交易哈希）
 * 允许证书所属学生或教师更新（studentId 字段存储的是领取证书的用户ID，可能是学生也可能是教师）
 */
export async function updateCertificateNftService(
  studentId: number,
  certificateId: number,
  data: { certificateNftId?: string; transactionHash?: string }
): Promise<CertificateInfo> {
  const certificate = await getCertificate({ certificateId });
  if (!certificate) {
    throw new Error('Certificate not found');
  }

  if (!certificate.studentId || certificate.studentId !== studentId) {
    throw new Error('No permission to update this certificate');
  }

  const updated = await updateCertificateNft(certificateId, data);
  if (!updated) {
    throw new Error('Failed to update certificate nft info');
  }

  return updated;
}

/**
 * 合并证书数据
 * 将模板、教师配置和学生数据合并
 */
async function mergeCertificateData(
  templateContent: any,
  overrideFields: any,
  student: any,
  course: any
): Promise<any> {
  // 解析模板内容
  let template;
  try {
    template = typeof templateContent === 'string' ? JSON.parse(templateContent) : templateContent;
  } catch (error) {
    throw new Error('Invalid certificate template content');
  }

  // 获取教师信息
  const teacher = await getUser({ userId: course.teacherId });
  if (!teacher) {
    throw new Error('Course teacher not found');
  }

  // 深拷贝模板
  const mergedData = JSON.parse(JSON.stringify(template));

  // 没有字段时直接返回
  if (!Array.isArray(mergedData.fields) || mergedData.fields.length === 0) {
    return mergedData;
  }

  // 合并字段数据（控制在单层 for 内，配合提前返回 / continue，避免深层嵌套）
    for (const field of mergedData.fields) {
    if (!field || !field.key) continue;

    const key = field.key as string;

    // 1. 通用覆盖逻辑：教师覆盖 > 模板默认值
    if (overrideFields && Object.prototype.hasOwnProperty.call(overrideFields, key)) {
      field.value = overrideFields[key];
    } else if (field.value == null && field.defaultValue != null) {
        field.value = field.defaultValue;
      }

    // 2. 针对特殊字段的业务处理（使用提前 continue，避免嵌套）

    // 学生姓名
    if (key === 'studentName' || key === 'studentNameLabel') {
          field.value = student.realName || student.username;
      continue;
    }

    // 课程名称
    if (key === 'courseName') {
          field.value = course.courseName;
      continue;
    }

    // 证书正文：替换课程名称占位符，仅加粗课程名称（不加书名号），前后添加空格
    if (key === 'certificateText' || key === 'certificateText1') {
      if (!field.value) continue;

      const placeholders = ['<在此完成>', '<课程名称>', '<课程名字>', '《课程名字》'];
      const replacement = ` <b>${course.courseName}</b> `;
      const placeholder = placeholders.find((p) => field.value.includes(p));

      if (!placeholder) continue;

      field.value = field.value.replace(placeholder, replacement);
      continue;
          }

    // 领证日期
    if (key === 'issueDate') {
          field.value = new Date().toISOString().split('T')[0];
      continue;
    }

    // 教师姓名
    if (key === 'teacherName') {
          field.value = teacher.realName || teacher.username || '';
      continue;
    }

    // 教师学校
    if (key === 'teacherSchool' || key === 'teacherSchoolLabel') {
          field.value = teacher.schoolName || '';
      continue;
    }

    // 颁发者名称
    if (key === 'issuerName') {
          field.value = teacher.realName || teacher.username || '';
      continue;
    }
  }

  return mergedData;
}
