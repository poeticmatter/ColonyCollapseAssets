import React, { useState, useRef } from 'react';
import { Download, Printer, LayoutGrid, Eye, Search, Sparkles, Filter, RefreshCw, Zap, RotateCw, CheckCircle2, Copy, Hexagon, Shield, Layers, HelpCircle, FileImage } from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';

// --- COLOR PALETTE & SCHEMES ---
const COLOR_SCHEMES = {
  Red: {
    name: 'Red',
    hexCode: '#EF4444',
    darkHex: '#B91C1C',
    lightBg: '#FFF5F5',
    accentBorder: '#EF4444',
    badgeBg: 'bg-red-100 text-red-800 border-red-300',
    bannerGradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    tagline: 'Courage & Action'
  },
  Green: {
    name: 'Green',
    hexCode: '#22C55E',
    darkHex: '#15803D',
    lightBg: '#F0FDF4',
    accentBorder: '#22C55E',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bannerGradient: 'linear-gradient(135deg, #16A34A 0%, #166534 100%)',
    tagline: 'Growth & Resources'
  },
  Blue: {
    name: 'Blue',
    hexCode: '#3B82F6',
    darkHex: '#1D4ED8',
    lightBg: '#EFF6FF',
    accentBorder: '#3B82F6',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
    bannerGradient: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
    tagline: 'Wisdom & Strategy'
  },
  Purple: {
    name: 'Purple',
    hexCode: '#A855F7',
    darkHex: '#7E22CE',
    lightBg: '#FAF5FF',
    accentBorder: '#A855F7',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    bannerGradient: 'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)',
    tagline: 'Sovereignty & Governance'
  },
  Yellow: {
    name: 'Yellow',
    hexCode: '#FACC15',
    darkHex: '#CA8A04',
    lightBg: '#FEFCE8',
    accentBorder: '#FACC15',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    bannerGradient: 'linear-gradient(135deg, #FACC15 0%, #EAB308 100%)',
    tagline: 'Honey & Energy'
  },
  Orange: {
    name: 'Orange',
    hexCode: '#F97316',
    darkHex: '#C2410C',
    lightBg: '#FFF7ED',
    accentBorder: '#F97316',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    bannerGradient: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
    tagline: 'Unity & Mobilization'
  }
};

