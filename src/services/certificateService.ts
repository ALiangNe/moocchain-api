import { CertificateInfo } from '../types/certificateType';
import { ResourceInfo } from '../types/resourceType';
import { getCertificate, postCertificate, getCertificateList, updateCertificateNft } from '../models/certificateModel';
import { getUser } from '../models/userModel';
import { getCourse } from '../models/courseModel';
import { getResourceCertificateConfig } from '../models/resourceCertificateConfigModel';
import { getCertificateTemplate } from '../models/certificateTemplateModel';
import { getResourceList } from '../models/resourceModel';
import { getLearningRecordList } from '../models/learningRecordModel';
import { uploadFileToIPFS } from '../utils/pinataIpfs';
import { ROLE_STUDENT } from '../middlewares/roleMiddleware';
import { generateCertificateImage } from '../utils/certificateTemplateDraw';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * 创建证书服务
 * 学生领取证书的核心业务逻辑
 */
export async function createCertificateService(
  studentId: number,
  courseId: number
): Promise<CertificateInfo> {
  // 1. 检查学生是否存在且为学生角色
  const student = await getUser({ userId: studentId });
  if (!student) {
    throw new Error('Student not found');
  }
  if (student.role !== ROLE_STUDENT) {
    throw new Error('Only students can claim certificates');
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
 * 支持按学生ID、教师ID、课程ID筛选
 */
export async function getCertificateListService(
  params: Partial<CertificateInfo>,
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
 * 仅允许证书所属学生更新
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

  // 合并字段数据
  if (mergedData.fields) {
    for (const field of mergedData.fields) {
      // 优先级：教师覆盖 > 模板默认值
      if (overrideFields && overrideFields[field.key]) {
        field.value = overrideFields[field.key];
      } else if (field.defaultValue) {
        field.value = field.defaultValue;
      }

      // 特殊字段处理
      switch (field.key) {
        case 'studentName':
        case 'studentNameLabel':
          field.value = student.realName || student.username;
          break;
        case 'courseName':
          // 强制覆盖课程名称
          field.value = course.courseName;
          break;
        case 'certificateText':
        case 'certificateText1':
          // 替换证书正文中的课程名称占位符
          if (field.value) {
            if (field.value.includes('<在此完成>')) {
              field.value = field.value.replace('<在此完成>', course.courseName);
            }
            if (field.value.includes('<课程名称>')) {
              field.value = field.value.replace('<课程名称>', course.courseName);
            }
          }
          break;
        case 'issueDate':
          // 使用ISO格式日期字符串，以便日期格式化函数正确处理
          field.value = new Date().toISOString().split('T')[0];
          break;
        case 'teacherName':
          // 强制覆盖教师名字
          field.value = teacher.realName || teacher.username || '';
          break;
        case 'teacherSchool':
        case 'teacherSchoolLabel':
          // 强制覆盖教师学校
          field.value = teacher.schoolName || '';
          break;
        case 'issuerName':
          // 强制覆盖颁发者名称
          field.value = teacher.realName || teacher.username || '';
          break;
      }
    }
  }

  return mergedData;
}
