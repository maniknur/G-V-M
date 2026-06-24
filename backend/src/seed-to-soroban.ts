import { execSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Client, networks } from "../../frontend/src/contracts/gvm-client/src/index";

const RPC_URL = "https://soroban-testnet.stellar.org";
const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const BLUEPRINTS_DIR = join(SCRIPT_DIR, "../../frontend/src/data/blueprints");
const RESULTS_FILE = join(SCRIPT_DIR, "../../frontend/src/data/seed-results.json");

function getSecretKey(): string {
  console.log("[KEY] Fetching akun_deploy secret from Stellar CLI...");
  const output = execSync("stellar keys show akun_deploy", { encoding: "utf-8" });
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("S")) return trimmed;
  }
  throw new Error("Could not extract secret key. Run: stellar keys show akun_deploy");
}

function blueprintNumericId(rawId: string): number {
  const digits = String(rawId || "0").replace(/\D/g, "");
  return parseInt(digits, 10) % 100;
}

function loadBlueprints(): any[] {
  const entries = readdirSync(BLUEPRINTS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("bp-"))
    .sort((a, b) => a.name.localeCompare(b.name));
  return dirs.map((d) => {
    const filePath = join(BLUEPRINTS_DIR, d.name, "metadata.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  });
}

async function fundIfNeeded(publicKey: string) {
  console.log(`[FUND] Checking account ${publicKey.slice(0, 12)}...`);
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (res.ok) {
      console.log("[FUND] Account exists.\n");
      return;
    }
  } catch {}
  console.log("[FUND] Funding via Friendbot...");
  await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  await new Promise((r) => setTimeout(r, 3000));
  console.log("[FUND] Done.\n");
}

async function main() {
  const SECRET = getSecretKey();
  const keypair = Keypair.fromSecret(SECRET);
  const publicKey = keypair.publicKey();
  console.log(`Admin: ${publicKey}\n`);

  await fundIfNeeded(publicKey);

  const client = new Client({
    contractId: networks.testnet.contractId,
    networkPassphrase: networks.testnet.networkPassphrase,
    rpcUrl: RPC_URL,
    publicKey,
  });

  console.log("[INIT] Initializing contract...");
  try {
    const initTx = await client.initialize({ admin: publicKey }, {
      signTransaction: async (txXdr: string) => {
        const tx = TransactionBuilder.fromXDR(txXdr, networks.testnet.networkPassphrase);
        tx.sign(keypair);
        return { signedTxXdr: tx.toXDR() };
      },
    });
    const initResult = await initTx.signAndSend();
    console.log(`[INIT] Contract initialized. TX: ${(initResult as any).txHash || (initResult as any).hash || "success"}\n`);
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("AlreadyInitialized")) {
      console.log("[INIT] Contract already initialized.\n");
    } else {
      console.error(`[INIT] Failed: ${msg.slice(0, 150)}\n`);
    }
  }

  const blueprints = loadBlueprints();
  console.log(`Loaded ${blueprints.length} blueprints\n`);

  let success = 0;
  let fail = 0;
  const results: { id: string; numericId: number; txHash: string }[] = [];

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const numericId = blueprintNumericId(bp.id);
    const creator = publicKey;
    const stroop = bp.metadata?.pricing?.amountInStroop || "0";
    const links = bp.folder_contents?.resource?.public_links || [];
    const ipfsHash = links[0]?.url || `ipfs://blueprints/${bp.id}`;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`[${i + 1}/${blueprints.length}] ${bp.id} — ${bp.metadata?.title}`);
    console.log(`  numericId: ${numericId} | stroop: ${stroop} | ipfs: ${ipfsHash}`);

    try {
      const addTx = await client.add_blueprint({
        creator,
        price: BigInt(stroop),
        ipfs_hash: ipfsHash,
      }, {
        signTransaction: async (txXdr: string) => {
          const tx = TransactionBuilder.fromXDR(txXdr, networks.testnet.networkPassphrase);
          tx.sign(keypair);
          return { signedTxXdr: tx.toXDR() };
        },
      });
      const addResult = await addTx.signAndSend() as any;
      const addHash = addResult?.sendTransactionResponse?.txHash
        || addResult?.txHash
        || addResult?.send?.txHash
        || addResult?.hash
        || "";
      console.log(`  ✓ add_blueprint — TX: ${addHash}`);

      const verifyTx = await client.verify_blueprint({
        admin: publicKey,
        blueprint_id: numericId,
        status: true,
      }, {
        signTransaction: async (txXdr: string) => {
          const tx = TransactionBuilder.fromXDR(txXdr, networks.testnet.networkPassphrase);
          tx.sign(keypair);
          return { signedTxXdr: tx.toXDR() };
        },
      });
      const verifyResult = await verifyTx.signAndSend() as any;
      const verifyHash = verifyResult?.sendTransactionResponse?.txHash
        || verifyResult?.txHash
        || verifyResult?.hash
        || "";
      console.log(`  ✓ verify_blueprint — TX: ${verifyHash}`);
      console.log(`  ✓ Stellar Expert: https://stellar.expert/explorer/testnet/tx/${addHash}\n`);
      success++;
      results.push({ id: bp.id, numericId, txHash: addHash });
    } catch (e: any) {
      console.error(`  ✗ FAILED: ${(e?.message || String(e)).slice(0, 150)}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2) + "\n");
  console.log(`\nSeed results saved (${results.length}/${blueprints.length} blueprints)`);

  console.log("══════════════════════════════════════════════");
  console.log(`Done. ${success} success, ${fail} failed.`);
}

main().catch((e) => {
  console.error("FATAL:", e?.message || String(e));
  process.exit(1);
});
