import React from 'react';
import { Zap, RotateCw } from 'lucide-react';
import { CC_COLOR_HEX, CC_COLOR_DEEP_HEX } from './colonyCollapsePalette.js';
import IssueSymbol from './ColonyCollapseIssueSymbol.jsx';

// One card front, shared by the on-screen grid and the TTS/Screentop exports.
// Every size is in em off a base that is 16px when the card is its true
// 280px export width, and scales with the card's container below that - so
// a grid thumbnail is the export, just smaller.
const CARD_DESIGN_WIDTH_PX = 280;
const CARD_DESIGN_BASE_FONT_PX = 16;
const CARD_SCALED_FONT_SIZE = `calc(100cqw * ${CARD_DESIGN_BASE_FONT_PX} / ${CARD_DESIGN_WIDTH_PX})`;

// A card belongs equally to both of its colors, so neither gets a bigger
// share of the card: they sit as two equal hex medallions stacked on the
// left rail, where they stay visible when the cards are fanned in a hand.
// The honey title bar is the same on every card.
const TITLE_BAR_COLOR = '#EDB547';
const TITLE_BAR_INK = '#2B1C02';
const RAIL_COLOR = '#1E293B';
const PAPER_COLOR = '#FBF8F1';

// Pointy-top hex inside a 62x70 box, matching the board's hex tiles.
const MEDALLION_VIEWBOX = { width: 62, height: 70 };
const MEDALLION_POINTS = '31,2 59,18 59,52 31,68 3,52 3,18';
const MEDALLION_ICON_SIZE = 32;

const HexMedallion = ({ color }) => (
  <svg
    viewBox={`0 0 ${MEDALLION_VIEWBOX.width} ${MEDALLION_VIEWBOX.height}`}
    className="block w-[3.875em] h-[4.375em]"
  >
    <polygon
      points={MEDALLION_POINTS}
      fill={CC_COLOR_HEX[color]}
      stroke={CC_COLOR_DEEP_HEX[color]}
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
    <g
      transform={`translate(${(MEDALLION_VIEWBOX.width - MEDALLION_ICON_SIZE) / 2}, ${(MEDALLION_VIEWBOX.height - MEDALLION_ICON_SIZE) / 2})`}
    >
      <IssueSymbol color={color} size={MEDALLION_ICON_SIZE} strokeWidth={2} />
    </g>
  </svg>
);

// Action keywords that open an effect ("ADDRESS:", "INTERN:") are rules
// terms, so they're set bold like a rulebook would.
const ACTION_KEYWORD_PATTERN = /^([A-Z]+:)\s*/;

const EffectText = ({ effect }) => {
  const keywordMatch = effect.match(ACTION_KEYWORD_PATTERN);
  if (!keywordMatch) return effect;
  return (
    <>
      <b className="font-black tracking-[0.04em]">{keywordMatch[1]}</b> {effect.slice(keywordMatch[0].length)}
    </>
  );
};

const AbilityTypeLine = ({ type }) => {
  const isImmediate = type === 'Immediate';
  return (
    <div className="flex items-center gap-[0.5em] pb-[0.5em] border-b border-[#E2DCCD]">
      <span
        className="flex items-center justify-center w-[1.5em] h-[1.5em] rounded-full flex-shrink-0"
        style={{ background: RAIL_COLOR, color: '#F8F4EA' }}
      >
        {isImmediate ? (
          <Zap size="0.875em" strokeWidth={2.4} fill="currentColor" />
        ) : (
          <RotateCw size="0.875em" strokeWidth={2.4} />
        )}
      </span>
      <span className="text-[0.6875em] font-extrabold uppercase tracking-[0.1em] text-slate-600">
        {isImmediate ? 'Immediate action' : 'Ongoing effect'}
      </span>
    </div>
  );
};

const CardFace = ({ card, totalCards }) => (
  <div className="w-full h-full" style={{ containerType: 'inline-size' }}>
    <div
      className="w-full h-full grid grid-cols-[2.5em_1fr] grid-rows-[3.625em_1fr] text-[#1F2937]"
      style={{ fontSize: CARD_SCALED_FONT_SIZE, background: PAPER_COLOR }}
    >
      <div
        className="col-span-2 flex items-center justify-center text-center px-[0.875em]"
        style={{ background: TITLE_BAR_COLOR, color: TITLE_BAR_INK }}
      >
        <h3 className="text-[1.1875em] font-black tracking-[-0.015em] leading-[1.08] text-balance">{card.title}</h3>
      </div>

      {/* Issue glyphs: the color-blind readable half of the card's identity */}
      <div className="relative" style={{ background: RAIL_COLOR }}>
        <div className="absolute z-10 top-[0.75em] left-full -translate-x-1/2 flex flex-col gap-[0.5em]">
          {card.colors.map((color) => (
            <HexMedallion key={color} color={color} />
          ))}
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-[0.625em] pt-[0.75em] pr-[0.875em] pb-[0.625em] pl-[2.625em]">
        <AbilityTypeLine type={card.type} />
        <p className="my-auto text-[0.875em] font-semibold leading-[1.38] text-center text-gray-900 text-pretty">
          <EffectText effect={card.effect} />
        </p>
        <p className="text-[0.6875em] italic leading-[1.35] text-center text-gray-500 pt-[0.7em] border-t border-[#ECE6D8]">
          “{card.flavor}”
        </p>
        <div className="flex justify-between text-[0.5625em] font-extrabold uppercase tracking-[0.14em] text-gray-400 tabular-nums">
          <span>Colony Collapse</span>
          <span>
            #{String(card.uniqueId).padStart(2, '0')}/{totalCards}
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default CardFace;
