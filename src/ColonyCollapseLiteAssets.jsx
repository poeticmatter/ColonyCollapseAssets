import React, { useState, useRef } from 'react';
import { Download, Printer, LayoutGrid, Filter, FileImage, ArrowRightLeft, Flower, Gem, Flame, Leaf, Sun, Droplet, Hexagon } from 'lucide-react';
import { toPng } from 'html-to-image';
import ColonyCollapseHexTiles from './ColonyCollapseHexTiles.jsx';

// --- 1. THE 6 OFFICIAL GAME COLORS ---
const LITE_COLOR_HEX = {
  Pink: '#EC4899',
  Purple: '#A855F7',
  Red: '#EF4444',
  Green: '#22C55E',
  Orange: '#F97316',
  Blue: '#3B82F6'
};

const LITE_COLOR_DARK_HEX = {
  Pink: '#BE185D',
  Purple: '#7E22CE',
  Red: '#B91C1C',
  Green: '#15803D',
  Orange: '#C2410C',
  Blue: '#1D4ED8'
};

// --- 2. COLOR BLIND ACCESSIBILITY SYMBOLS (Clean Symmetrical Lucide Icons) ---
const ColorSymbol = ({ color, size = 24, strokeWidth = 2.2, colorHex = '#FFFFFF', className = '' }) => {
  const props = { size, color: colorHex, strokeWidth, className };
  switch (color) {
    case 'Pink':
      return <Flower {...props} />;
    case 'Purple':
      return <Gem {...props} />;
    case 'Red':
      return <Flame {...props} />;
    case 'Green':
      return <Leaf {...props} />;
    case 'Orange':
      return <Sun {...props} />;
    case 'Blue':
      return <Droplet {...props} />;
    default:
      return null;
  }
};

// --- 3. 15 UNIQUE COLOR COMBINATIONS (C(6, 2) = 15) ---
const LITE_CARD_PAIRS = [
  { id: 1, colorA: 'Pink', colorB: 'Purple' },
  { id: 2, colorA: 'Pink', colorB: 'Red' },
  { id: 3, colorA: 'Pink', colorB: 'Green' },
  { id: 4, colorA: 'Pink', colorB: 'Orange' },
  { id: 5, colorA: 'Pink', colorB: 'Blue' },
  { id: 6, colorA: 'Purple', colorB: 'Red' },
  { id: 7, colorA: 'Purple', colorB: 'Green' },
  { id: 8, colorA: 'Purple', colorB: 'Orange' },
  { id: 9, colorA: 'Purple', colorB: 'Blue' },
  { id: 10, colorA: 'Red', colorB: 'Green' },
  { id: 11, colorA: 'Red', colorB: 'Orange' },
  { id: 12, colorA: 'Red', colorB: 'Blue' },
  { id: 13, colorA: 'Green', colorB: 'Orange' },
  { id: 14, colorA: 'Green', colorB: 'Blue' },
  { id: 15, colorA: 'Orange', colorB: 'Blue' }
];