// 18 Ability Templates
const CARD_TEMPLATES = [
  {
    id: 1,
    title: "Market Overhaul",
    type: "Immediate",
    effect: "Flip all tiles of one color in the market.",
    colors: ["Red", "Green"],
    flavor: "A sudden gust through the trading comb resets available faction resources."
  },
  {
    id: 2,
    title: "Priority Flight",
    type: "Immediate",
    effect: "Move your turn order marker one step up from the first player.",
    colors: ["Red", "Blue"],
    flavor: "Early foragers catch the sweetest blooms before the general assembly convenes."
  },
  {
    id: 3,
    title: "Comb Inversion",
    type: "Immediate",
    effect: "Flip a tile on the board.",
    colors: ["Red", "Purple"],
    flavor: "Flipping a wax cell in the field alters regional development priorities."
  },
  {
    id: 4,
    title: "Underdog Surge",
    type: "Immediate",
    effect: "Move up on each issue where you are last or tied for last.",
    colors: ["Red", "Yellow"],
    flavor: "Trailing delegates rally public momentum across contested legislative fronts."
  },
  {
    id: 5,
    title: "Strategic Foresight",
    type: "Immediate",
    effect: "Look at the top three cards of the deck, play one and discard the others.",
    colors: ["Red", "Orange"],
    flavor: "Scouts inspect upcoming decrees and enact the most decisive motion."
  },
  {
    id: 6,
    title: "Ballot Lock",
    type: "Immediate",
    effect: "Lock a vote.",
    colors: ["Red", "Green"],
    flavor: "Sealing the voting chamber solidifies the current democratic consensus."
  },
  {
    id: 7,
    title: "Burned Protocol",
    type: "Immediate",
    effect: "Use an action tile at strength 4. You may not use that tile again this game.",
    colors: ["Green", "Blue"],
    flavor: "Exhausting a structural blueprint yields an explosive burst of momentum."
  },
  {
    id: 8,
    title: "Grassroots Rally",
    type: "Immediate",
    effect: "Move up on each issue where you are last or tied for last.",
    colors: ["Green", "Purple"],
    flavor: "Back-bench reformers unite to surge forward on neglected policies."
  },
  {
    id: 9,
    title: "Rapid Annexation",
    type: "Immediate",
    effect: "Take a PLACE action of strength 4.",
    colors: ["Green", "Yellow"],
    flavor: "Deploying massive wax reserves to establish immediate territorial control."
  },
  {
    id: 10,
    title: "Tactical Placement",
    type: "Ongoing",
    effect: "PLACE: You may flip a tile before placing it.",
    colors: ["Green", "Orange"],
    flavor: "Inspecting both faces of the comb tile ensures optimal municipal placement."
  },
  {
    id: 11,
    title: "Pollen Preservation",
    type: "Ongoing",
    effect: "FLIP: You may choose to not flip the tile.",
    colors: ["Blue", "Purple"],
    flavor: "Maintaining current orientation keeps delicate honey reserves intact."
  },
  {
    id: 12,
    title: "Reserve Activation",
    type: "Ongoing",
    effect: "REPEAT: You may use a tile set aside instead of repeating.",
    colors: ["Blue", "Yellow"],
    flavor: "Drawing upon set-aside blueprints provides versatile action alternatives."
  },
  {
    id: 13,
    title: "Echoing Decree",
    type: "Ongoing",
    effect: "When you play a card with an Immediate effect, resolve it again, then discard this card.",
    colors: ["Blue", "Orange"],
    flavor: "A powerful proclamation reverberates throughout the entire hive structure."
  },
  {
    id: 14,
    title: "Preemptive Rotation",
    type: "Ongoing",
    effect: "FLIP: You may flip the tile before bumping and flipping.",
    colors: ["Blue", "Purple"],
    flavor: "Rotating the wax block prior to shifting destabilizes rival momentum."
  },
  {
    id: 15,
    title: "Grassroots Leverage",
    type: "Ongoing",
    effect: "You win ties with players above you on the turn order track.",
    colors: ["Purple", "Yellow"],
    flavor: "When votes are equal, lower-ranking reformers hold the deciding weight."
  },
  {
    id: 16,
    title: "Policy Pivot",
    type: "Ongoing",
    effect: "PLAY CARD: Instead of gaining the effect, you may discard the card to move up the issue another time.",
    colors: ["Purple", "Orange"],
    flavor: "Converting written bills directly into political influence and momentum."
  },
  {
    id: 17,
    title: "Voter Mandate",
    type: "Ongoing",
    effect: "POLLING: Once per poll, you may lock a vote in a district you won.",
    colors: ["Yellow", "Orange"],
    flavor: "Securing a district victory allows delegates to lock down the ballot."
  },
  {
    id: 18,
    title: "Flight Momentum",
    type: "Ongoing",
    effect: "Any time you overtake someone in turn order, go up another step.",
    colors: ["Yellow", "Orange"],
    flavor: "Breaking ahead in the draft creates an updraft launching you further forward."
  }
];

// Generate full deck: 18 templates * 2 copies (different colors) = 36 total cards
const generateDeck = () => {
  const deck = [];
  let cardIdCounter = 1;

  CARD_TEMPLATES.forEach((tpl) => {
    // Copy 1 (Color A)
    deck.push({
      uniqueId: cardIdCounter++,
      templateId: tpl.id,
      title: tpl.title,
      type: tpl.type,
      effect: tpl.effect,
      color: tpl.colors[0],
      altColor: tpl.colors[1],
      copyLabel: 'Copy A',
      flavor: tpl.flavor
    });

    // Copy 2 (Color B)
    deck.push({
      uniqueId: cardIdCounter++,
      templateId: tpl.id,
      title: tpl.title,
      type: tpl.type,
      effect: tpl.effect,
      color: tpl.colors[1],
      altColor: tpl.colors[0],
      copyLabel: 'Copy B',
      flavor: tpl.flavor
    });
  });

  return deck;
};

