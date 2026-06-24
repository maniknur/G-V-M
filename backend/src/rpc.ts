import { rpc } from "@stellar/stellar-sdk";
import {
  storePurchase,
  hasPurchase,
} from "./db";

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID =
  "CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

interface RawEvent {
  type: string;
  contractId?: string;
  topic?: Array<{ symbol?: string }>;
  value?: {
    _value?: any;
    _arm?: string;
    val?: {
      _value?: any;
      _arm?: string;
      _attributes?: {
        _value?: any;
        _arm?: any;
      };
    };
  };
  txHash?: string;
}

function parseEventValue(raw: any): Record<string, any> {
  try {
    const attrs = raw?.val?._attributes?.val?._attributes;
    if (!attrs) return {};
    const parsed: Record<string, any> = {};
    for (let i = 0; i < attrs.length; i++) {
      const pair = attrs[i]?._attributes;
      if (pair && pair.length >= 2) {
        parsed[String(pair[0]._value)] = String(pair[1]._value);
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

export async function verifyTransaction(txHash: string): Promise<boolean> {
  try {
    const server = new rpc.Server(RPC_URL, { allowHttp: true });
    const result = await server.getTransaction(txHash);

    if (result.status !== "SUCCESS") {
      console.warn(`TX ${txHash.slice(0, 10)}... status: ${result.status}`);
      return false;
    }

    console.log(`[RPC] Transaction ${txHash.slice(0, 10)}... verified — status: SUCCESS`);
    return true;
  } catch (e) {
    console.error(`[RPC] Transaction verification failed for ${txHash.slice(0, 10)}...:`, e);
    return false;
  }
}

export async function pollContractEvents(): Promise<void> {
  try {
    const server = new rpc.Server(RPC_URL, { allowHttp: true });
    const ledgers = await server.getLatestLedger();

    const events = await server.getEvents({
      startLedger: Math.max(ledgers.sequence - 1000, 1),
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
          topics: [["*"]],
        },
      ],
      limit: 100,
    });

    console.log(
      `[RPC] Polling ${events.events?.length || 0} contract events (ledger ${ledgers.sequence})`,
    );

    if (!events.events) return;

    for (const rawEvent of events.events as RawEvent[]) {
      const topic = rawEvent.topic?.[0]?.symbol;
      const txHash = rawEvent.txHash;

      if (!txHash) continue;

      if (topic === "purchase") {
        if (hasPurchase(txHash)) continue;

        const vals = parseEventValue(rawEvent.value);
        const price = Number(vals.price_0) || Number(vals.price) || 0;
        const platformFee = Number(vals.platform_fee_0) || Number(vals.platform_fee) || 0;
        const creatorShare = Number(vals.creator_share_0) || Number(vals.creator_share) || 0;

        console.log(`[RPC] New purchase event detected: ${txHash.slice(0, 10)}...`);

        const verified = await verifyTransaction(txHash);
        if (!verified) continue;

        storePurchase({
          tx_hash: txHash,
          blueprint_id: Number(vals.blueprint_id_0) || Number(vals.blueprint_id) || 0,
          buyer: String(vals.buyer_0 || vals.buyer || ""),
          creator: String(vals.creator_0 || vals.creator || ""),
          price,
          platform_fee: platformFee,
          creator_share: creatorShare,
          verified_at: new Date().toISOString(),
          download_granted: true, // auto-grant on verified purchase
          comments: [],
        });
      }
    }
  } catch (e) {
    console.error("[RPC] Event polling failed:", e);
  }
}

export function startEventWatcher(intervalMs = 10000): NodeJS.Timeout {
  console.log(`[RPC] Starting event watcher (interval: ${intervalMs}ms)`);
  pollContractEvents(); // Initial poll
  return setInterval(pollContractEvents, intervalMs);
}
