import { execSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const STELLAR_CLI = "/Users/macbookair/.local/bin/stellar";
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const CONTRACT_ID = "CASY2CBFQ2FO722F5FLMSIUYV5RGFDP2J2N4LU7W7M6P4I7LGM6H3C2P";
const BLUEPRINTS_DIR = join(PROJECT_ROOT, "frontend/src/data/blueprints");

function getSecretKey() {
  console.log("[KEY] Fetching akun_deploy secret from Stellar CLI...");
  const output = execSync(`${STELLAR_CLI} keys show akun_deploy`, { encoding: "utf-8" });
  for (const line of output.split("\n")) {
    if (line.trim().startsWith("S")) {
      return line.trim();
    }
  }
  throw new Error("Could not extract secret key. Run: stellar keys show akun_deploy");
}

function blueprintNumericId(rawId) {
  const digits = String(rawId || "0").replace(/\D/g, "");
  return parseInt(digits, 10) % 100;
}

function loadBlueprints() {
  const entries = readdirSync(BLUEPRINTS_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && e.name.startsWith("bp-"));
  return dirs.map((d) => {
    const filePath = join(BLUEPRINTS_DIR, d.name, "metadata.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  });
}

async function fundIfNeeded(keypair) {
  const publicKey = keypair.publicKey();
  console.log(`[FUND] Checking account ${publicKey.slice(0, 12)}...`);
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (res.ok) {
      console.log("[FUND] Account exists.");
      return;
    }
  } catch {}

  console.log("[FUND] Funding via Friendbot...");
  await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  console.log("[FUND] Waiting 3s for account creation...");
  await new Promise((r) => setTimeout(r, 3000));
}

async function main() {
  // Dynamic import stellar-sdk from backend node_modules
  const { Keypair, TransactionBuilder } = await import(
    join(PROJECT_ROOT, "backend/node_modules/@stellar/stellar-sdk/dist/esm/index.js")
  );
  const ClientModule = await import(
    join(PROJECT_ROOT, "frontend/src/contracts/gvm-client/src/index.ts")
  );

  const SECRET = getSecretKey();
  const keypair = Keypair.fromSecret(SECRET);
  const publicKey = keypair.publicKey();
  console.log(`Admin: ${publicKey}`);

  await fundIfNeeded(keypair);

  const blueprints = loadBlueprints();
  console.log(`\nLoaded ${blueprints.length} blueprints\n`);

  const client = new ClientModule.Client({
    contractId: CONTRACT_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey,
  });

  let successCount = 0;
  let failCount = 0;

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
        signTransaction: async (txXdr) => {
          const tx = TransactionBuilder.fromXDR(txXdr, NETWORK_PASSPHRASE);
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
        signTransaction: async (txXdr) => {
          const tx = TransactionBuilder.fromXDR(txXdr, NETWORK_PASSPHRASE);
          tx.sign(keypair);
          return { signedTxXdr: tx.toXDR() };
        },
      });

      const verifyResult = await verifyTx.signAndSend();
      console.log(`  ✓ verify_blueprint — TX: ${verifyResult.txHash}`);
      console.log(`  ✓ NFT Link: https://stellar.expert/explorer/testnet/tx/${addResult.txHash}\n`);

      successCount++;
    } catch (e) {
      const msg = e?.message || String(e);
      console.error(`  ✗ FAILED: ${msg.slice(0, 120)}`);
      failCount++;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("══════════════════════════════════════════════");
  console.log(`Done. ${successCount} success, ${failCount} failed.`);
}

main().catch((e) => {
  console.error("FATAL:", e?.message || String(e));
  process.exit(1);
});
