import express, { Request, Response } from "express";
import cors from "cors";
import { startEventWatcher, verifyTransaction } from "./rpc";
import {
  getAllPurchases,
  getPurchase,
  addComment,
  getComments,
  grantDownload,
  isDownloadGranted,
  hasPurchase,
  storePurchase,
  PurchaseComment,
  VerifiedPurchase,
} from "./db";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* ------------------------------------------------------------------ */
/*  Health check                                                      */
/* ------------------------------------------------------------------ */

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "gvm-backend", timestamp: new Date().toISOString() });
});

/* ------------------------------------------------------------------ */
/*  GET /api/purchases — list all verified purchases                   */
/* ------------------------------------------------------------------ */

app.get("/api/purchases", (_req: Request, res: Response) => {
  const purchases = getAllPurchases();
  res.json({ count: purchases.length, purchases });
});

/* ------------------------------------------------------------------ */
/*  GET /api/purchases/:txHash — get single verified purchase          */
/* ------------------------------------------------------------------ */

app.get("/api/purchases/:txHash", (req: Request, res: Response) => {
  const txHash = String(req.params.txHash);
  const purchase = getPurchase(txHash);
  if (!purchase) {
    return res.status(404).json({ error: "Purchase not found or not verified" });
  }
  res.json(purchase);
});

/* ------------------------------------------------------------------ */
/*  POST /api/verify — verify a transaction hash against Stellar RPC   */
/* ------------------------------------------------------------------ */

app.post("/api/verify", async (req: Request, res: Response) => {
  const { txHash } = req.body;
  if (!txHash || typeof txHash !== "string") {
    return res.status(400).json({ error: "txHash (string) is required" });
  }

  const verified = await verifyTransaction(txHash);
  res.json({ txHash, verified });
});

/* ------------------------------------------------------------------ */
/*  GET /api/comments/:blueprintId — get comments for a blueprint      */
/* ------------------------------------------------------------------ */

app.get("/api/comments/:blueprintId", (req: Request, res: Response) => {
  const bpId = parseInt(String(req.params.blueprintId), 10);
  if (isNaN(bpId)) {
    return res.status(400).json({ error: "Invalid blueprint ID" });
  }
  const comments = getComments(bpId);
  res.json({ blueprint_id: bpId, count: comments.length, comments });
});

/* ------------------------------------------------------------------ */
/*  POST /api/comments/:blueprintId — add a community comment          */
/* ------------------------------------------------------------------ */

app.post("/api/comments/:blueprintId", (req: Request, res: Response) => {
  const bpId = parseInt(String(req.params.blueprintId), 10);
  if (isNaN(bpId)) {
    return res.status(400).json({ error: "Invalid blueprint ID" });
  }

  const { userAddress, text } = req.body;
  if (!userAddress || !text) {
    return res.status(400).json({ error: "userAddress and text are required" });
  }

  const comment: PurchaseComment = {
    id: Date.now(),
    user_address: userAddress,
    text,
    created_at: new Date().toISOString(),
  };

  addComment(bpId, comment);
  res.status(201).json(comment);
});

/* ------------------------------------------------------------------ */
/*  GET /api/download/:txHash — check download access                   */
/* ------------------------------------------------------------------ */

app.get("/api/download/:txHash", (req: Request, res: Response) => {
  const txHash = String(req.params.txHash);
  const granted = isDownloadGranted(txHash);
  if (!granted) {
    return res.status(403).json({
      error: "Download not authorized. Purchase must be verified on-chain first.",
    });
  }
  res.json({
    status: "granted",
    tx_hash: req.params.txHash,
    message: "Access unlocked. IPFS CID available for download.",
    ipfs_cid: "QmT5NvUtoM5nWFfrQdPCkQhURzgCsLHfuMPo3jmo7YyY7m",
  });
});

/* ------------------------------------------------------------------ */
/*  POST /api/download/:txHash/grant — manually grant download access   */
/* ------------------------------------------------------------------ */

app.post("/api/download/:txHash/grant", async (req: Request, res: Response) => {
  const txHash = String(req.params.txHash);
  const purchase = getPurchase(txHash);

  if (!purchase) {
    return res.status(404).json({ error: "Purchase not found" });
  }

  grantDownload(txHash);
  res.json({ status: "granted", tx_hash: txHash });
});

/* ------------------------------------------------------------------ */
/*  POST /api/verify-purchase — RPC verification + DB commit           */
/* ------------------------------------------------------------------ */

app.post("/api/verify-purchase", async (req: Request, res: Response) => {
  const { transactionHash, blueprintId, buyerAddress } = req.body;

  if (!transactionHash || typeof transactionHash !== "string") {
    return res.status(400).json({ error: "transactionHash (string) is required" });
  }

  console.log(`[API] Verifying purchase: ${transactionHash.slice(0, 10)}...`);

  try {
    const verified = await verifyTransaction(transactionHash);

    if (!verified) {
      return res.status(422).json({
        verified: false,
        message: "Transaction not found or failed on Stellar Testnet.",
      });
    }

    if (hasPurchase(transactionHash)) {
      return res.json({
        verified: true,
        alreadyStored: true,
        tx_hash: transactionHash,
        download_url: `/api/download/${transactionHash}`,
      });
    }

    const purchase: VerifiedPurchase = {
      tx_hash: transactionHash,
      blueprint_id: blueprintId || 0,
      buyer: buyerAddress || "",
      creator: "",
      price: 0,
      platform_fee: 0,
      creator_share: 0,
      verified_at: new Date().toISOString(),
      download_granted: true,
      comments: [],
    };

    storePurchase(purchase);

    console.log(`[API] Purchase stored & download granted: ${transactionHash.slice(0, 10)}...`);

    res.status(201).json({
      verified: true,
      stored: true,
      tx_hash: transactionHash,
      download_url: `/api/download/${transactionHash}`,
    });
  } catch (e: any) {
    console.error("[API] Verification failed:", e?.message);
    res.status(500).json({
      verified: false,
      error: "Internal verification error.",
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Start server + event watcher                                        */
/* ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`\n🚀 GVM Backend running at http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Purchases: http://localhost:${PORT}/api/purchases`);
  console.log("");

  startEventWatcher(15000);
});
