import { Request, Response } from 'express';
import { createTokenRuleService, updateTokenRuleService, getTokenRuleListService, getTokenRuleService } from '../services/tokenRuleService';
import { TokenRuleInfo, TokenRuleInfoQueryParams } from '../types/tokenRuleType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 创建代币规则
 * 管理员创建新代币规则
 */
export async function createTokenRuleController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const params = req.body as Partial<TokenRuleInfo>;

  // 验证必需字段
  if (params.rewardType === undefined) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'rewardType is required',
    };
    return res.status(400).json(response);
  }

  // 验证 rewardType 范围（0:学习完成，1:资源上传，2:评价参与）
  if (![0, 1, 2].includes(params.rewardType)) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'rewardType must be 0 (learning completed), 1 (resource uploaded), or 2 (review submitted)',
    };
    return res.status(400).json(response);
  }

  if (params.rewardAmount === undefined) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'rewardAmount is required',
    };
    return res.status(400).json(response);
  }

  // 验证 rewardAmount 必须大于0
  if (params.rewardAmount <= 0) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'rewardAmount must be greater than 0',
    };
    return res.status(400).json(response);
  }

  if (!params.tokenName) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'tokenName is required',
    };
    return res.status(400).json(response);
  }

  // 验证 isEnabled 字段（如果提供了）
  if (params.isEnabled !== undefined) {
    if (params.isEnabled !== 0 && params.isEnabled !== 1) {
      const response: ResponseType<TokenRuleInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'isEnabled must be 0 or 1',
      };
      return res.status(400).json(response);
    }
  }

  let data;
  try {
    data = await createTokenRuleService(adminId, params);
  } catch (error) {
    console.error('Create token rule controller error:', error);
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create token rule',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<TokenRuleInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Token rule created successfully',
    data: data,
  };
  return res.status(201).json(response);
}

/**
 * 更新代币规则
 * 管理员更新代币规则信息
 */
export async function updateTokenRuleController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const ruleId = parseInt(req.params.ruleId);
  const params = req.body as Partial<TokenRuleInfo>;

  // 验证 ruleId
  if (!ruleId || isNaN(ruleId) || ruleId <= 0) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid ruleId',
    };
    return res.status(400).json(response);
  }

  // 验证 rewardAmount（如果提供了）
  if (params.rewardAmount !== undefined) {
    if (params.rewardAmount <= 0) {
      const response: ResponseType<TokenRuleInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'rewardAmount must be greater than 0',
      };
      return res.status(400).json(response);
    }
  }

  // 验证 isEnabled 字段（如果提供了）
  if (params.isEnabled !== undefined) {
    if (params.isEnabled !== 0 && params.isEnabled !== 1) {
      const response: ResponseType<TokenRuleInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'isEnabled must be 0 or 1',
      };
      return res.status(400).json(response);
    }
  }

  // 检查是否至少有一个可更新的字段
  const updatableFields = ['rewardAmount', 'tokenName', 'isEnabled'];
  const hasValidField = updatableFields.some(field => params[field as keyof TokenRuleInfo] !== undefined);

  if (!hasValidField) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'At least one field to update is required',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await updateTokenRuleService(adminId, ruleId, params);
  } catch (error) {
    console.error('Update token rule controller error:', error);
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update token rule',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<TokenRuleInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Token rule updated successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取代币规则列表
 * 支持条件筛选和分页
 */
export async function getTokenRuleListController(req: AuthRequest, res: Response) {
  const { rewardType, isEnabled, startDate, endDate } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: TokenRuleInfoQueryParams = {};

  if (rewardType !== undefined) {
    const rewardTypeNum = parseInt(rewardType as string);
    if (!isNaN(rewardTypeNum)) {
      params.rewardType = rewardTypeNum;
    }
  }
  if (isEnabled !== undefined) {
    const isEnabledNum = parseInt(isEnabled as string);
    if (!isNaN(isEnabledNum)) {
      params.isEnabled = isEnabledNum;
    }
  }
  if (startDate !== undefined) {
    params.startDate = String(startDate);
  }
  if (endDate !== undefined) {
    params.endDate = String(endDate);
  }

  let data;
  try {
    data = await getTokenRuleListService(params, page, pageSize);
  } catch (error) {
    console.error('Get token rule list controller error:', error);
    const response: ResponseType<{ records: TokenRuleInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get token rule list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: TokenRuleInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get token rule list successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取代币规则详情
 * 根据规则ID获取规则信息
 */
export async function getTokenRuleController(req: AuthRequest, res: Response) {
  const ruleId = parseInt(req.params.ruleId);

  // 验证 ruleId
  if (!ruleId || isNaN(ruleId) || ruleId <= 0) {
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid ruleId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getTokenRuleService(ruleId);
  } catch (error) {
    console.error('Get token rule controller error:', error);
    const response: ResponseType<TokenRuleInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get token rule',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<TokenRuleInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get token rule successfully',
    data: data,
  };
  return res.status(200).json(response);
}
