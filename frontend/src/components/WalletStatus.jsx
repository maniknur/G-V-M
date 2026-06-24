import { useState, useCallback, useEffect, useRef } from "react";
import { isConnected, getAddress } from "@stellar/freighter-api";
import { fetchNativeBalance } from "../utils/balance";

async function fetchBalance(address) {
  return await fetchNativeBalance(address);
}

function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatBalance(n) {
  return n.toLocaleString("en-US");
}

export default function WalletStatus() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [menuOpen, setMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const menuRef = useRef(null);

  const handleConnect = useCallback(async () => {
    try {
      setConnecting(true);
      const connected = await isConnected();
      if (!connected || !connected.isConnected) {
        alert("Please install and open the Freighter wallet extension.");
        return;
      }
      const { address } = await getAddress();
      setAccount(address);
      const bal = await fetchBalance(address);
      setBalance(bal);
    } catch (e) {
      console.error("Wallet connect error:", e);
      alert("Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setAccount(null);
    setBalance("0.00");
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
      {!account ? (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {connecting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
      ) : (
        <div className="relative flex items-center" ref={menuRef}>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#050510]/80 backdrop-blur-md px-5 py-2.5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>

            <span className="font-mono text-xs font-semibold text-white/80">
              {truncateAddress(account)}
            </span>

            <span className="h-4 w-px bg-white/10" />

            {balance === null || balance === "0.00" ? (
              <span className="text-[10px] font-semibold text-white/40">
                Loading balance...
              </span>
            ) : (
              <span className="text-xs font-bold text-green-400">
                {balance} XLM
              </span>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl p-1.5 shadow-2xl">
              <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
                Wallet
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
