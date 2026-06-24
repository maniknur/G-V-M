const HORIZON_URL = "https://horizon-testnet.stellar.org";

export const NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7KPLIBDBMECW5U67A53Y67SFF47JKRKA66OEBB6CDD";

export const TARGET_ASSET_CODE = "TUSDC";
export let TARGET_ASSET_ISSUER =
  "CDLZFC3SYJYDZT7K67VZ67QJ6RY6UTJGNHFYK4BWHPFHEQ2SL3TKSYNJ";

/**
 * Fetch the native XLM balance for a Stellar account via the Soroban Native SAC.
 * Uses token.balance() on the native SAC contract — consistent with how the
 * smart contract sees XLM balances during buy_blueprint_nft transfers.
 * Returns formatted string like "974.99" (XLM) or "0.00" on unfunded accounts.
 */
export async function fetchNativeBalance(
  address: string,
): Promise<string> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) {
      console.warn(`Horizon ${res.status}: account may be unfunded`);
      return "0.00";
    }

    const data = await res.json();
    const native = data.balances?.find(
      (b: any) => b.asset_type === "native",
    );

    if (native) {
      const xlm = Number(native.balance).toFixed(2);
      console.log(`[Balance] Native XLM: ${xlm} XLM`);
      return xlm;
    }

    return "0.00";
  } catch (e) {
    console.error("fetchNativeBalance failed:", e);
    return "0.00";
  }
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
}

export interface AssetBalance {
  assetCode: string;
  issuer: string;
  balance: number;
  limit: string;
}

/**
 * Fetch and parse all custom asset balances for a Stellar account.
 * Prints every balance from Horizon before filtering.
 */
export async function fetchAllBalances(
  address: string,
): Promise<AssetBalance[] | null> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) {
      console.error(`Horizon ${res.status}: account may not be funded`);
      return null;
    }

    const data = await res.json();
    const balances: HorizonBalance[] = data.balances || [];

    console.group("fetchAllBalances — raw balances from Horizon");
    if (balances.length === 0) {
      console.warn("No balances found on this account");
    } else {
      balances.forEach((b, i) => {
        console.log(`[${i}]`, {
          asset_type: b.asset_type,
          asset_code: b.asset_code || "(native)",
          asset_issuer: b.asset_issuer || "(native)",
          balance: b.balance,
          limit: b.limit || "n/a",
        });
      });
    }
    console.groupEnd();

    const customAssets: AssetBalance[] = balances
      .filter(
        (b) => b.asset_type === "credit_alphanum4" && b.asset_code,
      )
      .map((b) => ({
        assetCode: b.asset_code!,
        issuer: b.asset_issuer || "unknown",
        balance: Number(b.balance),
        limit: b.limit || "0",
      }));

    console.log("Parsed custom assets:", customAssets);
    return customAssets;
  } catch (e) {
    console.error("fetchAllBalances failed:", e);
    return null;
  }
}

/**
 * Fetch the balance for the target asset (TUSDC).
 * Auto-detects issuer if it doesn't match the hardcoded constant.
 */
export async function fetchTargetBalance(
  address: string,
): Promise<number | null> {
  const assets = await fetchAllBalances(address);
  if (!assets || assets.length === 0) return null;

  const matches = assets.filter(
    (a) => a.assetCode === TARGET_ASSET_CODE,
  );

  if (matches.length === 0) {
    console.warn(
      `No ${TARGET_ASSET_CODE} trustline found for any issuer on this account`,
    );
    return null;
  }

  console.log(
    `Found ${matches.length} ${TARGET_ASSET_CODE} trustline(s):`,
    matches.map((m) => ({
      issuer: m.issuer,
      balance: m.balance,
      limit: m.limit,
    })),
  );

  const exact = matches.find((m) => m.issuer === TARGET_ASSET_ISSUER);
  if (exact) {
    console.log(
      `Match! Known issuer ${TARGET_ASSET_ISSUER} → balance: ${exact.balance}`,
    );
    return exact.balance;
  }

  const fallback = matches[0];
  console.warn(
    `ISSUER MISMATCH — expected: ${TARGET_ASSET_ISSUER}`,
  );
  console.warn(
    `                 found: ${fallback.issuer}`,
  );
  console.log("Auto-detecting issuer and updating reference...");
  TARGET_ASSET_ISSUER = fallback.issuer;
  return fallback.balance;
}
