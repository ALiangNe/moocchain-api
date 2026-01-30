import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { createResourceService, updateResourceService, getResourceListService, getResourceService } from '../services/resourceService';
import { createTokenRewardTransactionService, createTokenConsumeTransactionService } from '../services/tokenTransactionService';
import { ResourceInfo } from '../types/resourceType';
import { TokenTransactionInfo } from '../types/tokenTransactionType';
import type { UserInfo } from '../types/userType';
import type { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getUser } from '../models/userModel';
import { uploadFileToIPFS } from '../utils/pinataIpfs';
import { getTokenRule } from '../models/tokenRuleModel';
import { MOOC_TOKEN_ADDRESS } from '../contracts/contractAddresses';
import { issueClaimRewardSign, getClaimRewardSign, consumeClaimRewardSign } from '../utils/eip712SignStore';
import path from 'path';
import fs from 'fs';

/**
 * 创建资源
 * 教师在自己创建的课程中创建资源，支持文件上传
 */
export async function createResourceController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;

  // 验证文件是否上传
  if (!req.file) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: '请选择要上传的资源文件',
    };
    return res.status(400).json(response);
  }

  // 从请求体中获取其他参数（使用 multer 后，body 中会包含表单字段）
  const params = req.body as Partial<ResourceInfo> & { courseId: string; title?: string };

  // 验证必需字段
  if (!params.courseId) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseId is required',
    };
    return res.status(400).json(response);
  }

  if (!params.title) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'title is required',
    };
    return res.status(400).json(response);
  }

  // 验证 courseId
  const courseId = parseInt(params.courseId);
  if (isNaN(courseId) || courseId <= 0) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseId',
    };
    return res.status(400).json(response);
  }

  // 根据文件类型自动设置 resourceType
  // 0:其他，1:文档，2:音频，3:视频
  const mimeType = req.file.mimetype;
  let resourceType = 0;

  if (mimeType === 'application/pdf' || mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    resourceType = 1;
    // 文档类型
  }

  if (mimeType.startsWith('audio/')) {
    resourceType = 2;
    // 音频类型
  }

  if (mimeType.startsWith('video/')) {
    resourceType = 3;
    // 视频类型
  }

  const filePath = path.join(__dirname, '../../uploads/resources', req.file.filename);

  let ipfsHash: string;
  try {
    ipfsHash = await uploadFileToIPFS(filePath, req.file.originalname);
  } catch (error) {
    console.error('Upload to IPFS error:', error);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }
    }
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : 'Failed to upload file to IPFS',
    };
    return res.status(500).json(response);
  }

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.error('Failed to delete temporary file after IPFS upload:', unlinkError);
    }
  }

  const resourceParams: Partial<ResourceInfo> = {
    courseId,
    title: params.title,
    description: params.description,
    resourceType,
    price: params.price !== undefined ? parseFloat(params.price as any) : undefined,
    accessScope: params.accessScope !== undefined ? parseInt(params.accessScope as any) : undefined,
    status: params.status !== undefined ? parseInt(params.status as any) : undefined,
    ipfsHash: ipfsHash,
  };

  let data;
  try {
    data = await createResourceService(teacherId, resourceParams);
  } catch (error) {
    console.error('Create resource controller error:', error);
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create resource',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<ResourceInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Resource created successfully',
    data: data,
  };
  return res.status(201).json(response);
}

/**
 * 更新资源
 * 教师更新自己创建的资源信息
 */