// --- CUSTOM SVG VECTOR ARTWORK COMPONENTS ---

// Honeycomb Background Pattern SVG
const HoneycombBgSVG = ({ colorHex = '#EF4444' }) => (
  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
    <defs>
      <pattern id={`hex-pattern-${colorHex.replace('#', '')}`} width="20" height="34.64" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
        <path
          d="M10 0 L20 5.77 L20 17.32 L10 23.09 L0 17.32 L0 5.77 Z M10 34.64 L20 28.87 L20 17.32 L10 23.09 L0 17.32 L0 28.87 Z"
          fill="none"
          stroke={colorHex}
          strokeWidth="0.8"
          strokeOpacity="0.6"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#hex-pattern-${colorHex.replace('#', '')})`} />
  </svg>
);

// Bee Democracy Emblem SVG
const BeeDemocracyEmblemSVG = ({ colorHex = '#EAB308', size = 80 }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} className="drop-shadow-sm">
    <defs>
      <radialGradient id="emblem-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={colorHex} stopOpacity="0.3" />
        <stop offset="100%" stopColor={colorHex} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.4" />
      </linearGradient>
    </defs>

    {/* Background Hexagon Shield */}
    <polygon points="60,8 105,34 105,86 60,112 15,86 15,34" fill="url(#emblem-glow)" stroke={colorHex} strokeWidth="1.5" strokeDasharray="4 2" />

    {/* Wings */}
    <path d="M 60 48 Q 25 20 18 42 Q 35 55 60 52 Z" fill="url(#wing-grad)" stroke="#94A3B8" strokeWidth="1" />
    <path d="M 60 48 Q 95 20 102 42 Q 85 55 60 52 Z" fill="url(#wing-grad)" stroke="#94A3B8" strokeWidth="1" />

    {/* Bee Body */}
    <ellipse cx="60" cy="62" rx="18" ry="24" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />
    {/* Body Stripes */}
    <path d="M 44 54 Q 60 50 76 54" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M 43 62 Q 60 58 77 62" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M 45 70 Q 60 66 75 70" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />

    {/* Bee Head */}
    <circle cx="60" cy="38" r="10" fill="#1E293B" />
    {/* Crown / Democratic Laurel */}
    <path d="M 52 32 L 56 24 L 60 30 L 64 24 L 68 32 Z" fill="#F59E0B" stroke="#78350F" strokeWidth="0.8" />
    <circle cx="60" cy="27" r="1.5" fill="#EF4444" />

    {/* Ballot Box Star underneath */}
    <path d="M 60 84 L 63 90 L 70 91 L 65 95 L 66 102 L 60 98 L 54 102 L 55 95 L 50 91 L 57 90 Z" fill="#F59E0B" />
  </svg>
);

// Card Back Graphic SVG
const CardBackGraphicSVG = () => (
  <svg viewBox="0 0 200 300" className="w-full h-full">
    <defs>
      <linearGradient id="card-back-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="50%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <pattern id="card-back-hex" width="24" height="41.56" patternUnits="userSpaceOnUse">
        <path
          d="M12 0 L24 6.93 L24 20.78 L12 27.71 L0 20.78 L0 6.93 Z"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="0.75"
          strokeOpacity="0.25"
        />
      </pattern>
    </defs>

    {/* Outer background */}
    <rect width="200" height="300" rx="12" fill="url(#card-back-bg)" />
    <rect width="200" height="300" fill="url(#card-back-hex)" />

    {/* Gold Ornate Hex Frame */}
    <rect x="12" y="12" width="176" height="276" rx="8" fill="none" stroke="#D97706" strokeWidth="2" />
    <rect x="16" y="16" width="168" height="268" rx="6" fill="none" stroke="#F59E0B" strokeWidth="0.8" strokeDasharray="6 3" />

    {/* Central Emblem */}
    <g transform="translate(100, 150)">
      <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="0" cy="0" r="32" fill="#0F172A" stroke="#D97706" strokeWidth="1.5" />

      {/* Bee Icon */}
      <path d="M -15 -5 Q 0 -20 15 -5 Q 10 10 0 15 Q -10 10 -15 -5 Z" fill="#F59E0B" />
      <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#0F172A" strokeWidth="2.5" />
      <line x1="-10" y1="4" x2="10" y2="4" stroke="#0F172A" strokeWidth="2.5" />

      <text x="0" y="70" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="bold" letterSpacing="2">
        COLONY
      </text>
      <text x="0" y="84" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="bold" letterSpacing="1.5">
        COLLAPSE
      </text>
    </g>
  </svg>
);

