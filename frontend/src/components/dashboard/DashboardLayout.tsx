import { useState, useEffect, useCallback } from "react";
import BrowseSolutions from "./BrowseSolutions";
import MyPurchases from "./MyPurchases";
import InnovatorBlueprint from "./InnovatorBlueprint";
import WalletConnect from "../WalletConnect";
import { isConnected, getAddress, signTransaction } from "@stellar/freighter-api";
import { Client, networks } from "../../contracts/gvm-client/src";
import { useSorobanContract } from "../../hooks/useSorobanContract";

const NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7KPLIBDBMECW5U67A53Y67SFF47JKRKA66OEBB6CDD";

/* ------------------------------------------------------------------ */
/*  Shared constants + mock data                                      */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["Agriculture", "Renewable Energy", "Eco-Climate", "Water Sovereignty"];

const SIDEBAR_TABS = [
  { id: "catalog", label: "Browse Solutions" },
  { id: "purchases", label: "My Purchases" },
  { id: "blueprint", label: "Innovator Blueprint" },
];

/* ------------------------------------------------------------------ */
/*  DashboardLayout — sidebar + tab switcher + shared state           */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({ onDisconnect }) {
  const [activeTab, setActiveTab] = useState("catalog");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [notification, setNotification] = useState(null);
  const [address, setAddress] = useState(null);

  const { client, connect, buyBlueprintNft } = useSorobanContract();

  /* ---------- notification helper ---------- */
  const flash = (msg, ms) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), ms || 3000);
  };

  /* ---------- fetch on-chain purchases ---------- */
  const fetchOnChainPurchases = useCallback(async () => {
    try {
      const conn = await isConnected();
      if (!conn?.isConnected) return;
      const { address: addr } = await getAddress();
      if (!addr) return;
      setAddress(addr);

      const found = [];
      for (let id = 0; id < 20; id++) {
        try {
          const ownerTx = await client.get_owner({ blueprint_id: id });
          const owner = (await ownerTx.simulate()).result;
          if (owner === addr) {
            const bpTx = await client.get_blueprint({ blueprint_id: id });
            const bp = (await bpTx.simulate()).result;
            found.push({
              id: `onchain-${id}-${Date.now()}`,
              productId: `onchain-${id}`,
              blueprint_id: id,
              title: String(bp.ipfs_hash || `Blueprint #${id}`).slice(0, 40),
              price: Number(bp.price) / 10_000_000,
              status: "LOCKED",
            });
          }
        } catch {}
      }

      if (found.length > 0) {
        setPurchases((prev) => {
          const existingIds = new Set(prev.map((p) => p.blueprint_id));
          const newItems = found.filter((f) => !existingIds.has(f.blueprint_id));
          return [...prev, ...newItems];
        });
      }
    } catch {}
  }, [client]);

  useEffect(() => {
    fetchOnChainPurchases();
  }, [fetchOnChainPurchases]);

  /* ---------- handleBuySuccess (state-only) ---------- */
  const handleBuySuccess = (blueprint) => {
    const price = blueprint.metadata?.pricing?.amountInXlm ?? blueprint.price;
    const bpId = blueprint.id ? Number(String(blueprint.id).replace(/\D/g, "")) % 100 : 0;
      setPurchases((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: blueprint.id,
        blueprint_id: bpId,
        title: blueprint.metadata?.title || blueprint.title,
        price,
        status: "LOCKED",
      },
    ]);
  };

  /* ---------- handleBuyViaEscrow ---------- */
  const handleBuyViaEscrow = async (blueprint) => {
    try {
      const price = blueprint.metadata?.pricing?.amountInXlm ?? blueprint.price;
      const bpId = blueprint.id ? Number(String(blueprint.id).replace(/\D/g, "")) % 100 : 0;

      await connect();

      const result = await buyBlueprintNft(NATIVE_XLM_SAC, bpId);
      console.log("Escrow TX confirmed:", result.txHash);

      handleBuySuccess(blueprint);

      flash(
        `Success! Blueprint locked in Soroban Escrow. TX: ${String(result.txHash).slice(0, 10)}...`,
        5000,
      );
    } catch (e) {
      if (
        e?.message?.includes("cancelled") ||
        e?.message?.includes("denied") ||
        e?.message?.includes("rejected")
      ) {
        flash("Transaction cancelled in wallet.", 2500);
        return;
      }
      console.error("Escrow TX failed:", e);
      flash("Escrow transaction failed. Check console for details.", 4000);
    }
  };

  /* ---------- Tab 2: Verify & Release ---------- */
  const handleVerifyRelease = (purchaseId) => {
    setPurchases((prev) =>
      prev.map((p) => (p.id === purchaseId ? { ...p, status: "COMPLETED" } : p)),
    );
    flash("Funds released! Blueprint is now available.");
  };

  /* ---------- Tab 2: Download IPFS ---------- */
  const handleDownload = () => {
    flash("IPFS Download started — CID: QmT5NvUtoM5nWFfrQdPCkQhURzgCsLHfuMPo3jmo7YyY7m", 4000);
  };

  /* ---------- Tab 3: Publish Blueprint ---------- */
  const handlePublish = async (newProduct) => {
    try {
      const conn = await isConnected();
      if (!conn?.isConnected) {
        flash("Please connect Freighter wallet first.", 3000);
        return;
      }
      const { address: creatorAddr } = await getAddress();

      flash("Sending blueprint to Soroban contract...", 2000);

      const client = new Client({
        contractId: networks.testnet.contractId,
        networkPassphrase: networks.testnet.networkPassphrase,
        rpcUrl: RPC_URL,
        publicKey: creatorAddr,
      });

      const tx = await client.add_blueprint({
        creator: creatorAddr,
        price: BigInt(newProduct.priceStroops || "0"),
        ipfs_hash: newProduct.ipfsHash || newProduct.adminEncryptedHash || `ipfs://${Date.now()}`,
      }, {
        signTransaction: async (txXdr) => {
          const signed = await signTransaction(txXdr, {
            networkPassphrase: networks.testnet.networkPassphrase,
            address: creatorAddr,
          });
          return signed.signedTxXdr;
        },
      });

      const result = await tx.signAndSend();
      const txHash = (result as any).sendTransactionResponse?.txHash
        || (result as any).txHash
        || (result as any).hash
        || "";

      setProducts((prev) => [{
        id: Date.now(),
        ...newProduct,
        creator: creatorAddr,
        txHash,
      }, ...prev]);

      flash(
        `"${newProduct.title}" published! TX: ${txHash.slice(0, 14)}...`,
        5000,
      );
      setActiveTab("catalog");
    } catch (e) {
      console.error("Publish failed:", e);
      flash("Failed to publish blueprint. Check console for details.", 4000);
    }
  };

  /* ---------- derived stats for InnovatorBlueprint ---------- */
  const activeEscrows = purchases.filter((p) => p.status === "LOCKED").length;
  const completedPurchases = purchases.filter((p) => p.status === "COMPLETED");
  const totalEarnings = completedPurchases.reduce((sum, p) => sum + p.price, 1250);
  const blueprintsSold = completedPurchases.length + 28;

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fdf8ed]">

      {/* ---------- Mobile overlay ---------- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* ---------- SIDEBAR ---------- */}
      <aside
        className={[
          "fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-[#4a2e15] border-r-[8px] border-[#36210f] shadow-[10px_0_20px_rgba(0,0,0,0.15)] shadow-[inset_-4px_0_10px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* -------- Brand Header — carved wooden plate -------- */}
        <div className="px-4 py-6 bg-[#3b2410] border-b-[6px] border-[#29190b] shadow-inner mb-6 flex items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="bg-emerald-700 text-amber-50 font-black px-2 py-1 rounded border-2 border-emerald-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
              <span className="text-sm">GV</span>
            </div>
            <span className="text-amber-100 font-bold text-lg tracking-wider drop-shadow-md">Village Marketplace</span>
          </div>
          <button onClick={closeSidebar} className="rounded-lg p-1 text-amber-400/60 hover:bg-[#5c3a1a] hover:text-amber-200 lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* -------- Navigation — wooden signposts -------- */}
        <nav className="flex-1 flex flex-col gap-3 px-3">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 1024) closeSidebar(); }}
                className={
                  isActive
                    ? "flex items-center px-4 py-3 rounded-lg bg-emerald-700 text-amber-50 font-bold border-2 border-[#104d30] border-b-[6px] shadow-[0_4px_10px_rgba(0,0,0,0.4)] transform translate-x-2 transition-all"
                    : "flex items-center px-4 py-3 rounded-lg text-amber-300/70 font-medium hover:bg-[#5c3a1a] hover:text-amber-100 hover:shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)] transition-all cursor-pointer"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* -------- Disconnect — worn red warning plank -------- */}
        <button
          onClick={onDisconnect}
          className="mt-auto mb-6 mx-3 px-4 py-3 bg-[#6b2a2a] text-red-100 font-bold rounded-lg border-2 border-[#4a1c1c] border-b-[4px] hover:translate-y-[2px] hover:border-b-[2px] transition-all text-center cursor-pointer shadow-md"
        >
          Disconnect &amp; Return Home
        </button>
      </aside>

      {/* ---------- MAIN CONTENT ---------- */}
      <main className="flex-1 h-full overflow-y-auto p-8 md:p-12 relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-200 px-6 py-4 bg-[#fdf8ed]">
          <button onClick={openSidebar} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h2 className="text-lg font-semibold capitalize tracking-tight">
            {activeTab === "catalog" ? "Browse Solutions" : activeTab === "purchases" ? "My Purchases" : "Innovator Blueprint"}
          </h2>

          <WalletConnect />
        </header>

        {/* ---------- TAB ROUTER ---------- */}
        {activeTab === "catalog" && (
          <BrowseSolutions
            products={products}
            handleBuy={handleBuyViaEscrow}
            handleBuySuccess={handleBuySuccess}
          />
        )}

        {activeTab === "purchases" && (
          <MyPurchases
            items={purchases}
            setItems={setPurchases}
            onVerifyRelease={handleVerifyRelease}
            onDownload={handleDownload}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "blueprint" && (
          <InnovatorBlueprint
            totalEarnings={totalEarnings}
            activeEscrows={activeEscrows}
            blueprintsSold={blueprintsSold}
            categories={CATEGORIES}
            onPublish={handlePublish}
            onNavigateTab={setActiveTab}
          />
        )}
      </main>

      {/* ---------- FLOATING TOAST NOTIFICATION ---------- */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-green-500 bg-slate-900 px-4 py-3 text-white shadow-xl transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}
    </div>
  );
}
