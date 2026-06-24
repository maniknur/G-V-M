import { useState, useEffect, useMemo } from "react";
import { useSorobanContract } from "../../hooks/useSorobanContract";
import { getBlueprintById } from "../../data/blueprints";
import { stroopsToXlm } from "../../utils/xlm";
import seedResults from "../../data/seed-results.json";

const NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7KPLIBDBMECW5U67A53Y67SFF47JKRKA66OEBB6CDD";

function blueprintNumericId(rawId) {
  var s = String(rawId || "0");
  var digits = "";
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c >= "0" && c <= "9") digits += c;
  }
  return parseInt(digits, 10) % 100;
}

const MOCK_REVIEWS = [
  { id: 1001, user: "GD5FKL...H8QD", text: "Reduced our tomato field water usage from 200L/day to 60L/day. Plants are healthier too.", date: "2 days ago" },
  { id: 1002, user: "GA7BRX...V9PS", text: "Built this in Kenya! Saved me 120 USDC in chicken feed this month. Zero manual sorting.", date: "5 days ago" },
  { id: 1003, user: "GB2LHS...W6DJ", text: "Does the ramp angle need adjustment for different humidity levels? Solid build guide anyway.", date: "1 week ago" },
  { id: 1004, user: "GC4TMB...X7KL", text: "The 2D CAD schematics unlocked perfectly. Highly recommended for off-grid communities.", date: "2 weeks ago" },
  { id: 1005, user: "GH1MNY...X5BC", text: "Implemented the solar Stirling setup at our local cooperative. Mechanical shaft output is stable.", date: "3 weeks ago" },
  { id: 1006, user: "GE9KLP...Z2QR", text: "Simple tools required, built it completely in my backyard within 3 days. Phenomenal design.", date: "1 month ago" },
];

