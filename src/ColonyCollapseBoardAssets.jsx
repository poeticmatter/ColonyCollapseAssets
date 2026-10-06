import React, { useState, useRef, useMemo } from 'react';
import {
  Download, Printer, LayoutGrid, Filter, FileImage, Package, Grid3x3, Hexagon, Layers,
  Megaphone, Hammer, Handshake, Radio, Newspaper, GraduationCap, RotateCcw, ArrowRight,
  Edit3, Copy, TrendingUp, Redo, Circle, Triangle, Compass, Eye
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { exportForTTS, buildAssetFilename } from 'asset-kit';
import JSZip from 'jszip';
import ColonyCollapseAssets from './ColonyCollapseAssets.jsx';
import ColonyCollapseTracksAssets, {
  ISSUE_TRACK_CELL_W,
  ISSUE_TRACK_CELL_H
} from './ColonyCollapseTracksAssets.jsx';
import BeeMark from './ColonyCollapseBeeMark.jsx';
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

const findIssueCell = (district) => district.cells.find(([q, r]) => hexDistanceFromHub(q, r) === 1);

const DISTRICT_COLORS = DISTRICT_LAYOUT.map((district) => district.color);

// The alternate, rotationally symmetric board: each district is a plain
// 1-2-3 triangle fanning out from its issue cell - 1 cell in the inner ring,
// 2 in the middle, 3 on the rim. Offsets are [steps outward along the issue
// cell's own direction, steps sideways toward the next corner clockwise].
const TRIANGLE_DISTRICT_OFFSETS = [
  [1, 0],
  [2, 0],
  [1, 1],
  [3, 0],
  [2, 1],
  [1, 2]
];

// Built from the shipped layout's issue cells, so each color keeps its spot
// in the inner ring and only the district shapes change.
const TRIANGLE_DISTRICT_LAYOUT = DISTRICT_LAYOUT.map((district) => {
  const [issueQ, issueR] = findIssueCell(district);
  const cornerIndex = HEX_NEIGHBOR_DIRECTIONS.findIndex((direction) => direction.q === issueQ && direction.r === issueR);
  const outward = HEX_NEIGHBOR_DIRECTIONS[cornerIndex];
  const sideways = HEX_NEIGHBOR_DIRECTIONS[(cornerIndex + 1) % 6];
  return {
    color: district.color,
    cells: TRIANGLE_DISTRICT_OFFSETS.map(([outSteps, sideSteps]) => [
      outSteps * outward.q + sideSteps * sideways.q,
      outSteps * outward.r + sideSteps * sideways.r
    ])
  };
});

// The round-number badge's fill runs from a deep gold (1) to the game's
// brightest gold (5), so which slots activate early vs. late reads at a
// glance from color alone, not just the printed digit.
const ROUND_NUMBER_FILLS = ['#8A5A00', '#A9740A', '#C48D15', '#DFA820', '#F5B301'];

// Dice pips, not a printed digit - a human recognizes a dot count at a glance
// (subitizing) far faster than reading a numeral, and it works for players
// who can't rely on the color gradient alone.
const ROUND_PIP_LAYOUTS = [
  [[0, 0]],
  [
    [-13, -13],
    [13, 13]
  ],
  [
    [-13, -13],
    [0, 0],
    [13, 13]
  ],
  [
    [-13, -13],
    [13, -13],
    [-13, 13],
    [13, 13]
  ],
  [
    [-13, -13],
    [13, -13],
    [0, 0],
    [-13, 13],
    [13, 13]
  ]
];

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
    const innerCell = findIssueCell(district);
    map.set(`${innerCell[0]},${innerCell[1]}`, index);
  });
  Object.entries(outerDistricts).forEach(([key, index]) => map.set(key, index));
  return map;
};

const layoutToDistrictByAxial = (layout) =>
  new Map(layout.flatMap((district, index) => district.cells.map(([q, r]) => [`${q},${r}`, index])));

// Round-number sort keys within a ring. The shipped board orders by raw
// angle around the hub (kept as-is so its printed numbers don't change);
// the symmetric board measures from each district's own issue cell instead,
// so every district gets the same numbering - raw atan2 wraps at ±180° and
// would number the district straddling that seam differently.
const angleAroundHub = (cell) => Math.atan2(cell.y, cell.x);

const angleFromIssueCell = (cell, issueCell) => {
  const delta = angleAroundHub(cell) - angleAroundHub(issueCell);
  return Math.atan2(Math.sin(delta), Math.cos(delta));
};

// Numbers each district's own slot cells 1-5, middle ring before outer ring,
// ordered by `sortAngle` within a ring - mutates the cell objects in place
// since buildBoardGeometry just built them fresh.
const assignRoundNumbers = (cells, sortAngle) => {
  const slotsByDistrict = new Map();
  cells.forEach((cell) => {
    if (cell.kind !== 'slot' || cell.district == null) return;
    if (!slotsByDistrict.has(cell.district)) slotsByDistrict.set(cell.district, []);
    slotsByDistrict.get(cell.district).push(cell);
  });

  slotsByDistrict.forEach((districtSlots, district) => {
    const issueCell = cells.find((cell) => cell.kind === 'issue' && cell.district === district);
    const ring = (cell) => hexDistanceFromHub(cell.q, cell.r);
    const angle = (cell) => sortAngle(cell, issueCell);
    const ordered = [...districtSlots].sort((a, b) => ring(a) - ring(b) || angle(a) - angle(b));
    ordered.forEach((cell, idx) => {
      cell.roundNumber = idx + 1;
    });
  });
};

// Cells plus the border segments between districts, derived fresh from a
// district assignment - the static exports and the live district editor
// all render through this, so they can never drift apart.
const buildBoardGeometry = ({ districtByAxial, sortAngle }) => {
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

  assignRoundNumbers(cells, sortAngle);

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
    const innerCell = findIssueCell(district);
    const outerCells = Object.entries(outerDistricts)
      .filter(([, districtIndex]) => districtIndex === index)
      .map(([key]) => key.split(',').map(Number));
    const cellsText = [innerCell, ...outerCells].map(([q, r]) => `[${q}, ${r}]`).join(', ');
    return `  { color: '${district.color}', cells: [${cellsText}] }`;
  });
  return `const DISTRICT_LAYOUT = [\n${lines.join(',\n')}\n];`;
};

const buildEditableBoardGeometry = (outerDistricts) =>
  buildBoardGeometry({ districtByAxial: buildDistrictByAxial(outerDistricts), sortAngle: angleAroundHub });

const DEFAULT_BOARD_GEOMETRY = buildEditableBoardGeometry(DEFAULT_OUTER_DISTRICTS);

const TRIANGLE_BOARD_GEOMETRY = buildBoardGeometry({
  districtByAxial: layoutToDistrictByAxial(TRIANGLE_DISTRICT_LAYOUT),
  sortAngle: angleFromIssueCell
});
const BOARD_CELLS = DEFAULT_BOARD_GEOMETRY.cells;
const DISTRICT_BORDER_SEGMENTS = DEFAULT_BOARD_GEOMETRY.borderSegments;

const BOARD_WIDTH = 1400;
const BOARD_HEIGHT = 1250;
const BOARD_CENTER = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 };

