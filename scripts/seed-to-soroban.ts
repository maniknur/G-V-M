import { execSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Client, networks } from "../../frontend/src/contracts/gvm-client/src";

const RPC_URL = "https://soroban-testnet.stellar.org";
const BLUEPRINTS_DIR = resolve(__dirname ?? new URL(".", import.meta.url).pathname, "../frontend/src/data/blueprints");

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
  const dirs = entries.filter((e) => e.isDirectory() && e.name.startsWith("bp-"));
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

  const blueprints = loadBlueprints();
  console.log(`Loaded ${blueprints.length} blueprints\n`);

  const client = new Client({
    contractId: networks.testnet.contractId,
    networkPassphrase: networks.testnet.networkPassphrase,
    rpcUrl: RPC_URL,
    publicKey,
  });

  let success = 0;
  let fail = 0;

  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    const numericId = blueprintNumericId(bp.id);
    const creator = bp.metadata?.creatorAddress || publicKey;
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
      const addResult = await addTx.signAndSend();
      console.log(`  ✓ add_blueprint — TX: ${addResult.txHash}`);

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
      const verifyResult = await verifyTx.signAndSend();
      console.log(`  ✓ verify_blueprint — TX: ${verifyResult.txHash}`);
      console.log(`  ✓ NFT Link: https://stellar.expert/explorer/testnet/tx/${addResult.txHash}\n`);
      success++;
    } catch (e: any) {
      console.error(`  ✗ FAILED: ${(e?.message || String(e)).slice(0, 150)}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("══════════════════════════════════════════════");
  console.log(`Done. ${success} success, ${fail} failed.`);
}

main().catch((e) => {
  console.error("FATAL:", e?.message || String(e));
  process.exit(1);
});
