import { useState } from "react";
import { processBlueprintFile, xlmToStroops } from "../../utils/crypto";

const CREAM = "#FDFBF7";
const CHARCOAL = "#1E293B";
const GREEN600 = "#16A34A";
const GREEN700 = "#15803D";

const ADMIN_PUBLIC_KEY = "GB7PX6UVGMO6565H5HGW6NF56W2S25BOXJZT74PW2YXMEC4L4DFECX5S";

interface PublishData {
  title: string;
  category: string;
  price: number;
  priceStroops: string;
  ipfsHash: string;
  adminEncryptedHash: string;
  fileName: string;
  fileSize: number;
}

interface InnovatorBlueprintProps {
  totalEarnings: number;
  activeEscrows: number;
  blueprintsSold: number;
  categories: string[];
  onPublish: (data: PublishData) => void;
}

export default function InnovatorBlueprint({
  totalEarnings,
  activeEscrows,
  blueprintsSold,
  categories,
  onPublish,
}: InnovatorBlueprintProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Agriculture");
  const [price, setPrice] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const flash = (msg: string, ms?: number) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), ms || 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) {
      flash("Please fill in all required fields.", 2500);
      return;
    }
    if (!selectedFile) {
      flash("Please select a blueprint file to upload.", 2500);
      return;
    }

    setEncrypting(true);
    flash("Encrypting blueprint file...", 2000);

    try {
      const encryption = await processBlueprintFile(selectedFile, ADMIN_PUBLIC_KEY);
      const priceStroops = xlmToStroops(Number(price));

      onPublish({
        title: title.trim(),
        category,
        price: Number(price),
        priceStroops: priceStroops.toString(),
        ipfsHash: encryption.ipfsHash,
        adminEncryptedHash: encryption.adminEncryptedHash,
        fileName: encryption.fileName,
        fileSize: encryption.fileSize,
      });

      setTitle("");
      setCategory("Agriculture");
      setPrice("");
      setSelectedFile(null);
    } catch (err: any) {
      flash("Encryption failed: " + (err?.message || "Unknown error"), 4000);
    } finally {
      setEncrypting(false);
    }
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
                {categories.map((cat: string) => (
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
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Technical Blueprint File
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-green-400 hover:bg-green-50/30">
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-green-700">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="mb-1 text-xs font-medium text-gray-500">Drag &amp; drop or click to browse</p>
                    <p className="text-xs text-gray-400">PDF, CAD, or ZIP (Max 50 MB)</p>
                  </>
                )}
                <input type="file" className="hidden" accept=".pdf,.step,.stp,.zip,.dwg,.dxf" onChange={handleFileChange} />
              </label>
            </div>

            {/* Encryption progress */}
            {encrypting && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                Encrypting file with admin public key...
              </div>
            )}

            <button
              type="submit"
              disabled={encrypting}
              className="w-full rounded-lg px-5 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: GREEN600 }}
            >
              {encrypting ? "Encrypting & Publishing..." : "Publish to Marketplace"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