// The hub carries the deck-back bee, wordless.
const HubBeeEmblem = ({ cx, cy, scale = 1.5 }) => (
  <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
    <polygon points="0,-50 43,-25 43,25 0,50 -43,25 -43,-25" fill="#1E293B" stroke="#F5B301" strokeWidth="2" />
    <circle cx="0" cy="0" r="32" fill="#0F172A" stroke="#F5B301" strokeWidth="1.5" />
    <g transform="translate(-24, -25)">
      <BeeMark size={48} bodyColor="#F5B301" stripeColor="#0F172A" />
    </g>
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

              {/* The round this slot activates: a dice-pip badge, darker to
                  brighter with the number, so a player can spot every "1"
                  across the board by shape and color without reading anything. */}
              <circle
                cx={cell.x}
                cy={cell.y}
                r="30"
                fill={ROUND_NUMBER_FILLS[cell.roundNumber - 1]}
                stroke="#0B1220"
                strokeWidth="2.5"
              />
              {ROUND_PIP_LAYOUTS[cell.roundNumber - 1].map(([dx, dy], pipIdx) => (
                <circle key={pipIdx} cx={cell.x + dx} cy={cell.y + dy} r="5.5" fill="#1A1206" stroke="none" />
              ))}
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
            strokeWidth="17"
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
            strokeWidth="6"
          />
        ))}
      </g>
    </g>
  </svg>
);

// --- 6B. DISPLAY BOARD & DIAL -----------------------------------------
// The 6-hex tile display: six empty hex slots in a ring, six color badges
// pointing to the matching districts, and a single central circular dial
// with a rotating dial token that points to the active slot.
// Same radius as a board cell, since an actual hex tile has to sit in both.
const DISPLAY_HEX_R = BOARD_CELL_R;
const DISPLAY_RING_R = 300;
const DISPLAY_BADGE_RING_R = 130;
const DISPLAY_BADGE_R = 40;
const DISPLAY_DIAL_R = 75;
const DISPLAY_MARGIN = 30;
const DISPLAY_BOARD_SIZE = (DISPLAY_RING_R + DISPLAY_HEX_R + DISPLAY_MARGIN) * 2;
const DISPLAY_BOARD_CENTER = { x: DISPLAY_BOARD_SIZE / 2, y: DISPLAY_BOARD_SIZE / 2 };

const DISPLAY_POSITIONS = CC_COLOR_ORDER.map((color, idx) => {
  const angleDeg = -90 + 60 * idx;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    color,
    angleDeg,
    hex: { x: DISPLAY_RING_R * Math.cos(angle), y: DISPLAY_RING_R * Math.sin(angle) },
    badge: { x: DISPLAY_BADGE_RING_R * Math.cos(angle), y: DISPLAY_BADGE_RING_R * Math.sin(angle) }
  };
});

export { default as DialTokenSVG } from './ColonyCollapseDialToken.jsx';
import DialTokenSVG from './ColonyCollapseDialToken.jsx';

