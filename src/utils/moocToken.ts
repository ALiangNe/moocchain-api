import { ethers } from 'ethers';
import MOOCTokenArtifact from '../contracts/MOOCToken.json';
import { MOOC_TOKEN_ADDRESS } from '../contracts/contractAddresses';

// 从环境变量获取配置
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

type MOOCTokenArtifact = { abi: ethers.InterfaceAbi };

/**
 * 获取 MOOCToken 合约 ABI
 */
function getMOOCTokenABI(): ethers.InterfaceAbi {
  return (MOOCTokenArtifact as MOOCTokenArtifact).abi;
}

/**
 * 获取管理员钱包（使用私钥创建）
 */
function getAdminWallet(): ethers.Wallet {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('ADMIN_PRIVATE_KEY is not configured in environment variables');
  }

  const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

  return wallet;
}

/**
 * 使用管理员私钥铸造代币到指定地址
 * @param to 接收代币的地址
 * @param amount 铸造数量（字符串形式，例如 "10.5"）
 * @returns 交易哈希
 */
export async function mintMOOCTokenToAddress(to: string, amount: string): Promise<string> {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('ADMIN_PRIVATE_KEY is not configured');
  }

  const wallet = getAdminWallet();
  const abi = getMOOCTokenABI();
  const contract = new ethers.Contract(MOOC_TOKEN_ADDRESS, abi, wallet);

  // 将代币数量转换为 wei（ERC20 通常使用 18 位小数）
  const amountInWei = ethers.parseUnits(amount, 18);

  let tx;
  try {
    tx = await contract.mint(to, amountInWei);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Mint transaction failed');
  }

  let receipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Wait mint transaction failed');
  }

  return receipt.hash;
}

/**
 * 查询代币余额
 * @param walletAddress 要查询的钱包地址
 * @returns 格式化的代币余额字符串（例如 "10.50"）
 */
export async function getMOOCTokenBalance(walletAddress: string): Promise<string> {
  const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
  const abi = getMOOCTokenABI();
  const contract = new ethers.Contract(MOOC_TOKEN_ADDRESS, abi, provider);

  let balance;
  try {
    balance = await contract.balanceOf(walletAddress);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Query balance failed');
  }

  // 将 wei 转换为代币单位（ERC20 通常使用 18 位小数）
  const balanceInTokens = ethers.formatUnits(balance, 18);

  // 格式化为保留2位小数的字符串
  const formattedBalance = parseFloat(balanceInTokens).toFixed(2);

  return formattedBalance;
}
