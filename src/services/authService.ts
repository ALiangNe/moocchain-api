import type { StringValue } from 'ms';
import jwt, { SignOptions } from 'jsonwebtoken';
import { parseExpiresIn } from '../utils/timeUtils';

// JWT 配置
const JWT_ACCESS_SECRET = (process.env.JWT_ACCESS_SECRET || 'dev-secret') as string;
const JWT_ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue;
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret') as string;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue;

interface RefreshTokenData {
    userId: number;
    username: string;
    expiresAt: number;
}

const refreshTokenStore = new Map<string, RefreshTokenData>();

/**
 * 生成 Access Token
 */
export function signAccessToken(payload: object): string {
    const options: SignOptions = { expiresIn: JWT_ACCESS_EXPIRES_IN };
    return jwt.sign(payload, JWT_ACCESS_SECRET, options);
}

/**
 * 生成 Refresh Token
 */
export function signRefreshToken(payload: object): string {
    const options: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN };
    return jwt.sign(payload, JWT_REFRESH_SECRET, options);
}

/**
 * 存储 refresh token
 */
export function storeRefreshTokenForUser(token: string, userId: number, username: string): void {
    const refreshExpiresIn = parseExpiresIn(JWT_REFRESH_EXPIRES_IN as string);
    const expiresAt = Date.now() + refreshExpiresIn * 1000; // refreshExpiresIn 是秒数
    refreshTokenStore.set(token, { userId, username, expiresAt });
}

/**
 * 获取 refresh token 数据
 */
export function getRefreshTokenData(token: string): RefreshTokenData | null {
    const data = refreshTokenStore.get(token);
    if (!data) {
        return null;
    }

    // 检查是否过期
    if (Date.now() > data.expiresAt) {
        refreshTokenStore.delete(token);
        return null;
    }

    return data;
}

/**
 * 删除 refresh token
 */
export function deleteRefreshToken(token: string): void {
    refreshTokenStore.delete(token);
}

/**
 * 刷新 Access Token
 */
export function refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } | null {
    let decoded: { userId: number; username: string; role?: number };
    try {
        // 验证 refresh token
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: number; username: string; role?: number };
    } catch (error) {
        console.error('Refresh token error:', error);
        return null;
    }

    // 检查 refresh token 是否在存储中
    const tokenData = getRefreshTokenData(refreshToken);
    if (!tokenData) {
        return null; // Refresh token 已过期或不存在
    }

    // 刷新双 Token
    const newAccessToken = signAccessToken({ userId: decoded.userId, username: decoded.username, role: decoded.role });
    const newRefreshToken = signRefreshToken({ userId: decoded.userId, username: decoded.username, role: decoded.role });
    deleteRefreshToken(refreshToken);
    storeRefreshTokenForUser(newRefreshToken, decoded.userId, decoded.username);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
}

