// @ts-nocheck
import { useRef, useEffect, useMemo, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  Trade Globe — converted from TradeGlobe.tsx, pure JSX              */
/* ------------------------------------------------------------------ */

const TRADE_ROUTES = [
  { startLat: -6.2, startLng: 106.8, endLat: 50.1, endLng: 8.7, color: "#22c55e" },
  { startLat: -6.2, startLng: 106.8, endLat: 40.7, endLng: -74.0, color: "#22c55e" },
  { startLat: -6.2, startLng: 106.8, endLat: 35.7, endLng: 139.8, color: "#22c55e" },
  { startLat: 21.0, startLng: 105.8, endLat: 51.5, endLng: -0.1, color: "#10b981" },
  { startLat: 21.0, startLng: 105.8, endLat: 34.1, endLng: -118.2, color: "#10b981" },
  { startLat: 21.0, startLng: 105.8, endLat: 47.4, endLng: 8.5, color: "#10b981" },
  { startLat: 14.6, startLng: 121.0, endLat: 37.8, endLng: -122.4, color: "#22c55e" },
  { startLat: 14.6, startLng: 121.0, endLat: -33.9, endLng: 151.2, color: "#22c55e" },
  { startLat: 14.6, startLng: 121.0, endLat: 43.7, endLng: -79.4, color: "#22c55e" },
];

const COUNTRY_MARKERS = [
  { lat: -6.2, lng: 106.8, name: "Indonesia", subtitle: "Coffee Export Hub", color: "#22c55e", radius: 0.35 },
  { lat: 21.0, lng: 105.8, name: "Vietnam", subtitle: "Rice Export Hub", color: "#22c55e", radius: 0.35 },
  { lat: 14.6, lng: 121.0, name: "Philippines", subtitle: "Coconut Export Hub", color: "#22c55e", radius: 0.35 },
  { lat: 50.1, lng: 8.7, name: "Germany", subtitle: "EUR Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 40.7, lng: -74.0, name: "USA", subtitle: "USD Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 35.7, lng: 139.8, name: "Japan", subtitle: "JPY Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 51.5, lng: -0.1, name: "UK", subtitle: "GBP Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 34.1, lng: -118.2, name: "USA", subtitle: "USD Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 47.4, lng: 8.5, name: "Switzerland", subtitle: "CHF Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 37.8, lng: -122.4, name: "USA", subtitle: "USD Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: -33.9, lng: 151.2, name: "Australia", subtitle: "AUD Settlement Hub", color: "#3b82f6", radius: 0.3 },
  { lat: 43.7, lng: -79.4, name: "Canada", subtitle: "CAD Settlement Hub", color: "#3b82f6", radius: 0.3 },
];

function GlobeLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-14 w-14 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
    </div>
  );
}

function TradeGlobe() {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [ready, setReady] = useState(false);

  const arcsData = useMemo(() => TRADE_ROUTES, []);
  const pointsData = useMemo(() => COUNTRY_MARKERS, []);
  const labelsData = useMemo(
    () => COUNTRY_MARKERS.map((p) => ({ lat: p.lat, lng: p.lng, text: p.name })),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = globeRef.current;
    if (!el) return;
    const scene = el.scene();
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(1, 1, 1);
    scene.add(ambient);
    scene.add(directional);

    const controls = el.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = false;
    controls.minDistance = 220;
    controls.maxDistance = 400;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;

    el.pointOfView({ lat: 5, lng: 115, altitude: 2.2 }, 1000);
  }, [ready]);

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-[400px]">
      {!ready && <GlobeLoader />}
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#1e3a8a"
        atmosphereAltitude={0.15}
        width={size.width}
        height={size.height}
        animateIn
        onGlobeReady={() => setReady(true)}
        arcsData={arcsData}
        arcColor="color"
        arcAltitude={0.22}
        arcStroke={1.2}
        arcDashLength={0.35}
        arcDashGap={0.15}
        arcDashAnimateTime={4000}
        arcDashInitialGap={() => Math.random()}
        arcsTransitionDuration={0}
        pointsData={pointsData}
        pointColor="color"
        pointAltitude={0.02}
        pointRadius="radius"
        pointsMerge={false}
        pointLabel={(d) => `${d.name}\n${d.subtitle}`}
        labelsData={labelsData}
        labelLat={(d) => d.lat}
        labelLng={(d) => d.lng}
        labelText={(d) => d.text}
        labelColor={() => "#cbd5e1"}
        labelSize={1.0}
        labelDotRadius={0.3}
        labelAltitude={0.02}
        labelResolution={2}
        rendererConfig={{ antialias: true, alpha: true, precision: "mediump" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                     */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: "10+", label: "Global Reach" },
  { value: "100+", label: "Verified Blueprints" },
  { value: "100%", label: "Escrow Efficiency" },
];

export default function LandingPage({ onGetStarted, onViewMarketplace }) {
  return (
    <div className="w-full bg-[#050510]">

      {/* SCREEN 1 — Hero text, CTA buttons, stats */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#050510] px-6 text-center">
        <div className="relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center">

          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-green-400 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            SECURE ESCROW ENABLED
          </div>

          <h1 className="mb-6 max-w-5xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white lg:text-6xl xl:text-7xl">
            Empowering{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Village
            </span>
            ,<br />
            Connecting Global Markets.
          </h1>

          <p className="max-w-3xl text-lg leading-relaxed text-zinc-400 lg:text-xl">
            "Bridge the gap between local eco-innovations and global sustainability. Trade verified blueprints with trustless, rapid settlements on the Stellar network."
          </p>

          <div className="mt-24 mb-28 flex flex-wrap justify-center gap-6">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-b from-green-400 to-green-600 px-10 py-4 text-lg font-extrabold text-white shadow-[0_0_30px_rgba(34,197,94,0.5),inset_0_2px_0_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.7),inset_0_2px_0_rgba(255,255,255,0.4)] hover:from-green-300 hover:to-green-500 active:scale-95 active:shadow-none"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={onViewMarketplace}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-10 py-4 text-lg font-bold text-white backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] hover:border-white/40 active:scale-95 active:shadow-none"
            >
              View Marketplace
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-16 gap-y-10">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2">
                <p className="text-4xl font-bold tracking-tight text-white">{stat.value}</p>
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* SCREEN 2 — 3D Globe + footer */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#050510]">
        <div className="relative h-[80vh] w-full max-w-[1400px]">
          <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_40%,#050510_100%)]" />
          <TradeGlobe />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30 flex justify-center pb-12">
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Settlement Powered by
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <span className="text-white">Stellar Network</span>
              <span className="h-1 w-1 rounded-full bg-zinc-600" />
              <span className="text-green-500">t+5s finality</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