// --- 4. CLEAN VECTOR CARD SVG WITH REFINED PEEL & CENTERED LEAF ICON ---
const CleanCardSVG = ({ colorA, colorB, width = 280, height = 392, className = '' }) => {
  const hexA = LITE_COLOR_HEX[colorA] || '#EC4899';
  const hexB = LITE_COLOR_HEX[colorB] || '#A855F7';
  const darkHexB = LITE_COLOR_DARK_HEX[colorB] || '#7E22CE';

  // Proportional math based on card width
  const R = Math.round(width * (16 / 280));  // outer corner radius (16px)
  const D = Math.round(width * (72 / 280));  // fold depth (72px)

  const foldTopX = width - D;      // 208
  const foldRightY = D;            // 72

  // Center symbol transformation math (100% centered on card face)
  const centerSymbolSize = Math.round(width * (84 / 280)); // 84px
  const centerScale = centerSymbolSize / 24;
  const centerX = width / 2 - 12 * centerScale;
  const centerY = height / 2 - 12 * centerScale;

  // Flap symbol position (shifted inward away from the leaf edge for breathing room)
  const flapSymbolSize = Math.round(width * (24 / 280)); // 24px
  const flapScale = flapSymbolSize / 24;
  const flapCenterX = foldTopX + Math.round(D * 0.38); // shifted inward (~235px)
  const flapCenterY = foldRightY - Math.round(D * 0.36); // shifted inward (~46px)
  const flapX = flapCenterX - 12 * flapScale;
  const flapY = flapCenterY - 12 * flapScale;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      className={`select-none block ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Soft subtle drop shadow for turned page leaf */}
        <filter id={`peel-shadow-${colorA}-${colorB}-${width}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-2.5" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.25" />
        </filter>

        {/* Paper shading gradient on turned flap */}
        <linearGradient id={`flap-grad-${colorB}-${width}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="35%" stopColor={hexB} />
          <stop offset="100%" stopColor={darkHexB} />
        </linearGradient>

        {/* Main card clip path (Clipped precisely along straight fold line from (foldTopX,0) to (width,foldRightY)) */}
        <clipPath id={`card-clip-${width}-${height}`}>
          <path
            d={`
              M ${R} 0
              L ${foldTopX} 0
              L ${width} ${foldRightY}
              L ${width} ${height - R}
              Q ${width} ${height} ${width - R} ${height}
              L ${R} ${height}
              Q 0 ${height} 0 ${height - R}
              L 0 ${R}
              Q 0 0 ${R} 0
              Z
            `}
          />
        </clipPath>
      </defs>

      {/* 1. Main Card Surface (Color A) */}
      <rect
        width={width}
        height={height}
        rx={R}
        fill={hexA}
        clipPath={`url(#card-clip-${width}-${height})`}
      />

      {/* 2. Center Color-Blind Symbol for Color A (Perfectly Centered Vector) */}
      <g transform={`translate(${centerX}, ${centerY}) scale(${centerScale})`}>
        <ColorSymbol color={colorA} size={24} strokeWidth={2} colorHex="#FFFFFF" />
      </g>

      {/* 3. Dark Recessed Void / Background behind peeled corner */}
      <path
        d={`
          M ${foldTopX} 0
          L ${width - R} 0
          A ${R} ${R} 0 0 1 ${width} ${R}
          L ${width} ${foldRightY}
          Z
        `}
        fill="#090D16"
        opacity="0.32"
      />

      {/* 4. TURNED CORNER PAGE FLAP (Color B) */}
      <path
        d={`
          M ${foldTopX} 0
          L ${foldTopX} ${foldRightY - R}
          A ${R} ${R} 0 0 0 ${foldTopX + R} ${foldRightY}
          L ${width} ${foldRightY}
          Z
        `}
        fill={`url(#flap-grad-${colorB}-${width})`}
        filter={`url(#peel-shadow-${colorA}-${colorB}-${width})`}
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeOpacity="0.45"
      />

      {/* 5. Symbol for Color B on Turned Page Flap (Positioned inward with comfortable margins) */}
      <g transform={`translate(${flapX}, ${flapY}) scale(${flapScale})`}>
        <ColorSymbol color={colorB} size={24} strokeWidth={2.4} colorHex="#FFFFFF" />
      </g>

      {/* 6. Crisp Outer Card Border */}
      <rect
        width={width}
        height={height}
        rx={R}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
    </svg>
  );
};

// --- 5. MAIN COLONY COLLAPSE LITE ASSETS PAGE COMPONENT ---
export default function ColonyCollapseLiteAssets() {
  const [activeAsset, setActiveAsset] = useState('hex-tiles'); // 'hex-tiles' | 'cards'
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery', 'print', 'tts', 'screentop'
  const [selectedColor, setSelectedColor] = useState('All');
  const [globalSide, setGlobalSide] = useState('interactive'); // 'interactive', 'fronts', 'backs'
  const [cardFlipState, setCardFlipState] = useState({}); // cardId -> 'A' | 'B'
  const [showCutLines, setShowCutLines] = useState(true);

  const printRef = useRef(null);

  // Toggle individual card side in interactive gallery mode
  const handleFlipCard = (cardId) => {
    setCardFlipState((prev) => ({
      ...prev,
      [cardId]: (prev[cardId] || 'A') === 'A' ? 'B' : 'A'
    }));
  };

  // Get current side for a card
  const getCardSide = (cardId) => {
    if (globalSide === 'fronts') return 'A';
    if (globalSide === 'backs') return 'B';
    return cardFlipState[cardId] || 'A';
  };

  // Filter deck cards
  const filteredCards = LITE_CARD_PAIRS.filter((card) => {
    if (selectedColor === 'All') return true;
    return card.colorA === selectedColor || card.colorB === selectedColor;
  });

  // --- EXPORT HANDLERS ---
  const exportTTSFrontSheet = () => {
    const node = document.getElementById('tts-front-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'ColonyCollapseLite_TTS_15Fronts.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  const exportTTSBackSheet = () => {
    const node = document.getElementById('tts-back-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'ColonyCollapseLite_TTS_15Backs.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  const exportScreentopSheet = () => {
    const node = document.getElementById('screentop-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'ColonyCollapseLite_Screentop_30CardSheet.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Banner */}
      <header className="relative bg-gradient-to-r from-pink-950 via-slate-900 to-purple-950 border-b border-pink-800/40 px-4 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                Colony Collapse Lite
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {activeAsset === 'hex-tiles'
                  ? '30 Double-Sided Hexagon Tiles • 3-Line & 2-Line Partitions'
                  : '15 Double-Sided Cards • Color-Blind Accessible'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              {activeAsset === 'hex-tiles' ? '⬡ Colony Collapse Lite — Hexagon Tiles' : '🌸 Colony Collapse Lite — Color & Symbol Cards'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {activeAsset === 'hex-tiles'
                ? 'Double-sided hexagon tiles in the 6 official colors with central circles revealing the reverse side color. 3 lines (three equal thirds) or 2 lines (one third & two thirds).'
                : 'Double-sided color cards with Lucide color-blind symbols in the card center and on the corner page leaf. 15 unique pairs. Exports for TTS & Screentop.co.'}
            </p>
          </div>

          {/* Color & Symbol Legend */}
          <div className="flex flex-wrap gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            {Object.keys(LITE_COLOR_HEX).map((colorName) => (
              <div key={colorName} className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 shadow-sm">
                <span className="w-3.5 h-3.5 rounded-full inline-block shadow-sm" style={{ backgroundColor: LITE_COLOR_HEX[colorName] }}></span>
                {activeAsset === 'cards' && (
                  <ColorSymbol color={colorName} size={15} strokeWidth={2.4} colorHex="#FFFFFF" />
                )}
                {colorName}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Asset Switcher Bar */}
        <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800 shadow-md no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 pl-2">Asset:</span>
            <button
              onClick={() => setActiveAsset('hex-tiles')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activeAsset === 'hex-tiles'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg ring-1 ring-pink-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Hexagon className="w-4 h-4 text-pink-400" /> ⬡ Hexagon Tiles (30 Tiles)
            </button>
            <button
              onClick={() => setActiveAsset('cards')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activeAsset === 'cards'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg ring-1 ring-pink-400/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileImage className="w-4 h-4 text-purple-400" /> 🎴 Color Cards (15 Cards)
            </button>
          </div>
        </div>

        {/* Dynamic Asset View */}
        {activeAsset === 'hex-tiles' ? (
          <ColonyCollapseHexTiles />
        ) : (
          <div className="space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl no-print">
          {/* View Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'gallery' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Card Gallery (15 Cards)
            </button>
            <button
              onClick={() => setViewMode('print')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'print' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" /> Printable Grid (3x3)
            </button>
            <button
              onClick={() => setViewMode('tts')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'tts' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" /> TTS Sheets (15 Fronts / 15 Backs)
            </button>
            <button
              onClick={() => setViewMode('screentop')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'screentop' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" /> Screentop Export (30 Card Sheet)
            </button>
          </div>

          {/* Interactive Filters (for Gallery) */}
          {viewMode === 'gallery' && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Flip Mode Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold text-slate-300">
                <span className="px-2 text-slate-400">View:</span>
                <button
                  onClick={() => setGlobalSide('interactive')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    globalSide === 'interactive' ? 'bg-purple-600 text-white shadow' : 'hover:text-white'
                  }`}
                >
                  Interactive Flip
                </button>
                <button
                  onClick={() => setGlobalSide('fronts')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    globalSide === 'fronts' ? 'bg-purple-600 text-white shadow' : 'hover:text-white'
                  }`}
                >
                  All Fronts (Side A)
                </button>
                <button
                  onClick={() => setGlobalSide('backs')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    globalSide === 'backs' ? 'bg-purple-600 text-white shadow' : 'hover:text-white'
                  }`}
                >
                  All Backs (Side B)
                </button>
              </div>

              {/* Color Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="All">All 6 Colors</option>
                  {Object.keys(LITE_COLOR_HEX).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- VIEW MODE 1: CARD GALLERY ---------------- */}
        {viewMode === 'gallery' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Showing {filteredCards.length} of 15 double-sided cards</span>
              <span className="text-pink-400">Click any card image to flip between front and back!</span>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {filteredCards.map((card) => {
                const side = getCardSide(card.id);
                const colorA = side === 'A' ? card.colorA : card.colorB;
                const colorB = side === 'A' ? card.colorB : card.colorA;

                return (
                  <div key={card.id} className="flex flex-col gap-2">
                    {/* Card Canvas Box */}
                    <div
                      onClick={() => handleFlipCard(card.id)}
                      className="group relative aspect-[2.5/3.5] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                    >
                      <CleanCardSVG colorA={colorA} colorB={colorB} />
                    </div>

                    {/* UI Label & Flip Control Outside the Card */}
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LITE_COLOR_HEX[colorA] }}></span>
                        {colorA} <span className="text-slate-500">/</span> {colorB}
                      </span>
                      <button
                        onClick={() => handleFlipCard(card.id)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Flip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 2: PRINTABLE GRID (3x3 Layout) ---------------- */}
        {viewMode === 'print' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 no-print">
              <div>
                <h3 className="font-bold text-white text-base">Printable Grid Layout (A4 / Letter 3x3 Grid)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Clean double-sided card sheets with color-blind symbols. Side A (Fronts) and Side B (Backs) are aligned in matching order for double-sided home printing.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="rounded text-pink-500 focus:ring-pink-500 bg-slate-950 border-slate-700"
                  />
                  Show Cut Guides
                </label>

                <button
                  onClick={() => window.print()}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-black px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" /> Print PDF / Paper
                </button>
              </div>
            </div>

            {/* Print Pages Container */}
            <div ref={printRef} className="print-area space-y-12">
              {/* PAGE 1: Side A (Fronts - Cards 1 to 9) */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
                <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page 1: Front Sides (Side A) — Cards 1 to 9
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 print:gap-2">
                  {LITE_CARD_PAIRS.slice(0, 9).map((card) => (
                    <div key={`p1-${card.id}`} className={`relative aspect-[2.5/3.5] ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                      <CleanCardSVG colorA={card.colorA} colorB={card.colorB} />
                    </div>
                  ))}
                </div>
              </div>

              {/* PAGE 2: Side A (Fronts - Cards 10 to 15) */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
                <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page 2: Front Sides (Side A) — Cards 10 to 15
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 print:gap-2">
                  {LITE_CARD_PAIRS.slice(9, 15).map((card) => (
                    <div key={`p2-${card.id}`} className={`relative aspect-[2.5/3.5] ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                      <CleanCardSVG colorA={card.colorA} colorB={card.colorB} />
                    </div>
                  ))}
                </div>
              </div>

              {/* PAGE 3: Side B (Backs - Cards 1 to 9 in Matching Order) */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
                <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page 3: Back Sides (Side B) — Cards 1 to 9 (Matching Backs)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 print:gap-2">
                  {LITE_CARD_PAIRS.slice(0, 9).map((card) => (
                    <div key={`p3-${card.id}`} className={`relative aspect-[2.5/3.5] ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                      <CleanCardSVG colorA={card.colorB} colorB={card.colorA} />
                    </div>
                  ))}
                </div>
              </div>

              {/* PAGE 4: Side B (Backs - Cards 10 to 15) */}
              <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full">
                <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page 4: Back Sides (Side B) — Cards 10 to 15 (Matching Backs)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 print:gap-2">
                  {LITE_CARD_PAIRS.slice(9, 15).map((card) => (
                    <div key={`p4-${card.id}`} className={`relative aspect-[2.5/3.5] ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                      <CleanCardSVG colorA={card.colorB} colorB={card.colorA} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 3: TABLETOP SIMULATOR (TTS) EXPORT ---------------- */}
        {viewMode === 'tts' && (
          <section className="space-y-8">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2 no-print">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-pink-400" />
                Tabletop Simulator (TTS) Deck Sheets (15 Fronts & 15 Backs)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Tabletop Simulator matching front and back sheet images. Position #1 on the Front Sheet corresponds directly to Position #1 on the Back Sheet. Clean cards with color-blind symbols.
              </p>
            </div>

            {/* 1. TTS Front Sheet (15 Cards) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg border border-slate-800">
                <span className="font-extrabold text-sm text-pink-400">1. TTS Front Sheet — 15 Card Fronts (Side A)</span>
                <button
                  onClick={exportTTSFrontSheet}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" /> Download Front Sheet PNG (2800px)
                </button>
              </div>

              <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
                <div
                  id="tts-front-sheet-export"
                  className="bg-black p-0 m-0 leading-none select-none border border-slate-700"
                  style={{ width: '2800px', display: 'grid', gridTemplateColumns: 'repeat(10, 280px)', gap: 0 }}
                >
                  {LITE_CARD_PAIRS.map((card) => (
                    <div key={`tts-front-${card.id}`} className="w-[280px] h-[392px]">
                      <CleanCardSVG colorA={card.colorA} colorB={card.colorB} width={280} height={392} />
                    </div>
                  ))}
                  {/* Empty Padding Slots */}
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={`tts-front-pad-${idx}`} className="w-[280px] h-[392px] bg-black border border-slate-900 flex items-center justify-center text-slate-800 font-bold text-xs">
                      [Empty]
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TTS Back Sheet (15 Cards) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg border border-slate-800">
                <span className="font-extrabold text-sm text-purple-400">2. TTS Back Sheet — 15 Matching Card Backs (Side B)</span>
                <button
                  onClick={exportTTSBackSheet}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" /> Download Back Sheet PNG (2800px)
                </button>
              </div>

              <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
                <div
                  id="tts-back-sheet-export"
                  className="bg-black p-0 m-0 leading-none select-none border border-slate-700"
                  style={{ width: '2800px', display: 'grid', gridTemplateColumns: 'repeat(10, 280px)', gap: 0 }}
                >
                  {LITE_CARD_PAIRS.map((card) => (
                    <div key={`tts-back-${card.id}`} className="w-[280px] h-[392px]">
                      <CleanCardSVG colorA={card.colorB} colorB={card.colorA} width={280} height={392} />
                    </div>
                  ))}
                  {/* Empty Padding Slots */}
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={`tts-back-pad-${idx}`} className="w-[280px] h-[392px] bg-black border border-slate-900 flex items-center justify-center text-slate-800 font-bold text-xs">
                      [Empty]
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 4: SCREENTOP EXPORT (30 CARD SHEET) ---------------- */}
        {viewMode === 'screentop' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-5 rounded-xl border border-slate-800 gap-4 no-print">
              <div>
                <h3 className="font-black text-white text-lg flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-purple-400" />
                  Screentop.co 30-Card Export Sheet (Alternating Front & Back)
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Contains all 30 card faces (15 Fronts and 15 Backs) arranged in alternating order on a single 10-column × 3-row grid sheet: <br />
                  <code className="text-pink-300">[Card 1 Front, Card 1 Back, Card 2 Front, Card 2 Back, ...]</code>
                </p>
              </div>

              <button
                onClick={exportScreentopSheet}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-lg cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download Screentop 30-Card Sheet PNG (2800px)
              </button>
            </div>

            {/* Scrollable Container for 30-card sheet */}
            <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
              <div
                id="screentop-sheet-export"
                className="bg-black p-0 m-0 leading-none select-none border border-slate-700"
                style={{ width: '2800px', display: 'grid', gridTemplateColumns: 'repeat(10, 280px)', gap: 0 }}
              >
                {LITE_CARD_PAIRS.flatMap((card) => [
                  <div key={`screentop-card-${card.id}-A`} className="w-[280px] h-[392px]">
                    <CleanCardSVG colorA={card.colorA} colorB={card.colorB} width={280} height={392} />
                  </div>,
                  <div key={`screentop-card-${card.id}-B`} className="w-[280px] h-[392px]">
                    <CleanCardSVG colorA={card.colorB} colorB={card.colorA} width={280} height={392} />
                  </div>
                ])}
              </div>
            </div>
          </section>
        )}
          </div>
        )}
      </main>
    </div>
  );
}
