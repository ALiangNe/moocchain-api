import { dbPool } from '../config/database';
import { CertificateInfo } from '../types/certificateType';



/**
 * 创建证书
 * 插入新证书到数据库，创建后返回完整证书信息
 */
export async function postCertificate(
    data: Partial<CertificateInfo>
): Promise<CertificateInfo> {
    const { certificateNftId, studentId, teacherId, courseId, learningRecordId, ipfsHash, transactionHash } = data;

    if (!studentId || !teacherId || !courseId || !learningRecordId) {
        throw new Error('studentId, teacherId, courseId and learningRecordId are required');
    }

    const now = new Date();

    let result;
    try {
        [result] = await dbPool.query(
            'INSERT INTO certificate (certificateNftId, studentId, teacherId, courseId, learningRecordId, ipfsHash, transactionHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [certificateNftId || null, studentId, teacherId, courseId, learningRecordId, ipfsHash || null, transactionHash || null, now]
        );
    } catch (error) {
        console.error('Create certificate failed:', error);
        throw error;
    }

    const insertResult = result as { insertId: number };

    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT 
              c.certificateId, c.certificateNftId, c.studentId, c.teacherId, c.courseId, c.learningRecordId, c.ipfsHash, c.transactionHash, c.createdAt,
              s.userId AS studentUserId, s.username AS studentUsername, s.realName AS studentRealName, s.email AS studentEmail, s.avatar AS studentAvatar,
              t.userId AS teacherUserId, t.username AS teacherUsername, t.realName AS teacherRealName, t.email AS teacherEmail, t.avatar AS teacherAvatar, t.schoolName AS teacherSchoolName,
              co.courseId AS courseCourseId, co.courseName, co.description AS courseDescription, co.teacherId AS courseTeacherId
            FROM certificate c
            LEFT JOIN user s ON c.studentId = s.userId
            LEFT JOIN course co ON c.courseId = co.courseId
            LEFT JOIN user t ON co.teacherId = t.userId
            WHERE c.certificateId = ?`,
            [insertResult.insertId]
        );
    } catch (error) {
        console.error('Get certificate failed:', error);
        throw error;
    }

    const certificates = rows as any[];
    if (certificates.length === 0) {
        throw new Error('Certificate not found after creation');
    }

    const row = certificates[0];
    return {
        certificateId: row.certificateId,
        certificateNftId: row.certificateNftId,
        studentId: row.studentId,
        teacherId: row.teacherId,
        courseId: row.courseId,
        learningRecordId: row.learningRecordId,
        ipfsHash: row.ipfsHash,
        transactionHash: row.transactionHash,
        createdAt: row.createdAt,
        // 返回学生信息
        student: row.studentUserId ? {
            userId: row.studentUserId,
            username: row.studentUsername,
            email: row.studentEmail,
            realName: row.studentRealName,
            avatar: row.studentAvatar,
        } : null,
        // 返回教师信息
        teacher: row.teacherUserId ? {
            userId: row.teacherUserId,
            username: row.teacherUsername,
            email: row.teacherEmail,
            realName: row.teacherRealName,
            avatar: row.teacherAvatar,
            schoolName: row.teacherSchoolName,
        } : null,
        // 返回课程信息
        course: row.courseCourseId ? {
            courseId: row.courseCourseId,
            courseName: row.courseName,
            description: row.courseDescription,
            teacherId: row.courseTeacherId,
        } : null,
    };
}

/**
 * 获取证书列表
 * 支持分页和条件筛选
 */
export async function getCertificateList(
    params: Partial<CertificateInfo>,
    page: number = 1,
    pageSize: number = 10
): Promise<{ records: CertificateInfo[]; total: number }> {
    const { studentId, teacherId, courseId } = params;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (studentId) {
        whereConditions.push('c.studentId = ?');
        values.push(studentId);
    }
    if (teacherId) {
        whereConditions.push('c.teacherId = ?');
        values.push(teacherId);
    }
    if (courseId) {
        whereConditions.push('c.courseId = ?');
        values.push(courseId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const offset = (page - 1) * pageSize;

    // 查询总数
    let countRows;
    try {
        [countRows] = await dbPool.query(
            `SELECT COUNT(*) as total FROM certificate c ${whereClause}`,
            values
        );
    } catch (error) {
        console.error('Get certificate count failed:', error);
        throw error;
    }

    const total = (countRows as { total: number }[])[0]?.total || 0;

    // 查询列表
    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT 
              c.certificateId, c.certificateNftId, c.studentId, c.teacherId, c.courseId, c.learningRecordId, c.ipfsHash, c.transactionHash, c.createdAt,
              s.userId AS studentUserId, s.username AS studentUsername, s.realName AS studentRealName, s.email AS studentEmail, s.avatar AS studentAvatar,
              t.userId AS teacherUserId, t.username AS teacherUsername, t.realName AS teacherRealName, t.email AS teacherEmail, t.avatar AS teacherAvatar, t.schoolName AS teacherSchoolName,
              co.courseId AS courseCourseId, co.courseName, co.description AS courseDescription, co.teacherId AS courseTeacherId
            FROM certificate c
            LEFT JOIN user s ON c.studentId = s.userId
            LEFT JOIN course co ON c.courseId = co.courseId
            LEFT JOIN user t ON co.teacherId = t.userId
            ${whereClause}
            ORDER BY c.createdAt DESC
            LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );
    } catch (error) {
        console.error('Get certificate list failed:', error);
        throw error;
    }

    const records = (rows as any[]).map((row: any): CertificateInfo => ({
        certificateId: row.certificateId,
        certificateNftId: row.certificateNftId,
        studentId: row.studentId,
        teacherId: row.teacherId,
        courseId: row.courseId,
        learningRecordId: row.learningRecordId,
        ipfsHash: row.ipfsHash,
        transactionHash: row.transactionHash,
        createdAt: row.createdAt,
        // 返回学生信息
        student: row.studentUserId ? {
            userId: row.studentUserId,
            username: row.studentUsername,
            email: row.studentEmail,
            realName: row.studentRealName,
            avatar: row.studentAvatar,
        } : null,
        // 返回教师信息
        teacher: row.teacherUserId ? {
            userId: row.teacherUserId,
            username: row.teacherUsername,
            email: row.teacherEmail,
            realName: row.teacherRealName,
            avatar: row.teacherAvatar,
            schoolName: row.teacherSchoolName,
        } : null,
        // 返回课程信息
        course: row.courseCourseId ? {
            courseId: row.courseCourseId,
            courseName: row.courseName,
            description: row.courseDescription,
            teacherId: row.courseTeacherId,
        } : null,
    }));

    return { records, total };
}

/**
* 查询证书
* 根据条件动态构建查询语句，支持按 certificateId、studentId、courseId 查询
*/

export async function getCertificate(
    conditions: Partial<CertificateInfo>
): Promise<CertificateInfo | null> {
    const { certificateId, studentId, courseId, learningRecordId } = conditions;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (certificateId) {
        whereConditions.push('c.certificateId = ?');
        values.push(certificateId);
    }
    if (studentId) {
        whereConditions.push('c.studentId = ?');
        values.push(studentId);
    }
    if (courseId) {
        whereConditions.push('c.courseId = ?');
        values.push(courseId);
    }
    if (learningRecordId) {
        whereConditions.push('c.learningRecordId = ?');
        values.push(learningRecordId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT 
              c.certificateId, c.certificateNftId, c.studentId, c.teacherId, c.courseId, c.learningRecordId, c.ipfsHash, c.transactionHash, c.createdAt,
              s.userId AS studentUserId, s.username AS studentUsername, s.realName AS studentRealName, s.email AS studentEmail, s.avatar AS studentAvatar,
              t.userId AS teacherUserId, t.username AS teacherUsername, t.realName AS teacherRealName, t.email AS teacherEmail, t.avatar AS teacherAvatar, t.schoolName AS teacherSchoolName,
              co.courseId AS courseCourseId, co.courseName, co.description AS courseDescription, co.teacherId AS courseTeacherId
            FROM certificate c
            LEFT JOIN user s ON c.studentId = s.userId
            LEFT JOIN course co ON c.courseId = co.courseId
            LEFT JOIN user t ON co.teacherId = t.userId
            ${whereClause}`,
            values
        );
    } catch (error) {
        console.error('Get certificate failed:', error);
        throw error;
    }

    const certificates = (rows as any[]).map((row: any): CertificateInfo => ({
        certificateId: row.certificateId,
        certificateNftId: row.certificateNftId,
        studentId: row.studentId,
        teacherId: row.teacherId,
        courseId: row.courseId,
        learningRecordId: row.learningRecordId,
        ipfsHash: row.ipfsHash,
        transactionHash: row.transactionHash,
        createdAt: row.createdAt,
        // 返回学生信息
        student: row.studentUserId ? {
            userId: row.studentUserId,
            username: row.studentUsername,
            email: row.studentEmail,
            realName: row.studentRealName,
            avatar: row.studentAvatar,
        } : null,
        // 返回教师信息
        teacher: row.teacherUserId ? {
            userId: row.teacherUserId,
            username: row.teacherUsername,
            email: row.teacherEmail,
            realName: row.teacherRealName,
            avatar: row.teacherAvatar,
            schoolName: row.teacherSchoolName,
        } : null,
        // 返回课程信息
        course: row.courseCourseId ? {
            courseId: row.courseCourseId,
            courseName: row.courseName,
            description: row.courseDescription,
            teacherId: row.courseTeacherId,
        } : null,
    }));

    return certificates.length > 0 ? certificates[0] : null;
}