export async function updateResourceController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const resourceId = parseInt(req.params.resourceId);
  const params = req.body as Partial<ResourceInfo>;

  // 验证 resourceId
  if (!resourceId || isNaN(resourceId) || resourceId <= 0) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await updateResourceService(teacherId, resourceId, params);
  } catch (error) {
    console.error('Update resource controller error:', error);
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update resource',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<ResourceInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Resource updated successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取资源列表
 * 支持条件筛选和分页
 */
export async function getResourceListController(req: AuthRequest, res: Response) {
  const { courseId, ownerId, resourceType, status } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: Partial<ResourceInfo> = {};

  if (courseId) {
    const courseIdNum = parseInt(courseId as string);
    if (!isNaN(courseIdNum)) {
      params.courseId = courseIdNum;
    }
  }
  if (ownerId) {
    const ownerIdNum = parseInt(ownerId as string);
    if (!isNaN(ownerIdNum)) {
      params.ownerId = ownerIdNum;
    }
  }
  if (resourceType !== undefined) {
    const resourceTypeNum = parseInt(resourceType as string);
    if (!isNaN(resourceTypeNum)) {
      params.resourceType = resourceTypeNum;
    }
  }
  if (status !== undefined) {
    const statusNum = parseInt(status as string);
    if (!isNaN(statusNum)) {
      params.status = statusNum;
    }
  }

  let data;
  try {
    data = await getResourceListService(params, page, pageSize);
  } catch (error) {
    console.error('Get resource list controller error:', error);
    const response: ResponseType<{ records: ResourceInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get resource list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: ResourceInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get resource list successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取资源详情
 * 根据资源ID获取资源信息
 */
export async function getResourceController(req: AuthRequest, res: Response) {
  const resourceId = parseInt(req.params.resourceId);

  // 验证 resourceId
  if (!resourceId || isNaN(resourceId) || resourceId <= 0) {
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getResourceService(resourceId);
  } catch (error) {
    console.error('Get resource controller error:', error);
    const response: ResponseType<ResourceInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get resource',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<ResourceInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get resource successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 领取上传资源奖励
 * 教师上传资源后，可以领取代币奖励
 */
export async function claimResourceUploadRewardController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { resourceId, walletAddress, signature } = req.body as { resourceId?: number; walletAddress?: string; signature?: string };

  // 验证必需字段
  if (!resourceId) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'resourceId is required',
    };
    return res.status(400).json(response);
  }

  if (!walletAddress) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'walletAddress is required',
    };
    return res.status(400).json(response);
  }

  // 验证 resourceId
  if (typeof resourceId !== 'number' || resourceId <= 0) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }

  // 验证 walletAddress
  if (typeof walletAddress !== 'string' || walletAddress.trim() === '') {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid walletAddress',
    };
    return res.status(400).json(response);
  }

  const rewardTypeNum = 1; // 上传资源奖励

  // EIP-712：要求前端提供签名（弹 MetaMask）
  if (!signature || typeof signature !== 'string' || signature.trim() === '') {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'signature is required',
    };
    return res.status(400).json(response);
  }

  // 获取并校验 sign（nonce/amount/deadline/chainId）
  const sign = getClaimRewardSign(userId, walletAddress.trim(), resourceId, rewardTypeNum);
  if (!sign) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'claim sign not found, please re-initiate claim',
    };
    return res.status(400).json(response);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (sign.deadline <= nowSec) {
    consumeClaimRewardSign(userId, walletAddress.trim(), resourceId, rewardTypeNum);
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'claim sign expired, please re-initiate claim',
    };
    return res.status(400).json(response);
  }

  // 规则可能变更：这里做一次对齐校验（保证签名里展示的 amount 与当前规则一致）
  const rule = await getTokenRule({ rewardType: rewardTypeNum, isEnabled: 1 });
  if (!rule) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Token rule not found or disabled',
    };
    return res.status(400).json(response);
  }
  const currentAmount = String(rule.rewardAmount || 0);
  if (currentAmount !== sign.amount) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Reward amount changed, please re-initiate claim',
    };
    return res.status(400).json(response);
  }

  // 验签：必须是 walletAddress 本人签的
  const domain = {
    name: 'MOOCChain',
    version: '1',
    chainId: sign.chainId,
    verifyingContract: MOOC_TOKEN_ADDRESS,
  };
  const types = {
    ClaimResourceUploadReward: [
      { name: 'userId', type: 'uint256' },
      { name: 'walletAddress', type: 'address' },
      { name: 'resourceId', type: 'uint256' },
      { name: 'rewardType', type: 'uint256' },
      { name: 'amount', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  } as const;
  const messageToVerify = {
    userId,
    walletAddress: walletAddress.trim(),
    resourceId,
    rewardType: rewardTypeNum,
    amount: sign.amount,
    nonce: sign.nonce,
    deadline: sign.deadline,
  };

  let recovered: string;
  try {
    recovered = ethers.verifyTypedData(domain as any, types as any, messageToVerify as any, signature.trim());
  } catch (error) {
    console.error('Verify typed data error:', error);
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid signature',
    };
    return res.status(400).json(response);
  }
  if (recovered.toLowerCase() !== walletAddress.trim().toLowerCase()) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Signature does not match walletAddress',
    };
    return res.status(400).json(response);
  }

  let transaction;
  try {
    transaction = await createTokenRewardTransactionService(userId, rewardTypeNum, resourceId, walletAddress.trim());
  } catch (error) {
    console.error('Claim resource upload reward controller error:', error);
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to claim resource upload reward',
    };
    return res.status(400).json(response);
  }

  // 成功后消费 sign，防止重复使用
  consumeClaimRewardSign(userId, walletAddress.trim(), resourceId, rewardTypeNum);

  // 奖励发放成功后，查询最新的用户信息（包含最新钱包地址与代币余额）
  let user: UserInfo | null = null;
  try {
    user = await getUser({ userId });
  } catch (error) {
    console.error('Get user after claiming upload reward error:', error);
    // 如果这里失败，不影响奖励发放结果，只是不返回最新用户信息
  }

  const response: ResponseType<{ transaction: TokenTransactionInfo; user: UserInfo | null }> = {
    code: StatusCode.SUCCESS,
    message: 'Resource upload reward claimed successfully',
    data: {
      transaction,
      user,
    },
  };
  return res.status(200).json(response);
}

