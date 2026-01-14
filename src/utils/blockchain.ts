import { ethers } from 'ethers';

/**
 * 计算资源的内容指纹（Content Hash）
 * 使用 Keccak256 算法对 ipfsHash、ownerAddress 和 createdAt 进行哈希计算
 * 
 * @param ipfsHash IPFS CID
 * @param ownerAddress 资源所有者钱包地址
 * @param createdAt 资源创建时间（Unix时间戳，秒）
 * @returns contentHash 内容指纹（bytes32格式的十六进制字符串）
 */
export function calculateContentHash(
  ipfsHash: string,
  ownerAddress: string,
  createdAt: number
): string {
  if (!ipfsHash || !ownerAddress || !createdAt) {
    throw new Error('ipfsHash, ownerAddress and createdAt are required');
  }

  // 验证地址格式
  if (!ethers.isAddress(ownerAddress)) {
    throw new Error('Invalid owner address format');
  }

  // 使用 solidityPackedKeccak256 进行哈希计算
  // 参数顺序：string ipfsHash, address ownerAddress, uint256 createdAt
  const contentHash = ethers.solidityPackedKeccak256(
    ['string', 'address', 'uint256'],
    [ipfsHash, ownerAddress, createdAt]
  );

  return contentHash;
}

/**
 * 验证地址格式
 * @param address 钱包地址
 * @returns 是否为有效地址
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * 将地址转换为校验和格式（EIP-55）
 * @param address 钱包地址
 * @returns 校验和格式的地址
 */
export function toChecksumAddress(address: string): string {
  return ethers.getAddress(address);
}
