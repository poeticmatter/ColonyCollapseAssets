import React, { useState, useRef, useMemo } from 'react';
import {
  Download, Printer, LayoutGrid, Filter, FileImage, Package, Grid3x3, Hexagon, Layers,
  Megaphone, Hammer, Handshake, Radio, Newspaper, GraduationCap, RotateCcw,
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
// The face colour fills the hex and carries its own glyph near the top. The
// reverse colour shows on a small hexagon nested near the bottom of the tile -
// it echoes the tile's own shape rather than introducing a new one, so it
// reads as a badge that clearly belongs to this piece. Both icons sit off
// centre, mirrored across it, so a control token placed in the middle of the
// tile leaves the face and flip-side colours readable.
const TILE_BADGE_CENTER = { x: 150, y: 226 };
const TILE_BADGE_R = 38;
const TILE_FACE_ICON_CENTER = { x: 150, y: 300 - TILE_BADGE_CENTER.y };

const TileFaceSVG = ({ faceColor, backColor, className = '' }) => {
  const faceHex = CC_COLOR_HEX[faceColor] || faceColor;
  const faceDeep = CC_COLOR_DEEP_HEX[faceColor] || '#1E293B';
  const faceInk = CC_COLOR_INK[faceColor] || '#1F2937';
  const backHex = CC_COLOR_HEX[backColor] || backColor;
  const backInk = CC_COLOR_INK[backColor] || '#1F2937';

  const cx = 150;
  const cy = 150;
  const outerR = 132;
  // Smaller than the old centred glyph so it clears the inner border where
  // the hex narrows toward its top point.
  const faceIconSize = 56;
  const badgeIconSize = 34;
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

      <g
        transform={`translate(${TILE_FACE_ICON_CENTER.x - faceIconSize / 2}, ${TILE_FACE_ICON_CENTER.y - faceIconSize / 2})`}
      >
        <IssueSymbol color={faceColor} size={faceIconSize} strokeWidth={2.2} colorHex={faceInk} />
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
// Each cell's printed face is inset from its grid hex, leaving a gutter
// between neighbours wide enough for the park borders to sit in without
// covering the cells.
const BOARD_CELL_FACE_R = BOARD_CELL_R - 14;

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

// Dice pips, not a printed digit - a human recognizes a dot count at a glance
// (subitizing) far faster than reading a numeral, and it works for players
// who can't tell the district colors apart.
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
      // An edge between two districts is seen from both sides; keep only one
      // copy (opposite directions are 3 apart) so the park colour patches drawn
      // along it aren't doubled.
      const neighborAlsoDraws = neighbor != null && neighbor.district != null;
      if (neighborAlsoDraws && edgeIndex >= 3) return;
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

// District borders are drawn as narrow parks: a strip of grass, edged dark so
// it reads against both chalk issue cells and the dark slots, with wildflowers
// growing in from its edges. Each wildflower patch is an imaginary circle
// centred on one edge of the grass, alternating sides along the border; its
// dots crowd near the centre and thin out toward the rim, and only the dots
// that land on the grass are drawn, so patches never spill onto the cells.
const PARK_EDGE_COLOR = '#12261A';
const PARK_EDGE_WIDTH = 26;
const PARK_GRASS_COLOR = '#3F7A3B';
const PARK_GRASS_WIDTH = 21;
const PARK_GRASS_HALF_WIDTH = PARK_GRASS_WIDTH / 2;
const PARK_PATCH_COLORS = ['#FFF6E5', '#F4A9C8', '#FFD447', '#C7B4F0', '#F28C6B'];
const PARK_PATCH_RADIUS = 16;
// Neighbouring circles sit on opposite edges; spacing them so their centres
// are this fraction of a diameter apart makes them overlap slightly.
const PARK_PATCH_OVERLAP_SPACING = 0.9;
const PARK_PATCH_STEP = Math.sqrt(
  (2 * PARK_PATCH_RADIUS * PARK_PATCH_OVERLAP_SPACING) ** 2 - PARK_GRASS_WIDTH ** 2
);
const PARK_PATCH_DOT_COUNT = 90; // before trimming the dots that fall off the grass
// The patch's heart is a solid disc of its colour. Its centre sits on the
// grass edge, so only the half facing into the grass is drawn.
const PARK_PATCH_CORE_R = 2.5;
const PARK_DOT_R = { heart: 1.4, rim: 0.7 };
// Raising a uniform 0-1 draw to this power bunches dots toward the patch's
// centre; 1 would spread them evenly by radius, higher clusters harder.
const PARK_DOT_CLUSTERING = 1.6;

// Mulberry32: a tiny seeded PRNG. Seeding it from the segment index keeps
// the patches organic-looking while every render and export stays identical.
const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const isOnGrass = (dot, segmentLength) =>
  Math.abs(dot.y) <= PARK_GRASS_HALF_WIDTH - dot.r && dot.x >= 0 && dot.x <= segmentLength;

// Dots in the segment's own frame: x runs along the border from its start,
// y runs across it from the centre line.
const buildPatchDots = (random, center, segmentLength) =>
  Array.from({ length: PARK_PATCH_DOT_COUNT }, () => {
    const radiusFraction = random() ** PARK_DOT_CLUSTERING;
    const angle = random() * 2 * Math.PI;
    return {
      x: center.x + Math.cos(angle) * radiusFraction * PARK_PATCH_RADIUS,
      y: center.y + Math.sin(angle) * radiusFraction * PARK_PATCH_RADIUS,
      r: PARK_DOT_R.heart + (PARK_DOT_R.rim - PARK_DOT_R.heart) * radiusFraction
    };
  }).filter((dot) => isOnGrass(dot, segmentLength));

const patchesAlongSegment = ({ from, to }, segmentIdx) => {
  const random = createSeededRandom(segmentIdx + 1);
  const segmentLength = Math.hypot(to.x - from.x, to.y - from.y);
  const patchCount = Math.floor(segmentLength / PARK_PATCH_STEP);
  const firstPatchX = (segmentLength - (patchCount - 1) * PARK_PATCH_STEP) / 2;
  let previousColorIdx = -1;
  return Array.from({ length: patchCount }, (_, patchIdx) => {
    const side = patchIdx % 2 === 0 ? -1 : 1;
    // Overlapping neighbours never share a colour, or they'd merge into one blob.
    const colorOffset = 1 + Math.floor(random() * (PARK_PATCH_COLORS.length - 1));
    const colorIdx =
      previousColorIdx < 0
        ? Math.floor(random() * PARK_PATCH_COLORS.length)
        : (previousColorIdx + colorOffset) % PARK_PATCH_COLORS.length;
    previousColorIdx = colorIdx;
    const center = { x: firstPatchX + patchIdx * PARK_PATCH_STEP, y: side * PARK_GRASS_HALF_WIDTH };
    return {
      center,
      side,
      color: PARK_PATCH_COLORS[colorIdx],
      dots: buildPatchDots(random, center, segmentLength)
    };
  });
};

// Half disc bulging from the grass edge toward the strip's centre line. In
// SVG's y-down frame, sweep 1 arcs through -y and sweep 0 through +y.
const patchCoreHalfDiscPath = (center, side) => {
  const sweepFlag = side > 0 ? 1 : 0;
  const left = center.x - PARK_PATCH_CORE_R;
  const right = center.x + PARK_PATCH_CORE_R;
  return `M ${left} ${center.y} A ${PARK_PATCH_CORE_R} ${PARK_PATCH_CORE_R} 0 0 ${sweepFlag} ${right} ${center.y} Z`;
};

const SegmentWildflowers = ({ segment, segmentIdx }) => {
  const { from, to } = segment;
  const angleDeg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${from.x}, ${from.y}) rotate(${angleDeg})`}>
      {patchesAlongSegment(segment, segmentIdx).map((patch, patchIdx) => (
        <g key={patchIdx} fill={patch.color}>
          <path d={patchCoreHalfDiscPath(patch.center, patch.side)} />
          {patch.dots.map((dot, dotIdx) => (
            <circle key={dotIdx} cx={dot.x} cy={dot.y} r={dot.r} />
          ))}
        </g>
      ))}
    </g>
  );
};

const ParkStrip = ({ borderSegments, stroke, strokeWidth }) => (
  <g strokeLinecap="round" stroke={stroke} strokeWidth={strokeWidth}>
    {borderSegments.map((segment, idx) => (
      <line key={idx} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} />
    ))}
  </g>
);

const DistrictParkBorders = ({ borderSegments }) => (
  <g>
    <ParkStrip borderSegments={borderSegments} stroke={PARK_EDGE_COLOR} strokeWidth={PARK_EDGE_WIDTH} />
    <ParkStrip borderSegments={borderSegments} stroke={PARK_GRASS_COLOR} strokeWidth={PARK_GRASS_WIDTH} />
    {borderSegments.map((segment, segmentIdx) => (
      <SegmentWildflowers key={segmentIdx} segment={segment} segmentIdx={segmentIdx} />
    ))}
  </g>
);

// Slots carry a wash of their district's issue colour - strong enough that a
// slot clearly reads as the same colour as its issue cell, while staying dark
// enough for the full-strength round badge to pop. The editor's active brush is louder.
const SLOT_DISTRICT_WASH_OPACITY = 0.34;
const SLOT_ACTIVE_BRUSH_WASH_OPACITY = 0.6;
const UNASSIGNED_BADGE_FILL = '#94A3B8';

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
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R)}
                fill="#151E2E"
                stroke="#334155"
                strokeWidth="3"
              />
              {districtColor && (
                <polygon
                  points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R)}
                  fill={CC_COLOR_HEX[districtColor]}
                  fillOpacity={isActiveBrush ? SLOT_ACTIVE_BRUSH_WASH_OPACITY : SLOT_DISTRICT_WASH_OPACITY}
                />
              )}
              <polygon
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R - 19)}
                fill="none"
                stroke="#3E4C63"
                strokeWidth="2.5"
                strokeDasharray="10 9"
              />

              {/* The round this slot activates: a dice-pip badge painted in the
                  district's own issue colour, so each slot visibly belongs to
                  the issue cell at the head of its district. */}
              <circle
                cx={cell.x}
                cy={cell.y}
                r="30"
                fill={CC_COLOR_HEX[districtColor] || UNASSIGNED_BADGE_FILL}
                stroke={CC_COLOR_DEEP_HEX[districtColor] || '#0B1220'}
                strokeWidth="3"
              />
              {ROUND_PIP_LAYOUTS[cell.roundNumber - 1].map(([dx, dy], pipIdx) => (
                <circle
                  key={pipIdx}
                  cx={cell.x + dx}
                  cy={cell.y + dy}
                  r="5.5"
                  fill={CC_COLOR_INK[districtColor] || '#1A1206'}
                  stroke="none"
                />
              ))}
            </g>
          );
        }

        if (cell.kind === 'hub') {
          return (
            <g key={key}>
              <polygon
                points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R)}
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
              points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R)}
              fill={issueHex}
              stroke={issueDeep}
              strokeWidth="4"
            />
            <polygon
              points={hexPointsAt(cell.x, cell.y, BOARD_CELL_FACE_R - 13)}
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

      <DistrictParkBorders borderSegments={borderSegments} />
    </g>
  </svg>
);

// --- 6B. DISPLAY BOARD & DIAL -----------------------------------------
// The 6-hex tile display: a central circular dial with a rotating dial token,
// six empty hex slots ringed tightly around it, and six color badges outside
// the hexes pointing to the matching districts.
// Same radius as a board cell, since an actual hex tile has to sit in both.
const DISPLAY_HEX_R = BOARD_CELL_R;
const DISPLAY_HEX_APOTHEM = (DISPLAY_HEX_R * Math.sqrt(3)) / 2;
const DISPLAY_HEX_GAP = 12;
// Neighbouring slots 60° apart sit flat side to flat side, so the ring
// radius equals the centre-to-centre distance: two apothems plus the gap.
const DISPLAY_RING_R = 2 * DISPLAY_HEX_APOTHEM + DISPLAY_HEX_GAP;
const DISPLAY_BADGE_R = 40;
// Wide enough for a short arrow pointing from each slot out to its badge.
const DISPLAY_BADGE_GAP = 46;
const DISPLAY_ARROW_CLEARANCE = 9; // space left at each end of the arrow
const DISPLAY_ARROW_HEAD = { length: 12, halfWidth: 8 };
const DISPLAY_ARROW_SHAFT_WIDTH = 4;
// Each slot faces outward with a flat side, so the badge clears it by the apothem.
const DISPLAY_BADGE_RING_R = DISPLAY_RING_R + DISPLAY_HEX_APOTHEM + DISPLAY_BADGE_GAP + DISPLAY_BADGE_R;
const DISPLAY_DIAL_R = 75;
const DISPLAY_MARGIN = 30;
// Rounded up to whole pixels so the export has a clean size.
const DISPLAY_BOARD_SIZE = Math.ceil((DISPLAY_BADGE_RING_R + DISPLAY_BADGE_R + DISPLAY_MARGIN) * 2);
const DISPLAY_BOARD_CENTER = { x: DISPLAY_BOARD_SIZE / 2, y: DISPLAY_BOARD_SIZE / 2 };

// Turns the whole ring 30° clockwise from straight-up so each slot lines up
// with its matching district on the main board. Hexes stay pointy-top, the
// same as the board cells, so a tile sits the same way in both.
const DISPLAY_ROTATION_DEG = 30;

const DISPLAY_POSITIONS = CC_COLOR_ORDER.map((color, idx) => {
  const angleDeg = -90 + DISPLAY_ROTATION_DEG + 60 * idx;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    color,
    angleDeg,
    hex: { x: DISPLAY_RING_R * Math.cos(angle), y: DISPLAY_RING_R * Math.sin(angle) },
    badge: { x: DISPLAY_BADGE_RING_R * Math.cos(angle), y: DISPLAY_BADGE_RING_R * Math.sin(angle) }
  };
});

// Drawn in a slot's own frame (origin at the hex centre, +x pointing outward),
// spanning the gap between the hex's flat outer side and its badge.
const DisplaySlotArrow = () => {
  const tailX = DISPLAY_HEX_APOTHEM + DISPLAY_ARROW_CLEARANCE;
  const tipX = DISPLAY_HEX_APOTHEM + DISPLAY_BADGE_GAP - DISPLAY_ARROW_CLEARANCE;
  const headBaseX = tipX - DISPLAY_ARROW_HEAD.length;
  const shaftHalfWidth = DISPLAY_ARROW_SHAFT_WIDTH / 2;
  return (
    <polygon
      points={[
        [tailX, -shaftHalfWidth],
        [headBaseX, -shaftHalfWidth],
        [headBaseX, -DISPLAY_ARROW_HEAD.halfWidth],
        [tipX, 0],
        [headBaseX, DISPLAY_ARROW_HEAD.halfWidth],
        [headBaseX, shaftHalfWidth],
        [tailX, shaftHalfWidth]
      ]
        .map(([x, y]) => `${x.toFixed(2)},${y}`)
        .join(' ')}
    />
  );
};

export { default as DialTokenSVG } from './ColonyCollapseDialToken.jsx';
import DialTokenSVG from './ColonyCollapseDialToken.jsx';

export const DisplayBoardSVG = ({
  showDialToken = false,
  dialAngle = DISPLAY_POSITIONS[0].angleDeg,
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
            x2={(DISPLAY_RING_R - DISPLAY_HEX_APOTHEM - 4) * Math.cos(rad)}
            y2={(DISPLAY_RING_R - DISPLAY_HEX_APOTHEM - 4) * Math.sin(rad)}
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

      {/* 3. The 6 hex tile slots */}
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

      {/* 4. Short arrows from each slot out to its badge */}
      {DISPLAY_POSITIONS.map((pos) => (
        <g
          key={`arrow-${pos.color}`}
          transform={`translate(${pos.hex.x}, ${pos.hex.y}) rotate(${pos.angleDeg})`}
          fill={CC_COLOR_HEX[pos.color]}
        >
          <DisplaySlotArrow />
        </g>
      ))}

      {/* 5. The 6 color badges */}
      {DISPLAY_POSITIONS.map((pos) => {
        const iconSize = DISPLAY_BADGE_R * 0.85;
        return (
          <g key={`badge-${pos.color}`}>
            <circle
              cx={pos.badge.x}
              cy={pos.badge.y}
              r={DISPLAY_BADGE_R}
              fill={CC_COLOR_HEX[pos.color]}
              stroke={CC_COLOR_DEEP_HEX[pos.color]}
              strokeWidth="3.5"
            />
            <g transform={`translate(${pos.badge.x - iconSize / 2}, ${pos.badge.y - iconSize / 2})`}>
              <IssueSymbol color={pos.color} size={iconSize} strokeWidth={2.2} colorHex={CC_COLOR_INK[pos.color]} />
            </g>
          </g>
        );
      })}

      {/* 6. Optional dial token overlay for previewing */}
      {showDialToken && (
        <g transform={`rotate(${dialAngle + 90}) scale(${DISPLAY_DIAL_R / 80}) translate(-120, -120)`}>
          <DialTokenSVG />
        </g>
      )}
    </g>
  </svg>
);

// --- 7. ACTION GLYPHS -------------------------------------------------------
// Each glyph is a line drawing on a 48-unit grid that inherits `currentColor`,
// drawn straight onto the tile body. A tile gives the gist of its action in
// one or two glyphs; the reference sheet carries the full rule.
const glyphFrame = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

// The cream every action tile body is printed on. Glyphs sit directly on it,
// so it's also the colour for marks that read as cut out of a filled shape.
const ACTION_TILE_BODY = '#F7F2E4';

// `size` is the rendered size of 48 grid units, so a glyph whose `box` is
// wider or taller than 48 grows in that direction at the same scale.
const GlyphSvg = ({ size, box = [0, 0, 48, 48], children }) => {
  const [x, y, width, height] = box;
  const scale = size / 48;
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} width={width * scale} height={height * scale} {...glyphFrame}>
      {children}
    </svg>
  );
};

const pointsOnRing = (count, ringR, startDeg = -90) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI / 180) * (startDeg + (360 / count) * i);
    return { x: 24 + ringR * Math.cos(angle), y: 24 + ringR * Math.sin(angle), angle };
  });

const formatPoints = (vertices) => vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');

// A colonist tile showing both of its sides at once - one half filled - the
// shared shorthand for "flip".
const HALF_HEX_VERTEX_INDICES = { left: [0, 3, 4, 5], right: [0, 1, 2, 3] };

const TwoToneHex = ({ cx, cy, r, filledHalf = 'left' }) => {
  const vertices = hexVerticesAt(cx, cy, r);
  const half = HALF_HEX_VERTEX_INDICES[filledHalf].map((i) => vertices[i]);
  return (
    <>
      <polygon points={formatPoints(half)} fill="currentColor" stroke="none" opacity="0.85" />
      <polygon points={hexPointsAt(cx, cy, r)} />
    </>
  );
};

// An arc with an arrowhead at its right end, swept over a tile - "turn this
// tile over". `arc` and `head` are path data so each glyph can fit the sweep
// to its own tile.
const FlipSweep = ({ arc, head }) => (
  <g strokeWidth="2.2">
    <path d={arc} />
    <path d={head} />
  </g>
);

// A pair of stacked upward chevrons sized to a hex of radius r, used to mark
// a tile as "rallying" - shared so the single-hex and seven-hex versions
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
// "ties count too".
const equalsPair = (cx, cy, r) => {
  const halfWidth = r * 0.5;
  const y1 = cy - r * 0.22;
  const y2 = cy + r * 0.22;
  return [
    `M ${(cx - halfWidth).toFixed(2)} ${y1.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${y1.toFixed(2)}`,
    `M ${(cx - halfWidth).toFixed(2)} ${y2.toFixed(2)} L ${(cx + halfWidth).toFixed(2)} ${y2.toFixed(2)}`
  ];
};

// The bare track ladder used by the "advance an issue" glyph.
const TrackLadder = ({ x = 8 }) => (
  <>
    <rect x={x} y="7" width="16" height="35" rx="8" />
    <path d={`M ${x + 3.5} 17 L ${x + 12.5} 17`} strokeWidth="1.6" />
    <path d={`M ${x + 3.5} 25 L ${x + 12.5} 25`} strokeWidth="1.6" />
    <path d={`M ${x + 3.5} 33 L ${x + 12.5} 33`} strokeWidth="1.6" />
    <circle cx={x + 8} cy="37.5" r="3.2" fill="currentColor" stroke="none" />
  </>
);

// Advance one issue track - an arrow capped by a line ("up to a limit"), with
// how far - N or 2N - named above it.
const IssueGlyph = ({ size = 48, label }) => (
  <GlyphSvg size={size}>
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
  </GlyphSvg>
);

// A narrow track pill with an arrow running up or down inside it - "go up /
// go down on an issue".
const TrackArrow = ({ centerX, direction, top = 7, height = 35 }) => {
  const isUp = direction === 'up';
  const tip = isUp ? top + 6 : top + height - 6;
  const tail = isUp ? top + height - 6 : top + 6;
  const headY = isUp ? tip + 3.4 : tip - 3.4;
  return (
    <>
      <rect x={centerX - 6} y={top} width="12" height={height} rx="6" />
      <g strokeWidth="2.2">
        <path d={`M ${centerX} ${tail} L ${centerX} ${tip}`} />
        <path d={`M ${centerX - 3.4} ${headY} L ${centerX} ${tip} L ${centerX + 3.4} ${headY}`} />
      </g>
    </>
  );
};

// Address: one issue goes up, the other goes down, with a tile flipping
// between them - the gist of "up, flip, down" without spelling out each step.
// Wider than square so the three parts get room to breathe.
const BridgeGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size} box={[0, 0, 72, 48]}>
    <TrackArrow centerX={8} direction="up" top={10} height={32} />
    <TrackArrow centerX={64} direction="down" top={10} height={32} />
    <TwoToneHex cx={36} cy={31} r={10} />
    <FlipSweep arc="M 27 18 C 30 9, 42 9, 45 17" head="M 40.4 15.2 L 45 17 L 45.8 12.2" />
  </GlyphSvg>
);

// Develop: a tile dropping into an empty board slot. Taller than square so
// the drop arrow sits clear of both the tile and the slot.
const DEVELOP_TILE = { cx: 24, cy: 18, r: 8 };

const PlaceDropAndSlot = () => (
  <>
    <path d="M 24 30 L 24 40" strokeWidth="2.6" />
    <path d="M 20.2 36.2 L 24 40 L 27.8 36.2" strokeWidth="2.6" />
    <polygon points={hexPointsAt(24, 54, 12)} strokeDasharray="4.5 4" />
  </>
);

// The basic glyph has no sweep above its tile, so its box starts lower to
// keep the drawing centred on the tile.
const PlaceGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size} box={[0, 8, 48, 60]}>
    <polygon points={hexPointsAt(DEVELOP_TILE.cx, DEVELOP_TILE.cy, DEVELOP_TILE.r)} fill="currentColor" stroke="none" />
    <PlaceDropAndSlot />
  </GlyphSvg>
);

// The upgraded drop: the falling tile shows both sides under a flip sweep -
// you may flip it before placing.
const PlaceFlipGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size} box={[0, 0, 48, 68]}>
    <TwoToneHex {...DEVELOP_TILE} />
    <FlipSweep arc="M 15 11 C 18 2, 30 2, 33 10" head="M 28.4 8.2 L 33 10 L 33.8 5.2" />
    <PlaceDropAndSlot />
  </GlyphSvg>
);

// A card's printed effect - the lightning bolt the card fronts use for an
// Immediate effect.
const BoltGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <path
      transform="translate(24, 24) scale(1.7)"
      d="M 1.5 -12 L -7 2 L -0.5 2 L -3.5 12 L 5 -2 L -1.5 -2 Z"
      fill="currentColor"
      stroke="none"
    />
  </GlyphSvg>
);

// A card's two issue colours as two halves - one goes up, the other down.
const SplitCardGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <path
      d="M 24 4 L 13.6 4 Q 11 4 11 6.6 L 11 41.4 Q 11 44 13.6 44 L 24 44 Z"
      fill="currentColor"
      stroke="none"
      opacity="0.85"
    />
    <rect x="11" y="4" width="26" height="40" rx="2.6" />
    <g strokeWidth="2.6">
      <path d="M 17.5 35 L 17.5 13 M 13.9 16.6 L 17.5 13 L 21.1 16.6" stroke={ACTION_TILE_BODY} />
      <path d="M 30.5 13 L 30.5 35 M 26.9 31.4 L 30.5 35 L 34.1 31.4" />
    </g>
  </GlyphSvg>
);

// Rally a single tile: a hex with chevrons climbing near its top.
const RallyOneGlyph = ({ size = 48 }) => {
  const [upper, lower] = chevronPair(24, 24, 16);
  return (
    <GlyphSvg size={size}>
      <polygon points={hexPointsAt(24, 24, 16)} />
      <path d={upper} strokeWidth="2.6" />
      <path d={lower} strokeWidth="2.6" />
    </GlyphSvg>
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
  <GlyphSvg size={size}>
    <RallyClusterHexes markPair={chevronPair} />
  </GlyphSvg>
);

// The upgraded rally-a-cluster: the same seven hexes, but marked with equals
// signs instead of chevrons - rallying is allowed on a tie too.
const RallyClusterEqualGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <RallyClusterHexes markPair={equalsPair} />
  </GlyphSvg>
);

// Intern: a dashed copy behind a miniature action tile - "do that action
// again". The upgraded glyph adds the upgrade triangle to the copy's header.
const CopiedActionTile = () => (
  <>
    <rect x="5" y="5" width="25" height="25" rx="3" strokeDasharray="3 3" />
    <rect x="18" y="18" width="25" height="25" rx="3" fill={ACTION_TILE_BODY} />
    <path d="M 18 25.5 L 18 21 Q 18 18 21 18 L 40 18 Q 43 18 43 21 L 43 25.5 Z" fill="currentColor" stroke="none" />
  </>
);

const CopyTileGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <CopiedActionTile />
  </GlyphSvg>
);

const CopyUpgradedTileGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <CopiedActionTile />
    <polygon points="35.4,23.8 40.6,23.8 38,19.4" fill={ACTION_TILE_BODY} stroke="none" />
  </GlyphSvg>
);

// Media: a row of tiles flipping, alternate halves filled, under one sweep -
// "flip several".
const FlipRowGlyph = ({ size = 48 }) => (
  <GlyphSvg size={size}>
    <TwoToneHex cx={8.5} cy={32} r={7} />
    <TwoToneHex cx={24} cy={32} r={7} filledHalf="right" />
    <TwoToneHex cx={39.5} cy={32} r={7} />
    <FlipSweep arc="M 9 21 C 14 9, 34 9, 39 20" head="M 34.8 18.4 L 39.2 20.6 L 40.3 15.9" />
  </GlyphSvg>
);

const ACTION_GLYPHS = {
  issue: IssueGlyph,
  bridge: BridgeGlyph,
  place: PlaceGlyph,
  placeFlip: PlaceFlipGlyph,
  bolt: BoltGlyph,
  splitCard: SplitCardGlyph,
  rallyTile: RallyOneGlyph,
  rallyCluster: RallyClusterGlyph,
  rallyClusterEqual: RallyClusterEqualGlyph,
  copyTile: CopyTileGlyph,
  copyUpgradedTile: CopyUpgradedTileGlyph,
  flipRow: FlipRowGlyph
};

// The "or" and "both" marks between two glyphs, drawn as strokes on a
// half-width grid so they scale with the glyphs beside them.
const SEPARATOR_PATHS = {
  '/': 'M 18 8 L 6 40',
  '+': 'M 12 13 L 12 35 M 1 24 L 23 24'
};

const SeparatorGlyph = ({ size = 48, mark }) => (
  <GlyphSvg size={size} box={[0, 0, 24, 48]}>
    <path d={SEPARATOR_PATHS[mark]} strokeWidth="3.4" />
  </GlyphSvg>
);

// --- 8. THE 7 DOUBLE-SIDED ACTION TILES ------------------------------------
// `steps` is the icon row across the middle of the tile - the gist of the
// action, not a play-by-play. `text` is the full rule for that side, printed
// on the reference sheet (the tiles carry no words). Each side's text stands
// on its own rather than as a delta.
const CC_ACTIONS = [
  {
    id: 'address',
    name: 'Address',
    Icon: Megaphone,
    basic: {
      steps: [{ glyph: 'bridge', scale: 1.8 }],
      text: 'Move up to N on the rondel. Go up on the issue matching that tile, flip the tile, then go down on the issue matching its new side.'
    },
    upgraded: {
      steps: [{ glyph: 'bridge', scale: 1.8 }],
      text: 'Move up to N on the rondel. Go up on the issue matching that tile, flip the tile, then go down on the issue matching its new side - or, instead, on the issue matching the district sign.'
    }
  },
  {
    id: 'develop',
    name: 'Develop',
    Icon: Hammer,
    basic: {
      steps: [{ glyph: 'place', scale: 1.7 }],
      text: 'Move N on the rondel. Place that tile on the board under your control.'
    },
    upgraded: {
      steps: [{ glyph: 'placeFlip', scale: 1.7 }],
      text: 'Move N on the rondel. You may flip that tile. Place it on the board under your control.'
    }
  },
  {
    id: 'leverage',
    name: 'Leverage',
    Icon: Handshake,
    basic: {
      steps: [{ glyph: 'bolt' }, { separator: '/' }, { glyph: 'splitCard' }],
      text: 'Look at the top N cards of the deck and play one. Either resolve its effect, or go up on one of its issues and down on the other.'
    },
    upgraded: {
      steps: [{ glyph: 'bolt' }, { separator: '+' }, { glyph: 'splitCard' }],
      text: 'Look at the top N cards of the deck and play one. Resolve its effect, go up on one of its issues and down on the other, or do both.'
    }
  },
  {
    id: 'dance',
    name: 'Dance',
    Icon: Radio,
    basic: {
      steps: [{ glyph: 'rallyCluster', scale: 1.3 }],
      text: 'Move the pawn N tiles, then rally its tile and each adjacent tile.'
    },
    upgraded: {
      steps: [{ glyph: 'rallyClusterEqual', scale: 1.3 }],
      text: 'Move the pawn N tiles, then rally its tile and each adjacent tile. You may also rally tiles whose issue you are only tied on.'
    }
  },
  {
    id: 'intern',
    name: 'Intern',
    Icon: GraduationCap,
    basic: {
      steps: [{ glyph: 'copyTile', scale: 1.6 }],
      text: 'Repeat your previous action at strength 1, using its basic side.'
    },
    upgraded: {
      steps: [{ glyph: 'copyUpgradedTile', scale: 1.6 }],
      text: 'Repeat your previous action at strength 1, using either of its sides.'
    }
  },
  {
    id: 'media',
    name: 'Media',
    Icon: Newspaper,
    basic: {
      steps: [{ glyph: 'flipRow', scale: 1.8 }],
      text: 'Flip N tiles.'
    },
    upgraded: {
      steps: [{ glyph: 'flipRow', scale: 1.15 }, { separator: '+' }, { glyph: 'rallyTile', scale: 1.15 }],
      text: 'Flip N tiles, then rally any one tile - it does not need to be adjacent to your pawn.'
    }
  },
  {
    id: 'invest',
    name: 'Invest',
    Icon: TrendingUp,
    basic: {
      steps: [{ glyph: 'issue', label: 'N', scale: 1.7 }],
      text: 'Advance any one issue track up to N.'
    },
    upgraded: {
      steps: [{ glyph: 'issue', label: '2N', scale: 1.7 }],
      text: 'Advance any one issue track up to 2N.'
    }
  }
];

// Basic and upgraded share every interior color - body, header text and
// glyph ink - so only the frame (and the upgraded corner triangle) tell them
// apart. The header bar is paired with the frame color, so basic is dark
// blue top-to-bottom and upgraded is the same brown as its border.
const ACTION_TILE_SHARED = {
  body: ACTION_TILE_BODY,
  headerInk: '#FFFFFF',
  glyphInk: '#22304A'
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

// The base rendered size of 48 glyph units. Sized so the widest row - two
// glyphs and a connector - still fits the tile; a step's optional `scale`
// enlarges a lone glyph that would otherwise look lost on its tile.
const ACTION_GLYPH_SIZE = 120;

// A bare glyph straight on the tile body, no frame or label - the reference
// sheet carries the explanation.
const ActionStep = ({ step, theme }) => {
  if (step.separator) {
    return (
      <span className="flex shrink-0" style={{ color: theme.glyphInk, opacity: 0.6 }}>
        <SeparatorGlyph size={ACTION_GLYPH_SIZE} mark={step.separator} />
      </span>
    );
  }

  const Glyph = ACTION_GLYPHS[step.glyph];
  return (
    <span className="flex shrink-0" style={{ color: theme.glyphInk }}>
      <Glyph size={ACTION_GLYPH_SIZE * (step.scale ?? 1)} label={step.label} />
    </span>
  );
};

const ActionTileCard = ({ action, side, size = 420 }) => {
  const isUpgraded = side === 'upgraded';
  const theme = ACTION_SIDE_THEME[side];
  const face = isUpgraded ? action.upgraded : action.basic;
  const { Icon } = action;

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

      {/* Icon row - the gist of the action, no words, spelled out on the reference sheet */}
      <div className="flex-1 flex items-center justify-center gap-3 px-3">
        {face.steps.map((step, i) => (
          <ActionStep key={`${action.id}-${side}-${i}`} step={step} theme={theme} />
        ))}
      </div>
    </div>
  );
};

// --- 8a. ACTION REFERENCE SHEET --------------------------------------------
// Rules only, no icons: one row per action, the basic side's full text beside
// the upgraded side's. The tiles carry the icons; this is what they mean.
const ActionReferenceSheet = () => (
  <div
    className="font-sans"
    style={{ width: 1240, background: '#0B1220', padding: 44, borderRadius: 30, border: '4px solid #22304A' }}
  >
    <div className="flex items-center gap-3 mb-8">
      <Hexagon className="w-8 h-8 text-amber-400" />
      <span className="text-[32px] font-black text-amber-400 tracking-tight">Action Tile Reference</span>
    </div>

    <div className="grid gap-x-4 gap-y-3" style={{ gridTemplateColumns: '200px 1fr 1fr' }}>
      <span />
      {['basic', 'upgraded'].map((side) => (
        <div
          key={`reference-heading-${side}`}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[15px] font-black uppercase tracking-wider"
          style={{ background: ACTION_SIDE_THEME[side].headerBg, color: ACTION_SIDE_THEME[side].headerInk }}
        >
          {side === 'basic' ? 'Basic' : 'Upgraded'}
          {side === 'upgraded' && <Triangle size={14} fill="#FFFFFF" color="#FFFFFF" strokeWidth={0} />}
        </div>
      ))}

      {CC_ACTIONS.map((action) => {
        const { Icon } = action;
        return (
          <React.Fragment key={`reference-${action.id}`}>
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#22304A', color: '#FFFFFF' }}>
              <Icon size={26} strokeWidth={2.2} />
              <span className="text-[22px] font-black tracking-tight leading-none">{action.name}</span>
            </div>
            {['basic', 'upgraded'].map((side) => (
              <div
                key={`reference-${action.id}-${side}`}
                className="rounded-xl border-2 px-4 py-3 text-[16px] leading-snug flex items-center"
                style={{ background: ACTION_TILE_SHARED.body, borderColor: ACTION_SIDE_THEME[side].border, color: '#22304A' }}
              >
                {action[side].text}
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

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
    return pos ? pos.angleDeg : DISPLAY_POSITIONS[0].angleDeg;
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
                  exportSheet('cc-action-reference', 'ColonyCollapse_ActionTiles_Reference.png')
                }
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-bold text-sm flex items-center gap-2 cursor-pointer border border-slate-700 transition-colors"
              >
                <Hexagon className="w-4 h-4" /> Reference sheet
              </button>
              <p className="text-xs text-slate-500 max-w-lg">
                Tiles carry icons only, no rule text - the reference sheet below spells out
                every action's basic and upgraded side in full.
              </p>
            </div>

            <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <ActionReferenceSheet />
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
        <div id="cc-action-reference" style={{ width: 'fit-content' }}>
          <ActionReferenceSheet />
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