/**
 * 获取领取上传资源奖励的 EIP-712 sign（给前端弹 MetaMask 签名用）
 */
export async function claimResourceUploadRewardSignController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { resourceId, walletAddress, chainId } = req.body as { resourceId?: number; walletAddress?: string; chainId?: number };

  if (!resourceId || typeof resourceId !== 'number' || resourceId <= 0) {
    const response: ResponseType<unknown> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }
  if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
    const response: ResponseType<unknown> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid walletAddress',
    };
    return res.status(400).json(response);
  }

  const rewardTypeNum = 1; // 上传资源奖励

  const chainIdNum = chainId !== undefined ? Number(chainId) : NaN;
  if (isNaN(chainIdNum) || chainIdNum <= 0) {
    const response: ResponseType<unknown> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid chainId',
    };
    return res.status(400).json(response);
  }

  // 可选：如果你希望只允许固定链，可通过环境变量约束
  const expectedChainId = process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : undefined;
  if (expectedChainId !== undefined && !isNaN(expectedChainId) && expectedChainId > 0 && expectedChainId !== chainIdNum) {
    const response: ResponseType<unknown> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Unsupported chainId',
    };
    return res.status(400).json(response);
  }

  // 获取规则金额，让用户在 MetaMask 里看到"将领取多少"
  const rule = await getTokenRule({ rewardType: rewardTypeNum, isEnabled: 1 });
  if (!rule) {
    const response: ResponseType<unknown> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Token rule not found or disabled',
    };
    return res.status(400).json(response);
  }

  const amount = String(rule.rewardAmount || 0);
  const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5 分钟有效
  const sign = issueClaimRewardSign({
    userId,
    walletAddress: walletAddress.trim(),
    resourceId,
    rewardType: rewardTypeNum,
    chainId: chainIdNum,
    amount,
    deadline,
  });

  const domain = {
    name: 'MOOCChain',
    version: '1',
    chainId: sign.chainId,
    verifyingContract: MOOC_TOKEN_ADDRESS,
  };
  const types = {
    ClaimResourceUploadReward: [
      { name: 'userId', type: 'uint256' },
      { name: 'walletAddress', type: 'address' },
      { name: 'resourceId', type: 'uint256' },
      { name: 'rewardType', type: 'uint256' },
      { name: 'amount', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };
  const message = {
    userId,
    walletAddress: walletAddress.trim(),
    resourceId,
    rewardType: rewardTypeNum,
    amount,
    nonce: sign.nonce,
    deadline: sign.deadline,
  };

  const response: ResponseType<{ domain: any; types: any; message: any }> = {
    code: StatusCode.SUCCESS,
    message: 'OK',
    data: { domain, types, message },
  };
  return res.status(200).json(response);
}

/**
 * 购买资源
 * 用户购买付费资源，前端完成区块链转账后，调用此接口记录交易
 */
export async function buyResourceController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { resourceId, transactionHash, walletAddress } = req.body as { resourceId?: number; transactionHash?: string; walletAddress?: string };

  // 验证必需字段
  if (!resourceId) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'resourceId is required',
    };
    return res.status(400).json(response);
  }

  if (!transactionHash) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'transactionHash is required',
    };
    return res.status(400).json(response);
  }

  if (!walletAddress) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'walletAddress is required',
    };
    return res.status(400).json(response);
  }

  // 验证 resourceId
  if (typeof resourceId !== 'number' || resourceId <= 0) {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid resourceId',
    };
    return res.status(400).json(response);
  }

  // 验证 transactionHash
  if (typeof transactionHash !== 'string' || transactionHash.trim() === '') {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid transactionHash',
    };
    return res.status(400).json(response);
  }

  // 验证 walletAddress
  if (typeof walletAddress !== 'string' || walletAddress.trim() === '') {
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid walletAddress',
    };
    return res.status(400).json(response);
  }

  let transaction;
  try {
    // 调用服务记录交易：consumeType=0（购买资源），relatedId=resourceId
    transaction = await createTokenConsumeTransactionService(userId, 0, resourceId, transactionHash.trim(), walletAddress.trim());
  } catch (error) {
    console.error('Buy resource controller error:', error);
    const response: ResponseType<TokenTransactionInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to buy resource',
    };
    return res.status(400).json(response);
  }

  // 购买成功后，查询最新的用户信息（包含最新钱包地址与代币余额）
  let user: UserInfo | null = null;
  try {
    user = await getUser({ userId });
  } catch (error) {
    console.error('Get user after buying resource error:', error);
    // 如果这里失败，不影响购买结果，只是不返回最新用户信息
  }

  const response: ResponseType<{ transaction: TokenTransactionInfo; user: UserInfo | null }> = {
    code: StatusCode.SUCCESS,
    message: 'Resource purchased successfully',
    data: {
      transaction,
      user,
    },
  };
  return res.status(200).json(response);
}
