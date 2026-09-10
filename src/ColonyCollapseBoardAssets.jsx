import React, { useState, useRef, useMemo } from 'react';
import {
  Download, Printer, LayoutGrid, Filter, FileImage, Package, Grid3x3, Hexagon, Layers,
  Megaphone, Hammer, Handshake, Radio, Newspaper, GraduationCap, RotateCcw, ArrowRight,
  Edit3, Copy
} from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import ColonyCollapseAssets from './ColonyCollapseAssets.jsx';
import {
  CC_COLOR_HEX,
  CC_COLOR_DEEP_HEX,
  CC_COLOR_INK,
  CC_COLOR_ORDER,
  CC_COLOR_TAGLINE
} from './colonyCollapsePalette.js';
import IssueSymbol from './ColonyCollapseIssueSymbol.jsx';

// --- 3. SHARED HEXAGON GEOMETRY (pointy-topped) ---
const hexPointsAt = (cx, cy, r) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const angle = (Math.PI / 180) * (60 * i - 90);
      return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
    })
    .join(' ');

const hexVerticesAt = (cx, cy, r) =>
  [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (Math.PI / 180) * (60 * i - 90);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

// --- 4. THE 15 DOUBLE-SIDED TILES (every unordered pair of the 6 colors) ---
const CC_TILE_PAIRS = (() => {
  const pairs = [];
  let id = 1;
  for (let i = 0; i < CC_COLOR_ORDER.length; i += 1) {
    for (let j = i + 1; j < CC_COLOR_ORDER.length; j += 1) {
      pairs.push({ id, colorA: CC_COLOR_ORDER[i], colorB: CC_COLOR_ORDER[j] });
      id += 1;
    }
  }
  return pairs;
})();

// --- 5. TILE FACE ----------------------------------------------------------
// The face colour fills the hex and carries its own glyph large in the middle.
// The reverse colour shows on a small hexagon nested near the bottom of the
// tile - it echoes the tile's own shape rather than introducing a new one, so
// it reads as a badge that clearly belongs to this piece. No decoration
// beyond the badge itself, so it stays as clean as the tile's other faces.
const TILE_BADGE_CENTER = { x: 150, y: 226 };
const TILE_BADGE_R = 38;

const TileFaceSVG = ({ faceColor, backColor, className = '' }) => {
  const faceHex = CC_COLOR_HEX[faceColor] || faceColor;
  const faceDeep = CC_COLOR_DEEP_HEX[faceColor] || '#1E293B';
  const faceInk = CC_COLOR_INK[faceColor] || '#1F2937';
  const backHex = CC_COLOR_HEX[backColor] || backColor;
  const backInk = CC_COLOR_INK[backColor] || '#1F2937';

  const cx = 150;
  const cy = 150;
  const outerR = 132;
  const centerIconSize = 72;
  const badgeIconSize = 34;
  const centerIconY = cy - 10; // nudged up to sit optically centred above the badge
  const backDeep = CC_COLOR_DEEP_HEX[backColor] || '#1E293B';

  return (
    <svg
      viewBox="0 0 300 300"
      width="100%"
      height="100%"
      className={`select-none block ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <polygon points={hexPointsAt(cx, cy, outerR)} fill={faceHex} />
      <polygon
        points={hexPointsAt(cx, cy, outerR - 9)}
        fill="none"
        stroke={faceDeep}
        strokeWidth="4"
        strokeOpacity="0.55"
      />

      <g transform={`translate(${cx - centerIconSize / 2}, ${centerIconY - centerIconSize / 2})`}>
        <IssueSymbol color={faceColor} size={centerIconSize} strokeWidth={2} colorHex={faceInk} />
      </g>

      {/* Small hex badge showing the reverse colour, nested inside the tile */}
      <g>
        <polygon
          points={hexPointsAt(TILE_BADGE_CENTER.x, TILE_BADGE_CENTER.y, TILE_BADGE_R)}
          fill={backHex}
          stroke={backDeep}
          strokeWidth="2.5"
          strokeOpacity="0.6"
        />
        <polygon
          points={hexPointsAt(TILE_BADGE_CENTER.x, TILE_BADGE_CENTER.y, TILE_BADGE_R - 6)}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />
        <g
          transform={`translate(${TILE_BADGE_CENTER.x - badgeIconSize / 2}, ${TILE_BADGE_CENTER.y - badgeIconSize / 2})`}
        >
          <IssueSymbol color={backColor} size={badgeIconSize} strokeWidth={2.4} colorHex={backInk} />
        </g>
      </g>
    </svg>
  );
};

// --- 6. BOARD LAYOUT: hex-of-hexes, 7 cells across (hub + 3 rings = 37 cells) ---
// The 36 cells around the hub split into 6 irregular districts of 6, each holding
// exactly one inner-ring issue cell plus 2 middle-ring and 3 outer-ring slots.
const BOARD_RINGS = 3;
const BOARD_CELL_R = 100; // circumradius of one board cell

// The shipped district shapes: every district holds exactly one inner-ring
// issue cell and six cells in total. This is only the DEFAULT - the in-app
// district editor repaints the outer 30 cells live, without touching this
// constant, and can hand you back new code for it once you like a shape.
const DISTRICT_LAYOUT = [
  { color: 'Clay', cells: [[1, -1], [2, -1], [2, -2], [3, -3], [1, -2], [0, -2]] },
  { color: 'Sage', cells: [[1, 0], [3, -2], [2, 0], [3, 0], [3, -1], [2, 1]] },
  { color: 'Periwinkle', cells: [[0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [-1, 3]] },
  { color: 'Stone', cells: [[-1, 1], [-2, 3], [-2, 1], [-1, 2], [-2, 2], [-3, 3]] },
  { color: 'Seafoam', cells: [[-1, 0], [-3, 2], [-2, -1], [-2, 0], [-3, 0], [-3, 1]] },
  { color: 'Mauve', cells: [[0, -1], [2, -3], [-1, -1], [1, -3], [0, -3], [-1, -2]] }
];

// Neighbour directions in the same order as a cell's edges, so edge i of a hex
// is the edge shared with the neighbour at direction i.
const HEX_NEIGHBOR_DIRECTIONS = [
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 }
];

const axialToPixel = (q, r, size) => ({
  x: size * Math.sqrt(3) * (q + r / 2),
  y: size * 1.5 * r
});

const hexDistanceFromHub = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

const DISTRICT_COLORS = DISTRICT_LAYOUT.map((district) => district.color);

// { "q,r": districtIndex } for the 30 cells two-plus steps from the hub - the
// only cells the district editor lets you repaint. Each district's single
// inner-ring cell (distance 1) is fixed, since that is the cell that ends up
// painted with the district's own issue colour.
const DEFAULT_OUTER_DISTRICTS = Object.fromEntries(
  DISTRICT_LAYOUT.flatMap((district, index) =>
    district.cells
      .filter(([q, r]) => hexDistanceFromHub(q, r) >= 2)
      .map(([q, r]) => [`${q},${r}`, index])
  )
);

// Merges each district's fixed inner cell with an (editable) outer-cell
// assignment into the one lookup the board is actually drawn from.
const buildDistrictByAxial = (outerDistricts) => {
  const map = new Map();
  DISTRICT_LAYOUT.forEach((district, index) => {
    const innerCell = district.cells.find(([q, r]) => hexDistanceFromHub(q, r) === 1);
    map.set(`${innerCell[0]},${innerCell[1]}`, index);
  });
  Object.entries(outerDistricts).forEach(([key, index]) => map.set(key, index));
  return map;
};

// Cells plus the border segments between districts, derived fresh from any
// outer-cell assignment - the static export and the live district editor
// both render through this, so they can never drift apart.
const buildBoardGeometry = (outerDistricts) => {
  const districtByAxial = buildDistrictByAxial(outerDistricts);
  const cells = [];
  for (let q = -BOARD_RINGS; q <= BOARD_RINGS; q += 1) {
    for (let r = -BOARD_RINGS; r <= BOARD_RINGS; r += 1) {
      if (Math.abs(q + r) > BOARD_RINGS) continue;
      const isHub = q === 0 && r === 0;
      const isInner = hexDistanceFromHub(q, r) === 1;
      const district = isHub ? null : districtByAxial.get(`${q},${r}`);
      const { x, y } = axialToPixel(q, r, BOARD_CELL_R);
      cells.push({
        q,
        r,
        x,
        y,
        kind: isHub ? 'hub' : isInner ? 'issue' : 'slot',
        color: isInner && district != null ? DISTRICT_COLORS[district] : null,
        district: isHub ? null : district
      });
    }
  }

  const byAxial = new Map(cells.map((cell) => [`${cell.q},${cell.r}`, cell]));
  const borderSegments = [];
  cells.forEach((cell) => {
    if (cell.district == null) return;
    const vertices = hexVerticesAt(cell.x, cell.y, BOARD_CELL_R);
    HEX_NEIGHBOR_DIRECTIONS.forEach((direction, edgeIndex) => {
      const neighbor = byAxial.get(`${cell.q + direction.q},${cell.r + direction.r}`);
      if (neighbor && neighbor.district === cell.district) return;
      borderSegments.push({ from: vertices[edgeIndex], to: vertices[(edgeIndex + 1) % 6] });
    });
  });

  return { cells, borderSegments };
};

// Turns an outer-cell assignment back into pasteable DISTRICT_LAYOUT source,
// so a shape drawn in the editor can be made the new shipped default.
const generateDistrictLayoutCode = (outerDistricts) => {
  const lines = DISTRICT_LAYOUT.map((district, index) => {
    const innerCell = district.cells.find(([q, r]) => hexDistanceFromHub(q, r) === 1);
    const outerCells = Object.entries(outerDistricts)
      .filter(([, districtIndex]) => districtIndex === index)
      .map(([key]) => key.split(',').map(Number));
    const cellsText = [innerCell, ...outerCells].map(([q, r]) => `[${q}, ${r}]`).join(', ');
    return `  { color: '${district.color}', cells: [${cellsText}] }`;
  });
  return `const DISTRICT_LAYOUT = [\n${lines.join(',\n')}\n];`;
};

const DEFAULT_BOARD_GEOMETRY = buildBoardGeometry(DEFAULT_OUTER_DISTRICTS);
const BOARD_CELLS = DEFAULT_BOARD_GEOMETRY.cells;
const DISTRICT_BORDER_SEGMENTS = DEFAULT_BOARD_GEOMETRY.borderSegments;

const BOARD_WIDTH = 1400;
const BOARD_HEIGHT = 1250;
const BOARD_CENTER = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };

// The hub carries the deck-back bee, wordless.
const HubBeeEmblem = ({ cx, cy, scale = 1.5 }) => (
  <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
    <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="#1E293B" stroke="#F5B301" strokeWidth="2" />
    <circle cx="0" cy="0" r="32" fill="#0F172A" stroke="#D97706" strokeWidth="1.5" />
    <path d="M -15 -5 Q 0 -20 15 -5 Q 10 10 0 15 Q -10 10 -15 -5 Z" fill="#F5B301" />
    <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#0F172A" strokeWidth="2.5" />
    <line x1="-10" y1="4" x2="10" y2="4" stroke="#0F172A" strokeWidth="2.5" />
  </g>
);

const BoardSVG = ({
  cells = BOARD_CELLS,
  borderSegments = DISTRICT_BORDER_SEGMENTS,
  interactive = false,
  activeDistrictIndex = null,
  onCellClick,
  className = ''
}) => (
  <svg
    viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <defs>
      <radialGradient id="cc-board-ground" cx="50%" cy="46%" r="62%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#080D18" />
      </radialGradient>
    </defs>

    <rect x="0" y="0" width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#cc-board-ground)" />

    <g transform={`translate(${BOARD_CENTER.x}, ${BOARD_CENTER.y})`}>
      {cells.map((cell) => {
        const key = `cell-${cell.q}-${cell.r}`;

        if (cell.kind === 'slot') {
          const districtColor = cell.district != null ? DISTRICT_COLORS[cell.district] : null;
          const isActiveBrush = interactive && cell.district === activeDistrictIndex;
          return (
            <g
              key={key}
              onClick={interactive ? () => onCellClick && onCellClick(cell.q, cell.r) : undefined}
              style={interactive ? { cursor: 'pointer' } : undefined}
            >
              <polygon
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 3)}
                fill="#151E2E"
                stroke="#334155"
                strokeWidth="3"
              />
              {/* Wash of the district's own issue colour; brighter for the editor's active brush */}
              {districtColor && (
                <polygon
                  points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 3)}
                  fill={CC_COLOR_HEX[districtColor]}
                  fillOpacity={isActiveBrush ? 0.45 : 0.13}
                />
              )}
              <polygon
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 22)}
                fill="none"
                stroke="#3E4C63"
                strokeWidth="2.5"
                strokeDasharray="10 9"
              />
            </g>
          );
        }

        if (cell.kind === 'hub') {
          return (
            <g key={key}>
              <polygon
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 3)}
                fill="#101828"
                stroke="#F5B301"
                strokeWidth="6"
              />
              <HubBeeEmblem cx={cell.x} cy={cell.y} />
            </g>
          );
        }

        const issueHex = CC_COLOR_HEX[cell.color];
        const issueDeep = CC_COLOR_DEEP_HEX[cell.color];
        const issueInk = CC_COLOR_INK[cell.color];
        const glyphSize = 74;

        return (
          <g key={key}>
            <polygon
              points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 3)}
              fill={issueHex}
              stroke={issueDeep}
              strokeWidth="4"
            />
            <polygon
              points={hexPointsAt(cell.x, cell.y, BOARD_CELL_R - 16)}
              fill="none"
              stroke={issueDeep}
              strokeWidth="3.5"
              strokeOpacity="0.6"
            />
            <g transform={`translate(${cell.x - glyphSize / 2}, ${cell.y - glyphSize / 2})`}>
              <IssueSymbol color={cell.color} size={glyphSize} strokeWidth={2.2} colorHex={issueInk} />
            </g>
          </g>
        );
      })}

      {/* District borders, cased so they read over both chalk cells and dark slots */}
      <g strokeLinecap="round">
        {borderSegments.map((segment, idx) => (
          <line
            key={`border-case-${idx}`}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke="#080D18"
            strokeWidth="11"
          />
        ))}
        {borderSegments.map((segment, idx) => (
          <line
            key={`border-line-${idx}`}
            x1={segment.from.x}
            y1={segment.from.y}
            x2={segment.to.x}
            y2={segment.to.y}
            stroke="#E8DCC5"
            strokeWidth="3.5"
          />
        ))}
      </g>
    </g>
  </svg>
);

// --- 7. ACTION GLYPHS -------------------------------------------------------
// Each glyph is a 48x48 line drawing that inherits `currentColor`, so the same
// artwork works on the light basic side and the dark upgraded side.
const glyphFrame = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

const pointsOnRing = (count, ringR, startDeg = -90) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI / 180) * (startDeg + (360 / count) * i);
    return { x: 24 + ringR * Math.cos(angle), y: 24 + ringR * Math.sin(angle), angle };
  });

// The display: six hexes in a circle with one shared pawn moving around them.
const DisplayGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    {pointsOnRing(6, 15).map((pos, idx) => (
      <polygon
        key={`display-hex-${idx}`}
        points={hexPointsAt(pos.x, pos.y, 6.4)}
        fill={idx === 0 ? 'currentColor' : 'none'}
      />
    ))}
    <path d="M 28 27.6 A 5 5 0 1 0 24.2 19" />
    <path d="M 21.2 20.8 L 24.8 18.2 L 25.8 22.4 Z" fill="currentColor" stroke="none" />
  </svg>
);

// Advance one step on an issue track.
const IssueGlyph = ({ size = 48, accent }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="15" y="7" width="18" height="35" rx="9" />
    <path d="M 17.5 17 L 30.5 17" strokeWidth="1.6" />
    <path d="M 17.5 25 L 30.5 25" strokeWidth="1.6" />
    <path d="M 17.5 33 L 30.5 33" strokeWidth="1.6" />
    <circle cx="24" cy="37.5" r="3.4" fill={accent || 'currentColor'} stroke="none" />
    <path d="M 24 34 L 24 12.5" strokeWidth="2.6" />
    <path d="M 18.6 17.6 L 24 12 L 29.4 17.6" strokeWidth="2.6" />
  </svg>
);

// Flip a tile to its other colour.
const FlipGlyph = ({ size = 48 }) => {
  const verts = hexVerticesAt(24, 19, 13);
  const leftHalf = [verts[0], verts[3], verts[4], verts[5]]
    .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
      <polygon points={leftHalf} fill="currentColor" stroke="none" opacity="0.85" />
      <polygon points={hexPointsAt(24, 19, 13)} />
      <path d="M 11 35 Q 24 45 37 35" strokeWidth="2.2" />
      <path d="M 15.6 34.6 L 10.4 35.8 L 12.6 31 Z" fill="currentColor" stroke="none" />
      <path d="M 32.4 34.6 L 37.6 35.8 L 35.4 31 Z" fill="currentColor" stroke="none" />
    </svg>
  );
};

// Place a tile into an empty board slot.
const PlaceGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <polygon points={hexPointsAt(24, 9.5, 7.5)} fill="currentColor" stroke="none" />
    <path d="M 24 15 L 24 22.5" strokeWidth="2.6" />
    <path d="M 20.2 18.8 L 24 23 L 27.8 18.8" strokeWidth="2.6" />
    <polygon points={hexPointsAt(24, 35, 11.5)} strokeDasharray="4.5 4" />
  </svg>
);

// Rally the three tiles around a junction.
const RallyGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    {pointsOnRing(3, 15.5).map((pos, idx) => (
      <polygon key={`rally-hex-${idx}`} points={hexPointsAt(pos.x, pos.y, 6.6)} />
    ))}
    {pointsOnRing(3, 9.5).map((pos, idx) => {
      const apexX = 24 + 11.5 * Math.cos(pos.angle);
      const apexY = 24 + 11.5 * Math.sin(pos.angle);
      const leftX = 24 + 7 * Math.cos(pos.angle) - 2.6 * Math.sin(pos.angle);
      const leftY = 24 + 7 * Math.sin(pos.angle) + 2.6 * Math.cos(pos.angle);
      const rightX = 24 + 7 * Math.cos(pos.angle) + 2.6 * Math.sin(pos.angle);
      const rightY = 24 + 7 * Math.sin(pos.angle) - 2.6 * Math.cos(pos.angle);
      return (
        <path
          key={`rally-arrow-${idx}`}
          d={`M ${apexX} ${apexY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`}
          fill="currentColor"
          stroke="none"
        />
      );
    })}
    <circle cx="24" cy="24" r="3.4" fill="currentColor" stroke="none" />
  </svg>
);

// Move the pawn along tile edges from junction to junction.
const JunctionGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <path d="M 6 35 L 15 20 L 31 20 L 40 35" strokeWidth="2.2" />
    <circle cx="6" cy="35" r="3" />
    <circle cx="15" cy="20" r="3" fill="currentColor" stroke="none" />
    <circle cx="31" cy="20" r="3" fill="currentColor" stroke="none" />
    <circle cx="40" cy="29.5" r="3.6" fill="currentColor" stroke="none" />
    <path d="M 35.6 41 Q 37.6 34 40 32.6 Q 42.4 34 44.4 41 Z" fill="currentColor" stroke="none" />
  </svg>
);

// The numbered row of cards you may play from.
const CardsGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="5" y="18" width="12.5" height="19" rx="2.5" />
    <rect x="17.8" y="13" width="12.5" height="19" rx="2.5" fill="currentColor" stroke="none" />
    <rect x="30.6" y="18" width="12.5" height="19" rx="2.5" />
  </svg>
);

// Draw several cards and keep one.
const DrawGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="4" y="13" width="13.5" height="19" rx="2.5" opacity="0.55" />
    <rect x="7.5" y="17.5" width="13.5" height="19" rx="2.5" />
    <path d="M 25 27 L 31 27" strokeWidth="2.4" />
    <path d="M 28.4 23.8 L 32 27 L 28.4 30.2" strokeWidth="2.4" />
    <rect x="33" y="16" width="11" height="21" rx="2.5" fill="currentColor" stroke="none" />
  </svg>
);

// Look at the top card of the deck.
const PeekGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="12" y="25" width="24" height="18" rx="3" />
    <path d="M 15.5 21.5 L 32.5 21.5" strokeWidth="1.8" />
    <path d="M 12 12.5 Q 24 3.5 36 12.5 Q 24 21.5 12 12.5 Z" />
    <circle cx="24" cy="12.5" r="3.2" fill="currentColor" stroke="none" />
  </svg>
);

// Two equal standings: a tie counts as leading.
const TieGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="7" y="16" width="11" height="24" rx="2.5" fill="currentColor" stroke="none" />
    <rect x="30" y="16" width="11" height="24" rx="2.5" fill="currentColor" stroke="none" />
    <path d="M 20.5 24 L 27.5 24" strokeWidth="2.8" />
    <path d="M 20.5 31 L 27.5 31" strokeWidth="2.8" />
  </svg>
);

const RepeatGlyph = ({ size = 48 }) => <RotateCcw size={size} strokeWidth={2} />;

const ACTION_GLYPHS = {
  display: DisplayGlyph,
  issue: IssueGlyph,
  flip: FlipGlyph,
  place: PlaceGlyph,
  rally: RallyGlyph,
  junction: JunctionGlyph,
  cards: CardsGlyph,
  draw: DrawGlyph,
  peek: PeekGlyph,
  tie: TieGlyph,
  repeat: RepeatGlyph
};

// --- 8. THE 6 DOUBLE-SIDED ACTION TILES ------------------------------------
// `steps` is the icon sentence across the middle of the tile, `text` is the
// rule, and `bonus` is the clause the upgraded side adds, highlighted in gold.
const CC_ACTIONS = [
  {
    id: 'address',
    name: 'Address',
    Icon: Megaphone,
    basic: {
      steps: [
        { glyph: 'display', label: '≤ N' },
        { glyph: 'issue', label: 'tile' },
        { glyph: 'flip' }
      ],
      text: 'Move up to N on the display. Advance that tile’s issue, then flip it.'
    },
    upgraded: {
      steps: [
        { glyph: 'display', label: '≤ N' },
        { glyph: 'issue', label: 'tile' },
        { glyph: 'flip' },
        { glyph: 'place' }
      ],
      text: 'Move up to N on the display. Advance that tile’s issue, then flip it.',
      bonus: 'Then place that tile on the board.'
    }
  },
  {
    id: 'develop',
    name: 'Develop',
    Icon: Hammer,
    basic: {
      steps: [
        { glyph: 'display', label: 'N' },
        { glyph: 'place' }
      ],
      text: 'Move N on the display. Place that tile on the board.'
    },
    upgraded: {
      steps: [
        { glyph: 'display', label: 'N' },
        { glyph: 'place' },
        { glyph: 'rally' }
      ],
      text: 'Move N on the display. Place that tile on the board.',
      bonus: 'Then rally that tile.'
    }
  },
  {
    id: 'leverage',
    name: 'Leverage',
    Icon: Handshake,
    basic: {
      steps: [
        { glyph: 'cards', label: '1–N' },
        { separator: 'or' },
        { glyph: 'draw', label: 'N → 1' }
      ],
      text: 'Play a card from slots 1–N, or draw N cards and play one of them.'
    },
    upgraded: {
      steps: [
        { glyph: 'cards', label: '1–N' },
        { separator: 'or' },
        { glyph: 'draw', label: 'N → 1' },
        { glyph: 'issue', label: 'card' }
      ],
      text: 'Play a card from slots 1–N, or draw N cards and play one of them.',
      bonus: 'Then advance the issue matching that card’s color.'
    }
  },
  {
    id: 'rally',
    name: 'Rally',
    Icon: Radio,
    basic: {
      steps: [
        { glyph: 'junction', label: 'N' },
        { glyph: 'rally', label: '× 3' }
      ],
      text: 'Move the pawn N junctions along tile edges, then rally the 3 adjacent tiles.'
    },
    upgraded: {
      steps: [
        { glyph: 'junction', label: 'N' },
        { glyph: 'rally', label: '× 3' },
        { glyph: 'tie' }
      ],
      text: 'Move the pawn N junctions along tile edges, then rally the 3 adjacent tiles.',
      bonus: 'You may rally issues on which you are tied.'
    }
  },
  {
    id: 'intern',
    name: 'Intern',
    Icon: GraduationCap,
    basic: {
      steps: [
        { glyph: 'repeat', label: 'prev.' },
        { chip: 'STR 1' },
        { chip: 'BASIC' }
      ],
      text: 'Repeat your previous action at strength 1, using its basic side.'
    },
    upgraded: {
      steps: [
        { glyph: 'repeat', label: 'prev.' },
        { chip: 'STR 1' }
      ],
      text: 'Repeat your previous action at strength 1.',
      bonus: 'You may use its upgraded side.'
    }
  },
  {
    id: 'media',
    name: 'Media',
    Icon: Newspaper,
    basic: {
      steps: [{ glyph: 'flip', label: '× N' }],
      text: 'Flip N tiles.'
    },
    upgraded: {
      steps: [
        { glyph: 'flip', label: '× N' },
        { glyph: 'peek', label: 'top' },
        { glyph: 'cards', label: 'play' },
        { glyph: 'issue', label: 'or advance' }
      ],
      text: 'Flip N tiles, then look at the top card of the deck.',
      bonus: 'Play it, or discard it to advance the issue matching its color.'
    }
  }
];

const ACTION_SIDE_THEME = {
  basic: {
    body: '#F7F2E4',
    border: '#22304A',
    headerBg: '#1B2739',
    headerInk: '#F8FAFC',
    ink: '#1F2937',
    glyphInk: '#22304A',
    stepBg: '#FFFFFF',
    stepBorder: '#C9BFA4',
    discBg: '#1B2739',
    discInk: '#FFFFFF',
    discRing: '#F7F2E4',
    bannerBg: 'rgba(34,48,74,0.08)',
    bannerInk: '#5A6679',
    bannerBorder: 'rgba(34,48,74,0.15)'
  },
  upgraded: {
    body: '#101725',
    border: '#F5B301',
    headerBg: '#F5B301',
    headerInk: '#1A1206',
    ink: '#E8EDF6',
    glyphInk: '#FDE68A',
    stepBg: 'rgba(245,179,1,0.09)',
    stepBorder: 'rgba(245,179,1,0.45)',
    discBg: '#1A1206',
    discInk: '#F5B301',
    discRing: '#F5B301',
    bannerBg: 'rgba(245,179,1,0.16)',
    bannerInk: '#F5B301',
    bannerBorder: 'rgba(245,179,1,0.35)'
  }
};

const ActionStep = ({ step, theme, glyphSize }) => {
  if (step.separator) {
    return (
      <span
        className="text-[11px] font-black tracking-[0.14em] uppercase shrink-0"
        style={{ color: theme.glyphInk, opacity: 0.7 }}
      >
        {step.separator}
      </span>
    );
  }

  if (step.chip) {
    return (
      <span
        className="px-2.5 py-1.5 rounded-lg text-[13px] font-black tracking-wide shrink-0 border-2"
        style={{ color: theme.glyphInk, borderColor: theme.stepBorder, background: theme.stepBg }}
      >
        {step.chip}
      </span>
    );
  }

  const Glyph = ACTION_GLYPHS[step.glyph];
  return (
    <span className="flex flex-col items-center gap-1 shrink-0" style={{ color: theme.glyphInk }}>
      <span
        className="rounded-xl border-2 flex items-center justify-center"
        style={{
          borderColor: theme.stepBorder,
          background: theme.stepBg,
          width: glyphSize + 18,
          height: glyphSize + 18
        }}
      >
        <Glyph size={glyphSize} />
      </span>
      {step.label && (
        <span className="text-[12px] font-black tracking-wide leading-none">{step.label}</span>
      )}
    </span>
  );
};

const ActionTileCard = ({ action, side, size = 420 }) => {
  const isUpgraded = side === 'upgraded';
  const theme = ACTION_SIDE_THEME[side];
  const face = isUpgraded ? action.upgraded : action.basic;
  const { Icon } = action;

  const glyphCount = face.steps.filter((step) => step.glyph).length;
  const glyphSize = glyphCount >= 4 ? 34 : glyphCount === 3 ? 40 : 46;

  return (
    <div
      className="relative flex flex-col overflow-hidden font-sans"
      style={{
        width: size,
        height: size,
        background: theme.body,
        border: `6px solid ${theme.border}`,
        borderRadius: 30
      }}
    >
      {/* Header: name, emblem and the strength socket */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ background: theme.headerBg, color: theme.headerInk, height: 74 }}
      >
        <Icon size={34} strokeWidth={2.2} />
        <span className="text-[30px] font-black tracking-tight leading-none flex-1">
          {action.name}
        </span>
        <span
          className="flex items-center justify-center rounded-full text-[28px] font-black leading-none"
          style={{
            width: 50,
            height: 50,
            background: theme.discBg,
            color: theme.discInk,
            border: `3px solid ${theme.discRing}`
          }}
        >
          N
        </span>
      </div>

      {/* Side banner: reads across the table which face is up */}
      <div
        className="flex items-center justify-center shrink-0 text-[12px] font-black tracking-[0.28em] uppercase"
        style={{
          height: 28,
          background: theme.bannerBg,
          color: theme.bannerInk,
          borderBottom: `2px solid ${theme.bannerBorder}`
        }}
      >
        {isUpgraded ? '▲▲ Upgraded ▲▲' : 'Basic'}
      </div>

      {/* Icon sentence */}
      <div className="flex-1 flex items-center justify-center gap-2 px-3">
        {face.steps.map((step, idx) => {
          const previous = face.steps[idx - 1];
          const needsArrow = idx > 0 && !step.separator && !(previous && previous.separator);
          return (
            <React.Fragment key={`${action.id}-${side}-step-${idx}`}>
              {needsArrow && (
                <ArrowRight
                  size={16}
                  strokeWidth={3}
                  style={{ color: theme.glyphInk, opacity: 0.55, flexShrink: 0 }}
                />
              )}
              <ActionStep step={step} theme={theme} glyphSize={glyphSize} />
            </React.Fragment>
          );
        })}
      </div>

      {/* Rule text */}
      <div className="px-4 pb-4 shrink-0">
        <p className="text-[15px] font-bold leading-snug text-center" style={{ color: theme.ink }}>
          {face.text}
        </p>
        {face.bonus && (
          <p
            className="mt-2 px-3 py-2 rounded-xl text-[15px] font-black leading-snug text-center"
            style={{
              color: '#F5B301',
              background: 'rgba(245,179,1,0.13)',
              border: '2px solid rgba(245,179,1,0.45)'
            }}
          >
            {'▲ '}
            {face.bonus}
          </p>
        )}
      </div>
    </div>
  );
};

// --- 9. EXPORT HELPERS ------------------------------------------------------
const TILE_EXPORT_PX = 300;
const ACTION_EXPORT_PX = 420;
const EXPORT_PIXEL_RATIO = 2;

const triggerDownload = (dataUrl, fileName) => {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

const renderNodeToPng = async (nodeId, { transparent = true } = {}) => {
  const node = document.getElementById(nodeId);
  if (!node) throw new Error(`Export node "${nodeId}" is not mounted`);
  return toPng(node, {
    cacheBust: true,
    pixelRatio: EXPORT_PIXEL_RATIO,
    backgroundColor: transparent ? null : '#0B1220'
  });
};

const tileFileName = (tile, side) => {
  const face = side === 'A' ? tile.colorA : tile.colorB;
  const back = side === 'A' ? tile.colorB : tile.colorA;
  const index = String(tile.id).padStart(2, '0');
  return `ColonyCollapse_Tile_${index}_${face}-over-${back}.png`;
};

const actionFileName = (action, side) =>
  `ColonyCollapse_Action_${action.name}_${side === 'upgraded' ? 'Upgraded' : 'Basic'}.png`;

// --- 10. MAIN COMPONENT -----------------------------------------------------
export default function ColonyCollapseBoardAssets() {
  const [activeAsset, setActiveAsset] = useState('tiles'); // 'tiles' | 'board' | 'actions'
  const [tileFlipState, setTileFlipState] = useState({}); // tile id -> 'A' | 'B'
  const [selectedColor, setSelectedColor] = useState('All');
  const [busyLabel, setBusyLabel] = useState(null);

  // District editor: repaint the 30 outer cells to reshape the six districts
  // without touching the shipped DISTRICT_LAYOUT constant.
  const [districtEditorOpen, setDistrictEditorOpen] = useState(false);
  const [outerDistricts, setOuterDistricts] = useState(() => ({ ...DEFAULT_OUTER_DISTRICTS }));
  const [activeDistrictBrush, setActiveDistrictBrush] = useState(0);
  const [districtCodeCopied, setDistrictCodeCopied] = useState(false);

  const liveBoardGeometry = useMemo(() => buildBoardGeometry(outerDistricts), [outerDistricts]);
  const boardGeometry = districtEditorOpen ? liveBoardGeometry : DEFAULT_BOARD_GEOMETRY;

  const districtOuterCounts = useMemo(
    () => DISTRICT_COLORS.map((_, index) => Object.values(outerDistricts).filter((d) => d === index).length),
    [outerDistricts]
  );

  const districtLayoutCode = useMemo(() => generateDistrictLayoutCode(outerDistricts), [outerDistricts]);

  const paintDistrictCell = (q, r) => {
    const key = `${q},${r}`;
    setOuterDistricts((previous) =>
      previous[key] === activeDistrictBrush ? previous : { ...previous, [key]: activeDistrictBrush }
    );
  };

  const resetDistricts = () => setOuterDistricts({ ...DEFAULT_OUTER_DISTRICTS });

  const copyDistrictLayoutCode = async () => {
    try {
      await navigator.clipboard.writeText(districtLayoutCode);
      setDistrictCodeCopied(true);
      setTimeout(() => setDistrictCodeCopied(false), 2000);
    } catch (error) {
      console.error('Colony Collapse district code copy failed:', error);
    }
  };

  const printRef = useRef(null);

  const getTileSide = (tileId) => tileFlipState[tileId] || 'A';

  const flipTile = (tileId) => {
    setTileFlipState((previous) => ({
      ...previous,
      [tileId]: (previous[tileId] || 'A') === 'A' ? 'B' : 'A'
    }));
  };

  const visibleTiles = CC_TILE_PAIRS.filter(
    (tile) =>
      selectedColor === 'All' || tile.colorA === selectedColor || tile.colorB === selectedColor
  );

  const runExport = async (label, task) => {
    setBusyLabel(label);
    try {
      await task();
    } catch (error) {
      console.error(`Colony Collapse export failed (${label}):`, error);
      window.alert(`Export failed: ${error.message}`);
    } finally {
      setBusyLabel(null);
    }
  };

  const exportSingleTile = (tile, side) =>
    runExport(`tile-${tile.id}-${side}`, async () => {
      const dataUrl = await renderNodeToPng(`cc-tile-export-${tile.id}-${side}`);
      triggerDownload(dataUrl, tileFileName(tile, side));
    });

  const exportSingleAction = (action, side) =>
    runExport(`action-${action.id}-${side}`, async () => {
      const dataUrl = await renderNodeToPng(`cc-action-export-${action.id}-${side}`, {
        transparent: false
      });
      triggerDownload(dataUrl, actionFileName(action, side));
    });

  const exportBoard = () =>
    runExport('board', async () => {
      const dataUrl = await renderNodeToPng('cc-board-export', { transparent: false });
      triggerDownload(dataUrl, 'ColonyCollapse_Board_7across.png');
    });

  const exportSheet = (nodeId, fileName) =>
    runExport(nodeId, async () => {
      const dataUrl = await renderNodeToPng(nodeId, { transparent: false });
      triggerDownload(dataUrl, fileName);
    });

  const exportAllTilesZip = () =>
    runExport('tiles-zip', async () => {
      const zip = new JSZip();
      const folder = zip.folder('colony_collapse_tiles');
      for (const tile of CC_TILE_PAIRS) {
        for (const side of ['A', 'B']) {
          const dataUrl = await renderNodeToPng(`cc-tile-export-${tile.id}-${side}`);
          folder.file(tileFileName(tile, side), dataUrl.split(',')[1], { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(URL.createObjectURL(blob), 'ColonyCollapse_Tiles_30_faces.zip');
    });

  const exportAllActionsZip = () =>
    runExport('actions-zip', async () => {
      const zip = new JSZip();
      const folder = zip.folder('colony_collapse_action_tiles');
      for (const action of CC_ACTIONS) {
        for (const side of ['basic', 'upgraded']) {
          const dataUrl = await renderNodeToPng(`cc-action-export-${action.id}-${side}`, {
            transparent: false
          });
          folder.file(actionFileName(action, side), dataUrl.split(',')[1], { base64: true });
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(URL.createObjectURL(blob), 'ColonyCollapse_ActionTiles_12_faces.zip');
    });

  const isBusy = busyLabel !== null;

  const assetTabs = [
    { id: 'tiles', label: 'Hex Tiles', sub: '15 double-sided', Icon: Hexagon },
    { id: 'board', label: 'Board', sub: '37 cells, 7 across', Icon: Grid3x3 },
    { id: 'actions', label: 'Action Tiles', sub: '6 double-sided', Icon: LayoutGrid },
    { id: 'cards', label: 'Cards', sub: '36 ability cards', Icon: Layers }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Page header */}
      <header className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-b border-amber-500/30 px-6 py-5 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-2xl font-black text-amber-400 tracking-tight flex items-center gap-2">
              <Hexagon className="w-6 h-6" /> Colony Collapse — Board, Tiles &amp; Actions
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              15 double-sided hex tiles · a 37-cell board · 6 double-sided action tiles · the
              36-card deck. Exports for Tabletop Simulator, Screentop.gg and print.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CC_COLOR_ORDER.map((color) => (
              <span
                key={color}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                style={{
                  background: `${CC_COLOR_HEX[color]}22`,
                  borderColor: `${CC_COLOR_HEX[color]}88`,
                  color: CC_COLOR_HEX[color]
                }}
                title={CC_COLOR_TAGLINE[color]}
              >
                <IssueSymbol color={color} size={14} colorHex={CC_COLOR_HEX[color]} />
                {color}
              </span>
            ))}
          </div>
        </div>

        {/* Asset switcher */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {assetTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveAsset(tab.id)}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 cursor-pointer border transition-colors ${
                activeAsset === tab.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <tab.Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`text-[11px] font-semibold ${
                  activeAsset === tab.id ? 'text-slate-900/70' : 'text-slate-500'
                }`}
              >
                {tab.sub}
              </span>
            </button>
          ))}
        </div>
      </header>

      {isBusy && (
        <div className="bg-amber-500 text-slate-950 text-sm font-bold px-6 py-2 no-print">
          Rendering export… ({busyLabel})
        </div>
      )}

      <main className="p-6" ref={printRef}>
        {/* ---------------- CARDS (the existing 36-card deck tool) ---------------- */}
        {activeAsset === 'cards' && (
          <div className="-m-6">
            <ColonyCollapseAssets />
          </div>
        )}

        {/* ---------------- HEX TILES ---------------- */}
        {activeAsset === 'tiles' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedColor}
                  onChange={(event) => setSelectedColor(event.target.value)}
                  className="bg-slate-900 text-slate-200 text-sm font-semibold outline-none cursor-pointer"
                >
                  <option value="All">All colors ({CC_TILE_PAIRS.length})</option>
                  {CC_COLOR_ORDER.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={exportAllTilesZip}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Package className="w-4 h-4" /> All 30 faces (.zip)
              </button>
              <button
                onClick={() => exportSheet('cc-tile-sheet-a', 'ColonyCollapse_TTS_TileSheet_SideA.png')}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <FileImage className="w-4 h-4" /> Sheet — side A
              </button>
              <button
                onClick={() => exportSheet('cc-tile-sheet-b', 'ColonyCollapse_TTS_TileSheet_SideB.png')}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <FileImage className="w-4 h-4" /> Sheet — side B
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <p className="text-xs text-slate-500">
                Click a tile to flip it. The bottom leaf always shows the color on the reverse.
              </p>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5">
              {visibleTiles.map((tile) => {
                const side = getTileSide(tile.id);
                const faceColor = side === 'A' ? tile.colorA : tile.colorB;
                const backColor = side === 'A' ? tile.colorB : tile.colorA;
                return (
                  <div
                    key={tile.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2"
                  >
                    <button
                      onClick={() => flipTile(tile.id)}
                      className="w-full aspect-square cursor-pointer"
                      title="Flip tile"
                    >
                      <TileFaceSVG faceColor={faceColor} backColor={backColor} />
                    </button>
                    <div className="text-[11px] font-bold text-slate-400 tracking-wide">
                      #{String(tile.id).padStart(2, '0')} · {faceColor} / {backColor}
                    </div>
                    <div className="flex gap-1.5 w-full no-print">
                      <button
                        onClick={() => exportSingleTile(tile, 'A')}
                        disabled={isBusy}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-bold text-slate-300 cursor-pointer transition-colors"
                      >
                        <Download className="w-3 h-3 inline mr-1" />
                        {tile.colorA}
                      </button>
                      <button
                        onClick={() => exportSingleTile(tile, 'B')}
                        disabled={isBusy}
                        className="flex-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-bold text-slate-300 cursor-pointer transition-colors"
                      >
                        <Download className="w-3 h-3 inline mr-1" />
                        {tile.colorB}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- BOARD ---------------- */}
        {activeAsset === 'board' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
              <button
                onClick={exportBoard}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" /> Board PNG ({BOARD_WIDTH * EXPORT_PIXEL_RATIO}px)
              </button>
              <button
                onClick={() => setDistrictEditorOpen((open) => !open)}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 cursor-pointer border transition-colors ${
                  districtEditorOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4" /> {districtEditorOpen ? 'Done drawing districts' : 'Draw districts'}
              </button>
              <p className="text-xs text-slate-500 max-w-md">
                Hub in the middle, the six issue colors in the inner ring (never flipped, so no
                leaf), and 30 empty slots. Six irregular districts of 6 cells, one issue each.
              </p>
            </div>

            {districtEditorOpen && (
              <div className="mb-5 bg-slate-900 border border-amber-500/30 rounded-2xl p-4 no-print">
                <p className="text-sm text-slate-300 mb-3">
                  Click a dashed slot to paint it into the selected district. Each district's
                  colored inner cell is fixed - only the 30 outer slots can move. Aim for 5 slots
                  per district (6 cells total with its inner one).
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {DISTRICT_COLORS.map((color, index) => {
                    const count = districtOuterCounts[index];
                    const isBalanced = count === 5;
                    return (
                      <button
                        key={color}
                        onClick={() => setActiveDistrictBrush(index)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer border-2 transition-all ${
                          activeDistrictBrush === index ? 'ring-2 ring-amber-400 scale-105' : ''
                        }`}
                        style={{
                          backgroundColor: CC_COLOR_HEX[color],
                          borderColor: CC_COLOR_DEEP_HEX[color],
                          color: CC_COLOR_INK[color]
                        }}
                      >
                        <IssueSymbol color={color} size={16} strokeWidth={2.6} colorHex={CC_COLOR_INK[color]} />
                        {color}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                            isBalanced ? 'bg-white/40' : 'bg-white/70'
                          }`}
                        >
                          {count}/5{isBalanced ? '' : ' ⚠'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    onClick={resetDistricts}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to shipped shapes
                  </button>
                  <button
                    onClick={copyDistrictLayoutCode}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> {districtCodeCopied ? 'Copied!' : 'Copy DISTRICT_LAYOUT code'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={districtLayoutCode}
                  rows={8}
                  className="w-full font-mono text-[11px] leading-relaxed bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300"
                  onClick={(event) => event.target.select()}
                />
              </div>
            )}

            <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <BoardSVG
                cells={boardGeometry.cells}
                borderSegments={boardGeometry.borderSegments}
                interactive={districtEditorOpen}
                activeDistrictIndex={districtEditorOpen ? activeDistrictBrush : null}
                onCellClick={districtEditorOpen ? paintDistrictCell : undefined}
              />
            </div>
          </section>
        )}

        {/* ---------------- ACTION TILES ---------------- */}
        {activeAsset === 'actions' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
              <button
                onClick={exportAllActionsZip}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Package className="w-4 h-4" /> All 12 faces (.zip)
              </button>
              <button
                onClick={() =>
                  exportSheet('cc-action-sheet', 'ColonyCollapse_ActionTiles_Sheet.png')
                }
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <FileImage className="w-4 h-4" /> Reference sheet
              </button>
              <p className="text-xs text-slate-500 max-w-lg">
                Left column is the basic side, right column is what the tile shows once flipped to
                upgraded. N is the strength the tile is played at.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {CC_ACTIONS.map((action) => (
                <div
                  key={action.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap gap-6 items-start"
                >
                  {['basic', 'upgraded'].map((side) => (
                    <div key={side} className="flex flex-col items-center gap-2">
                      <ActionTileCard action={action} side={side} />
                      <button
                        onClick={() => exportSingleAction(action, side)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        {side === 'basic' ? 'Basic side' : 'Upgraded side'}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ---------------- OFF-SCREEN EXPORT NODES ---------------- */}
      <div
        aria-hidden="true"
        className="no-print"
        style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}
      >
        {CC_TILE_PAIRS.flatMap((tile) =>
          ['A', 'B'].map((side) => (
            <div
              key={`export-tile-${tile.id}-${side}`}
              id={`cc-tile-export-${tile.id}-${side}`}
              style={{ width: TILE_EXPORT_PX, height: TILE_EXPORT_PX }}
            >
              <TileFaceSVG
                faceColor={side === 'A' ? tile.colorA : tile.colorB}
                backColor={side === 'A' ? tile.colorB : tile.colorA}
              />
            </div>
          ))
        )}

        {CC_ACTIONS.flatMap((action) =>
          ['basic', 'upgraded'].map((side) => (
            <div key={`export-action-${action.id}-${side}`} id={`cc-action-export-${action.id}-${side}`}>
              <ActionTileCard action={action} side={side} size={ACTION_EXPORT_PX} />
            </div>
          ))
        )}

        <div id="cc-board-export" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}>
          <BoardSVG cells={boardGeometry.cells} borderSegments={boardGeometry.borderSegments} />
        </div>

        {['A', 'B'].map((side) => (
          <div
            key={`sheet-${side}`}
            id={`cc-tile-sheet-${side.toLowerCase()}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(5, ${TILE_EXPORT_PX}px)`,
              background: '#0B1220'
            }}
          >
            {CC_TILE_PAIRS.map((tile) => (
              <div key={`sheet-${side}-${tile.id}`} style={{ width: TILE_EXPORT_PX, height: TILE_EXPORT_PX }}>
                <TileFaceSVG
                  faceColor={side === 'A' ? tile.colorA : tile.colorB}
                  backColor={side === 'A' ? tile.colorB : tile.colorA}
                />
              </div>
            ))}
          </div>
        ))}

        <div
          id="cc-action-sheet"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(2, ${ACTION_EXPORT_PX}px)`,
            gap: 24,
            padding: 24,
            background: '#0B1220'
          }}
        >
          {CC_ACTIONS.flatMap((action) =>
            ['basic', 'upgraded'].map((side) => (
              <ActionTileCard key={`sheet-${action.id}-${side}`} action={action} side={side} size={ACTION_EXPORT_PX} />
            ))
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #FFFFFF !important; }
        }
      `}</style>
    </div>
  );
}