/**
 * 更新证书的链上信息
 * 仅更新 certificateNftId 和 transactionHash 字段
 */
export async function updateCertificateNft(
    certificateId: number,
    data: { certificateNftId?: string; transactionHash?: string }
): Promise<CertificateInfo | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.certificateNftId !== undefined) {
        updateFields.push('certificateNftId = ?');
        values.push(data.certificateNftId);
    }

    if (data.transactionHash !== undefined) {
        updateFields.push('transactionHash = ?');
        values.push(data.transactionHash);
    }

    if (updateFields.length === 0) {
        throw new Error('No nft fields to update');
    }

    values.push(certificateId);

    try {
        await dbPool.query(
            `UPDATE certificate SET ${updateFields.join(', ')} WHERE certificateId = ?`,
            values
        );
    } catch (error) {
        console.error('Update certificate nft info failed:', error);
        throw error;
    }

    // 返回更新后的证书信息
    return await getCertificate({ certificateId });
}

/**
 * 检查证书是否已存在
 * 根据学习记录ID检查是否已领取过证书
 */
export async function checkCertificateExists(learningRecordId: number): Promise<boolean> {
    try {
        const [rows] = await dbPool.query(
            'SELECT COUNT(*) as count FROM certificate WHERE learningRecordId = ?',
            [learningRecordId]
        );

        const count = (rows as { count: number }[])[0]?.count || 0;
        return count > 0;
    } catch (error) {
        console.error('Check certificate exists failed:', error);
        throw error;
    }
}