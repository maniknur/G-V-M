import { useState } from "react";

const CREAM = "#FDFBF7";
const CHARCOAL = "#1E293B";
const GREEN600 = "#16A34A";
const GREEN700 = "#15803D";

export default function InnovatorBlueprint({
  totalEarnings,
  activeEscrows,
  blueprintsSold,
  categories,
  onPublish,
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Agriculture");
  const [price, setPrice] = useState("");
  const [alertMsg, setAlertMsg] = useState(null);

  const flash = (msg, ms) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), ms || 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !price) {
      flash("Please fill in all required fields.", 2500);
      return;
    }
    onPublish({ title: title.trim(), category, price: Number(price) });
    setTitle("");
    setCategory("Agriculture");
    setPrice("");
  };

  return (
    <div className="p-6">
      {alertMsg && (
        <div className="mb-5 rounded-lg border px-4 py-2 text-sm font-medium" style={{ background: "#ECFDF5", borderColor: GREEN600, color: GREEN700 }}>
          {alertMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

        {/* ---- Section A: Revenue Tracker & Analytics ---- */}
        <div>
          <h3 className="mb-5 text-base font-semibold tracking-tight" style={{ color: CHARCOAL }}>
            Revenue Tracker &amp; Analytics
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Total Earnings</p>
              <p className="text-2xl font-extrabold" style={{ color: GREEN700 }}>{totalEarnings.toLocaleString()} XLM</p>
              <p className="mt-1 text-xs text-gray-400">+12% from last month</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Active Escrows</p>
              <p className="text-2xl font-extrabold" style={{ color: "#D97706" }}>{activeEscrows}</p>
              <p className="mt-1 text-xs text-gray-400">Awaiting verification</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Blueprints Sold</p>
              <p className="text-2xl font-extrabold" style={{ color: CHARCOAL }}>{blueprintsSold}</p>
              <p className="mt-1 text-xs text-gray-400">All-time total</p>
            </div>
          </div>
        </div>

        {/* ---- Section B: Upload New Blueprint ---- */}
        <div>
          <h3 className="mb-5 text-base font-semibold tracking-tight" style={{ color: CHARCOAL }}>
            Upload New Blueprint
          </h3>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Title */}
            <div className="mb-4">
              <label htmlFor="bp-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Product Title
              </label>
              <input
                id="bp-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Aquaponic Solar Drip Irrigation"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100"
                style={{ background: CREAM }}
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label htmlFor="bp-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category
              </label>
              <select
                id="bp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100"
                style={{ background: CREAM }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="mb-4">
              <label htmlFor="bp-price" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Price in XLM
              </label>
              <input
                id="bp-price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="50"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100"
                style={{ background: CREAM }}
              />
            </div>

            {/* File drop-zone */}
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Technical Blueprint File
              </label>
              <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-green-400 hover:bg-green-50/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-2 h-8 w-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="mb-1 text-xs font-medium text-gray-500">Drag &amp; drop or click to browse</p>
                <p className="text-xs text-gray-400">PDF, CAD, or ZIP (Max 50 MB)</p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg px-5 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: GREEN600 }}
            >
              Publish to Marketplace
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
