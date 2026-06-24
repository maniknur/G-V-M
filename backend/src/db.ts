// Database module — pluggable: swap in-memory for Supabase/PostgreSQL

export interface VerifiedPurchase {
  tx_hash: string;
  blueprint_id: number;
  buyer: string;
  creator: string;
  price: number;
  platform_fee: number;
  creator_share: number;
  verified_at: string;
  download_granted: boolean;
  comments: PurchaseComment[];
}

export interface PurchaseComment {
  id: number;
  user_address: string;
  text: string;
  created_at: string;
}

// In-memory store (swap with Supabase client for production)
const purchases: Map<string, VerifiedPurchase> = new Map();
const comments: Map<number, PurchaseComment[]> = new Map();

export function storePurchase(p: VerifiedPurchase): void {
  purchases.set(p.tx_hash, p);
  console.log(`[DB] Stored verified purchase: ${p.tx_hash.slice(0, 10)}...`);
}

export function getPurchase(txHash: string): VerifiedPurchase | undefined {
  return purchases.get(txHash);
}

export function getAllPurchases(): VerifiedPurchase[] {
  return Array.from(purchases.values());
}

export function hasPurchase(txHash: string): boolean {
  return purchases.has(txHash);
}

export function addComment(
  blueprintId: number,
  comment: PurchaseComment,
): void {
  const existing = comments.get(blueprintId) || [];
  comments.set(blueprintId, [...existing, comment]);
}

export function getComments(blueprintId: number): PurchaseComment[] {
  return comments.get(blueprintId) || [];
}

export function grantDownload(txHash: string): void {
  const p = purchases.get(txHash);
  if (p) {
    p.download_granted = true;
    console.log(`[DB] Download access granted: ${txHash.slice(0, 10)}...`);
  }
}

export function isDownloadGranted(txHash: string): boolean {
  return purchases.get(txHash)?.download_granted || false;
}
