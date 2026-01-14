import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Pinata API 配置
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';

/**
 * 上传文件到 Pinata IPFS
 * @param filePath 文件路径（本地文件系统路径）
 * @param fileName 文件名（可选，用于元数据）
 * @returns IPFS Hash (CID)
 */
export async function uploadFileToIPFS(filePath: string, fileName?: string): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error('Pinata API credentials are not configured. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env file');
  }

  const fileStream = fs.createReadStream(filePath);
  const formData = new FormData();
  formData.append('file', fileStream);

  if (fileName) {
    const metadata = JSON.stringify({
      name: fileName,
    });
    formData.append('pinataMetadata', metadata);
  }

  const headers = {
    'pinata_api_key': PINATA_API_KEY,
    'pinata_secret_api_key': PINATA_SECRET_API_KEY,
    ...formData.getHeaders(),
  };

  let response;
  try {
    response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const message = error.response?.data?.error?.details || error.message;
    throw new Error(`Failed to upload file to IPFS: ${message}`);
  }

  if (!response.data || !response.data.IpfsHash) {
    throw new Error('Failed to upload file to IPFS: Invalid response from Pinata');
  }

  return response.data.IpfsHash;
}

/**
 * 从 Buffer 上传文件到 Pinata IPFS
 * @param buffer 文件 Buffer
 * @param fileName 文件名
 * @param mimeType MIME 类型
 * @returns IPFS Hash (CID)
 */
export async function uploadBufferToIPFS(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    throw new Error('Pinata API credentials are not configured. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env file');
  }

  const formData = new FormData();
  formData.append('file', buffer, {
    filename: fileName,
    contentType: mimeType,
  });

  const metadata = JSON.stringify({
    name: fileName,
  });
  formData.append('pinataMetadata', metadata);

  const headers = {
    'pinata_api_key': PINATA_API_KEY,
    'pinata_secret_api_key': PINATA_SECRET_API_KEY,
    ...formData.getHeaders(),
  };

  let response;
  try {
    response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const message = error.response?.data?.error?.details || error.message;
    throw new Error(`Failed to upload file to IPFS: ${message}`);
  }

  if (!response.data || !response.data.IpfsHash) {
    throw new Error('Failed to upload file to IPFS: Invalid response from Pinata');
  }

  return response.data.IpfsHash;
}

/**
 * 获取 IPFS 文件的完整访问 URL
 * @param ipfsHash IPFS Hash (CID)
 * @returns 完整的 IPFS 访问 URL
 */
export function getIPFSUrl(ipfsHash: string): string {
  return `${PINATA_GATEWAY_URL}${ipfsHash}`;
}