export default function BlueprintDetailModal({ blueprint, onClose, onBuy, onBuySuccess }) {
  const allComments = [...(blueprint.off_chain_interactions?.comments || []), ...MOCK_REVIEWS];
  const [comments, setComments] = useState(allComments);
  const [commentText, setCommentText] = useState("");
  const [hoveredStepIndex, setHoveredStepIndex] = useState(null);
  const [showPackageInfo, setShowPackageInfo] = useState(false);
  const [copyLabel, setCopyLabel] = useState(null);

  // MENGGUNAKAN buy_blueprint SESUAI SMART CONTRACT BARU
  const {
    loading: txLoading,
    error: txError,
    publicKey,
    client,
    connect,
    buyBlueprint, 
  } = useSorobanContract();

  const [buyHash, setBuyHash] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);
  const [onChainBp, setOnChainBp] = useState(null);
  const [onChainOwner, setOnChainOwner] = useState(null);
  const [loadingOnChain, setLoadingOnChain] = useState(!!blueprint.id);

  // Fetch real on-chain data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bid = blueprint.id
          ? blueprintNumericId(blueprint.id)
          : null;
        if (bid === null) return;

        setLoadingOnChain(true);

        try {
          const tx = await client.get_blueprint({ blueprint_id: bid });
          const bp = (await tx.simulate()).result;
          if (!cancelled && bp) setOnChainBp(bp);
        } catch {
          // blueprint not on-chain -- fall back to mock data
        }

        try {
          // Menggunakan has_access untuk memeriksa kepemilikan multi-user
          if (publicKey) {
            const hasAccess = await client.has_access({ blueprint_id: bid, user: publicKey });
            if (!cancelled && hasAccess) setOnChainOwner(publicKey);
          }
        } catch {
          // belum punya akses -- tidak masalah
        }
      } catch (e) {
        console.warn("On-chain fetch skipped:", e?.message);
      } finally {
        if (!cancelled) setLoadingOnChain(false);
      }
    })();
    return () => { cancelled = true; };
  }, [blueprint.id, publicKey]);

  const meta = blueprint.metadata || {};
  const folder = blueprint.folder_contents || {};
  const techDocs = folder.technical_documents || {};
  const guides = folder.guides || {};
  const automation = folder.core_automation || {};
  const resource = folder.resource || {};
  const publicLinks = resource.public_links || [];

  const localData = useMemo(
    () => getBlueprintById(blueprint.id) || blueprint,
    [blueprint.id, blueprint],
  );

  const displayTitle = onChainBp?.ipfs_hash
    ? `Blueprint #${blueprintNumericId(blueprint.id)}`
    : (meta.title || localData.title);
  const displayCreator = onChainBp?.creator
    ? String(onChainBp.creator).slice(0, 14) + "..."
    : (meta.creatorAddress || localData.creator);
  const displayCategory = meta.category || localData.category;
  const displayPrice = onChainBp?.price != null
    ? stroopsToXlm(onChainBp.price)
    : (meta.pricing?.amountInXlm ?? localData.price);
  const displayIsVerified = onChainBp?.is_verified ?? (meta.verification?.isVerified ?? false);
  const summary = techDocs.description || localData.description;
  const hasNewSchema = !!(blueprint.metadata || localData.metadata);
  const isOwner = !!(onChainOwner && publicKey && onChainOwner === publicKey);
  const seedTxHash = (() => {
    const nid = blueprint.id ? blueprintNumericId(blueprint.id) : -1;
    return seedResults.find((s) => s.numericId === nid)?.txHash || null;
  })();
  const bomItems = techDocs.bill_of_materials || [];
  const assemblySteps = guides.step_by_step_build || [];
  const opsMaintenance = guides.operations_maintenance || {};
  const specs = techDocs.specifications || {};

  const fullCreatorAddress = onChainBp?.creator
    ? String(onChainBp.creator)
    : (meta.creatorAddress || localData.creator);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullCreatorAddress).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel(null), 1800);
    }).catch(() => {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel(null), 1800);
    });
  };

  useEffect(() => {
    setComments([...(blueprint.off_chain_interactions?.comments || []), ...MOCK_REVIEWS]);
    setCommentText("");
    setHoveredStepIndex(null);
  }, [blueprint]);

  const stats = useMemo(() => {
    const materials = blueprint.materials || bomItems;
    const steps = blueprint.steps || assemblySteps;
    const totalCost = Array.isArray(materials) ? materials.reduce((sum, m) => {
      const num = parseFloat(m.cost) || 0;
      return sum + num;
    }, 0) : 0;
    const difficulty = steps.length <= 3 ? "Easy" : steps.length <= 5 ? "Medium" : "Advanced";
    const buildTime = steps.length <= 3 ? "1 Day" : steps.length <= 5 ? "2 Days" : "3-4 Days";
    return { totalCost: Math.round(totalCost), difficulty, buildTime };
  }, [blueprint, bomItems, assemblySteps]);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      { id: Date.now(), user: "GDYOUR...WALLET", text: commentText.trim(), date: "Just now" },
      ...prev,
    ]);
    setCommentText("");
  };

  const handleBuyOnChain = async () => {
    setPurchaseStatus(null);
    setPurchaseError(null);

    try {
      const blueprintId = blueprint.id
        ? blueprintNumericId(blueprint.id)
        : 0;

      await connect();

      // MEMANGGIL FUNGSI INTEGRASI BARU DENGAN TIMEOUT/SIGNING VIA FREIGHTER
      const result = await buyBlueprint({
        token_address: NATIVE_XLM_SAC,
        buyer: publicKey,
        blueprint_id: blueprintId
      });

      setPurchaseStatus("success");
      setBuyHash(result?.txHash || null);

      if (onBuySuccess) onBuySuccess(blueprint);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      console.error(e);
      const msg = e?.message || String(e);

      if (msg.includes("cancelled") || msg.includes("denied") || msg.includes("rejected")) {
        setPurchaseError("Transaction cancelled in wallet.");
        return;
      }

      if (msg.includes("AlreadyOwned") || msg.includes("Error(Contract, #5)")) {
        setPurchaseStatus("blocked");
        return;
      }

      setPurchaseError(msg || "Transaction failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-7xl h-[90vh] bg-[#e7cc9f] border-4 border-b-[12px] border-r-[6px] border-[#653a15] rounded-2xl flex flex-col relative text-amber-950"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Plaque */}
        <div className="w-full px-4 md:px-8 overflow-visible relative z-30 mb-12">
          <div
            className="w-full p-6 rounded-2xl border-4 border-[#1f0f05] border-b-[8px] border-r-[6px] shadow-[0_12px_24px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-visible transform scale-[1.02]"
            style={{ backgroundImage: 'linear-gradient(180deg, #5c3a1a 0%, #422812 50%, #2b1708 100%)' }}
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#3a1f08] text-white font-black text-xs flex items-center justify-center border-2 border-[#1f0f05]"
            >
              ✕
            </button>
            <h2 className="font-black text-xl md:text-2xl lg:text-3xl uppercase tracking-wider text-amber-50">
              {displayTitle}
            </h2>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-8 pt-0 flex flex-col gap-6 pb-16">
          <div className="w-full max-w-5xl mx-auto bg-[#dcc59f] p-10 rounded-sm shadow-xl relative">
            <div className="flex flex-col gap-6 font-serif">
              {/* Creator Address Section */}
              <div>
                <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Creator</h3>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[11px] text-[#472c13] bg-[#f0e2cc]/80 px-3 py-1.5 rounded border border-[#b59970] break-all">
                    {fullCreatorAddress}
                  </code>
                  <button onClick={handleCopyAddress} className="bg-[#f0e2cc] font-bold text-xs px-3 py-1.5 border rounded">
                    {copyLabel || "Copy"}
                  </button>
                </div>
              </div>

              {/* Technical Documents Content */}
              <div>
                <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Executive Summary</h3>
                <p className="text-[#472c13] leading-relaxed text-justify">{summary}</p>
              </div>

              {techDocs.problem_statement && (
                <div>
                  <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Problem Statement</h3>
                  <p className="text-[#472c13] leading-relaxed text-justify">{techDocs.problem_statement}</p>
                </div>
              )}

              {techDocs.engineering_solution && (
                <div>
                  <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Engineering Solution</h3>
                  <p className="text-[#472c13] leading-relaxed text-justify">{techDocs.engineering_solution}</p>
                </div>
              )}

              {/* Bill of Materials */}
              {bomItems.length > 0 && (
                <div>
                  <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Bill of Materials</h3>
                  <div className="bg-[#f0e2cc]/60 border border-[#b59970] rounded-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#856539] text-[#fbf7f0] font-black text-[12px]">
                          <th className="p-3">Component</th>
                          <th className="p-3 text-right">Cost (XLM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomItems.map((bom, i) => (
                          <tr key={i} className="border-b border-[#b59970]/40">
                            <td className="p-3 text-[#472c13]">{bom.name}</td>
                            <td className="p-3 text-right font-bold text-[#5c3a1a]">{bom.cost_xlm} XLM</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Footer */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#653a15] px-8 flex items-center justify-between z-30">
          <span className="text-xl font-extrabold text-white">
            {typeof displayPrice === "number" ? displayPrice.toFixed(2) : displayPrice} XLM
          </span>

          <div className="flex items-center gap-2">
            {purchaseStatus === "blocked" && <div className="text-xs text-red-300">You already own this blueprint!</div>}
            {purchaseStatus === "success" && <div className="text-xs text-green-300">Purchase Confirmed!</div>}
            {purchaseError && <div className="text-xs text-amber-300">{purchaseError}</div>}

            <button
              onClick={handleBuyOnChain}
              disabled={txLoading || isOwner || loadingOnChain}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs px-5 py-2.5 rounded-xl disabled:opacity-50"
            >
              {isOwner ? "✓ Already Owned" : txLoading ? "Processing..." : "Buy via Escrow"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}