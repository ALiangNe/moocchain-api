import { dbPool } from '../config/database';
import { CertificateTemplateInfo } from '../types/certificateTemplateType';



/**
 * 创建证书模板
 * 插入新证书模板到数据库，创建后返回完整模板信息
 */
export async function postCertificateTemplate(
    data: Partial<CertificateTemplateInfo>
): Promise<CertificateTemplateInfo> {
    const { templateName, templateContent, createdBy, isActive } = data;

    if (!templateName || !templateContent || !createdBy) {
        throw new Error('templateName, templateContent and createdBy are required');
    }

    const now = new Date();

    let result;
    try {
        [result] = await dbPool.query(
            'INSERT INTO certificateTemplate (templateName, templateContent, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
            [templateName, templateContent, createdBy, isActive !== undefined ? isActive : 1, now, now]
        );
    } catch (error) {
        console.error('Create certificate template failed:', error);
        throw error;
    }

    const insertResult = result as { insertId: number };

    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT ct.templateId, ct.templateName, ct.templateContent, ct.createdBy, ct.isActive, ct.createdAt, ct.updatedAt
       FROM certificateTemplate ct
       WHERE ct.templateId = ?`,
            [insertResult.insertId]
        );
    } catch (error) {
        console.error('Get certificate template failed:', error);
        throw error;
    }

    const templates = rows as CertificateTemplateInfo[];
    return templates[0];
}

/**
 * 更新证书模板信息
 * 根据 templateId 更新证书模板信息，只允许更新特定字段
 */
export async function putCertificateTemplate(
    templateId: number,
    data: Partial<CertificateTemplateInfo>
): Promise<CertificateTemplateInfo> {
    // 允许更新的字段
    const allowedFields = ['templateName', 'templateContent', 'isActive'];

    const updateFields: string[] = [];
    const values: any[] = [];

    // 动态构建 UPDATE 语句
    allowedFields.forEach(field => {
        if (data[field as keyof CertificateTemplateInfo] !== undefined) {
            updateFields.push(`${field} = ?`);
            values.push(data[field as keyof CertificateTemplateInfo]);
        }
    });

    if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
    }

    // 添加 updatedAt 字段
    const now = new Date();
    updateFields.push('updatedAt = ?');
    values.push(now);

    // 添加 templateId 到参数列表
    values.push(templateId);

    // 执行更新
    try {
        await dbPool.query(
            `UPDATE certificateTemplate SET ${updateFields.join(', ')} WHERE templateId = ?`,
            values
        );
    } catch (error) {
        console.error('Update certificate template failed:', error);
        throw error;
    }

    // 查询并返回更新后的模板信息
    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT ct.templateId, ct.templateName, ct.templateContent, ct.createdBy, ct.isActive, ct.createdAt, ct.updatedAt
       FROM certificateTemplate ct
       WHERE ct.templateId = ?`,
            [templateId]
        );
    } catch (error) {
        console.error('Get certificate template failed:', error);
        throw error;
    }

    const templates = rows as CertificateTemplateInfo[];
    if (templates.length === 0) {
        throw new Error('Certificate template not found after update');
    }

    return templates[0];
}

/**
 * 获取证书模板列表
 * 支持分页和条件筛选
 */

export async function getCertificateTemplateList(
    params: Partial<CertificateTemplateInfo>,
    page: number = 1,
    pageSize: number = 10
): Promise<{ records: CertificateTemplateInfo[]; total: number }> {
    const { createdBy, isActive } = params;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (createdBy) {
        whereConditions.push('ct.createdBy = ?');
        values.push(createdBy);
    }
    if (isActive !== undefined) {
        whereConditions.push('ct.isActive = ?');
        values.push(isActive);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const offset = (page - 1) * pageSize;

    // 查询总数
    let countRows;
    try {
        [countRows] = await dbPool.query(
            `SELECT COUNT(*) as total FROM certificateTemplate ct ${whereClause}`,
            values
        );
    } catch (error) {
        console.error('Get certificate template count failed:', error);
        throw error;
    }

    const total = (countRows as { total: number }[])[0]?.total || 0;

    // 查询列表
    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT 
           ct.templateId, ct.templateName, ct.templateContent, ct.createdBy, ct.isActive, ct.createdAt, ct.updatedAt,
           u.userId AS creatorUserId, u.username AS creatorUsername, u.realName AS creatorRealName, u.email AS creatorEmail, u.avatar AS creatorAvatar
         FROM certificateTemplate ct
         LEFT JOIN user u ON ct.createdBy = u.userId
         ${whereClause}
         ORDER BY ct.createdAt DESC 
         LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );
    } catch (error) {
        console.error('Get certificate template list failed:', error);
        throw error;
    }

    const records = (rows as any[]).map((row: any): CertificateTemplateInfo => ({
        templateId: row.templateId,
        templateName: row.templateName,
        templateContent: row.templateContent,
        createdBy: row.createdBy,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // 返回创建者的关键信息
        creator: row.creatorUserId ? {
            userId: row.creatorUserId,
            username: row.creatorUsername,
            email: row.creatorEmail,
            realName: row.creatorRealName,
            avatar: row.creatorAvatar,
        } : null,
    }));

    return { records, total };
}

/**
 * 查询证书模板
 * 根据条件动态构建查询语句，支持按 templateId、createdBy、isActive 查询
 */
export async function getCertificateTemplate(
    conditions: Partial<CertificateTemplateInfo>
): Promise<CertificateTemplateInfo | null> {
    const { templateId, createdBy, isActive } = conditions;

    const whereConditions: string[] = [];
    const values: any[] = [];

    if (templateId) {
        whereConditions.push('ct.templateId = ?');
        values.push(templateId);
    }
    if (createdBy) {
        whereConditions.push('ct.createdBy = ?');
        values.push(createdBy);
    }
    if (isActive !== undefined) {
        whereConditions.push('ct.isActive = ?');
        values.push(isActive);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    let rows;
    try {
        [rows] = await dbPool.query(
            `SELECT 
           ct.templateId, ct.templateName, ct.templateContent, ct.createdBy, ct.isActive, ct.createdAt, ct.updatedAt,
           u.userId AS creatorUserId, u.username AS creatorUsername, u.realName AS creatorRealName, u.email AS creatorEmail, u.avatar AS creatorAvatar
         FROM certificateTemplate ct 
         LEFT JOIN user u ON ct.createdBy = u.userId
         ${whereClause}`,
            values
        );
    } catch (error) {
        console.error('Get certificate template failed:', error);
        throw error;
    }

    const templates = (rows as any[]).map((row: any): CertificateTemplateInfo => ({
        templateId: row.templateId,
        templateName: row.templateName,
        templateContent: row.templateContent,
        createdBy: row.createdBy,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // 返回创建者的关键信息
        creator: row.creatorUserId ? {
            userId: row.creatorUserId,
            username: row.creatorUsername,
            email: row.creatorEmail,
            realName: row.creatorRealName,
            avatar: row.creatorAvatar,
        } : null,
    }));

    return templates.length > 0 ? templates[0] : null;
}

