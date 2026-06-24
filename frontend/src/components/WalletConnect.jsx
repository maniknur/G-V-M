import { useState, useCallback, useEffect, useRef } from "react";
import { isConnected, getAddress, requestAccess } from "@stellar/freighter-api";
import { fetchNativeBalance } from "../utils/balance";

function seedFromAddress(addr) {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function Identicon({ address, size = 20 }) {
  const seed = seedFromAddress(address);
  const hue = seed % 360;
  const hue2 = (seed * 7) % 360;
  return (
    <div
      className="shrink-0 rounded-full border border-white/10"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${seed % 360}deg, hsl(${hue}, 70%, 50%), hsl(${hue2}, 60%, 40%), hsl(${hue}, 70%, 50%))`,
      }}
    />
  );
}

function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

async function fetchBalance(address) {
  return await fetchNativeBalance(address);
}

function formatBalance(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [menuOpen, setMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const menuRef = useRef(null);

  const refreshBalance = useCallback(async () => {
    if (!account) return;
    const bal = await fetchBalance(account);
    setBalance(bal);
  }, [account]);

  useEffect(() => {
    if (account) {
      refreshBalance();
    }
  }, [account, refreshBalance]);

  const connectWallet = useCallback(async () => {
    try {
      setConnecting(true);
      const connected = await isConnected();
      if (!connected?.isConnected) {
        alert("Please install the Freighter wallet extension.");
        return;
      }
      const access = await requestAccess();
      if (access.error) {
        alert("Freighter access denied. Please unlock and approve connection.");
        return;
      }
      const address = access.address;
      setAccount(address);
      const bal = await fetchBalance(address);
      setBalance(bal);
    } catch (e) {
      console.error("Connect failed:", e);
      alert("Could not connect wallet. Ensure Freighter is installed and unlocked.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
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

  /* Not connected → green button */
  if (!account) {
    return (
      <button
        onClick={connectWallet}
        disabled={connecting}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {connecting ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </button>
    );
  }

  /* Connected → pill with dropdown */
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs transition-shadow hover:shadow-md"
      >
        <Identicon address={account} size={18} />
        <span className="font-mono font-semibold text-gray-700">
          {truncateAddress(account)}
        </span>
        <span className="h-3 w-px bg-gray-200" />
        <span className="font-bold text-emerald-700">
          {balance} XLM
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Wallet
          </div>
          <div className="border-t border-gray-100 px-3 py-1.5">
            <span className="font-mono text-[10px] text-gray-500">
              {truncateAddress(account)}
            </span>
          </div>
          <div className="border-t border-gray-100">
            <button
              onClick={disconnectWallet}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
