const GREEN600 = "#16A34A";
const GREEN700 = "#15803D";

export default function MyPurchases({ items, setItems, onVerifyRelease, onDownload, onNavigateTab }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mb-4 text-5xl">&#128722;</div>
        <h3 className="mb-2 text-lg font-semibold text-[#1E293B]">No purchases yet</h3>
        <p className="mb-6 max-w-xs text-center text-sm text-gray-500">
          Browse the marketplace and buy blueprints to manage your escrow transactions here.
        </p>
        <button
          onClick={() => onNavigateTab("catalog")}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
          style={{ background: GREEN600 }}
        >
          Browse Solutions
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              <th className="px-6 py-4">Blueprint Name</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Soroban Escrow Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-[#1E293B]">{purchase.title}</td>
                <td className="px-6 py-4 font-bold" style={{ color: GREEN700 }}>{purchase.price} XLM</td>
                <td className="px-6 py-4">
                  {purchase.status === "LOCKED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#F59E0B" }} />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#D97706" }} />
                      </span>
                      LOCKED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#D1FAE5", color: "#065F46" }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#10B981" }} />
                      COMPLETED
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {purchase.status === "LOCKED" ? (
                    <button
                      onClick={() => onVerifyRelease(purchase.id)}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: GREEN600 }}
                    >
                      Verify &amp; Release Funds
                    </button>
                  ) : (
                    <button
                      onClick={onDownload}
                      className="rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                      style={{ background: "#EEF2FF", color: "#4338CA" }}
                    >
                      Download Blueprint (IPFS)
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
