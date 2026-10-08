import React, { useState, useRef, useMemo } from 'react';
import { Download, Printer, LayoutGrid, Eye, Search, Sparkles, Filter, RefreshCw, Zap, RotateCw, CheckCircle2, Copy, Hexagon, Shield, Layers, HelpCircle, FileImage, Upload, AlertTriangle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { exportForTTS, exportForScreentop, buildAssetFilename } from 'asset-kit';
import {
  CC_COLOR_HEX,
  CC_COLOR_DEEP_HEX,
  CC_COLOR_INK,
  CC_COLOR_ORDER,
  CC_COLOR_TAGLINE
} from './colonyCollapsePalette.js';
import IssueSymbol from './ColonyCollapseIssueSymbol.jsx';
import BeeMark from './ColonyCollapseBeeMark.jsx';

// --- COLOR PALETTE & SCHEMES ---
// Chalk issue colors are light, so every scheme carries an ink tone for text
// and glyphs that sit on top of the color.
const COLOR_SCHEMES = Object.fromEntries(
  CC_COLOR_ORDER.map((name) => [
    name,
    {
      name,
      hexCode: CC_COLOR_HEX[name],
      darkHex: CC_COLOR_DEEP_HEX[name],
      inkHex: CC_COLOR_INK[name],
      tagline: CC_COLOR_TAGLINE[name]
    }
  ])
);

// 18 Ability Templates. Every card carries two issue colors, and each
// ability's two copies use different pairs that together cover four distinct
// colors. Across the deck every color appears on exactly 12 cards and every
// one of the 15 possible pairs shows up 2-3 times.
const CARD_TEMPLATES = [
  {
    id: 1,
    title: "Comb Overturn",
    type: "Immediate",
    effect: "Flip any number of tiles in the display.",
    colorPairs: [["Clay", "Sage"], ["Periwinkle", "Seafoam"]],
    flavor: "A coordinated push through the trading comb turns every open cell face up."
  },
  {
    id: 2,
    title: "Long Flight",
    type: "Immediate",
    effect: "Move your player pawn to any space on the board then rally one adjacent tile.",
    colorPairs: [["Clay", "Seafoam"], ["Sage", "Periwinkle"]],
    flavor: "Scouts range far beyond the usual foraging paths to stake a distant claim."
  },
  {
    id: 3,
    title: "Dissident Rally",
    type: "Immediate",
    effect: "Rally a tile, even if you aren't leading the issue.",
    colorPairs: [["Clay", "Mauve"], ["Sage", "Stone"]],
    flavor: "Even the back benches can summon support when the moment calls for it."
  },
  {
    id: 4,
    title: "Speaker's Favor",
    type: "Immediate",
    effect: "Give the first player marker to a player of your choice.",
    colorPairs: [["Clay", "Periwinkle"], ["Sage", "Seafoam"]],
    flavor: "A well-placed favor buys more influence than the gavel itself."
  },
  {
    id: 5,
    title: "Ward Sweep",
    type: "Immediate",
    effect: "Rally all tiles in a district.",
    colorPairs: [["Clay", "Stone"], ["Sage", "Mauve"]],
    flavor: "One motion carries the whole district, cell by cell, all at once."
  },
  {
    id: 6,
    title: "Blueprint Revision",
    type: "Immediate",
    effect: "Upgrade one of your action tiles.",
    colorPairs: [["Clay", "Sage"], ["Periwinkle", "Mauve"]],
    flavor: "Revised plans catch on fast among colonies eager for an edge."
  },
  {
    id: 7,
    title: "Reserve Deployment",
    type: "Immediate",
    effect: "Use a set aside action tile at strength 3.",
    colorPairs: [["Sage", "Seafoam"], ["Clay", "Periwinkle"]],
    flavor: "What was shelved for later proves useful sooner than expected."
  },
  {
    id: 8,
    title: "Market Reshuffle",
    type: "Immediate",
    effect: "Rearrange all the tiles in the display.",
    colorPairs: [["Sage", "Mauve"], ["Clay", "Stone"]],
    flavor: "A brisk reordering of the trading comb catches every rival off guard."
  },
  {
    id: 9,
    title: "Supply Refresh",
    type: "Immediate",
    effect: "Replace any number of tiles in the display with tiles from the bag.",
    colorPairs: [["Sage", "Periwinkle"], ["Clay", "Seafoam"]],
    flavor: "Stale offerings are swept aside for whatever the reserve bag yields next."
  },
  {
    id: 10,
    title: "Deferred Gavel",
    type: "Ongoing",
    effect: "You may pass the first player token if you have it.",
    colorPairs: [["Sage", "Stone"], ["Clay", "Mauve"]],
    flavor: "Leading first isn't always leading best; some delegates prefer to watch and wait."
  },
  {
    id: 11,
    title: "Echoing Decree",
    type: "Ongoing",
    effect: "When you play a card with an Immediate effect, resolve it again, then discard this card.",
    colorPairs: [["Seafoam", "Mauve"], ["Clay", "Stone"]],
    flavor: "A powerful proclamation reverberates throughout the entire hive structure."
  },
  {
    id: 12,
    title: "Cross-Party Address",
    type: "Ongoing",
    effect: "ADDRESS: You may play a card matching the tile's color instead of advancing on an issue.",
    colorPairs: [["Seafoam", "Periwinkle"], ["Stone", "Mauve"]],
    flavor: "Shared colors make for unlikely allies at the podium."
  },
  {
    id: 13,
    title: "Site Prep",
    type: "Ongoing",
    effect: "DEVELOP: You may also place a tile before turning the dial.",
    colorPairs: [["Seafoam", "Stone"], ["Clay", "Sage"]],
    flavor: "Groundwork laid ahead of schedule keeps the dial turning smoothly."
  },
  {
    id: 14,
    title: "Policy Trade",
    type: "Ongoing",
    effect: "LEVERAGE: You may advance on an issue of the card's color instead of gaining the card's effect.",
    colorPairs: [["Seafoam", "Mauve"], ["Periwinkle", "Stone"]],
    flavor: "Some delegates cash in favors for votes instead of votes for favors."
  },
  {
    id: 15,
    title: "Waggle Sweep",
    type: "Ongoing",
    effect: "DANCE: You may instead rally all tiles in a district adjacent to your pawn.",
    colorPairs: [["Mauve", "Periwinkle"], ["Stone", "Seafoam"]],
    flavor: "A well-danced signal draws support from the neighboring wards."
  },
  {
    id: 16,
    title: "Extra Hands",
    type: "Ongoing",
    effect: "INTERN: N = 2.",
    colorPairs: [["Mauve", "Stone"], ["Periwinkle", "Seafoam"]],
    flavor: "Two apprentices accomplish what one alone could not."
  },
  {
    id: 17,
    title: "Press Cycle",
    type: "Ongoing",
    effect: "MEDIA: You may instead replace a tile with a tile from the bag.",
    colorPairs: [["Periwinkle", "Stone"], ["Sage", "Mauve"]],
    flavor: "A fresh headline is worth more than yesterday's stock."
  },
  {
    id: 18,
    title: "Swift Withdrawal",
    type: "Ongoing",
    effect: "When another player rallies a tile you control, remove your token before they do.",
    colorPairs: [["Periwinkle", "Stone"], ["Seafoam", "Mauve"]],
    flavor: "Wise delegates know when to retreat before the vote turns against them."
  }
];

const COPY_LABELS = ['Copy A', 'Copy B'];

// Generate the full deck from a list of ability templates: each template
// becomes 2 cards, one per color pair in its `colorPairs`.
const generateDeck = (templates) =>
  templates.flatMap((tpl, templateIdx) =>
    tpl.colorPairs.map((colors, copyIdx) => ({
      uniqueId: templateIdx * COPY_LABELS.length + copyIdx + 1,
      templateId: tpl.id,
      title: tpl.title,
      type: tpl.type,
      effect: tpl.effect,
      colors,
      copyLabel: COPY_LABELS[copyIdx],
      flavor: tpl.flavor
    }))
  );

// --- CSV EXPORT / IMPORT FOR CARD ABILITY TEMPLATES ---
// One column per color slot: copy A's pair, then copy B's pair.
const CSV_COLOR_COLUMNS = ['copyAColor1', 'copyAColor2', 'copyBColor1', 'copyBColor2'];
const CSV_COLUMNS = ['id', 'title', 'type', 'effect', ...CSV_COLOR_COLUMNS, 'flavor'];
const REQUIRED_CSV_COLUMNS = ['title', 'type', 'effect', ...CSV_COLOR_COLUMNS, 'flavor'].map((col) => col.toLowerCase());

const escapeCSVField = (value) => {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const templatesToCSV = (templates) => {
  const rows = templates.map((tpl) => [tpl.id, tpl.title, tpl.type, tpl.effect, ...tpl.colorPairs.flat(), tpl.flavor]);
  return [CSV_COLUMNS, ...rows].map((row) => row.map(escapeCSVField).join(',')).join('\r\n');
};

// Minimal RFC 4180 parser: handles quoted fields containing commas, quotes, and newlines.
const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // handled by the following \n, or ignored for bare \r
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
};

// Converts parsed CSV rows into card ability templates, validating each row.
// Throws with a row-numbered, human-readable message on the first problem found.
const csvRowsToTemplates = (rows) => {
  if (rows.length < 2) {
    throw new Error('CSV must contain a header row plus at least one card row.');
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const missingColumns = REQUIRED_CSV_COLUMNS.filter((col) => !header.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required column(s): ${missingColumns.join(', ')}.`);
  }
  const colIndex = Object.fromEntries(header.map((name, idx) => [name, idx]));
  const readCell = (row, name) => (row[colIndex[name]] ?? '').trim();

  return rows.slice(1).map((row, rowIdx) => {
    const lineNumber = rowIdx + 2;
    const title = readCell(row, 'title');
    const type = readCell(row, 'type');
    const effect = readCell(row, 'effect');
    const colorSlots = CSV_COLOR_COLUMNS.map((col) => readCell(row, col.toLowerCase()));
    const flavor = readCell(row, 'flavor');
    const idRaw = colIndex.id !== undefined ? readCell(row, 'id') : '';

    if (!title) throw new Error(`Row ${lineNumber}: "title" is required.`);
    if (type !== 'Immediate' && type !== 'Ongoing') {
      throw new Error(`Row ${lineNumber}: "type" must be "Immediate" or "Ongoing", got "${type}".`);
    }
    if (!effect) throw new Error(`Row ${lineNumber}: "effect" is required.`);
    CSV_COLOR_COLUMNS.forEach((col, slotIdx) => {
      if (!CC_COLOR_ORDER.includes(colorSlots[slotIdx])) {
        throw new Error(`Row ${lineNumber}: "${col}" must be one of ${CC_COLOR_ORDER.join(', ')} (got "${colorSlots[slotIdx]}").`);
      }
    });
    const colorPairs = [colorSlots.slice(0, 2), colorSlots.slice(2, 4)];
    colorPairs.forEach(([first, second], copyIdx) => {
      if (first === second) {
        throw new Error(`Row ${lineNumber}: ${COPY_LABELS[copyIdx]} needs two different colors, got "${first}" twice.`);
      }
    });
    const [pairA, pairB] = colorPairs;
    if (pairA.every((color) => pairB.includes(color))) {
      throw new Error(`Row ${lineNumber}: Copy A and Copy B must use different color pairs.`);
    }

    const parsedId = Number(idRaw);
    const id = idRaw && !Number.isNaN(parsedId) ? parsedId : rowIdx + 1;

    return { id, title, type, effect, colorPairs, flavor };
  });
};

// --- CUSTOM SVG VECTOR ARTWORK COMPONENTS ---

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
    </defs>

    {/* Outer background */}
    <rect width="200" height="300" rx="12" fill="url(#card-back-bg)" />

    {/* Central Emblem */}
    <g transform="translate(100, 150)">
      <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="0" cy="0" r="32" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />

      {/* Bee Icon - the same mark used on the board hub and every player disc */}
      <g transform="translate(-24, -25)">
        <BeeMark size={48} bodyColor="#F59E0B" stripeColor="#0F172A" />
      </g>

      <text x="0" y="70" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="bold" letterSpacing="2">
        COLONY
      </text>
      <text x="0" y="84" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="bold" letterSpacing="1.5">
        COLLAPSE
      </text>
    </g>
  </svg>
);

// --- CARD COLOR PAIR PIECES ---
// A card belongs equally to both of its colors, so nothing on it favors one:
// the banner splits evenly down the middle, each half gets its own issue
// badge, and the trim, type bubble and watermark all stay neutral.
const CARD_NEUTRAL_INK = '#1F2937';
const CARD_NEUTRAL_TRIM = '#475569';

const splitBannerBackground = ([first, second]) =>
  `linear-gradient(90deg, ${CC_COLOR_HEX[first]} 0%, ${CC_COLOR_HEX[first]} 38%, ${CC_COLOR_HEX[second]} 62%, ${CC_COLOR_HEX[second]} 100%)`;

const splitTrimBackground = ([first, second]) =>
  `linear-gradient(90deg, ${CC_COLOR_DEEP_HEX[first]} 50%, ${CC_COLOR_DEEP_HEX[second]} 50%)`;

// Filled in its own color, so each badge still reads as that color even
// where the banner blends into its neighbor.
const ColorBadge = ({ color, iconSize, className }) => (
  <span
    className={`absolute z-10 flex items-center justify-center rounded-full border-2 ${className}`}
    style={{ backgroundColor: CC_COLOR_HEX[color], borderColor: CC_COLOR_DEEP_HEX[color] }}
  >
    <IssueSymbol color={color} size={iconSize} strokeWidth={2.6} />
  </span>
);

const ColorIconPair = ({ colors, size }) => (
  <span className="flex items-center gap-0.5">
    {colors.map((color) => (
      <IssueSymbol key={color} color={color} size={size} strokeWidth={2.6} />
    ))}
  </span>
);

// --- MAIN SINGLE CARD RENDER COMPONENT ---
const SingleCard = ({ card, onSelectCard, totalCards = 36 }) => {
  const [leftColor, rightColor] = card.colors;
  const isImmediate = card.type === 'Immediate';

  return (
    <div
      onClick={() => onSelectCard && onSelectCard(card)}
      className="group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-lg border-2 bg-white flex flex-col justify-between transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 cursor-pointer select-none"
      style={{ borderColor: CARD_NEUTRAL_TRIM }}
    >
      {/* 1. TOP COLOR BANNER (Occupies approx 28% of card) */}
      <div
        className="relative h-[28%] w-full px-3 py-2.5 flex items-center justify-center overflow-hidden text-center"
        style={{ background: splitBannerBackground(card.colors), color: CARD_NEUTRAL_INK }}
      >
        {/* Issue glyphs: the color-blind readable half of the card's identity */}
        <ColorBadge color={leftColor} iconSize={14} className="top-1.5 left-1.5 w-7 h-7" />
        <ColorBadge color={rightColor} iconSize={14} className="top-1.5 right-1.5 w-7 h-7" />

        {/* Card Title */}
        <h3 className="relative z-10 text-base sm:text-lg font-black tracking-tight leading-tight my-auto px-7">
          {card.title}
        </h3>
      </div>
      <div className="h-[2px] w-full flex-shrink-0" style={{ background: splitTrimBackground(card.colors) }} />

      {/* 2. CARD BODY AREA (Occupies approx 72% light readable area) */}
      <div className="relative flex-1 p-3 flex flex-col justify-between bg-[#FDFBF7] text-slate-900">
        {/* Subtle Watermark Illustration in Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <BeeDemocracyEmblemSVG colorHex={CARD_NEUTRAL_TRIM} size={150} />
        </div>

        {/* Ability Type Indicator Bar */}
        <div className="relative z-10 flex items-center gap-2 pb-1.5 border-b border-slate-200">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-full text-white font-black shadow-md flex-shrink-0"
            style={{ backgroundColor: CARD_NEUTRAL_INK }}
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
          <span className="flex items-center gap-1 text-slate-600">
            <ColorIconPair colors={card.colors} size={11} />
            #{String(card.uniqueId).padStart(2, '0')}/{totalCards}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- TABLETOP SIMULATOR (TTS) CARD COMPONENT (Edge-to-edge 0 gap, full size, sharp square corners) ---
const TTSCard = ({ card, totalCards = 36 }) => {
  const [leftColor, rightColor] = card.colors;
  const isImmediate = card.type === 'Immediate';

  return (
    <div
      className="relative w-[280px] h-[392px] bg-white flex flex-col justify-between overflow-hidden box-border border-b border-r border-slate-300"
      style={{ borderColor: CARD_NEUTRAL_TRIM }}
    >
      {/* 1. TOP COLOR BANNER (28% of card) */}
      <div
        className="relative h-[28%] w-full px-3.5 py-3 flex items-center justify-center overflow-hidden text-center"
        style={{ background: splitBannerBackground(card.colors), color: CARD_NEUTRAL_INK }}
      >
        {/* Issue glyphs: the color-blind readable half of the card's identity */}
        <ColorBadge color={leftColor} iconSize={17} className="top-2 left-2 w-8 h-8" />
        <ColorBadge color={rightColor} iconSize={17} className="top-2 right-2 w-8 h-8" />

        {/* Card Title */}
        <h3 className="relative z-10 text-lg font-black tracking-tight leading-tight my-auto px-9">
          {card.title}
        </h3>
      </div>
      <div className="h-[3px] w-full flex-shrink-0" style={{ background: splitTrimBackground(card.colors) }} />

      {/* 2. CARD BODY AREA (72% light area) */}
      <div className="relative flex-1 p-3.5 flex flex-col justify-between bg-[#FDFBF7] text-slate-900">
        {/* Watermark Illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <BeeDemocracyEmblemSVG colorHex={CARD_NEUTRAL_TRIM} size={180} />
        </div>

        {/* Ability Type Indicator Bar */}
        <div className="relative z-10 flex items-center gap-2.5 pb-2 border-b border-slate-200">
          <span
            className="flex items-center justify-center w-8 h-8 rounded-full text-white font-black shadow-sm flex-shrink-0"
            style={{ backgroundColor: CARD_NEUTRAL_INK }}
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
          <span className="flex items-center gap-1 text-slate-600">
            <ColorIconPair colors={card.colors} size={11} />
            #{String(card.uniqueId).padStart(2, '0')}/{totalCards}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- SCREENTOP.GG SHEET SIZING ---
// Screentop.gg rejects images over 4096px on either side (see asset-kit's
// EXPORT_STANDARDS.md). Cards are only viewed on a virtual table, so exporting
// 1:1 with the 280×392 card layout is sharp enough and keeps the sheet small.
const SCREENTOP_MAX_SHEET_PX = 4096;
const SCREENTOP_PIXEL_RATIO = 1;
const CARD_WIDTH_PX = 280;
const CARD_HEIGHT_PX = 392;
const SCREENTOP_SHEET_COLUMNS = 10;
const SCREENTOP_SHEET_WIDTH_PX = SCREENTOP_SHEET_COLUMNS * CARD_WIDTH_PX;
const SCREENTOP_MAX_ROWS = Math.floor(SCREENTOP_MAX_SHEET_PX / (CARD_HEIGHT_PX * SCREENTOP_PIXEL_RATIO));
const SCREENTOP_MAX_CARDS = SCREENTOP_SHEET_COLUMNS * SCREENTOP_MAX_ROWS;

// --- MAIN APP COMPONENT FOR COLONY COLLAPSE ---
export default function ColonyCollapseAssets() {
  const [cardTemplates, setCardTemplates] = useState(CARD_TEMPLATES);
  const deck = useMemo(() => generateDeck(cardTemplates), [cardTemplates]);
  const [selectedColor, setSelectedColor] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'print', 'tts', 'screentop', 'backs'
  const [selectedCardModal, setSelectedCardModal] = useState(null);
  const [showCutLines, setShowCutLines] = useState(true);
  const [csvImportError, setCsvImportError] = useState(null);

  const printRef = useRef(null);
  const csvFileInputRef = useRef(null);

  // Filter Deck based on user controls
  const filteredDeck = deck.filter((card) => {
    const matchesColor = selectedColor === 'ALL' || card.colors.includes(selectedColor);
    const matchesType = selectedType === 'ALL' || card.type === selectedType;
    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.effect.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.colors.some((color) => color.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesColor && matchesType && matchesSearch;
  });

  // Calculate Statistics
  const colorCounts = Object.fromEntries(
    CC_COLOR_ORDER.map((color) => [color, deck.filter((card) => card.colors.includes(color)).length])
  );

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
        link.download = `ColonyCollapse_${card.title.replace(/\s+/g, '_')}_${card.colors.join('-')}_${card.copyLabel.replace(/s+/g, '')}.png`;
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

  // Export card ability templates as CSV (one row per ability, not per printed card)
  const exportCardsCSV = () => {
    const csv = templatesToCSV(cardTemplates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'ColonyCollapse_Cards.csv';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import card ability templates from a CSV file, replacing the current deck
  const importCardsCSV = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        const templates = csvRowsToTemplates(rows);
        setCardTemplates(templates);
        setCsvImportError(null);
      } catch (err) {
        setCsvImportError(err.message);
      }
    };
    reader.onerror = () => setCsvImportError('Could not read the selected file.');
    reader.readAsText(file);
  };

  // Export TTS Deck Image (10 Columns Grid)
  const exportTTSSheet = () => {
    const node = document.getElementById('tts-sheet-export');
    if (!node) return;

    exportForTTS(node, {
      filename: buildAssetFilename({ game: 'ColonyCollapse', group: 'Cards', variant: 'TTS_DeckSheet_10cols' }),
    }).catch((err) => console.error('Export error:', err));
  };

  const isDeckTooLargeForScreentop = deck.length > SCREENTOP_MAX_CARDS;
  const screentopSheetHeightPx = Math.ceil(deck.length / SCREENTOP_SHEET_COLUMNS) * CARD_HEIGHT_PX;

  // Export Screentop.gg card fronts sheet (backs share one image, exported from the Card Backs tab)
  const exportScreentopSheet = () => {
    const node = document.getElementById('screentop-sheet-export');
    if (!node) return;

    exportForScreentop(node, {
      filename: buildAssetFilename({ game: 'ColonyCollapse', group: 'Cards', variant: `Screentop_${deck.length}Fronts` }),
      pixelRatio: SCREENTOP_PIXEL_RATIO,
    }).catch((err) => console.error('Export error:', err));
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
              {deck.length} Cards ({cardTemplates.length} abilities × 2 copies, each copy a different color pair).
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              onClick={exportCardsCSV}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg transition shadow-md active:scale-95 cursor-pointer text-xs sm:text-sm border border-slate-700"
              title="Download the card abilities as a CSV file"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => csvFileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg transition shadow-md active:scale-95 cursor-pointer text-xs sm:text-sm border border-slate-700"
              title="Replace the card abilities with a CSV file"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={importCardsCSV}
              className="hidden"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition shadow-md active:scale-95 cursor-pointer text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4" />
              Print Deck
            </button>
          </div>
        </div>

        {csvImportError && (
          <div className="max-w-7xl mx-auto mt-4 flex items-start gap-2 bg-red-950/60 border border-red-800/60 text-red-200 text-xs rounded-lg px-3 py-2.5 no-print">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">CSV import failed:</span> {csvImportError}
            </div>
            <button
              onClick={() => setCsvImportError(null)}
              className="text-red-300 hover:text-white font-bold cursor-pointer flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}
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
                onClick={() => setViewMode('screentop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'screentop' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileImage className="w-4 h-4" />
                Screentop Sheet
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
                      backgroundColor: COLOR_SCHEMES[col].hexCode,
                      borderColor: COLOR_SCHEMES[col].darkHex,
                      color: COLOR_SCHEMES[col].inkHex
                    }}
                  >
                    <IssueSymbol color={col} size={12} strokeWidth={2.6} colorHex={COLOR_SCHEMES[col].inkHex} />
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
              <span className="font-semibold text-slate-300">Color Distribution:</span>
              {Object.entries(colorCounts).map(([color, count]) => (
                <span key={color} className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_SCHEMES[color].hexCode }}></span>
                  <span className="text-white font-medium">{color}: {count}</span>
                </span>
              ))}
            </div>
            <div className="text-slate-400">
              ⚡ Immediate: <strong className="text-amber-400">{typeCounts.Immediate}</strong> | 🔄 Ongoing: <strong className="text-indigo-400">{typeCounts.Ongoing}</strong> | Total: <strong className="text-white">{deck.length} cards</strong>
            </div>
          </div>
        </section>

        {/* ---------------- VIEW MODE 1: CARDS GRID ---------------- */}
        {viewMode === 'grid' && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredDeck.map((card) => (
              <div key={card.uniqueId} id={`card-export-${card.uniqueId}`} className="flex flex-col">
                <SingleCard card={card} onSelectCard={setSelectedCardModal} totalCards={deck.length} />
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
                          <SingleCard card={card} totalCards={deck.length} />
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
                  Full-resolution, zero-gap edge-to-edge layout for Tabletop Simulator custom deck import ({deck.length} cards).
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
                  <TTSCard key={card.uniqueId} card={card} totalCards={deck.length} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 4: SCREENTOP.GG CARD FRONTS SHEET EXPORT ---------------- */}
        {viewMode === 'screentop' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 no-print">
              <div>
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-amber-400" />
                  Screentop.gg Card Fronts Sheet ({SCREENTOP_SHEET_WIDTH_PX}×{screentopSheetHeightPx}px)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {deck.length} card fronts, {SCREENTOP_SHEET_COLUMNS} per row, {CARD_WIDTH_PX}×{CARD_HEIGHT_PX}px each, transparent background.
                  All cards share one back — export it from the Card Backs tab.
                </p>
                {isDeckTooLargeForScreentop && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {deck.length} cards won't fit Screentop's {SCREENTOP_MAX_SHEET_PX}px limit (max {SCREENTOP_MAX_CARDS} per sheet).
                  </p>
                )}
              </div>
              <button
                onClick={exportScreentopSheet}
                disabled={isDeckTooLargeForScreentop}
                className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-md cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download Screentop Sheet PNG
              </button>
            </div>

            <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
              <div
                id="screentop-sheet-export"
                className="p-0 m-0 leading-none select-none"
                style={{ width: `${SCREENTOP_SHEET_WIDTH_PX}px`, display: 'grid', gridTemplateColumns: `repeat(${SCREENTOP_SHEET_COLUMNS}, ${CARD_WIDTH_PX}px)`, gap: 0 }}
              >
                {deck.map((card) => (
                  <TTSCard key={card.uniqueId} card={card} totalCards={deck.length} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- VIEW MODE 5: CARD BACKS & SINGLE BACK EXPORT ---------------- */}
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
                <SingleCard card={selectedCardModal} totalCards={deck.length} />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  {selectedCardModal.colors.map((color) => (
                    <span
                      key={color}
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: COLOR_SCHEMES[color].hexCode }}
                    >
                      <IssueSymbol color={color} size={14} strokeWidth={2.6} colorHex={COLOR_SCHEMES[color].inkHex} />
                    </span>
                  ))}
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
