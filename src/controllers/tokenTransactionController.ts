import { Response } from 'express';
import { getTokenTransactionListService } from '../services/tokenTransactionService';
import { TokenTransactionInfo } from '../types/tokenTransactionType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 获取代币交易记录列表
 * 支持按条件筛选和分页
 */
export async function getTokenTransactionListController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { transactionType, rewardType, consumeType, relatedId, page, pageSize } = req.query;

  const params: Partial<TokenTransactionInfo> = {
    userId,
  };

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
