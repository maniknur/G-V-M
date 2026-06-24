import { execSync } from "child_process";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { Keypair, Horizon } from "@stellar/stellar-sdk";
import { Client, networks } from "../../frontend/src/contracts/gvm-client/src/index";

const RPC_URL = "https://soroban-testnet.stellar.org";
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const CONTRACT_ID = networks.testnet.contractId;
const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const BLUEPRINTS_DIR = join(SCRIPT_DIR, "../../frontend/src/data/blueprints");

const MAX_TITLE_LEN = 128;
const MAX_DESC_LEN = 1024;
const MIN_XLM_BALANCE = 1;

interface BlueprintData {
  id: string;
  metadata: {
    title?: string;
    creatorAddress?: string;
    pricing?: { amountInXlm?: number; amountInStroop?: string; platformFeeBps?: number };
  };
  folder_contents?: {
    resource?: { public_links?: { title: string; url: string }[] };
    technical_documents?: { description?: string };
  };
}

interface ValidationError {
  id: string;
  field: string;
  issue: string;
  value?: string;
}

let errors: ValidationError[] = [];
let warnings: string[] = [];

function blueprintNumericId(rawId: string): number {
  const digits = String(rawId || "0").replace(/\D/g, "");
  return parseInt(digits, 10) % 100;
}

