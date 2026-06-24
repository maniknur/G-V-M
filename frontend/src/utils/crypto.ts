/**
 * GVM Client-Side Asymmetric Encryption Utilities
 *
 * Encrypts blueprint files locally in the browser using the Admin's public key
 * before uploading to IPFS. The encrypted version is stored as admin_encrypted_hash
 * in the smart contract, while the plaintext file gets ipfs_hash for buyer access.
 *
 * Currently using a mock implementation — swap with tweetnacl or openpgp in production.
 */

const STROOP_PER_XLM = 10_000_000;

/** Pseudo-random hex string generator (simulates SHA-256 output) */
function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/**
 * Simulates reading a file and computing its IPFS content hash.
 * In production: upload to IPFS (Pinata/web3.storage) and return the CID.
 */
export async function computeIpfsHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const sizeHex = buffer.byteLength.toString(16).padStart(8, "0");
  return `ipfs://bafybei${randomHex(44)}${sizeHex}`;
}

/**
 * Encrypts a file using the Admin's public key (asymmetric encryption).
 *
 * Mock: generates a random hex string of same length as file content.
 * Production: use nacl.box or openpgp.encrypt with the admin's ed25519 public key.
 */
export async function encryptForAdmin(
  file: File,
  adminPublicKey: string,
): Promise<string> {
  const buffer = await file.arrayBuffer();
  const contentLen = buffer.byteLength;
  const encrypted = randomHex(Math.min(contentLen, 256));
  return `enc:${adminPublicKey.slice(0, 12)}:${encrypted}`;
}

/**
 * Converts XLM amount to stroops (Stellar base unit, 1 XLM = 10^7 stroops).
 */
export function xlmToStroops(amountXlm: number): bigint {
  return BigInt(Math.round(amountXlm * STROOP_PER_XLM));
}

export interface EncryptionResult {
  ipfsHash: string;
  adminEncryptedHash: string;
  fileSize: number;
  fileName: string;
}

/**
 * Full pipeline: read file → compute IPFS hash → encrypt for admin.
 */
export async function processBlueprintFile(
  file: File,
  adminPublicKey: string,
): Promise<EncryptionResult> {
  const [ipfsHash, adminEncryptedHash] = await Promise.all([
    computeIpfsHash(file),
    encryptForAdmin(file, adminPublicKey),
  ]);

  return {
    ipfsHash,
    adminEncryptedHash,
    fileSize: file.size,
    fileName: file.name,
  };
}
