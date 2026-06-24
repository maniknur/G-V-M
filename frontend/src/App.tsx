import { useState } from "react";
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";
import LandingPage from "./components/landing-page/LandingPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";

export default function App() {
  const [view, setView] = useState("landing");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletStep, setWalletStep] = useState("connect");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleGetStarted = () => {
    setWalletStep("connect");
    setWalletAddress(null);
    setUserRole(null);
    setWalletError(null);
    setShowWalletModal(true);
  };

  const handleViewMarketplace = () => {
    setView("dashboard");
  };

  const handleConnectWallet = async () => {
    setConnecting(true);
    setWalletError(null);
    try {
      const connected = await isConnected();
      if (!connected?.isConnected) {
        setWalletError("Freighter wallet not detected. Please install the Freighter extension.");
        return;
      }
      const access = await requestAccess();
      if (access.error) {
        setWalletError(access.error || "Access denied. Please unlock Freighter and try again.");
        return;
      }
      setWalletAddress(access.address);
      setWalletStep("selectRole");
    } catch (e: any) {
      setWalletError(e?.message || "Could not connect to Freighter.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectRole = (role) => {
    setUserRole(role);
    setShowWalletModal(false);
    setView("dashboard");
  };

  const handleDisconnect = () => {
    setView("landing");
    setWalletAddress(null);
    setUserRole(null);
  };

  const closeModal = () => setShowWalletModal(false);

  return (
    <>
      {view === "landing" ? (
        <LandingPage
          onGetStarted={handleGetStarted}
          onViewMarketplace={handleViewMarketplace}
        />
      ) : (
        <DashboardLayout onDisconnect={handleDisconnect} />
      )}

      {/* ---------- Connect Wallet Modal ---------- */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {walletStep === "connect" ? (
              <div className="flex flex-col items-center py-6">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </div>
                <h3 className="mb-1 text-xl font-bold text-[#1E293B]">Connect Your Wallet</h3>
                <p className="mb-8 text-center text-sm text-gray-500">
                  Connect to interact with the Global Village Marketplace on Stellar.
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={connecting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-green-200 transition-all hover:bg-[#15803D] hover:shadow-xl hover:shadow-green-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Connect Freighter Wallet
                    </>
                  )}
                </button>
                {walletError && (
                  <p className="mt-3 text-xs text-red-500 text-center">{walletError}</p>
                )}
                <p className="mt-4 text-xs text-gray-400">
                  Freighter browser extension required
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="mb-1 text-xl font-bold text-[#1E293B]">Wallet Connected</h3>
                <p className="mb-1 font-mono text-sm text-[#16A34A]">{walletAddress}</p>
                <p className="mb-8 text-center text-sm text-gray-500">
                  Select your role to continue.
                </p>
                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={() => handleSelectRole("buyer")}
                    className="inline-flex w-full items-center justify-between rounded-xl border-2 border-gray-100 px-6 py-4 text-left transition-all hover:border-[#16A34A] hover:bg-green-50"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">I am a Buyer</p>
                      <p className="text-xs text-gray-500">Browse &amp; purchase sustainability blueprints</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleSelectRole("innovator")}
                    className="inline-flex w-full items-center justify-between rounded-xl border-2 border-gray-100 px-6 py-4 text-left transition-all hover:border-[#16A34A] hover:bg-green-50"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">I am an Innovator</p>
                      <p className="text-xs text-gray-500">Publish &amp; sell your open-source blueprints</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