function loadBlueprints(): BlueprintData[] {
  const entries = readdirSync(BLUEPRINTS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith("bp-"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => {
      const raw = readFileSync(join(BLUEPRINTS_DIR, d.name, "metadata.json"), "utf-8");
      return JSON.parse(raw) as BlueprintData;
    });
}

function validateBlueprint(bp: BlueprintData): void {
  const id = bp.id;

  if (!bp.metadata?.title || bp.metadata.title.trim().length === 0) {
    errors.push({ id, field: "metadata.title", issue: "Title is empty" });
  } else if (bp.metadata.title.length > MAX_TITLE_LEN) {
    errors.push({ id, field: "metadata.title", issue: `Title too long (${bp.metadata.title.length} > ${MAX_TITLE_LEN})` });
  }

  const desc = bp.folder_contents?.technical_documents?.description || "";
  if (!desc || desc.trim().length === 0) {
    errors.push({ id, field: "folder_contents.technical_documents.description", issue: "Description is empty" });
  } else if (desc.length > MAX_DESC_LEN) {
    errors.push({ id, field: "description", issue: `Description too long (${desc.length} > ${MAX_DESC_LEN})` });
  }

  const stroop = bp.metadata?.pricing?.amountInStroop;
  if (!stroop) {
    errors.push({ id, field: "metadata.pricing.amountInStroop", issue: "amountInStroop is missing" });
  } else {
    try {
      const priceBig = BigInt(stroop);
      if (priceBig <= 0n) {
        errors.push({ id, field: "metadata.pricing.amountInStroop", issue: "Price must be positive", value: stroop });
      }
      if (priceBig > 2n ** 127n - 1n) {
        errors.push({ id, field: "metadata.pricing.amountInStroop", issue: "Price exceeds i128 max", value: stroop });
      }
    } catch {
      errors.push({ id, field: "metadata.pricing.amountInStroop", issue: "Cannot parse as integer", value: stroop });
    }
  }

  const links = bp.folder_contents?.resource?.public_links || [];
  if (links.length === 0) {
    warnings.push(`${id}: No public_links — will use fallback IPFS hash`);
  }
  links.forEach((link, i) => {
    try {
      new URL(link.url);
    } catch {
      errors.push({ id, field: `resource.public_links[${i}].url`, issue: "Invalid URL", value: link.url });
    }
  });

  const numericId = blueprintNumericId(id);
  if (numericId < 0 || numericId > 99) {
    errors.push({ id, field: "id", issue: `Numeric ID out of range (${numericId})` });
  }
}

async function checkAccount(publicKey: string): Promise<boolean> {
  const server = new Horizon.Server(HORIZON_URL);
  try {
    const account = await server.loadAccount(publicKey);
    const balances = account.balances;
    const native = balances.find((b) => b.asset_type === "native");
    const xlm = native ? parseFloat(native.balance) : 0;
    const seq = parseInt(account.sequence, 10);

    console.log(`\n[ACCOUNT] ${publicKey}`);
    console.log(`  Balance:   ${xlm.toFixed(2)} XLM`);
    console.log(`  Sequence:  ${seq}`);

    if (xlm < MIN_XLM_BALANCE) {
      errors.push({ id: "ACCOUNT", field: "balance", issue: `XLM balance too low (${xlm.toFixed(2)} < ${MIN_XLM_BALANCE})` });
      return false;
    }
    return true;
  } catch {
    errors.push({ id: "ACCOUNT", field: "existence", issue: "Account not found on testnet. Fund via Friendbot first." });
    return false;
  }
}

async function simulateAllBlueprints(client: Client, publicKey: string, blueprints: BlueprintData[]): Promise<number> {
  console.log("\n[SIMULATE] Running dry-run simulation for all blueprints...\n");
  let simOk = 0;
  let simFail = 0;

  for (const bp of blueprints) {
    const numericId = blueprintNumericId(bp.id);
    const stroop = bp.metadata?.pricing?.amountInStroop || "0";
    const links = bp.folder_contents?.resource?.public_links || [];
    const ipfsHash = links[0]?.url || `ipfs://blueprints/${bp.id}`;

    console.log(`  [${bp.id}] add_blueprint(${numericId}, ${stroop} stroop, ${ipfsHash.slice(0, 50)}...)`);

    try {
      const tx = await client.add_blueprint({
        creator: publicKey,
        price: BigInt(stroop),
        ipfs_hash: ipfsHash,
      });
      await tx.simulate();
      console.log(`    ✓ Simulated OK`);

      const vTx = await client.verify_blueprint({
        admin: publicKey,
        blueprint_id: numericId,
        status: true,
      });
      await vTx.simulate();
      console.log(`    ✓ Verify simulated OK`);
      simOk++;
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error(`    ✗ SIMULATION FAILED: ${msg.slice(0, 200)}`);
      errors.push({ id: bp.id, field: "simulation", issue: msg.slice(0, 150) });
      simFail++;
    }
  }

  console.log(`\n[SIMULATE] Result: ${simOk} OK, ${simFail} FAILED\n`);
  return simFail;
}

async function verifyAdminAuth(client: Client, publicKey: string): Promise<boolean> {
  console.log(`\n[AUTH] Checking admin authorization...`);
  console.log(`  Connected as Admin: ${publicKey}`);

  try {
    const tx = await client.get_admin();
    const result = tx.simulate ? (await tx.simulate()).result : await tx;
    console.log(`  Contract admin:    ${result}`);

    if (result !== publicKey) {
      errors.push({
        id: "AUTH",
        field: "admin",
        issue: `Admin mismatch! Connected: ${publicKey.slice(0, 10)}... vs Contract: ${String(result).slice(0, 10)}...`,
      });
      return false;
    }
    console.log(`  ✓ Admin matches.\n`);
    return true;
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("NotInitialized")) {
      errors.push({ id: "AUTH", field: "init", issue: "Contract not initialized. Run seed script first." });
      return false;
    }
    errors.push({ id: "AUTH", field: "get_admin", issue: msg.slice(0, 150) });
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  PRE-FLIGHT VALIDATOR — Blueprint Data Check");
  console.log("═══════════════════════════════════════════════");

  const output = execSync("stellar keys show akun_deploy", { encoding: "utf-8" });
  let secretKey = "";
  for (const line of output.split("\n")) {
    if (line.trim().startsWith("S")) { secretKey = line.trim(); break; }
  }
  if (!secretKey) {
    console.error("ERROR: Could not read akun_deploy secret key.");
    process.exit(1);
  }

  const keypair = Keypair.fromSecret(secretKey);
  const publicKey = keypair.publicKey();

  const blueprints = loadBlueprints();
  console.log(`\n[DATA] Loaded ${blueprints.length} blueprints\n`);

  console.log("[VALIDATE] Checking blueprint data...\n");
  for (const bp of blueprints) {
    validateBlueprint(bp);
  }

  if (errors.length > 0) {
    console.log("\n───────────────────────────────────────────────");
    console.log(`  ERRORS FOUND: ${errors.length}`);
    console.log("───────────────────────────────────────────────");
    for (const e of errors) {
      console.log(`  ${e.id.padEnd(10)} | ${e.field.padEnd(50)} | ${e.issue}`);
      if (e.value) console.log(`             | value: ${e.value}`);
    }
  } else {
    console.log("  ✓ All blueprint data valid.\n");
  }

  if (warnings.length > 0) {
    console.log(`  ⚠ Warnings: ${warnings.length}`);
    warnings.forEach((w) => console.log(`    - ${w}`));
    console.log();
  }

  const accountOk = await checkAccount(publicKey);

  if (!accountOk || errors.length > 0) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  VALIDATION FAILED — Fix errors above first.");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  console.log("\n[CONTRACT] Connecting to Soroban RPC...");
  const client = new Client({
    contractId: CONTRACT_ID,
    networkPassphrase: networks.testnet.networkPassphrase,
    rpcUrl: RPC_URL,
    publicKey,
  });

  const authOk = await verifyAdminAuth(client, publicKey);

  const simFails = await simulateAllBlueprints(client, publicKey, blueprints);

  console.log("═══════════════════════════════════════════════");
  if (errors.length === 0 && simFails === 0 && accountOk && authOk) {
    console.log("  ✓ ALL CHECKS PASSED — Ready to seed!");
    console.log(`  Run: cd backend && npx tsx src/seed-to-soroban.ts`);
  } else {
    console.log(`  ✗ ${errors.length} errors, ${simFails} simulation failures — Fix before seeding.`);
  }
  console.log("═══════════════════════════════════════════════");
}

main().catch((e) => {
  console.error("FATAL:", e?.message || String(e));
  process.exit(1);
});
