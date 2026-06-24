import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  Keypair,
  Horizon,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Client, networks } from "../../frontend/src/contracts/gvm-client/src";

const RPC_URL = "https://soroban-testnet.stellar.org";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET || "";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const BLUEPRINTS_DIR = join(SCRIPT_DIR, "../../frontend/src/data/blueprints");
const RESULTS_FILE = join(SCRIPT_DIR, "../../frontend/src/data/seed-results.json");

interface BlueprintJson {
  id: string;
  metadata: {
    title: string;
    creatorAddress: string;
    pricing: { amountInXlm: number; amountInStroop: string; platformFeeBps: number };
  };
  folder_contents: {
    resource: { public_links: { title: string; url: string }[] };
  };
}

function loadBlueprints(): BlueprintJson[] {
  const entries = readdirSync(BLUEPRINTS_DIR, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("bp-"))
    .sort((a, b) => a.name.localeCompare(b.name));

  return dirs.map((d) => {
    const filePath = join(BLUEPRINTS_DIR, d.name, "metadata.json");
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as BlueprintJson;
  });
}

async function fundAccountIfNeeded(publicKey: string) {
  console.log(`  Checking account ${publicKey.slice(0, 10)}... on testnet`);
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");

  try {
    await server.loadAccount(publicKey);
    console.log("  Account exists.");
  } catch (_) {
    console.log("  Account not found — funding via Friendbot...");
    const resp = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
    );
    const body = await resp.json();
    console.log("  Friendbot:", JSON.stringify(body).slice(0, 120));
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function main() {
  if (!ADMIN_SECRET) {
    console.error(
      "ERROR: ADMIN_SECRET environment variable is required.\n" +
        "Example: ADMIN_SECRET=S... tsx src/seed-blueprints.ts",
    );
    process.exit(1);
  }

  const adminKeypair = Keypair.fromSecret(ADMIN_SECRET);
  const adminPublic = adminKeypair.publicKey();
  console.log(`Admin: ${adminPublic.slice(0, 12)}...`);
  console.log("");

  await fundAccountIfNeeded(adminPublic);

  const blueprints = loadBlueprints();
  console.log(`Loaded ${blueprints.length} blueprints from ${BLUEPRINTS_DIR}\n`);

  const client = new Client({
    contractId: networks.testnet.contractId,
    networkPassphrase: networks.testnet.networkPassphrase,
    rpcUrl: RPC_URL,
    publicKey: adminPublic,
  });

  const seedResults: { id: string; numericId: number; txHash: string }[] = [];

  for (const bp of blueprints) {
    const numericId = Number(bp.id.replace(/\D/g, "")) % 100;
    const creator = adminPublic;
    const amountInStroop = BigInt(bp.metadata.pricing.amountInStroop);
    const firstLink = bp.folder_contents.resource.public_links?.[0];
    const ipfsHash = firstLink?.url ?? `ipfs://blueprints/${bp.id}`;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Blueprint: ${bp.id} | numericId: ${numericId}`);
    console.log(`  Title:    ${bp.metadata.title}`);
    console.log(`  Creator:  ${creator}`);
    console.log(`  Stroop:   ${amountInStroop.toString()} (${bp.metadata.pricing.amountInXlm} XLM)`);
    console.log(`  IPFS:     ${ipfsHash}`);

    try {
      console.log(`\n  → add_blueprint...`);
      const addTx = await client.add_blueprint({
        creator,
        price: amountInStroop,
        ipfs_hash: ipfsHash,
      }, {
        signTransaction: async (txXdr: string) => {
          const tx = TransactionBuilder.fromXDR(
            txXdr,
            networks.testnet.networkPassphrase,
          );
          tx.sign(adminKeypair);
          return { signedTxXdr: tx.toXDR() };
        },
      });

      const addResult = await addTx.signAndSend();
      const txHash = String((addResult as any).txHash || (addResult as any).hash || "");
      console.log(`  ✓ add_blueprint TX: ${txHash.slice(0, 14)}...`);

      console.log(`  → verify_blueprint (status: true)...`);
      const verifyTx = await client.verify_blueprint({
        admin: adminPublic,
        blueprint_id: numericId,
        status: true,
      }, {
        signTransaction: async (txXdr: string) => {
          const tx = TransactionBuilder.fromXDR(
            txXdr,
            networks.testnet.networkPassphrase,
          );
          tx.sign(adminKeypair);
          return { signedTxXdr: tx.toXDR() };
        },
      });

      const verifyResult = await verifyTx.signAndSend();
      console.log(`  ✓ verify_blueprint TX: ${String((verifyResult as any).txHash || (verifyResult as any).hash || "").slice(0, 14)}...`);
      console.log(`  ✓ Blueprint ${bp.id} seeded + verified.\n`);

      seedResults.push({ id: bp.id, numericId, txHash });
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(`  ✗ Failed: ${msg.slice(0, 150)}`);
      if (e?.response?.data) {
        console.error(`  Response: ${JSON.stringify(e.response.data).slice(0, 300)}`);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(seedResults, null, 2) + "\n");
  console.log(`\nSeed results saved to: ${RESULTS_FILE}`);

  console.log("══════════════════════════════════════════════");
  console.log(`Seeding complete. ${seedResults.length}/${blueprints.length} seeded.`);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || String(e));
  process.exit(1);
});