// --- MAIN SINGLE CARD RENDER COMPONENT ---
const SingleCard = ({ card, onSelectCard }) => {
  const scheme = COLOR_SCHEMES[card.color] || COLOR_SCHEMES.Red;
  const isImmediate = card.type === 'Immediate';

  return (
    <div
      onClick={() => onSelectCard && onSelectCard(card)}
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-lg border-2 bg-white flex flex-col justify-between transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 cursor-pointer select-none"
      style={{ borderColor: scheme.hexCode }}
    >
      {/* 1. TOP COLOR BANNER (Occupies approx 28% of card) */}
      <div
        className="relative h-[28%] w-full px-3 py-2.5 flex items-center justify-center text-white overflow-hidden text-center"
        style={{ background: scheme.bannerGradient }}
      >
        <HoneycombBgSVG colorHex="#FFFFFF" />

        {/* Card Title */}
        <h3 className="relative z-10 text-base sm:text-lg font-black tracking-tight drop-shadow-md leading-tight text-white my-auto">
          {card.title}
        </h3>
      </div>

      {/* 2. CARD BODY AREA (Occupies approx 72% light readable area) */}
      <div
        className="relative flex-1 p-3 flex flex-col justify-between bg-[#FDFBF7] text-slate-900 border-t"
        style={{ borderTopColor: scheme.hexCode }}
      >
        {/* Subtle Watermark Illustration in Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <BeeDemocracyEmblemSVG colorHex={scheme.hexCode} size={150} />
        </div>

        {/* Ability Type Indicator Bar (Large Icon in Card Color) */}
        <div className="relative z-10 flex items-center gap-2 pb-1.5 border-b border-slate-200">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full text-white font-black shadow-md flex-shrink-0"
            style={{ backgroundColor: scheme.darkHex }}
          >
            {isImmediate ? <Zap className="w-4 h-4 fill-current" /> : <RotateCw className="w-4 h-4" />}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {isImmediate ? 'Immediate Action' : 'Ongoing Effect'}
          </span>
        </div>

        {/* Ability Main Text Box */}
        <div className="relative z-10 my-auto py-2 px-2.5 rounded-lg bg-white/80 border border-slate-200/80 shadow-xs">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
            {card.effect}
          </p>
        </div>

        {/* Flavor Text */}
        <div className="relative z-10 pt-1.5 border-t border-slate-100">
          <p className="text-[11px] italic text-slate-500 leading-tight">
            "{card.flavor}"
          </p>
        </div>

        {/* Card Footer: Game Name & Serial */}
        <div className="relative z-10 mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-200/50">
          <span>COLONY COLLAPSE</span>
          <span style={{ color: scheme.darkHex }}>#{String(card.uniqueId).padStart(2, '0')}/36</span>
        </div>
      </div>
    </div>
  );
};

