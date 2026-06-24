import { useState, useEffect, useMemo } from "react";
import { useSorobanContract } from "../../hooks/useSorobanContract";
import { isConnected, getAddress, signTransaction } from "@stellar/freighter-api";
import { Client, networks } from "../../contracts/gvm-client/src";
import { getBlueprintById } from "../../data/blueprints";
import { stroopsToXlm } from "../../utils/xlm";
import seedResults from "../../data/seed-results.json";

const RPC_URL = "https://soroban-testnet.stellar.org";
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

  const {
    loading: txLoading,
    error: txError,
    publicKey,
    connect,
    buyBlueprintNft,
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
        const client = new Client({
          contractId: networks.testnet.contractId,
          networkPassphrase: networks.testnet.networkPassphrase,
          rpcUrl: RPC_URL,
          publicKey: undefined,
        });

        try {
          const tx = await client.get_blueprint({ blueprint_id: bid });
          const bp = (await tx.simulate()).result;
          if (!cancelled && bp) setOnChainBp(bp);
        } catch {
          // blueprint not on-chain -- fall back to mock data
        }

        try {
          const txO = await client.get_owner({ blueprint_id: bid });
          const owner = (await txO.simulate()).result;
          if (!cancelled && owner) setOnChainOwner(owner);
        } catch {
          // no owner yet -- not purchased
        }
      } catch (e) {
        console.warn("On-chain fetch skipped:", e?.message);
      } finally {
        if (!cancelled) setLoadingOnChain(false);
      }
    })();
    return () => { cancelled = true; };
  }, [blueprint.id]);

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
    const roiMonths = Math.max(1, Math.min(4, Math.ceil((displayPrice || 45) / 25)));
    const laborSaved = steps.length <= 3 ? "12 hours" : steps.length <= 5 ? "18 hours" : "24 hours";
    return { totalCost: Math.round(totalCost), difficulty, buildTime, roiMonths, laborSaved };
  }, [blueprint, bomItems, assemblySteps, displayPrice]);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      { id: Date.now(), user: "GDYOUR...WALLET", text: commentText.trim(), date: "Just now" },
      ...prev,
    ]);
    setCommentText("");
  };

  const handleBuyAndClose = () => {
    onBuy(blueprint);
    onClose();
  };

  const handleBuyOnChain = async () => {
    setPurchaseStatus(null);
    setPurchaseError(null);

    try {
      const connected = await isConnected();
      if (!connected || !connected.isConnected) {
        setPurchaseError("Please install or unlock Freighter Wallet.");
        return;
      }

      const { address } = await getAddress();
      const blueprintId = blueprint.id
        ? blueprintNumericId(blueprint.id)
        : 0;

      console.log("[handleBuyOnChain] address:", address);
      console.log("[handleBuyOnChain] rawBlueprintId:", blueprint.id, "→ numericId:", blueprintId, "type:", typeof blueprintId);
      console.log("[handleBuyOnChain] token_address:", NATIVE_XLM_SAC);

      const client = new Client({
        contractId: networks.testnet.contractId,
        networkPassphrase: networks.testnet.networkPassphrase,
        rpcUrl: RPC_URL,
        publicKey: address,
      });

      const tx = await client.buy_blueprint_nft(
        {
          token_address: NATIVE_XLM_SAC,
          buyer: address,
          blueprint_id: blueprintId,
        },
        {
          signTransaction: async (txXdr) => {
            console.log("[handleBuyOnChain] TX XDR (pre-sign):", txXdr);
            const signed = await signTransaction(txXdr, {
              networkPassphrase: networks.testnet.networkPassphrase,
              address,
            });
            return signed.signedTxXdr;
          },
        },
      );

      const rawTx = tx.toXDR();
      console.log("[handleBuyOnChain] TX XDR (post-build):", rawTx);

      const result = await tx.signAndSend();

      console.log("[handleBuyOnChain] TX confirmed:", result);
      setPurchaseStatus("success");
      setBuyHash(result.txHash || null);

      if (onBuySuccess) onBuySuccess(blueprint);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e) {
      console.error("=== handleBuyOnChain ERROR ===");
      console.error("e:", e);
      console.log("e.constructor.name:", e?.constructor?.name);
      console.log("e.message:", e?.message);
      console.log("e.stack:", e?.stack);

      try {
        const dump = {};
        for (const k of Object.getOwnPropertyNames(e)) {
          try { dump[k] = e[k]; } catch (_) { dump[k] = "<unreadable>"; }
        }
        console.log("e own properties:", dump);
      } catch (_) {}

      if (e?.response) {
        console.log("e.response:", e.response);
        console.log("e.response.status:", e.response.status);
        console.log("e.response.statusText:", e.response.statusText);
        try {
          console.log("e.response.data:", e.response.data);
        } catch (_) {}
      }

      const resultCodes = e?.response?.data?.extras?.result_codes;
      if (resultCodes) {
        console.log("result_codes:", resultCodes);
        const codes = resultCodes.transaction || resultCodes.operations || [];
        const friendly = Array.isArray(codes) ? codes.join(", ") : String(codes);
        setPurchaseError(`Stellar error: ${friendly}`);
        return;
      }

      const msg = e?.message || String(e);

      if (
        msg.includes("cancelled") ||
        msg.includes("denied") ||
        msg.includes("rejected")
      ) {
        setPurchaseError("Transaction cancelled in wallet.");
        return;
      }

      if (
        msg.includes("AlreadyOwned") ||
        msg.includes("Already owned") ||
        msg.includes("already own") ||
        msg.includes("Error(Contract, #6)")
      ) {
        setPurchaseStatus("blocked");
        return;
      }

      const errorTexts = [];
      if (msg.includes("Error(Contract, #1)")) errorTexts.push("Contract error: Not Initialized");
      else if (msg.includes("Error(Contract, #2)")) errorTexts.push("Contract error: Blueprint Not Found");
      else if (msg.includes("Error(Contract, #3)")) errorTexts.push("Contract error: Unauthorized");
      else if (msg.includes("Error(Contract, #4)")) errorTexts.push("Contract error: No Owner Recorded");
      else if (msg.includes("Error(Contract, #5)")) errorTexts.push("Contract error: Invalid Price");
      else if (msg.includes("Error(Contract, #7)")) errorTexts.push("Contract error: Already Initialized");

      if (msg.includes("tx_insufficient_fee")) errorTexts.push("Insufficient fee — increase gas or bump fee");
      if (msg.includes("tx_insufficient_balance")) errorTexts.push("Insufficient XLM balance to cover fee + amount");
      if (msg.includes("tx_bad_seq")) errorTexts.push("Bad sequence number — nonce mismatch");
      if (msg.includes("tx_bad_auth")) errorTexts.push("Bad auth — signature rejected");
      if (msg.includes("tx_too_early")) errorTexts.push("TimeBounds too early");
      if (msg.includes("tx_too_late")) errorTexts.push("TimeBounds expired");
      if (msg.includes("host")) errorTexts.push(`Host error: ${msg.slice(msg.indexOf("host")).slice(0, 120)}`);
      if (msg.includes("simulation")) errorTexts.push("Simulation failed — check contract state & inputs");

      const fallback = errorTexts.length > 0 ? errorTexts.join(" | ") : "Transaction failed. See console for details.";
      setPurchaseError(fallback);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-7xl h-[90vh] bg-[#e7cc9f] border-4 border-b-[12px] border-r-[6px] border-[#653a15] rounded-2xl flex flex-col relative text-amber-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full px-4 md:px-8 overflow-visible relative z-30 mb-12">

          {/* 3D WOODEN PLANK PLAQUE */}
          <div
            className="w-full p-6 rounded-2xl border-4 border-[#1f0f05] border-b-[8px] border-r-[6px] shadow-[0_12px_24px_rgba(0,0,0,0.5),inset_0_4px_0_rgba(255,255,255,0.15),inset_0_-6px_12px_rgba(0,0,0,0.5)] flex flex-col items-center text-center relative overflow-visible transform scale-[1.02] z-40 transition-transform duration-300 hover:scale-[1.04]"
            style={{ backgroundImage: 'linear-gradient(90deg, rgba(166,124,70,0.12) 0%, rgba(0,0,0,0) 25%, rgba(166,124,70,0.08) 60%, rgba(0,0,0,0.3) 100%), linear-gradient(180deg, #5c3a1a 0%, #422812 50%, #2b1708 100%)' }}
          >

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#3a1f08] hover:bg-[#522f11] active:bg-[#251304] text-amber-100/80 hover:text-white font-black text-xs flex items-center justify-center border-2 border-[#1f0f05] border-b-4 border-r-2 shadow-lg transition-all hover:scale-110 active:translate-y-[2px] active:border-b-2 z-50 cursor-pointer"
              aria-label="Close Modal"
            >
              -
            </button>

            {/* Iron Nails */}
            <div className="absolute top-3 left-4 w-3 h-3 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 border border-stone-950 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-[6px] text-stone-950 font-black">-</div>
            <div className="absolute top-3 right-4 w-3 h-3 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 border border-stone-950 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-[6px] text-stone-950 font-black">-</div>
            <div className="absolute bottom-3 left-4 w-3 h-3 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 border border-stone-950 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-[6px] text-stone-950 font-black">-</div>
            <div className="absolute bottom-3 right-4 w-3 h-3 rounded-full bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800 border border-stone-950 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-[6px] text-stone-950 font-black">-</div>

            {/* Surface Cracks */}
            <div className="absolute top-0 left-1/4 w-[2px] h-3 bg-black/40 shadow-[1px_0_0_rgba(255,255,255,0.05)] opacity-60"></div>
            <div className="absolute bottom-0 right-1/3 w-[1px] h-4 bg-black/50 shadow-[1px_0_0_rgba(255,255,255,0.05)] opacity-50 rotate-12"></div>

            <h2 className="font-black text-xl md:text-2xl lg:text-3xl uppercase tracking-wider text-amber-50 drop-shadow-[0_3px_4px_rgba(0,0,0,0.7)]">
              {displayTitle}
            </h2>

            <div className="flex flex-row flex-wrap items-center justify-center gap-2 w-full mt-2">
              {displayCategory && (
                <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 font-black text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full">
                  {displayCategory}
                </span>
              )}

              {seedTxHash ? (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${seedTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[9px] text-emerald-200/80 tracking-wider bg-emerald-600/20 hover:bg-emerald-600/30 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors truncate max-w-[180px]"
                >
                  &#10003; NFT: {seedTxHash.slice(0, 12)}...
                </a>
              ) : (
                <span className="font-mono text-[9px] text-amber-200/30 tracking-wider bg-black/10 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                  Pending on Chain
                </span>
              )}

              {displayIsVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/30 border border-emerald-400/40 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  &#10003; Verified
                </span>
              )}

              {isOwner && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                  &#128274; You Own This
                </span>
              )}
            </div>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-0 flex flex-col gap-6 pb-16">

          {/* =================================================================== */}
          {/* ANCESTRAL PARCHMENT SCROLL VIEWPORT */}
          {/* =================================================================== */}
          <div className="w-full px-4 md:px-8 overflow-visible relative flex justify-center items-center">

            {/* Left Ambient: Animated Frog */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-14 h-14 z-0 pointer-events-none opacity-80 animate-bounce transition-all duration-1000 text-2xl filter drop-shadow-[0_8px_4px_rgba(0,0,0,0.15)] hidden lg:block">
              -
            </div>

            {/* Right Ambient: Waterfall Droplets */}
            <div className="absolute -right-12 top-0 bottom-0 w-8 z-0 pointer-events-none opacity-40 flex flex-col justify-between items-center text-emerald-400 font-mono text-[10px] select-none animate-pulse hidden lg:block">
              <div className="animate-bounce">-</div>
              <div className="animate-ping delay-200">-</div>
              <div className="animate-bounce delay-500">-</div>
              <div className="animate-ping delay-700">-</div>
            </div>

            {/* MAIN ANCIENT SCROLL */}
            <div className="w-full max-w-5xl mx-auto bg-[#dcc59f] text-[#3e230c] mt-32 p-10 rounded-sm relative shadow-[0_25px_55px_rgba(40,20,5,0.45)] border-y-4 border-[#9a7846] animate-fade-in transition-transform duration-500 hover:scale-[1.01] overflow-hidden group">

              {/* Left Torn Edge */}
              <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/10 via-transparent to-transparent pointer-events-none shadow-[inset_4px_0_4px_rgba(0,0,0,0.1)] border-l-2 border-dashed border-[#9a7846]/10"></div>
              {/* Right Torn Edge */}
              <div className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-l from-black/10 via-transparent to-transparent pointer-events-none shadow-[inset_-4px_0_4px_rgba(0,0,0,0.1)] border-r-2 border-dashed border-[#9a7846]/10"></div>
              {/* Center Crumpled Crease */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.08) 100%)" }}></div>

              {/* PARCHMENT CONTENT */}
              <div className="relative z-10 flex flex-col gap-6 font-serif border border-[#9a7846]/15 rounded-lg p-5 bg-[#e8d5b0]/30">

                {/* Creator Details */}
                <div>
                  <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Creator</h3>
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <code className="font-mono text-[11px] text-[#472c13] bg-[#f0e2cc]/80 px-3 py-1.5 rounded border border-[#b59970] select-all break-all">
                        {fullCreatorAddress}
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="shrink-0 font-black text-[10px] uppercase tracking-widest text-[#856539] hover:text-[#5c3a1a] bg-[#f0e2cc] hover:bg-[#e4ca9a] border-2 border-b-4 border-[#b59970] active:border-b-2 active:translate-y-[2px] px-3 py-1.5 rounded transition-all"
                        aria-label="Copy creator address"
                      >
                        {copyLabel || "Copy"}
                      </button>
                      {seedTxHash && (
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${seedTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-blue-500 hover:underline text-xs font-medium"
                        >
                          View on-chain
                        </a>
                      )}
                    </div>
                  </div>
                  {blueprint.txHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${blueprint.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      View on Stellar Expert
                    </a>
                  )}
                </div>

                {/* Old-schema content (backward-compatible) */}
                {!hasNewSchema && (
                  <>
                    <div>
                      <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Problem Statement</h3>
                      <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{blueprint.problem}</p>
                    </div>

                    <div>
                      <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Engineering Solution</h3>
                      <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{blueprint.solution}</p>
                    </div>

                    <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify italic text-[#5c3a1a]">{summary}</p>
                  </>
                )}

                {/* New-schema content */}
                {hasNewSchema && (
                  <>
                    {/* Executive Summary */}
                    <div>
                      <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Executive Summary</h3>
                      <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{summary}</p>
                    </div>

                    {/* Public Resources & References */}
                    {publicLinks.length > 0 && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Public Resources</h3>
                        <div className="flex flex-col gap-2">
                          {publicLinks.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-mono text-[#856539] bg-[#f0e2cc]/80 px-3 py-1.5 rounded border border-[#b59970] hover:bg-[#e4ca9a] hover:text-[#5c3a1a] transition-colors truncate"
                            >
                              &#128279; {link.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specifications */}
                    {specs.dimensions && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Technical Specifications</h3>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          {Object.entries(specs).map(([key, val]) => (
                            <div key={key} className="bg-[#f0e2cc]/60 px-3 py-1.5 rounded border border-[#b59970]/50">
                              <span className="font-black uppercase text-[#5c3a1a] text-[10px]">{key.replace(/_/g, " ")}</span>
                              <p className="text-[#472c13] font-medium text-[12px] mt-0.5 break-all">{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Core Automation */}
                    {automation.logic_description && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Core Automation Logic</h3>
                        <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{automation.logic_description}</p>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {automation.wiring_diagram && (
                            <span className="text-[11px] font-mono text-[#856539] bg-[#f0e2cc] px-3 py-1 rounded border border-[#b59970]">
                              &#9881; Wiring: {automation.wiring_diagram}
                            </span>
                          )}
                          {automation.source_code_repository && (
                            <a href={automation.source_code_repository} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-blue-800 bg-blue-100 px-3 py-1 rounded border border-blue-300 hover:underline">
                              &#128187; Source Code Repo
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Operations & Maintenance */}
                    {opsMaintenance.initial_setup && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Operations &amp; Maintenance</h3>
                        <div className="flex flex-col gap-3 text-[15px]">
                          <div>
                            <span className="font-black text-[#5c3a1a] text-[11px] uppercase">Initial Setup:</span>
                            <p className="text-[#472c13] font-medium mt-0.5">{opsMaintenance.initial_setup}</p>
                          </div>
                          {opsMaintenance.sensor_care && (
                            <div>
                              <span className="font-black text-[#5c3a1a] text-[11px] uppercase">Sensor Care:</span>
                              <p className="text-[#472c13] font-medium mt-0.5">{opsMaintenance.sensor_care}</p>
                            </div>
                          )}
                          {opsMaintenance.troubleshooting && (
                            <div>
                              <span className="font-black text-[#5c3a1a] text-[11px] uppercase">Troubleshooting:</span>
                              <p className="text-[#472c13] font-medium mt-0.5">{opsMaintenance.troubleshooting}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Problem & Solution */}
                    {techDocs.problem_statement && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Problem Statement</h3>
                        <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{techDocs.problem_statement}</p>
                      </div>
                    )}
                    {techDocs.engineering_solution && (
                      <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Engineering Solution</h3>
                        <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify text-[#472c13]">{techDocs.engineering_solution}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Description (shared) */}
                {!hasNewSchema && blueprint.description && (
                  <p className="text-[15px] md:text-base font-medium leading-relaxed text-justify italic text-[#5c3a1a]">{summary}</p>
                )}

                {/* Bill of Materials */}
                {(blueprint.materials?.length > 0 || bomItems.length > 0) && (
                <div>
                  <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Bill of Materials</h3>
                  <div className="bg-[#f0e2cc]/60 border border-[#b59970] rounded-lg shadow-inner overflow-hidden">
                    {bomItems.length > 0 ? (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#856539]">
                            <th className="text-[#fbf7f0] font-black text-[12px] p-3.5 uppercase tracking-wider text-left">Component</th>
                            <th className="text-[#fbf7f0] font-black text-[12px] p-3.5 uppercase tracking-wider text-right">Cost (XLM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomItems.map((bom, i) => (
                            <tr key={i} className="border-b border-[#b59970]/40 last:border-b-0 hover:bg-[#dcc59f]/30 transition-colors">
                              <td className="p-3.5 text-[13px] font-medium text-[#472c13] tracking-wide">{bom.name}</td>
                              <td className="p-3.5 text-[13px] font-bold text-[#5c3a1a] text-right uppercase tracking-wider">{bom.cost_xlm} XLM</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-[#856539]">
                            <th className="text-[#fbf7f0] font-black text-[12px] p-3.5 uppercase tracking-wider text-left">Component</th>
                            <th className="text-[#fbf7f0] font-black text-[12px] p-3.5 uppercase tracking-wider text-right">Est. Cost (XLM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blueprint.materials.map((mat, i) => (
                            <tr key={i} className="border-b border-[#b59970]/40 last:border-b-0 hover:bg-[#dcc59f]/30 transition-colors">
                              <td className="p-3.5 text-[13px] font-medium text-[#472c13] tracking-wide">{mat.name}</td>
                              <td className="p-3.5 text-[13px] font-bold text-[#5c3a1a] text-right uppercase tracking-wider">{mat.cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                )}
              </div>

            {/* Steps */}
            <div className="mt-4">
              <h3 className="font-black text-base uppercase tracking-widest text-[#5c3a1a] border-b-2 border-[#5c3a1a]/20 pb-1 mb-2">Step-by-Step Build Guide</h3>
              <div className="relative flex flex-col gap-0">
                <div className="absolute top-0 left-[13px] w-0.5 h-full bg-emerald-800/10 border-l-2 border-dashed border-emerald-600/15 -z-0 pointer-events-none" />

                {(blueprint.steps?.length > 0 ? blueprint.steps : assemblySteps).map((step, i) => (
                  <div
                    key={i}
                    className="relative flex items-start gap-4 pb-5 last:pb-0 group"
                    onMouseEnter={() => setHoveredStepIndex(i)}
                    onMouseLeave={() => setHoveredStepIndex(null)}
                  >
                    <span className="w-11 h-11 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center border-4 border-[#dcc59f] shadow-md cursor-pointer transition-all duration-300 ease-out hover:scale-115 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.8)] hover:-translate-y-0.5 active:scale-95 relative z-10 shrink-0 mt-0.5">{i + 1}</span>

                    <p className={`text-[15px] leading-relaxed break-words pt-1.5 transition-colors duration-300 ${hoveredStepIndex === i ? "text-[#3e230c] font-bold" : "text-[#472c13] font-medium"}`}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact */}
            <div className="bg-[#faf6ee] border-2 border-b-4 border-[#cbbca3] p-6 rounded-2xl flex flex-col gap-3 shadow-sm mt-4">
              <h3 className="text-amber-950 font-black text-sm uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] text-center">Real-World Impact</h3>
              <p className="text-[#4a2e15] font-semibold text-[14px] leading-relaxed text-center mt-1">
                By deploying this high-efficiency system, communities can directly accelerate their sustainable development goals. This blueprint is designed to heavily cut down operational overhead, saving critical labor hours each week while optimizing resource management. Engineered for long-term endurance, its climate-positive infrastructure guarantees a zero-emission environmental footprint, making it a reliable asset for off-grid self-sufficiency and immediate economic payback.
              </p>
            </div>

            {/* Community Reviews */}
            <div className="flex flex-col gap-3 mt-4">
              <h4 className="font-black text-[15px] uppercase tracking-widest text-[#5c3a1a] text-center">
                Community Reviews ({comments.length})
              </h4>

              <div className="w-full max-h-[250px] overflow-y-auto pr-2 flex flex-col items-center gap-4">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="w-fit min-w-[280px] max-w-xl md:max-w-2xl mx-auto bg-[#6e482b] border-2 border-[#4f311a] border-t-[4px] border-[#382110] p-4 rounded-xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)] flex flex-col gap-2 transition-all hover:bg-[#774f30] whitespace-normal break-words"
                  >
                    <div className="flex justify-between items-center gap-8 border-b border-[#54351d] pb-1">
                      <span className="text-amber-400 font-mono text-[11px] font-bold tracking-wider">{c.user}</span>
                      <span className="text-amber-200/40 text-[10px] font-semibold shrink-0">{c.date}</span>
                    </div>
                    <p className="text-amber-50/90 text-[13px] leading-relaxed font-medium text-center md:text-left">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Share your build experience..." rows={2} className="w-full bg-[#f4ebd8] border-2 border-[#8b5a2b] rounded-lg p-3 text-xs placeholder:text-[#a68a61] focus:outline-none resize-none" />
                <div className="flex justify-end">
                  <button onClick={handlePostComment} className="bg-[#5c3612] hover:bg-[#78481e] text-amber-100 text-xs font-bold px-4 py-2 rounded-lg border-2 border-b-4 border-[#3e2723] active:border-b-2 active:translate-y-[2px] transition-all">Post Comment</button>
                </div>
              </div>
            </div>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#653a15] border-t-4 border-[#43250c] px-4 flex items-center justify-between z-30 shadow-[0_-8px_16px_rgba(0,0,0,0.3)]">
          <div className="flex items-center">
            <div className="relative inline-flex items-baseline px-2 py-0.5 ml-8">
              <div className="absolute inset-0 bg-yellow-500/40 blur-md rounded-full pointer-events-none"></div>
              <span className="relative z-10 text-xl font-extrabold tracking-tight text-black drop-shadow-sm">
                {displayPrice.toFixed(2)}
                <span className="ml-2 text-sm font-bold uppercase tracking-widest"> XLM</span>
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 relative">
            {showPackageInfo && (
              <div className="absolute bottom-full mb-4 right-0 w-80 bg-[#f4ebd8] border-4 border-[#8b5a2b] rounded-2xl p-4 shadow-2xl z-50 text-[#3e2723]">
                <div className="flex justify-between items-center border-b-2 border-[#8b5a2b]/30 pb-2 mb-3">
                  <h5 className="font-black text-xs uppercase tracking-wider">Blueprint Deliverables</h5>
                  <button onClick={() => setShowPackageInfo(false)} className="text-stone-500 hover:text-stone-800 font-bold text-xs">&#10005;</button>
                </div>
                <ul className="flex flex-col gap-2.5 text-xs font-semibold">
                  {hasNewSchema ? (
                    <>
                      {publicLinks.length > 0 && <li className="flex items-center gap-2 text-emerald-800">&#10003; {publicLinks.length} Public Reference Link{publicLinks.length > 1 ? 's' : ''}</li>}
                      {automation.wiring_diagram && <li className="flex items-center gap-2 text-emerald-800">&#10003; Wiring Schematic Diagram</li>}
                      {specs.cad_files_link && <li className="flex items-center gap-2 text-emerald-800">&#10003; CAD Files (.step)</li>}
                      {automation.source_code_repository && <li className="flex items-center gap-2 text-emerald-800">&#10003; Source Code Repository</li>}
                      <li className="flex items-center gap-2 text-emerald-800">&#10003; 1-on-1 Telegram Support Access</li>
                      <li className="flex items-center gap-2 text-amber-700 text-[10px] mt-1 border-t border-[#8b5a2b]/30 pt-2">
                        Platform fee: {meta.pricing?.platformFeeBps} bps ({(meta.pricing?.platformFeeBps / 100).toFixed(1)}%)
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2 text-emerald-800">&#10003; Complete 2D CAD Schematics (.dwg)</li>
                      <li className="flex items-center gap-2 text-emerald-800">&#10003; 40-Minute Assembly Tutorial Video</li>
                      <li className="flex items-center gap-2 text-emerald-800">&#10003; Dynamic BOM Calculator (Excel)</li>
                      <li className="flex items-center gap-2 text-emerald-800">&#10003; 1-on-1 Telegram Support Access</li>
                    </>
                  )}
                </ul>
                <div className="absolute top-full right-4 border-[8px] border-transparent border-t-[#8b5a2b]"></div>
              </div>
            )}

            <button onClick={() => setShowPackageInfo(!showPackageInfo)} className="bg-[#966432] hover:bg-[#b07d47] text-amber-100 p-2.5 rounded-xl border-2 border-b-4 border-[#523315] active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center cursor-pointer text-sm" aria-label="Package Info">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </button>

            {purchaseStatus === "blocked" && (
              <div className="absolute bottom-full right-0 mb-3 w-72 bg-[#f3d3d3] border-2 border-[#b85c5c] border-b-[6px] border-r-[4px] border-[#913d3d] rounded-2xl p-4 shadow-lg z-50">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">&#128683;</span>
                  <div>
                    <h5 className="font-black text-[11px] uppercase tracking-wider text-rose-900 mb-1">Purchase Blocked</h5>
                    <p className="text-[11px] font-semibold text-rose-800 leading-relaxed">
                      You already own this blueprint! Soroban escrow rejected the duplicate purchase at the contract level.
                    </p>
                  </div>
                  <button onClick={() => setPurchaseStatus(null)} className="ml-auto text-rose-700 hover:text-rose-900 font-bold text-xs">&#10005;</button>
                </div>
              </div>
            )}

            {purchaseStatus === "success" && (
              <div className="absolute bottom-full right-0 mb-3 w-72 bg-[#d2edd5] border-2 border-[#5c995c] border-b-[6px] border-r-[4px] border-[#3d6e3d] rounded-2xl p-4 shadow-lg z-50 animate-bounce">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">&#9989;</span>
                  <div>
                    <h5 className="font-black text-[11px] uppercase tracking-wider text-emerald-900 mb-1">Purchase Confirmed</h5>
                    <p className="text-[11px] font-semibold text-emerald-800 leading-relaxed">
                      5% platform fee sent. 95% sent to creator. NFT ownership transferred on-chain.
                    </p>
                    {buyHash && (
                      <p className="text-[9px] font-mono text-emerald-700 mt-1 truncate">
                        TX: {String(buyHash).slice(0, 16)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {purchaseError && (
              <div className="absolute bottom-full right-0 mb-3 w-72 bg-[#fef3c7] border-2 border-[#d97706] border-b-[6px] border-r-[4px] border-[#b45309] rounded-2xl p-4 shadow-lg z-50">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">&#9888;</span>
                  <div>
                    <h5 className="font-black text-[11px] uppercase tracking-wider text-amber-900 mb-1">Transaction Issue</h5>
                    <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">{purchaseError}</p>
                  </div>
                  <button onClick={() => setPurchaseError(null)} className="ml-auto text-amber-700 hover:text-amber-900 font-bold text-xs">&#10005;</button>
                </div>
              </div>
            )}

            <button
              onClick={handleBuyOnChain}
              disabled={txLoading || isOwner || loadingOnChain}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest px-5 py-2.5 rounded-xl border-2 border-b-[6px] border-emerald-900 active:border-b-2 active:translate-y-[4px] transition-all flex flex-col items-center justify-center shadow-lg leading-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOwner ? (
                <>
                  <span className="text-sm font-black mb-0.5">&#10003; Already Owned</span>
                  <span className="text-[9px] text-emerald-100/80 font-bold">DOWNLOAD &amp; BUILD</span>
                </>
              ) : txLoading || loadingOnChain ? (
                <span className="text-sm font-black animate-pulse">Processing...</span>
              ) : (
                <>
                  <span className="text-sm font-black mb-0.5">Buy via Escrow</span>
                  <span className="text-[9px] text-emerald-100/80 font-bold">LOCK FUNDS &amp; BUY</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