export const DisplayBoardSVG = ({
  showDialToken = false,
  dialAngle = -90,
  className = ''
}) => (
  <svg
    viewBox={`0 0 ${DISPLAY_BOARD_SIZE} ${DISPLAY_BOARD_SIZE}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <defs>
      <radialGradient id="cc-display-ground" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#080D18" />
      </radialGradient>
      <radialGradient id="cc-display-dial-recess" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#131B2A" />
        <stop offset="85%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#090E17" />
      </radialGradient>
    </defs>

    <rect x="0" y="0" width={DISPLAY_BOARD_SIZE} height={DISPLAY_BOARD_SIZE} fill="url(#cc-display-ground)" />

    <g transform={`translate(${DISPLAY_BOARD_CENTER.x}, ${DISPLAY_BOARD_CENTER.y})`}>
      {/* 1. Subtle radial guide rays connecting center dial to the 6 slots */}
      {DISPLAY_POSITIONS.map((pos) => {
        const rad = (pos.angleDeg * Math.PI) / 180;
        return (
          <line
            key={`dial-ray-${pos.color}`}
            x1={DISPLAY_DIAL_R * Math.cos(rad)}
            y1={DISPLAY_DIAL_R * Math.sin(rad)}
            x2={(DISPLAY_BADGE_RING_R - DISPLAY_BADGE_R - 6) * Math.cos(rad)}
            y2={(DISPLAY_BADGE_RING_R - DISPLAY_BADGE_R - 6) * Math.sin(rad)}
            stroke="#334155"
            strokeWidth="2.5"
            strokeDasharray="4 4"
          />
        );
      })}

      {/* 2. Central dial circle socket */}
      <g id="cc-display-dial-socket">
        {/* Recessed circular bed */}
        <circle
          cx={0}
          cy={0}
          r={DISPLAY_DIAL_R}
          fill="url(#cc-display-dial-recess)"
          stroke="#334155"
          strokeWidth="4"
        />
        {/* Concentric guide ring */}
        <circle
          cx={0}
          cy={0}
          r={DISPLAY_DIAL_R - 12}
          fill="none"
          stroke="#3E4C63"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        {/* 6 directional alignment notches pointing to the 6 color slots */}
        {DISPLAY_POSITIONS.map((pos) => {
          const rad = (pos.angleDeg * Math.PI) / 180;
          const rIn = DISPLAY_DIAL_R - 20;
          const rOut = DISPLAY_DIAL_R - 4;
          return (
            <line
              key={`dial-notch-${pos.color}`}
              x1={rIn * Math.cos(rad)}
              y1={rIn * Math.sin(rad)}
              x2={rOut * Math.cos(rad)}
              y2={rOut * Math.sin(rad)}
              stroke="#5C6578"
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        {/* Central pivot mount */}
        <circle cx={0} cy={0} r={14} fill="#0A0F1D" stroke="#5C6578" strokeWidth="2.5" />
        <circle cx={0} cy={0} r={4.5} fill="#94A3B8" />
      </g>

      {/* 3. The 6 color badges */}
      {DISPLAY_POSITIONS.map((pos) => {
        const fillHex = CC_COLOR_HEX[pos.color];
        const deepHex = CC_COLOR_DEEP_HEX[pos.color];
        const inkHex = CC_COLOR_INK[pos.color];
        const iconSize = DISPLAY_BADGE_R * 0.85;
        return (
          <g key={`badge-${pos.color}`}>
            <circle cx={pos.badge.x} cy={pos.badge.y} r={DISPLAY_BADGE_R} fill={fillHex} stroke={deepHex} strokeWidth="3.5" />
            <g transform={`translate(${pos.badge.x - iconSize / 2}, ${pos.badge.y - iconSize / 2})`}>
              <IssueSymbol color={pos.color} size={iconSize} strokeWidth={2.2} colorHex={inkHex} />
            </g>
          </g>
        );
      })}

      {/* 4. The 6 hex tile slots */}
      {DISPLAY_POSITIONS.map((pos) => (
        <g key={`slot-${pos.color}`}>
          <polygon points={hexPointsAt(pos.hex.x, pos.hex.y, DISPLAY_HEX_R)} fill="#151E2E" stroke="#334155" strokeWidth="4" />
          <polygon
            points={hexPointsAt(pos.hex.x, pos.hex.y, DISPLAY_HEX_R - 16)}
            fill="none"
            stroke="#3E4C63"
            strokeWidth="2.5"
            strokeDasharray="10 9"
          />
        </g>
      ))}

      {/* 5. Optional dial token overlay for previewing */}
      {showDialToken && (
        <g transform={`rotate(${dialAngle + 90}) scale(${DISPLAY_DIAL_R / 80}) translate(-120, -120)`}>
          <DialTokenSVG />
        </g>
      )}
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

// A pair of stacked upward chevrons sized to a hex of radius r, used to mark
// a tile as "rallying" - shared so the single-hex and three-hex versions
// climb in exactly the same proportions.
const chevronPair = (cx, cy, r) => {
  const halfWidth = r * 0.531;
  const apex1 = cy - r * 0.656;
  const base1 = cy - r * 0.188;
  const apex2 = cy - r * 0.219;
  const base2 = cy + r * 0.25;
  return [
    `M ${(cx - halfWidth).toFixed(2)} ${base1.toFixed(2)} L ${cx.toFixed(2)} ${apex1.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${base1.toFixed(2)}`,
    `M ${(cx - halfWidth).toFixed(2)} ${base2.toFixed(2)} L ${cx.toFixed(2)} ${apex2.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${base2.toFixed(2)}`
  ];
};

// A pair of horizontal bars ("=") sized to a hex of radius r - the upgraded
// counterpart to chevronPair: chevrons mean "must be ahead", equals means
// "ties count too", replacing what used to be a text label under the icon.
const equalsPair = (cx, cy, r) => {
  const halfWidth = r * 0.5;
  const y1 = cy - r * 0.22;
  const y2 = cy + r * 0.22;
  return [
    `M ${(cx - halfWidth).toFixed(2)} ${y1.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${y1.toFixed(2)}`,
    `M ${(cx - halfWidth).toFixed(2)} ${y2.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${y2.toFixed(2)}`
  ];
};

// The display: six hexes in a circle with one shared pawn moving around them.
// The orbit arrow covers about a third of the ring, clear of the hexes.
const DisplayGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    {pointsOnRing(6, 16).map((pos, idx) => (
      <polygon key={`display-hex-${idx}`} points={hexPointsAt(pos.x, pos.y, 5.5)} />
    ))}
    {/* A miniature version of the dial token itself, aimed at one slot */}
    <circle cx="24" cy="24" r="7" />
    <polygon points="24,17 19.5,23 28.5,23" fill="currentColor" stroke="none" />
    <circle cx="24" cy="24" r="2" fill="currentColor" stroke="none" />
  </svg>
);

// The bare track ladder shared by every "advance an issue" glyph below.
// `x` lets it sit on either side of whatever it's paired with.
const TrackLadder = ({ x = 8 }) => (
  <>
    <rect x={x} y="7" width="16" height="35" rx="8" />
    <path d={`M ${x + 3.5} 17 L ${x + 12.5} 17`} strokeWidth="1.6" />
    <path d={`M ${x + 3.5} 25 L ${x + 12.5} 25`} strokeWidth="1.6" />
    <path d={`M ${x + 3.5} 33 L ${x + 12.5} 33`} strokeWidth="1.6" />
    <circle cx={x + 8} cy="37.5" r="3.2" fill="currentColor" stroke="none" />
  </>
);

// Advance one step on an issue track - the generic, unattached version, used
// where there is no card or tile alongside it to say which track. An arrow
// capped by a line ("up to a limit"), with how far - N or 2N - named above it.
const IssueGlyph = ({ size = 48, label }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <TrackLadder x={2} />
    {label && (
      <text
        x="35"
        y="9"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="currentColor"
        stroke="none"
      >
        {label}
      </text>
    )}
    <path d="M 26 15 L 44 15" strokeWidth="2.6" />
    <path d="M 35 42 L 35 19" strokeWidth="2.6" />
    <path d="M 29.5 25 L 35 19 L 40.5 25" strokeWidth="2.6" />
  </svg>
);

// Advance the track matching a tile's colour - the hex sits to the left of
// the track (which one), no arrow needed since the pairing already says
// which track advances.
const IssueTileGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <polygon points={hexPointsAt(12, 23, 9.5)} />
    <TrackLadder x={24} />
  </svg>
);

// Advance the track matching a card's colour - the card sits to the left.
const IssueCardGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="5" y="14" width="13" height="18" rx="2.2" />
    <TrackLadder x={24} />
  </svg>
);

// Flip a tile to its other colour: one clean curl with a single arrowhead.
const FlipGlyph = ({ size = 48 }) => {
  const verts = hexVerticesAt(24, 17, 11);
  const leftHalf = [verts[0], verts[3], verts[4], verts[5]]
    .map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
      <polygon points={leftHalf} fill="currentColor" stroke="none" opacity="0.85" />
      <polygon points={hexPointsAt(24, 17, 11)} />
      <g transform="translate(14, 28) scale(0.8333)" strokeWidth="2.4">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
      </g>
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

// Rally a single tile: a hex with chevrons climbing near its top.
const RallyOneGlyph = ({ size = 48 }) => {
  const [upper, lower] = chevronPair(24, 24, 16);
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
      <polygon points={hexPointsAt(24, 24, 16)} />
      <path d={upper} strokeWidth="2.6" />
      <path d={lower} strokeWidth="2.6" />
    </svg>
  );
};

// Two touching tiles side by side - shared by the move and rally-adjacent
// glyphs so the pawn's tile sits in the same spot in both.
const PAIR_HEX_R = 10.5;
const PAIR_LEFT = { x: 14.9, y: 24 };
const PAIR_RIGHT = { x: PAIR_LEFT.x + Math.sqrt(3) * PAIR_HEX_R, y: 24 };

// Rally a tile next to your pawn: the pawn's tile with a dot at its center,
// and the adjacent tile climbing with the rally chevrons.
const RallyAdjacentGlyph = ({ size = 48 }) => {
  const [upper, lower] = chevronPair(PAIR_RIGHT.x, PAIR_RIGHT.y, PAIR_HEX_R);
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
      <polygon points={hexPointsAt(PAIR_LEFT.x, PAIR_LEFT.y, PAIR_HEX_R)} />
      <circle cx={PAIR_LEFT.x} cy={PAIR_LEFT.y} r="3.4" fill="currentColor" stroke="none" />
      <polygon points={hexPointsAt(PAIR_RIGHT.x, PAIR_RIGHT.y, PAIR_HEX_R)} />
      <path d={upper} strokeWidth="2.2" />
      <path d={lower} strokeWidth="2.2" />
    </svg>
  );
};

// Rally a tile and every tile around it: a full seven-hex flower, each hex
// climbing with the same chevrons as a single-tile rally. Radius 8.5 is the
// largest that fits the flower (3·√3·r wide, 5r tall) inside the 48 box.
const RALLY_CLUSTER_HEX_R = 8.5;
const RALLY_CLUSTER_CENTERS = [
  { x: 24, y: 24 },
  ...pointsOnRing(6, Math.sqrt(3) * RALLY_CLUSTER_HEX_R, 0)
];

// `markPair` draws the two strokes inside each hex - chevrons for the basic
// rally, equals signs for the ties-count upgrade.
const RallyClusterHexes = ({ markPair }) =>
  RALLY_CLUSTER_CENTERS.map((center, idx) => {
    const [upper, lower] = markPair(center.x, center.y, RALLY_CLUSTER_HEX_R);
    return (
      <g key={`rally-cluster-hex-${idx}`}>
        <polygon points={hexPointsAt(center.x, center.y, RALLY_CLUSTER_HEX_R)} strokeWidth="1.6" />
        <path d={upper} strokeWidth="1.8" />
        <path d={lower} strokeWidth="1.8" />
      </g>
    );
  });

const RallyClusterGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <RallyClusterHexes markPair={chevronPair} />
  </svg>
);

// The upgraded rally-a-cluster: the same seven hexes, but marked with equals
// signs instead of chevrons - rallying is allowed on a tie too.
const RallyClusterEqualGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <RallyClusterHexes markPair={equalsPair} />
  </svg>
);

// Move the pawn from the center of one tile to the center of the next.
const MoveGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <polygon points={hexPointsAt(PAIR_LEFT.x, PAIR_LEFT.y, PAIR_HEX_R)} opacity="0.5" />
    <polygon points={hexPointsAt(PAIR_RIGHT.x, PAIR_RIGHT.y, PAIR_HEX_R)} opacity="0.5" />
    <circle cx={PAIR_LEFT.x} cy={PAIR_LEFT.y} r="3.4" fill="currentColor" stroke="none" />
    <path d={`M ${PAIR_LEFT.x + 5.5} 24 L ${PAIR_RIGHT.x} 24`} strokeWidth="2.6" />
    <path d={`M ${PAIR_RIGHT.x - 4.2} 19.8 L ${PAIR_RIGHT.x} 24 L ${PAIR_RIGHT.x - 4.2} 28.2`} strokeWidth="2.6" />
  </svg>
);

// The numbered row of cards you may play from.
const CardsGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="4.5" y="19" width="13" height="18" rx="2.2" />
    <rect x="17.5" y="14" width="13" height="18" rx="2.2" fill="currentColor" stroke="none" />
    <rect x="30.5" y="19" width="13" height="18" rx="2.2" />
  </svg>
);

// Draw several cards and keep one - also stands in for peeking at the top
// of the deck, since both are "reach for the draw pile" gestures.
const DrawGlyph = ({ size = 48 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} {...glyphFrame}>
    <rect x="3" y="14" width="13" height="18" rx="2.2" opacity="0.5" />
    <rect x="6.5" y="18" width="13" height="18" rx="2.2" />
    <path d="M 23.5 27 L 29 27" strokeWidth="2.4" />
    <path d="M 26.4 23.8 L 30 27 L 26.4 30.2" strokeWidth="2.4" />
    <rect x="32" y="17" width="13" height="18" rx="2.2" fill="currentColor" stroke="none" />
  </svg>
);

const RepeatGlyph = ({ size = 48 }) => <RotateCcw size={size} strokeWidth={2} />;

const ACTION_GLYPHS = {
  display: DisplayGlyph,
  issue: IssueGlyph,
  issueTile: IssueTileGlyph,
  issueCard: IssueCardGlyph,
  flip: FlipGlyph,
  place: PlaceGlyph,
  rallyTile: RallyOneGlyph,
  rallyAdjacent: RallyAdjacentGlyph,
  rallyCluster: RallyClusterGlyph,
  rallyClusterEqual: RallyClusterEqualGlyph,
  move: MoveGlyph,
  cards: CardsGlyph,
  draw: DrawGlyph,
  repeat: RepeatGlyph
};

// --- 7B. ICON REFERENCE SHEET ----------------------------------------------
// The tiles themselves carry no words now - this sheet is where the icon
// language actually gets explained, once, in plain sentences.
const ICON_LEGEND_ENTRIES = [
  {
    key: 'display',
    category: 'Turn & Movement',
    label: 'Colonists priority',
    description: 'Move the dial up to N colonist slots around the ring.'
  },
  {
    key: 'move',
    category: 'Turn & Movement',
    label: 'Move your pawn',
    description: 'Move the shared pawn from the center of one tile to the center of an adjacent tile.'
  },
  {
    key: 'issueCard',
    category: 'Advance a Track',
    label: "A card's issue",
    description: "Advance the track matching that card's color."
  },
  {
    key: 'issueTile',
    category: 'Advance a Track',
    label: "A colonist's issue",
    description: "Advance the track matching that colonist's color."
  },
  {
    key: 'issue',
    category: 'Advance a Track',
    label: 'Advance with a limit',
    description: 'Advance any one issue track of your choice, up to the value shown.'
  },
  {
    key: 'flip',
    category: 'Board Actions',
    label: 'Flip a colonist',
    description: 'Flip a colonist tile over to its other color.'
  },
  {
    key: 'place',
    category: 'Board Actions',
    label: 'Place a colonist',
    description: 'Place a colonist tile onto an empty slot on the board.'
  },
  {
    key: 'rallyTile',
    category: 'Rally',
    label: 'Rally one tile',
    description: 'Rally a single tile.'
  },
  {
    key: 'rallyAdjacent',
    category: 'Rally',
    label: 'Rally, adjacent to pawn',
    description: 'Rally one tile adjacent to the tile your pawn is on.'
  },
  {
    key: 'rallyCluster',
    category: 'Rally',
    label: 'Rally a tile and its neighbors',
    description: 'Rally a tile and each tile adjacent to it. Chevrons: you must be ahead on that issue.'
  },
  {
    key: 'rallyClusterEqual',
    category: 'Rally',
    label: 'Rally, ties count',
    description: 'The same rally, but a tie on that issue is enough - you don’t need to be strictly ahead.'
  },
  {
    key: 'cards',
    category: 'Cards',
    label: 'Play a card',
    description: 'Play a card from the numbered display.'
  },
  {
    key: 'draw',
    category: 'Cards',
    label: 'Draw / look',
    description: 'Draw from the deck, or look at its top card, and keep one.'
  },
  {
    key: 'repeat',
    category: 'Other',
    label: 'Repeat',
    description: 'Repeat your previous action.'
  }
];

const ICON_LEGEND_CONVENTIONS = [
  { type: 'arrow-right', description: 'Perform the left action, then the right action.' },
  { type: 'arrow-down', description: 'Same meaning as → - the sequence just wrapped onto a second row.' },
  { type: 'slash', description: 'Perform the left action, or the right action.' },
  { type: 'chip', description: 'A fixed number or word (like "N = 1") - not the tile’s own strength.' },
  { type: 'square', description: 'A single action, done once.' },
  { type: 'circle', description: 'Repeat this step N times - the notch at the top marks it as a repeat.' },
  { type: 'triangle', description: 'This is the tile’s upgraded side.' }
];

// Draws the actual shape each convention refers to, so the sheet shows the
// rule instead of just describing it.
const ConventionSwatch = ({ type }) => {
  const boxStyle = {
    borderColor: '#22304A',
    background: '#FFFFFF',
    color: '#22304A'
  };
  const swatchBox = (className, content) => (
    <span className={`flex items-center justify-center shrink-0 ${className}`} style={{ width: 56, height: 56 }}>
      {content}
    </span>
  );
  const demoSquare = () => <span className="rounded-xl border-2 shrink-0" style={{ ...boxStyle, width: 48, height: 48 }} />;

  if (type === 'arrow-right' || type === 'slash') {
    const connector = type === 'arrow-right'
      ? <ArrowRight size={26} strokeWidth={3} color="#22304A" />
      : <span style={{ fontSize: 28, fontWeight: 900, color: '#22304A', lineHeight: 1 }}>/</span>;
    return (
      <span className="flex items-center gap-2 shrink-0" style={{ height: 56 }}>
        {demoSquare()}
        {connector}
        {demoSquare()}
      </span>
    );
  }
  if (type === 'arrow-down') {
    return swatchBox('', <ArrowRight size={28} strokeWidth={3} color="#22304A" style={{ transform: 'rotate(90deg)' }} />);
  }
  if (type === 'chip') {
    return swatchBox(
      '',
      <span
        className="rounded-lg border-2 flex flex-col items-center justify-center gap-0.5"
        style={{ ...boxStyle, width: 48, height: 48 }}
      >
        <span className="text-[15px] font-black leading-none">N = 1</span>
      </span>
    );
  }
  if (type === 'square') {
    return swatchBox('', demoSquare());
  }
  if (type === 'circle') {
    return (
      <span className="relative flex items-center justify-center shrink-0" style={{ width: 56, height: 56 }}>
        <span className="border-2" style={{ ...boxStyle, width: 48, height: 48, borderRadius: '9999px' }} />
        <svg viewBox="0 0 20 20" width="36" height="36" style={{ position: 'absolute', top: -10.4, left: '50%', transform: 'translateX(-50%)' }}>
          <path d="M 6 13 L 11 8 L 6 3" stroke={boxStyle.borderColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  // triangle - filled with the upgraded side's own color, so the swatch
  // matches the actual corner badge on an upgraded tile.
  return swatchBox(
    'rounded-xl',
    <span className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: ACTION_SIDE_THEME.upgraded.headerBg }}>
      <Triangle size={26} fill="#FFFFFF" color="#FFFFFF" strokeWidth={0} />
    </span>
  );
};

// Consecutive entries sharing a category become one visual cluster - the
// three rally icons and the three "advance a track" icons each stay
// together as a group rather than scattering through a flat grid.
const ICON_LEGEND_GROUPS = ICON_LEGEND_ENTRIES.reduce((groups, entry) => {
  const lastGroup = groups[groups.length - 1];
  if (lastGroup && lastGroup.category === entry.category) {
    lastGroup.entries.push(entry);
  } else {
    groups.push({ category: entry.category, entries: [entry] });
  }
  return groups;
}, []);

const ActionIconLegendSheet = () => (
  <div
    className="font-sans"
    style={{ width: 1240, background: '#0B1220', padding: 44, borderRadius: 30, border: '4px solid #22304A' }}
  >
    <div className="flex items-center gap-3 mb-1">
      <Hexagon className="w-8 h-8 text-amber-400" />
      <span className="text-[32px] font-black text-amber-400 tracking-tight">Action Tile Icon Reference</span>
    </div>
    <p className="text-[15px] text-slate-400 mb-8">What each symbol on an action tile means.</p>

    <div className="grid grid-cols-2 gap-6 mb-8 items-start">
      {ICON_LEGEND_GROUPS.map((group) => (
        <div
          key={group.category}
          className="rounded-2xl border-2 p-4"
          style={{ background: '#F7F2E4', borderColor: '#22304A' }}
        >
          <div className="text-[13px] font-black uppercase tracking-wider mb-3" style={{ color: '#8A5A00' }}>
            {group.category}
          </div>
          <div className="flex flex-col gap-4">
            {group.entries.map((entry) => {
              const Glyph = ACTION_GLYPHS[entry.key];
              return (
                <div key={entry.key} className="flex items-center gap-4">
                  <span
                    className="rounded-xl border-2 flex items-center justify-center shrink-0"
                    style={{ width: 70, height: 70, borderColor: '#22304A', background: '#FFFFFF', color: '#22304A' }}
                  >
                    <Glyph size={48} />
                  </span>
                  <div>
                    <div className="text-[17px] font-black leading-tight" style={{ color: '#22304A' }}>
                      {entry.label}
                    </div>
                    <div className="text-[13px] leading-snug mt-0.5" style={{ color: '#6B5D4F' }}>
                      {entry.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-2xl border-2 p-5" style={{ background: '#F7F2E4', borderColor: '#22304A' }}>
      <div className="text-[14px] font-black uppercase tracking-wider mb-4" style={{ color: '#8A5A00' }}>
        Reading the tiles
      </div>
      <div className="grid grid-cols-2 gap-x-10 gap-y-4">
        {ICON_LEGEND_CONVENTIONS.map((item) => (
          <div key={item.type} className="flex items-center gap-4">
            <ConventionSwatch type={item.type} />
            <div className="text-[13px] leading-snug" style={{ color: '#6B5D4F' }}>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- 8. THE 6 DOUBLE-SIDED ACTION TILES ------------------------------------
// `steps` is the icon sentence across the middle of the tile, `text` is the
// rule, and `bonus` is the clause the upgraded side adds, highlighted in gold.
const CC_ACTIONS = [
  {
    id: 'address',
    name: 'Address',
    Icon: Megaphone,
    basic: {
      rows: [{ steps: [{ glyph: 'display', repeat: true }, { glyph: 'issueTile' }] }, { connector: 'then', steps: [{ glyph: 'flip' }] }],
      text: 'Move up to N on the display. Advance that tile’s issue, then flip it.'
    },
    upgraded: {
      rows: [
        { steps: [{ glyph: 'display', repeat: true }, { glyph: 'issueTile' }] },
        { connector: 'then', steps: [{ glyph: 'flip' }, { glyph: 'place' }] }
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
      rows: [{ steps: [{ glyph: 'display', repeat: true }] }, { connector: 'then', steps: [{ glyph: 'place' }] }],
      text: 'Move N on the display. Place that tile on the board.'
    },
    upgraded: {
      rows: [
        { steps: [{ glyph: 'display', repeat: true }, { glyph: 'place' }] },
        { connector: 'then', steps: [{ glyph: 'rallyTile' }] }
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
      rows: [{ steps: [{ glyph: 'cards' }, { separator: '/' }, { glyph: 'draw' }] }],
      text: 'Play a card from slots 1–N, or draw N cards and play one of them.'
    },
    upgraded: {
      rows: [
        { steps: [{ glyph: 'cards' }, { separator: '/' }, { glyph: 'draw' }] },
        { connector: 'then', steps: [{ glyph: 'issueCard' }] }
      ],
      text: 'Play a card from slots 1–N, or draw N cards and play one of them.',
      bonus: 'Then advance the issue matching that card’s color.'
    }
  },
  {
    id: 'dance',
    name: 'Dance',
    Icon: Radio,
    basic: {
      rows: [{ steps: [{ glyph: 'move', repeat: true }, { glyph: 'rallyCluster' }] }],
      text: 'Move the pawn N tiles, then rally its tile and each adjacent tile.'
    },
    upgraded: {
      rows: [{ steps: [{ glyph: 'move', repeat: true }, { glyph: 'rallyClusterEqual' }] }],
      text: 'Move the pawn N tiles, then rally its tile and each adjacent tile.',
      bonus: 'You may rally issues on which you are tied.'
    }
  },
  {
    id: 'intern',
    name: 'Intern',
    Icon: GraduationCap,
    basic: {
      rows: [{ steps: [{ glyph: 'repeat' }, { chip: ['N = 1', 'Basic'] }] }],
      text: 'Repeat your previous action at strength 1, using its basic side.'
    },
    upgraded: {
      rows: [{ steps: [{ glyph: 'repeat' }, { chip: ['N = 1'] }] }],
      text: 'Repeat your previous action at strength 1.',
      bonus: 'You may use its upgraded side.'
    }
  },
  {
    id: 'media',
    name: 'Media',
    Icon: Newspaper,
    basic: {
      rows: [{ steps: [{ glyph: 'flip', repeat: true }] }],
      text: 'Flip N tiles.'
    },
    upgraded: {
      rows: [{ steps: [{ glyph: 'flip', repeat: true }, { glyph: 'rallyAdjacent' }] }],
      text: 'Flip N tiles.',
      bonus: 'Then rally the tile adjacent to your pawn.'
    }
  },
  {
    id: 'invest',
    name: 'Invest',
    Icon: TrendingUp,
    basic: {
      rows: [{ steps: [{ glyph: 'issue', label: 'N' }] }],
      text: 'Advance any one issue track up to N.'
    },
    upgraded: {
      rows: [{ steps: [{ glyph: 'issue', label: '2N' }] }],
      text: 'Advance any one issue track up to N.',
      bonus: 'Advance it up to 2N instead.'
    }
  }
];

// Basic and upgraded share every interior color - body, header, icon boxes,
// ink - so only the frame (and the upgraded corner triangle) tell them apart.
// Body, icon boxes and glyph ink stay identical on both sides; the header
// bar is paired with the frame color, so basic is dark blue top-to-bottom
// and upgraded is the same brown as its border, not the other way round.
const ACTION_TILE_SHARED = {
  body: '#F7F2E4',
  headerInk: '#FFFFFF',
  glyphInk: '#22304A',
  stepBg: '#FFFFFF',
  stepBorder: '#22304A'
};

const ACTION_SIDE_THEME = {
  basic: {
    ...ACTION_TILE_SHARED,
    border: '#22304A',
    headerBg: '#22304A'
  },
  upgraded: {
    ...ACTION_TILE_SHARED,
    border: '#8A5A00',
    headerBg: '#8A5A00'
  }
};

// One glyph size everywhere, matching Develop's upgraded tile - every action
// tile reads at the same scale instead of icons shrinking as a row fills up.
const ACTION_GLYPH_SIZE = 88;

// A plain icon box, no label underneath - the icon reference sheet carries
// the explanation now, so the tile itself can give the icon all the room.
const ActionStep = ({ step, theme, glyphSize }) => {
  if (step.separator) {
    return (
      <span className="text-[30px] font-black leading-none shrink-0" style={{ color: theme.glyphInk, opacity: 0.6 }}>
        {step.separator}
      </span>
    );
  }

  if (step.chip) {
    const lines = Array.isArray(step.chip) ? step.chip : [step.chip];
    return (
      <span
        className="rounded-xl shrink-0 border-2 flex flex-col items-center justify-center gap-0.5"
        style={{
          color: theme.glyphInk,
          borderColor: theme.stepBorder,
          background: theme.stepBg,
          width: glyphSize + 24,
          height: glyphSize + 24
        }}
      >
        {lines.map((line, idx) => (
          <span
            key={line}
            className={idx === 0 ? 'text-[28px] font-black tracking-wide leading-none' : 'text-[15px] font-bold uppercase tracking-widest leading-none opacity-75 mt-1'}
          >
            {line}
          </span>
        ))}
      </span>
    );
  }

  const Glyph = ACTION_GLYPHS[step.glyph];
  const isRepeat = Boolean(step.repeat);
  return (
    <span
      className="relative flex items-center justify-center shrink-0"
      style={{
        color: theme.glyphInk,
        background: theme.stepBg,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: theme.stepBorder,
        borderRadius: isRepeat ? '9999px' : '0.75rem',
        width: glyphSize + 24,
        height: glyphSize + 24
      }}
    >
      <Glyph size={glyphSize} label={step.label} />
      {/* A step done once per N, marked by rounding the frame into a circle
          with a small clockwise chevron notched into its rim. */}
      {isRepeat && (
        <svg
          viewBox="0 0 20 20"
          width="36"
          height="36"
          style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)' }}
        >
          <path
            d="M 6 13 L 11 8 L 6 3"
            stroke={theme.stepBorder}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
};

const ActionTileCard = ({ action, side, size = 420 }) => {
  const isUpgraded = side === 'upgraded';
  const theme = ACTION_SIDE_THEME[side];
  const face = isUpgraded ? action.upgraded : action.basic;
  const { Icon } = action;

  const glyphSize = ACTION_GLYPH_SIZE;

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
      {/* Header: name and emblem - a small triangle in the corner marks the upgraded side */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ background: theme.headerBg, color: theme.headerInk, height: 74 }}
      >
        <Icon size={34} strokeWidth={2.2} />
        <span className="text-[30px] font-black tracking-tight leading-none flex-1">
          {action.name}
        </span>
        {isUpgraded && <Triangle size={28} fill={theme.headerInk} color={theme.headerInk} strokeWidth={0} />}
      </div>

      {/* Icon sentence - the whole rule, no words, explained on the icon reference sheet */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-3">
        {face.rows.map((row, rowIdx) => (
          <React.Fragment key={`row-${rowIdx}`}>
            {rowIdx > 0 &&
              (row.connector === 'or' ? (
                <span className="text-[26px] font-black leading-none" style={{ color: theme.glyphInk, opacity: 0.5 }}>
                  /
                </span>
              ) : (
                <ArrowRight
                  size={22}
                  strokeWidth={3}
                  style={{ color: theme.glyphInk, opacity: 0.45, transform: 'rotate(90deg)' }}
                />
              ))}
            <div className="flex items-center justify-center gap-3">
              {row.steps.map((step, i) => {
                const previous = row.steps[i - 1];
                const needsArrow = i > 0 && !step.separator && !(previous && previous.separator);
                return (
                  <React.Fragment key={`${action.id}-${side}-${rowIdx}-${i}`}>
                    {needsArrow && (
                      <ArrowRight size={18} strokeWidth={3} style={{ color: theme.glyphInk, opacity: 0.55, flexShrink: 0 }} />
                    )}
                    <ActionStep step={step} theme={theme} glyphSize={glyphSize} />
                  </React.Fragment>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// --- 8b. ACTION UPGRADE MARKERS (issue-track slot-3 tiles) -----------------
// Just the header strip of an action tile's upgraded side - icon, name, gold
// theme, upgrade triangle - with no body, sized to exactly cover a single
// issue-track cell (see the gold badge on slot 3 in ColonyCollapseTracksAssets.jsx)
// so the marker can be dropped straight onto the board when a colonist gets there.
const ActionUpgradeMarker = ({ action }) => {
  const theme = ACTION_SIDE_THEME.upgraded;
  const { Icon } = action;

  return (
    <div
      className="flex items-center gap-3 px-4 font-sans box-border shrink-0"
      style={{
        width: ISSUE_TRACK_CELL_W,
        height: ISSUE_TRACK_CELL_H,
        background: theme.headerBg,
        color: theme.headerInk,
        border: `3px solid ${theme.border}`,
        borderRadius: 12
      }}
    >
      <Icon size={30} strokeWidth={2.2} />
      <span className="text-[24px] font-black tracking-tight leading-none flex-1">
        {action.name}
      </span>
      <Triangle size={20} fill={theme.headerInk} color={theme.headerInk} strokeWidth={0} />
    </div>
  );
};

// Uniform back for the 7 upgrade markers - identical on every one, no name or
// icon, so a stack of them can be shuffled and drawn blind. Plain gradient, a
// white bee centred between two upgrade triangles bookending it.
const ActionUpgradeMarkerBack = () => {
  const w = ISSUE_TRACK_CELL_W;
  const h = ISSUE_TRACK_CELL_H;
  const beeSize = 48;
  const triangleSize = 24;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block">
      <defs>
        <linearGradient id="action-upgrade-back-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C48D15" />
          <stop offset="100%" stopColor="#5C3D00" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="12" fill="url(#action-upgrade-back-grad)" />
      <rect
        x="1.5"
        y="1.5"
        width={w - 3}
        height={h - 3}
        rx="12"
        fill="none"
        stroke={ACTION_SIDE_THEME.upgraded.border}
        strokeWidth="3"
      />
      <g transform={`translate(${32 - triangleSize / 2}, ${h / 2 - triangleSize / 2})`}>
        <Triangle size={triangleSize} fill="#FFFFFF" color="#FFFFFF" strokeWidth={0} />
      </g>
      <g transform={`translate(${w - 32 - triangleSize / 2}, ${h / 2 - triangleSize / 2})`}>
        <Triangle size={triangleSize} fill="#FFFFFF" color="#FFFFFF" strokeWidth={0} />
      </g>
      <g transform={`translate(${w / 2 - beeSize / 2}, ${h / 2 - beeSize / 2})`}>
        <BeeMark size={beeSize} bodyColor="#FFFFFF" stripeColor={ACTION_SIDE_THEME.upgraded.border} />
      </g>
    </svg>
  );
};

// --- 9. EXPORT HELPERS ------------------------------------------------------
const TILE_EXPORT_PX = 300;
const DIAL_TOKEN_EXPORT_PX = 300;
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

const actionUpgradeMarkerFileName = (action) => `ColonyCollapse_ActionUpgradeMarker_${action.name}.png`;
const ACTION_UPGRADE_MARKER_BACK_FILENAME = 'ColonyCollapse_ActionUpgradeMarker_Back.png';

// --- 10. MAIN COMPONENT -----------------------------------------------------
export default function ColonyCollapseBoardAssets() {
  const [activeAsset, setActiveAsset] = useState('display'); // 'tiles' | 'board' | 'display' | 'actions'
  const [tileFlipState, setTileFlipState] = useState({}); // tile id -> 'A' | 'B'
  const [selectedColor, setSelectedColor] = useState('All');
  const [busyLabel, setBusyLabel] = useState(null);

  // Central dial preview state
  const [displayPreviewWithDial, setDisplayPreviewWithDial] = useState(false);
  const [displayDialColor, setDisplayDialColor] = useState('Clay');

  const currentDialAngle = useMemo(() => {
    const pos = DISPLAY_POSITIONS.find((p) => p.color === displayDialColor);
    return pos ? pos.angleDeg : -90;
  }, [displayDialColor]);

  // District editor: repaint the 30 outer cells to reshape the six districts
  // without touching the shipped DISTRICT_LAYOUT constant.
  const [districtEditorOpen, setDistrictEditorOpen] = useState(false);
  const [outerDistricts, setOuterDistricts] = useState(() => ({ ...DEFAULT_OUTER_DISTRICTS }));
  const [activeDistrictBrush, setActiveDistrictBrush] = useState(0);
  const [districtCodeCopied, setDistrictCodeCopied] = useState(false);

  const [boardVariant, setBoardVariant] = useState('irregular'); // 'irregular' | 'triangles'
  const isTriangleBoard = boardVariant === 'triangles';

  const liveBoardGeometry = useMemo(() => buildEditableBoardGeometry(outerDistricts), [outerDistricts]);
  const isEditingDistricts = districtEditorOpen && !isTriangleBoard;
  const irregularBoardGeometry = isEditingDistricts ? liveBoardGeometry : DEFAULT_BOARD_GEOMETRY;
  const boardGeometry = isTriangleBoard ? TRIANGLE_BOARD_GEOMETRY : irregularBoardGeometry;

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
      const nodeId = `cc-tile-export-${tile.id}-${side}`;
      const node = document.getElementById(nodeId);
      if (!node) throw new Error(`Export node "${nodeId}" is not mounted`);
      await exportForTTS(node, { filename: tileFileName(tile, side), transparent: true });
    });

  const exportSingleAction = (action, side) =>
    runExport(`action-${action.id}-${side}`, async () => {
      const dataUrl = await renderNodeToPng(`cc-action-export-${action.id}-${side}`, {
        transparent: false
      });
      triggerDownload(dataUrl, actionFileName(action, side));
    });

  const exportSingleActionUpgradeMarker = (action) =>
    runExport(`action-upgrade-${action.id}`, async () => {
      const dataUrl = await renderNodeToPng(`cc-action-upgrade-export-${action.id}`, {
        transparent: false
      });
      triggerDownload(dataUrl, actionUpgradeMarkerFileName(action));
    });

  const exportActionUpgradeMarkerBack = () =>
    runExport('action-upgrade-back', async () => {
      const dataUrl = await renderNodeToPng('cc-action-upgrade-back-export', { transparent: false });
      triggerDownload(dataUrl, ACTION_UPGRADE_MARKER_BACK_FILENAME);
    });

  const exportBoard = () =>
    runExport('board', async () => {
      const dataUrl = await renderNodeToPng('cc-board-export', { transparent: false });
      const fileName = isTriangleBoard ? 'ColonyCollapse_Board_7across_Triangles.png' : 'ColonyCollapse_Board_7across.png';
      triggerDownload(dataUrl, fileName);
    });

  const exportDisplayBoard = () =>
    runExport('display', async () => {
      const dataUrl = await renderNodeToPng('cc-display-export', { transparent: false });
      triggerDownload(dataUrl, 'ColonyCollapse_TileDisplay.png');
    });

  const exportDisplayBoardWithDial = () =>
    runExport('display-with-dial', async () => {
      const dataUrl = await renderNodeToPng('cc-display-with-dial-export', { transparent: false });
      triggerDownload(dataUrl, `ColonyCollapse_TileDisplay_WithDial_${displayDialColor}.png`);
    });

  const exportDialToken = () =>
    runExport('dial-token', async () => {
      const nodeId = 'cc-dial-token-export';
      const node = document.getElementById(nodeId);
      if (!node) throw new Error(`Export node "${nodeId}" is not mounted`);
      await exportForTTS(node, {
        filename: buildAssetFilename({ game: 'ColonyCollapse', group: 'Token', variant: 'Dial' }),
        transparent: true
      });
    });

  const exportSheet = (nodeId, fileName, transparent = false) =>
    runExport(nodeId, async () => {
      const dataUrl = await renderNodeToPng(nodeId, { transparent });
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
      triggerDownload(URL.createObjectURL(blob), 'ColonyCollapse_ActionTiles_14_faces.zip');
    });

  const exportAllActionUpgradeMarkersZip = () =>
    runExport('action-upgrade-zip', async () => {
      const zip = new JSZip();
      const folder = zip.folder('colony_collapse_action_upgrade_markers');
      for (const action of CC_ACTIONS) {
        const dataUrl = await renderNodeToPng(`cc-action-upgrade-export-${action.id}`, {
          transparent: false
        });
        folder.file(actionUpgradeMarkerFileName(action), dataUrl.split(',')[1], { base64: true });
      }
      const backDataUrl = await renderNodeToPng('cc-action-upgrade-back-export', { transparent: false });
      folder.file(ACTION_UPGRADE_MARKER_BACK_FILENAME, backDataUrl.split(',')[1], { base64: true });
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(URL.createObjectURL(blob), 'ColonyCollapse_ActionUpgradeMarkers_7.zip');
    });

  const isBusy = busyLabel !== null;

  const assetTabs = [
    { id: 'tiles', label: 'Hex Tiles', sub: '15 double-sided', Icon: Hexagon },
    { id: 'board', label: 'Board', sub: '37 cells, 7 across', Icon: Grid3x3 },
    { id: 'display', label: 'Colonists', sub: '6-hex tile display', Icon: Hexagon },
    { id: 'actions', label: 'Action Tiles', sub: '7 double-sided', Icon: LayoutGrid },
    { id: 'cards', label: 'Cards', sub: '36 ability cards', Icon: Layers },
    { id: 'tracks', label: 'Tokens & Boards', sub: 'tracks, discs, player boards', Icon: Circle }
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
              15 double-sided hex tiles · a 37-cell board · 7 double-sided action tiles · the
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

        {/* ---------------- TOKENS, TRACKS & PLAYER BOARDS ---------------- */}
        {activeAsset === 'tracks' && (
          <div className="-m-6">
            <ColonyCollapseTracksAssets />
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
                onClick={() => exportSheet('cc-tile-sheet-a', 'ColonyCollapse_TTS_TileSheet_SideA.png', true)}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <FileImage className="w-4 h-4" /> Sheet — side A
              </button>
              <button
                onClick={() => exportSheet('cc-tile-sheet-b', 'ColonyCollapse_TTS_TileSheet_SideB.png', true)}
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
              <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-1">
                {[
                  { id: 'irregular', label: 'Irregular districts' },
                  { id: 'triangles', label: 'Triangle districts' }
                ].map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setBoardVariant(variant.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                      boardVariant === variant.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
              {!isTriangleBoard && (
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
              )}
              <p className="text-xs text-slate-500 max-w-md">
                Hub in the middle, the six issue colors in the inner ring (never flipped, so no
                leaf), and 30 empty slots.{' '}
                {isTriangleBoard
                  ? 'Six identical 1-2-3 triangle districts, rotationally symmetric, one issue each.'
                  : 'Six irregular districts of 6 cells, one issue each.'}
              </p>
            </div>

            {isEditingDistricts && (
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
                interactive={isEditingDistricts}
                activeDistrictIndex={isEditingDistricts ? activeDistrictBrush : null}
                onCellClick={isEditingDistricts ? paintDistrictCell : undefined}
              />
            </div>
          </section>
        )}

        {/* ---------------- DISPLAY & DIAL TOKEN ---------------- */}
        {activeAsset === 'display' && (
          <section className="space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
                <button
                  onClick={exportDisplayBoard}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" /> Colonists Board PNG ({DISPLAY_BOARD_SIZE * EXPORT_PIXEL_RATIO}px)
                </button>
                <button
                  onClick={exportDisplayBoardWithDial}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Board with Dial ({displayDialColor})
                </button>

                {/* Preview controls */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 ml-auto">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayPreviewWithDial}
                      onChange={(e) => setDisplayPreviewWithDial(e.target.checked)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Preview dial token on board
                  </label>
                </div>
              </div>

              {displayPreviewWithDial && (
                <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 no-print">
                  <span className="text-xs font-bold text-slate-400">Aim dial at:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CC_COLOR_ORDER.map((color) => (
                      <button
                        key={`aim-${color}`}
                        onClick={() => setDisplayDialColor(color)}
                        className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                          displayDialColor === color
                            ? 'ring-2 ring-amber-400 scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: `${CC_COLOR_HEX[color]}25`,
                          borderColor: CC_COLOR_DEEP_HEX[color],
                          color: CC_COLOR_HEX[color]
                        }}
                      >
                        <IssueSymbol color={color} size={12} colorHex={CC_COLOR_HEX[color]} />
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 max-w-xl mb-4">
                Six empty hex slots in a ring, each with its district color badge, and a central circular dial
                socket for the rotating dial token.
              </p>

              <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <DisplayBoardSVG showDialToken={displayPreviewWithDial} dialAngle={currentDialAngle} />
              </div>
            </div>

            {/* ---------------- DIAL TOKEN ASSET CARD ---------------- */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
                    <Compass className="w-5 h-5" /> Colonists Priority
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Turn colonist priority dial.</p>
                </div>
                <button
                  onClick={exportDialToken}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors no-print"
                >
                  <Download className="w-4 h-4" /> Dial Token PNG
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col items-center max-w-xs mx-auto">
                <div className="w-56 h-56 relative flex items-center justify-center">
                  <div
                    style={{
                      transform: `rotate(${currentDialAngle + 90}deg)`,
                      transition: 'transform 0.25s ease-out'
                    }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <DialTokenSVG size={220} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 text-center mt-3">
                  Flat pewter disc, a pointer nose, the same bee mark as every other token.
                </p>
              </div>

              {/* Aiming test bar */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
                <span className="text-xs font-bold text-slate-400">Test rotation:</span>
                <div className="flex flex-wrap gap-2">
                  {CC_COLOR_ORDER.map((color) => (
                    <button
                      key={`test-dial-${color}`}
                      onClick={() => setDisplayDialColor(color)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                        displayDialColor === color
                          ? 'ring-2 ring-amber-400 scale-105'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${CC_COLOR_HEX[color]}20`,
                        borderColor: CC_COLOR_DEEP_HEX[color],
                        color: CC_COLOR_HEX[color]
                      }}
                    >
                      <IssueSymbol color={color} size={14} colorHex={CC_COLOR_HEX[color]} />
                      {color}
                    </button>
                  ))}
                </div>
              </div>
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
                <Package className="w-4 h-4" /> All 14 faces (.zip)
              </button>
              <button
                onClick={() =>
                  exportSheet('cc-action-sheet', 'ColonyCollapse_ActionTiles_Sheet.png', true)
                }
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <FileImage className="w-4 h-4" /> Tile faces sheet
              </button>
              <button
                onClick={() =>
                  exportSheet('cc-icon-legend', 'ColonyCollapse_ActionTiles_IconReference.png')
                }
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <Hexagon className="w-4 h-4" /> Icon reference sheet
              </button>
              <p className="text-xs text-slate-500 max-w-lg">
                Tiles carry icons only now, no rule text - the icon reference sheet below is
                where every symbol actually gets explained.
              </p>
            </div>

            <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <ActionIconLegendSheet />
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

            {/* ---------------- ISSUE TRACK UPGRADE MARKERS (slot 3) ---------------- */}
            <div className="mt-10 pt-6 border-t border-slate-800">
              <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
                <div className="flex-1 min-w-[280px]">
                  <h2 className="text-lg font-black text-amber-400 tracking-tight">
                    Issue Track Upgrade Markers
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg mt-1">
                    Just an action tile's upgraded header - no body - sized to exactly cover a
                    single issue-track cell. Drop one on slot 3 (marked with the gold triangle
                    badge on every issue track) once a colonist reaches it. All 7 share the same
                    back below, so they can be shuffled face-down and drawn blind.
                  </p>
                </div>
                <button
                  onClick={exportAllActionUpgradeMarkersZip}
                  disabled={isBusy}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Package className="w-4 h-4" /> All 7 + back (.zip)
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                {CC_ACTIONS.map((action) => (
                  <div key={action.id} className="flex flex-wrap items-center gap-3">
                    <ActionUpgradeMarker action={action} />
                    <button
                      onClick={() => exportSingleActionUpgradeMarker(action)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-3 pt-3 mt-1 border-t border-slate-800">
                  <ActionUpgradeMarkerBack />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Uniform back
                    </span>
                    <span className="text-[11px] text-slate-500">Same on all 7, for shuffling</span>
                  </div>
                  <button
                    onClick={exportActionUpgradeMarkerBack}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              </div>
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
            <div
              key={`export-action-${action.id}-${side}`}
              id={`cc-action-export-${action.id}-${side}`}
              style={{ width: ACTION_EXPORT_PX, height: ACTION_EXPORT_PX }}
            >
              <ActionTileCard action={action} side={side} size={ACTION_EXPORT_PX} />
            </div>
          ))
        )}

        {CC_ACTIONS.map((action) => (
          <div
            key={`export-action-upgrade-${action.id}`}
            id={`cc-action-upgrade-export-${action.id}`}
            style={{ width: ISSUE_TRACK_CELL_W, height: ISSUE_TRACK_CELL_H }}
          >
            <ActionUpgradeMarker action={action} />
          </div>
        ))}

        <div
          id="cc-action-upgrade-back-export"
          style={{ width: ISSUE_TRACK_CELL_W, height: ISSUE_TRACK_CELL_H }}
        >
          <ActionUpgradeMarkerBack />
        </div>

        <div id="cc-board-export" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}>
          <BoardSVG cells={boardGeometry.cells} borderSegments={boardGeometry.borderSegments} />
        </div>

        <div id="cc-display-export" style={{ width: DISPLAY_BOARD_SIZE, height: DISPLAY_BOARD_SIZE }}>
          <DisplayBoardSVG />
        </div>

        <div id="cc-display-with-dial-export" style={{ width: DISPLAY_BOARD_SIZE, height: DISPLAY_BOARD_SIZE }}>
          <DisplayBoardSVG showDialToken={true} dialAngle={currentDialAngle} />
        </div>

        <div id="cc-dial-token-export" style={{ width: DIAL_TOKEN_EXPORT_PX, height: DIAL_TOKEN_EXPORT_PX }}>
          <DialTokenSVG size={DIAL_TOKEN_EXPORT_PX} />
        </div>

        {['A', 'B'].map((side) => (
          <div
            key={`sheet-${side}`}
            id={`cc-tile-sheet-${side.toLowerCase()}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(5, ${TILE_EXPORT_PX}px)`
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
            gridTemplateColumns: `repeat(4, ${ACTION_EXPORT_PX}px)`
          }}
        >
          {CC_ACTIONS.flatMap((action) =>
            ['basic', 'upgraded'].map((side) => (
              <ActionTileCard key={`sheet-${action.id}-${side}`} action={action} side={side} size={ACTION_EXPORT_PX} />
            ))
          )}
        </div>

        {/* fit-content: as a plain block this wrapper stretches to the widest
            sibling in the hidden export container (the tile sheets), which
            leaves empty space to the right of the 1240px sheet. */}
        <div id="cc-icon-legend" style={{ width: 'fit-content' }}>
          <ActionIconLegendSheet />
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
