import { Response } from 'express';
import { getTokenTransactionListService } from '../services/tokenTransactionService';
import { TokenTransactionInfo, TokenTransactionInfoQueryParams } from '../types/tokenTransactionType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ROLE_ADMIN } from '../middlewares/roleMiddleware';

/**
 * 获取代币交易记录列表
 * 支持按条件筛选和分页
 *
 * 规则：
 * - 非管理员：只能查询自己的记录（忽略 query.userId）
 * - 管理员：
 *   - 传 query.userId：查询指定用户
 *   - 不传 query.userId：查询全部用户（用于 blockchainRecord 等全局统计）
 */
export async function getTokenTransactionListController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { userId: queryUserId, transactionType, rewardType, consumeType, relatedId, startDate, endDate, page, pageSize } = req.query;

  const params: TokenTransactionInfoQueryParams = {};

  // 非管理员：强制只查自己
  if (userRole !== ROLE_ADMIN) {
    params.userId = userId;
  }

  // 管理员：允许指定 userId，不指定则查全部
  if (userRole === ROLE_ADMIN && queryUserId !== undefined) {
    const uid = parseInt(queryUserId as string);
    if (!isNaN(uid)) params.userId = uid;
  }

  if (transactionType !== undefined) {
    const transactionTypeNum = parseInt(transactionType as string);
    if (!isNaN(transactionTypeNum)) {
      params.transactionType = transactionTypeNum;
    }
  }

  if (rewardType !== undefined) {
    const rewardTypeNum = parseInt(rewardType as string);
    if (!isNaN(rewardTypeNum)) {
      params.rewardType = rewardTypeNum;
    }
  }

  if (consumeType !== undefined) {
    const consumeTypeNum = parseInt(consumeType as string);
    if (!isNaN(consumeTypeNum)) {
      params.consumeType = consumeTypeNum;
    }
  }

  if (relatedId !== undefined) {
    const relatedIdNum = parseInt(relatedId as string);
    if (!isNaN(relatedIdNum)) {
      params.relatedId = relatedIdNum;
    }
  }

  if (startDate) {
    params.startDate = startDate as string;
  }

  if (endDate) {
    params.endDate = endDate as string;
  }

  const pageNum = parseInt(page as string) || 1;
  const pageSizeNum = parseInt(pageSize as string) || 10;

  let data;
  try {
    data = await getTokenTransactionListService(params, pageNum, pageSizeNum);
  } catch (error) {
    console.error('Get token transaction list controller error:', error);
    const response: ResponseType<{ records: TokenTransactionInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get token transaction list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: TokenTransactionInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get token transaction list successfully',
    data,
  };
  return res.status(200).json(response);
}
