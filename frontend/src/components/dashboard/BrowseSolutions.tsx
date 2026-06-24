import { useState, useEffect } from "react";
import BlueprintDetailModal from "./BlueprintDetailModal";
import { isConnected, requestAccess } from "@stellar/freighter-api";
import { BLUEPRINTS } from "../../data/blueprints";
import seedResults from "../../data/seed-results.json";
import { stroopsToXlm, formatXlm } from "../../utils/xlm";
import { useSorobanContract } from "../../hooks/useSorobanContract";

function blueprintNumericId(rawId) {
  var s = String(rawId || "0");
  var digits = "";
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c >= "0" && c <= "9") digits += c;
  }
  return parseInt(digits, 10) % 100;
}

export default function BrowseSolutions({ products, handleBuy, handleBuySuccess }) {
  const [contractBlueprints, setContractBlueprints] = useState([]);
  const [fetchingOnChain, setFetchingOnChain] = useState(true);
  const [adminPublicKey, setAdminPublicKey] = useState(null);
  const { client, connect, addBlueprint } = useSorobanContract();
  const allProducts = [...contractBlueprints, ...BLUEPRINTS.filter((b) => {
    const n = Number(String(b.id || "").replace(/\D/g, "")) % 100;
    return !contractBlueprints.some((c) => c.onChainId === n);
  }), ...(products || [])];
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState("");
  const [seedLog, setSeedLog] = useState<{id: string; status: string; txHash?: string}[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFetchingOnChain(true);

        const fetched = [];
        for (let id = 0; id < 20; id++) {
          try {
            const tx = await client.get_blueprint({ blueprint_id: id });
            const bp = tx.simulate ? (await tx.simulate()).result : await tx;
            if (bp && bp.price > 0) {
              const numericId = id;
              const xlmPrice = stroopsToXlm(bp.price);
              const localBp = BLUEPRINTS.find((b) => {
                const n = Number(String(b.id || "").replace(/\D/g, "")) % 100;
                return n === numericId;
              });
              const seedEntry = seedResults.find((s) => s.numericId === numericId);
              fetched.push({
                ...(localBp || {}),
                id: localBp?.id || `onchain-${id}`,
                title: localBp?.metadata?.title || localBp?.title || `Blueprint #${id}`,
                price: xlmPrice,
                creator: String(bp.creator || ""),
                is_verified: bp.is_verified,
                ipfs_hash: String(bp.ipfs_hash || ""),
                onChainId: numericId,
                txHash: seedEntry?.txHash || null,
                metadata: {
                  ...(localBp?.metadata || {}),
                  title: localBp?.metadata?.title || String(bp.ipfs_hash || `Blueprint #${id}`),
                  creatorAddress: String(bp.creator || ""),
                  verification: { isVerified: bp.is_verified, verifiedBy: "Stellar Testnet", badge: "Blue Verified Tick" },
                  pricing: {
                    amountInXlm: xlmPrice,
                    amountInStroop: String(bp.price),
                    platformFeeBps: 500,
                    ...(localBp?.metadata?.pricing || {}),
                  },
                },
              });
            }
          } catch {
            // blueprint ID not found — skip
          }
        }

        if (!cancelled) {
          console.log(`Fetched ${fetched.length} blueprints from Stellar testnet contract`);
          setContractBlueprints(fetched);
        }
      } catch (e) {
        console.warn("Contract blueprint fetch skipped (contract may be empty):", e?.message);
      } finally {
        if (!cancelled) setFetchingOnChain(false);
      }
    })();
    return () => { cancelled = true; };
  }, [client]);

  useEffect(() => {
    (async () => {
      try {
        const conn = await isConnected();
        if (conn?.isConnected) {
          const access = await requestAccess();
          if (!access.error && access.address) {
            setAdminPublicKey(access.address);
          }
        }
      } catch {
        setAdminPublicKey(null);
      }
    })();
  }, []);

  const handleSeedAllBlueprints = async () => {
    setSeeding(true);
    setSeedLog([]);
    setSeedProgress("Connecting to wallet...");

    try {
      await connect();

      for (let i = 0; i < BLUEPRINTS.length; i++) {
        const bp = BLUEPRINTS[i];
        const numericId = blueprintNumericId(bp.id);
        const stroop = bp.metadata?.pricing?.amountInStroop || "0";
        const ipfsHash = bp.folder_contents?.resource?.public_links?.[0]?.url
          || `ipfs://blueprints/${bp.id}`;

        setSeedProgress(`Seeding ${i + 1}/${BLUEPRINTS.length}: ${bp.metadata?.title || bp.id}...`);

        try {
          const result = await addBlueprint(BigInt(stroop), ipfsHash);
          setSeedLog((prev) => [...prev, {
            id: bp.id,
            status: "success",
            txHash: String((result as any).txHash || (result as any).hash || "").slice(0, 14),
          }]);
        } catch (e: any) {
          const msg = e?.message || String(e);
          setSeedLog((prev) => [...prev, {
            id: bp.id,
            status: msg.includes("AlreadyInitialized") ? "exists" : "failed",
            txHash: msg.slice(0, 40),
          }]);
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      setSeedProgress(`Done! ${BLUEPRINTS.length} blueprints processed.`);
    } catch (e: any) {
      console.error("Seed failed:", e);
      setSeedProgress("Seed failed: " + (e?.message || String(e)));
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedProgress(""), 5000);
    }

  };

  const getWoodStyle = (idx) => {
    const styles = [
      "bg-[#dfba88] border-amber-900 text-amber-950 shadow-[inset_0_0_20px_rgba(180,83,9,0.3)]",
      "bg-[#6b4226] border-amber-950 text-amber-50 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]",
      "bg-[#e6c998] border-amber-800 text-amber-900 shadow-[inset_0_0_15px_rgba(217,119,6,0.2)]",
    ];
    return styles[idx % 3];
  };

  return (
    <div className="bg-[#fdf8ed] bg-[url('/village-bg.png')] bg-cover bg-fixed bg-center min-h-full">
      <div className="w-full max-w-7xl mx-auto flex flex-col">
        <h1 className="text-amber-900 text-2xl font-black uppercase tracking-[0.2em] text-center mb-2 drop-shadow-sm">
          OPEN-SOURCE SUSTAINABILITY BLUEPRINTS AVAILABLE
        </h1>
        {fetchingOnChain && (
          <p className="text-center text-[10px] font-medium text-amber-600/60 animate-pulse mb-2">
            Fetching live blueprint data from Stellar Testnet...
          </p>
        )}

        {!fetchingOnChain && allProducts.length === 0 && (
          <p className="text-center text-sm font-medium text-amber-700/60 mb-6">
            No blueprints available yet. Seed data to the blockchain to get started.
          </p>
        )}

        {adminPublicKey && (
          <div className="flex flex-col items-center gap-2 mb-4">
            <button
              onClick={handleSeedAllBlueprints}
              disabled={seeding}
              className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-bold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-lg border border-amber-600/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seeding ? "Seeding..." : "Seed All to Contract"}
            </button>
            {seedProgress && (
              <p className="text-[10px] font-mono text-amber-700/70 animate-pulse">{seedProgress}</p>
            )}
            {seedLog.length > 0 && (
              <div className="w-full max-w-md max-h-32 overflow-y-auto bg-amber-50/50 border border-amber-300 rounded p-2 text-[9px] font-mono">
                {seedLog.map((entry, i) => (
                  <div key={i} className={`flex justify-between gap-2 ${entry.status === "success" ? "text-emerald-700" : entry.status === "exists" ? "text-amber-600" : "text-red-600"}`}>
                    <span>{entry.id}</span>
                    <span>{entry.status === "success" ? `TX: ${entry.txHash}` : entry.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {allProducts.map((product, index) => {
          const wood = getWoodStyle(index);
          const isDark = index % 3 === 1;
          const title = product.metadata?.title || product.title;
          const price = product.metadata?.pricing?.amountInXlm ?? product.price;
          const description = product.folder_contents?.technical_documents?.description || product.description;

          return (
            <div
              key={product.id}
              onClick={() => setSelectedBlueprint(product)}
              className={`relative flex flex-col h-full rounded-xl p-5 cursor-pointer border-2 border-b-[8px] border-r-[4px] transition-all duration-300 hover:-translate-y-2 hover:rotate-1 hover:shadow-2xl ${wood}`}
            >
              {/* Title */}
              <h3 className={`font-bold text-lg leading-tight mb-3 cursor-pointer hover:underline ${isDark ? "text-amber-50" : "text-amber-950"}`}>
                {title}
              </h3>

              {/* Description */}
              {description && (
                <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isDark ? "text-amber-100/80" : "text-amber-800"}`}>
                  {description}
                </p>
              )}

              {/* Bottom row: Price + 3D Button */}
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-amber-700/20">
                <div className="flex flex-col">
                   <span className={`text-xl font-black tracking-tight flex items-baseline gap-1 ${isDark ? "text-amber-50" : "text-amber-950"}`}>
                    {formatXlm(Number(price))}
                    <span className="text-xs font-bold uppercase opacity-60">XLM</span>
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBuy(product);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg border-2 border-b-[6px] border-emerald-900 active:border-b-2 active:translate-y-[4px] transition-colors flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Buy via Escrow
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {selectedBlueprint && (
        <BlueprintDetailModal
          key={selectedBlueprint.id}
          blueprint={selectedBlueprint}
          onClose={() => setSelectedBlueprint(null)}
          onBuy={handleBuy}
          onBuySuccess={handleBuySuccess}
        />
      )}
    </div>
  );
}