// --- TABLETOP SIMULATOR (TTS) CARD COMPONENT (Edge-to-edge 0 gap, full size, sharp square corners) ---
const TTSCard = ({ card }) => {
  const scheme = COLOR_SCHEMES[card.color] || COLOR_SCHEMES.Red;
  const isImmediate = card.type === 'Immediate';

  return (
    <div
      className="relative w-[280px] h-[392px] bg-white flex flex-col justify-between overflow-hidden box-border border-b border-r border-slate-300"
      style={{ borderColor: scheme.darkHex }}
    >
      {/* 1. TOP COLOR BANNER (28% of card) */}
      <div
        className="relative h-[28%] w-full px-3.5 py-3 flex items-center justify-center text-white overflow-hidden text-center"
        style={{ background: scheme.bannerGradient }}
      >
        <HoneycombBgSVG colorHex="#FFFFFF" />

        {/* Card Title */}
        <h3 className="relative z-10 text-lg font-black tracking-tight drop-shadow-md leading-tight text-white my-auto">
          {card.title}
        </h3>
      </div>

      {/* 2. CARD BODY AREA (72% light area) */}
      <div
        className="relative flex-1 p-3.5 flex flex-col justify-between bg-[#FDFBF7] text-slate-900 border-t-2"
        style={{ borderTopColor: scheme.hexCode }}
      >
        {/* Watermark Illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <BeeDemocracyEmblemSVG colorHex={scheme.hexCode} size={180} />
        </div>

        {/* Ability Type Indicator Bar */}
        <div className="relative z-10 flex items-center gap-2.5 pb-2 border-b border-slate-200">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full text-white font-black shadow-sm flex-shrink-0"
            style={{ backgroundColor: scheme.darkHex }}
          >
            {isImmediate ? <Zap className="w-4.5 h-4.5 fill-current" /> : <RotateCw className="w-4.5 h-4.5" />}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {isImmediate ? 'Immediate Action' : 'Ongoing Effect'}
          </span>
        </div>

        {/* Ability Main Text Box */}
        <div className="relative z-10 my-auto py-2.5 px-3 rounded-lg bg-white/90 border border-slate-300 shadow-xs">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
            {card.effect}
          </p>
        </div>

        {/* Flavor Text */}
        <div className="relative z-10 pt-2 border-t border-slate-200/80">
          <p className="text-[11px] italic text-slate-600 leading-tight">
            "{card.flavor}"
          </p>
        </div>

        {/* Card Footer */}
        <div className="relative z-10 mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-200/50">
          <span>COLONY COLLAPSE</span>
          <span style={{ color: scheme.darkHex }}>#{String(card.uniqueId).padStart(2, '0')}/36</span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT FOR COLONY COLLAPSE ---
export default function ColonyCollapseAssets() {
  const [deck, setDeck] = useState(generateDeck);
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'print', 'tts', 'backs'
  const [selectedCardModal, setSelectedCardModal] = useState(null);
  const [showCutLines, setShowCutLines] = useState(true);

  const printRef = useRef(null);

  // Filter Deck based on user controls
  const filteredDeck = deck.filter((card) => {
    const matchesColor = selectedColor === 'ALL' || card.color === selectedColor;
    const matchesType = selectedType === 'ALL' || card.type === selectedType;
    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.effect.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.color.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesColor && matchesType && matchesSearch;
  });

  // Calculate Statistics
  const colorCounts = {
    Red: deck.filter((c) => c.color === 'Red').length,
    Green: deck.filter((c) => c.color === 'Green').length,
    Blue: deck.filter((c) => c.color === 'Blue').length,
    Purple: deck.filter((c) => c.color === 'Purple').length,
    Yellow: deck.filter((c) => c.color === 'Yellow').length,
    Orange: deck.filter((c) => c.color === 'Orange').length
  };

  const typeCounts = {
    Immediate: deck.filter((c) => c.type === 'Immediate').length,
    Ongoing: deck.filter((c) => c.type === 'Ongoing').length
  };

  // Export card as image
  const exportCardAsImage = (card) => {
    const cardNode = document.getElementById(`card-export-${card.uniqueId}`);
    if (!cardNode) return;

    toPng(cardNode, { cacheBust: true, quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ColonyCollapse_${card.title.replace(/\s+/g, '_')}_${card.color}_${card.copyLabel}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Export error:', err);
      });
  };

  // Export Single Card Back PNG
  const exportSingleCardBack = () => {
    const node = document.getElementById('single-card-back-export');
    if (!node) return;

    toPng(node, { cacheBust: true, quality: 0.98 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'ColonyCollapse_CardBack.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  // Export TTS Deck Image (10 Columns Grid)
  const exportTTSSheet = () => {
    const node = document.getElementById('tts-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'ColonyCollapse_TTS_DeckSheet_10cols.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Banner */}
      <header className="relative bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 border-b border-amber-800/40 px-4 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">
              <Hexagon className="w-4 h-4 fill-amber-400/20 stroke-amber-400" />
              Board Game Asset Generator
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Colony Collapse
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-semibold">
                Bee Democracy
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              36 Cards (18 abilities × 2 color copies). Perfectly balanced equal color distribution (6 cards of each color: Red, Green, Blue, Purple, Yellow, Orange).
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition shadow-md active:scale-95 cursor-pointer text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4" />
              Print Deck
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Filter Controls & Deck Stats */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-6 shadow-lg backdrop-blur-md no-print">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* View Mode Toggle */}
            <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cards Grid ({filteredDeck.length})
              </button>
              <button
                onClick={() => setViewMode('print')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'print' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-4 h-4" />
                Print Sheet (9/page)
              </button>
              <button
                onClick={() => setViewMode('tts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'tts' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileImage className="w-4 h-4" />
                TTS Sheet (10 Cols)
              </button>
              <button
                onClick={() => setViewMode('backs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'backs' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                Card Backs
              </button>
            </div>

            {/* Filter Options */}
            <div className="flex flex-wrap items-center gap-3 flex-1 lg:justify-end">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search card text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Color filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 font-medium mr-1">Color:</span>
                <button
                  onClick={() => setSelectedColor('ALL')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    selectedColor === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({deck.length})
                </button>
                {Object.keys(COLOR_SCHEMES).map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border transition ${
                      selectedColor === col ? 'ring-2 ring-amber-400 scale-105' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: COLOR_SCHEMES[col].darkHex,
                      borderColor: COLOR_SCHEMES[col].hexCode,
                      color: '#FFF'
                    }}
                  >
                    {col} ({colorCounts[col]})
                  </button>
                ))}
              </div>

              {/* Ability Type filter */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 font-medium mr-1">Type:</span>
                <button
                  onClick={() => setSelectedType('ALL')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    selectedType === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedType('Immediate')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                    selectedType === 'Immediate' ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" /> Immediate ({typeCounts.Immediate})
                </button>
                <button
                  onClick={() => setSelectedType('Ongoing')}
                  className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                    selectedType === 'Ongoing' ? 'bg-indigo-500 text-white' : 'bg-slate-950 text-indigo-400 border border-indigo-500/40'
                  }`}
                >
                  <RotateCw className="w-3 h-3" /> Ongoing ({typeCounts.Ongoing})
                </button>
              </div>

            </div>
          </div>

          {/* Color Distribution Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Equal Color Distribution (6 each):</span>
              {Object.entries(colorCounts).map(([color, count]) => (
                <span key={color} className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_SCHEMES[color].hexCode }}></span>
                  <span className="text-white font-medium">{color}: {count}</span>
                </span>
              ))}
            </div>
            <div className="text-slate-400">
              ⚡ Immediate: <strong className="text-amber-400">{typeCounts.Immediate}</strong> | 🔄 Ongoing: <strong className="text-indigo-400">{typeCounts.Ongoing}</strong> | Total: <strong className="text-white">36 cards</strong>
            </div>
          </div>
        </section>

        {/* ---------------- VIEW MODE 1: CARDS GRID ---------------- */}
        {viewMode === 'grid' && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredDeck.map((card) => (
              <div key={card.uniqueId} id={`card-export-${card.uniqueId}`} className="flex flex-col">
                <SingleCard card={card} onSelectCard={setSelectedCardModal} />
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400 px-1 no-print">
                  <span className="truncate">{card.title} ({card.copyLabel})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportCardAsImage(card);
                    }}
                    className="hover:text-amber-400 p-1 transition cursor-pointer"
                    title="Download PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ---------------- VIEW MODE 2: PRINT SHEET (9 Cards per A4 Page) ---------------- */}
        {viewMode === 'print' && (
          <section className="space-y-8">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 no-print">
              <div>
                <h3 className="font-bold text-white text-base">Print Layout (9 Cards per Page)</h3>
                <p className="text-xs text-slate-400">Optimized standard poker card size for printing on A4 / Letter paper.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  Show Crop / Cut Lines
                </label>
                <button
                  onClick={() => window.print()}
                  className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-amber-400 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
              </div>
            </div>

            {/* Print Grid Pages */}
            <div ref={printRef} className="print-area space-y-12">
              {Array.from({ length: Math.ceil(filteredDeck.length / 9) }).map((_, pageIdx) => {
                const pageCards = filteredDeck.slice(pageIdx * 9, (pageIdx + 1) * 9);
                return (
                  <div
                    key={pageIdx}
                    className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after"
                  >
                    <div className="text-center pb-3 border-b border-slate-200 mb-4 print:hidden">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Page {pageIdx + 1} of {Math.ceil(filteredDeck.length / 9)} — Cards {pageIdx * 9 + 1} to {Math.min((pageIdx + 1) * 9, filteredDeck.length)}
                      </span>
                    </div>

                    {/* 3x3 Cards Grid */}
                    <div className="grid grid-cols-3 gap-3 print:gap-2">
                      {pageCards.map((card) => (
                        <div key={card.uniqueId} className={`relative ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                          <SingleCard card={card} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 3: TABLETOP SIMULATOR (TTS) 10-COLUMN SHEET EXPORT ---------------- */}
        {viewMode === 'tts' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 no-print">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-amber-400" />
                  Tabletop Simulator (TTS) 10-Column Deck Sheet (2800px Wide)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full-resolution, zero-gap edge-to-edge layout for Tabletop Simulator custom deck import (36 cards).
                </p>
              </div>
              <button
                onClick={exportTTSSheet}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-md cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download Full-Size TTS Sheet PNG (2800px)
              </button>
            </div>

            {/* Scrollable Container so user can see full-size sheet */}
            <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
              <div
                id="tts-sheet-export"
                className="bg-black p-0 m-0 leading-none select-none border border-slate-700"
                style={{ width: '2800px', display: 'grid', gridTemplateColumns: 'repeat(10, 280px)', gap: 0 }}
              >
                {/* 36 Deck Cards */}
                {deck.map((card) => (
                  <TTSCard key={card.uniqueId} card={card} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 4: CARD BACKS & SINGLE BACK EXPORT ---------------- */}
        {viewMode === 'backs' && (
          <section className="space-y-8">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 no-print flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Single Card Back Preview for Export (Exact 280px × 392px TTS match) */}
                <div id="single-card-back-export" className="w-[280px] h-[392px] rounded-none overflow-hidden shadow-2xl border border-amber-500/80 flex-shrink-0 bg-slate-950">
                  <CardBackGraphicSVG />
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="font-black text-white text-xl">Single Card Back Export (280px × 392px)</h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Export a high-resolution standalone PNG of the Colony Collapse card back. Sized at exactly 280px × 392px to match TTS single card dimensions.
                  </p>
                  <button
                    onClick={exportSingleCardBack}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer mt-3"
                  >
                    <Download className="w-4 h-4" /> Download Single Card Back PNG (280px)
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Grid of Card Backs */}
            <div className="space-y-4">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Printable Grid of Card Backs (For Double-Sided Home Printing)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="aspect-[2.5/3.5] w-full rounded-xl overflow-hidden shadow-2xl border-2 border-amber-600/50">
                    <CardBackGraphicSVG />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* --- MODAL FOR ENLARGED CARD INSPECTION & EDITING --- */}
      {selectedCardModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={() => setSelectedCardModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCardModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-56 flex-shrink-0">
                <SingleCard card={selectedCardModal} />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: COLOR_SCHEMES[selectedCardModal.color].darkHex }}
                  >
                    {selectedCardModal.color}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{selectedCardModal.copyLabel}</span>
                </div>

                <h2 className="text-xl font-black text-white">{selectedCardModal.title}</h2>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Ability Type</span>
                  <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    {selectedCardModal.type === 'Immediate' ? (
                      <>
                        <Zap className="w-4 h-4 fill-amber-400" /> Immediate Action
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-4 h-4 text-indigo-400" /> Ongoing Effect
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Effect Description</span>
                  <p className="text-sm text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {selectedCardModal.effect}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Flavor Text</span>
                  <p className="text-xs italic text-slate-400">"{selectedCardModal.flavor}"</p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => exportCardAsImage(selectedCardModal)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Download Card PNG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
