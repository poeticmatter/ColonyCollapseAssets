import React, { useState, useRef } from 'react';
import { Download, Printer, LayoutGrid, Filter, FileImage, ArrowRightLeft, Flower, Gem, Flame, Leaf, Sun, Droplet, Archive, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

// --- COLOR SYMBOLS FOR GAME PALETTE ---
export const ColorSymbol = ({ color, size = 24, strokeWidth = 2.2, colorHex = '#FFFFFF', className = '' }) => {
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

// --- 2. 15 COLOR PAIRS (C(6,2) = 15) ---
const LITE_COLOR_PAIRS = [
  { pairId: 1, colorA: 'Pink', colorB: 'Purple' },
  { pairId: 2, colorA: 'Pink', colorB: 'Red' },
  { pairId: 3, colorA: 'Pink', colorB: 'Green' },
  { pairId: 4, colorA: 'Pink', colorB: 'Orange' },
  { pairId: 5, colorA: 'Pink', colorB: 'Blue' },
  { pairId: 6, colorA: 'Purple', colorB: 'Red' },
  { pairId: 7, colorA: 'Purple', colorB: 'Green' },
  { pairId: 8, colorA: 'Purple', colorB: 'Orange' },
  { pairId: 9, colorA: 'Purple', colorB: 'Blue' },
  { pairId: 10, colorA: 'Red', colorB: 'Green' },
  { pairId: 11, colorA: 'Red', colorB: 'Orange' },
  { pairId: 12, colorA: 'Red', colorB: 'Blue' },
  { pairId: 13, colorA: 'Green', colorB: 'Orange' },
  { pairId: 14, colorA: 'Green', colorB: 'Blue' },
  { pairId: 15, colorA: 'Orange', colorB: 'Blue' }
];

// --- 3. GENERATE COMPLETE 30-TILE DECK ---
// 15 pairs x 2 line types ('3-lines' = three thirds, '2-lines' = 1/3 and 2/3)
const LITE_HEX_TILES = LITE_COLOR_PAIRS.flatMap((pair) => [
  {
    id: `hex-${pair.pairId}-3lines`,
    numId: pair.pairId * 2 - 1,
    pairId: pair.pairId,
    colorA: pair.colorA,
    colorB: pair.colorB,
    lineType: '3-lines',
    title: `${pair.colorA} / ${pair.colorB} — Three Thirds`,
    description: 'Separated into three equal thirds (1/3 + 1/3 + 1/3)'
  },
  {
    id: `hex-${pair.pairId}-2lines`,
    numId: pair.pairId * 2,
    pairId: pair.pairId,
    colorA: pair.colorA,
    colorB: pair.colorB,
    lineType: '2-lines',
    title: `${pair.colorA} / ${pair.colorB} — 1/3 & 2/3`,
    description: 'Separated into one third (1/3) and two thirds (2/3)'
  }
]);

// --- 3B. SPECIAL 3-TILE TRIAD SET ---
// A cluster of 3 hexagon tiles arranged such that:
// - Top tile: inner bottom third is White ('Wall'/blank), top-left third is Purple (Gem), top-right third is Red (Flame), no center circle
// - Right tile (bottom-right): inner top-left third is White ('Wall'/blank), bottom third is Pink (Flower), top-right third is Orange (Sun), no center circle
// - Left tile (bottom-left): inner top-right third is White ('Wall'/blank), bottom third is Blue (Droplet), top-left third is Green (Leaf), no center circle
// No back side, so no central color or medallion needed.
export const SPECIAL_TRIAD_TILES = [
  {
    id: 'special-triad-top',
    name: 'Special Triad — Top Tile (Purple & Red)',
    description: 'Forms the top of the triad. Inner bottom third is White (wall blank), top-left third is Purple (Gem), top-right third is Red (Flame). No center medallion.',
    showCenterCircle: false,
    // Order: [Bottom (idx 0), Top-Right (idx 1), Top-Left (idx 2)]
    thirdsColors: ['#FFFFFF', LITE_COLOR_HEX.Red, LITE_COLOR_HEX.Purple],
    thirdsIcons: [null, 'Red', 'Purple']
  },
  {
    id: 'special-triad-left',
    name: 'Special Triad — Left Tile (Green & Blue)',
    description: 'Forms bottom-left of the triad. Inner top-right third is White (wall blank), top-left third is Green (Leaf), bottom third is Blue (Droplet). No center medallion.',
    showCenterCircle: false,
    // Order: [Bottom (idx 0), Top-Right (idx 1), Top-Left (idx 2)]
    thirdsColors: [LITE_COLOR_HEX.Blue, '#FFFFFF', LITE_COLOR_HEX.Green],
    thirdsIcons: ['Blue', null, 'Green']
  },
  {
    id: 'special-triad-right',
    name: 'Special Triad — Right Tile (Orange & Pink)',
    description: 'Forms bottom-right of the triad. Inner top-left third is White (wall blank), top-right third is Orange (Sun), bottom third is Pink (Flower). No center medallion.',
    showCenterCircle: false,
    // Order: [Bottom (idx 0), Top-Right (idx 1), Top-Left (idx 2)]
    thirdsColors: [LITE_COLOR_HEX.Pink, LITE_COLOR_HEX.Orange, '#FFFFFF'],
    thirdsIcons: ['Pink', 'Orange', null]
  }
];

// --- 4. CLEAN FLAT VECTOR HEXAGON TILE SVG ---
export const HexTileSVG = ({
  colorA,
  colorB,
  lineType = '3-lines',
  twoLineOrientation = 'bottom', // 'bottom' (v4 & v2), 'top-right' (v0 & v2), 'top-left' (v0 & v4)
  lineTheme = 'contrast', // 'contrast', 'white', 'dark'
  thirdsColors = null, // Optional array of 3 hex colors: [bottomThird, topRightThird, topLeftThird]
  thirdsIcons = null,  // Optional array of 3 color keys: [bottomThird, topRightThird, topLeftThird]
  centerColor = null,  // Optional center circle fill color (defaults to colorB)
  centerIcon = null,   // Optional center circle icon key (defaults to colorB)
  showCenterCircle = true, // Whether to render central circle medallion
  className = ''
}) => {
  const hexA = LITE_COLOR_HEX[colorA] || colorA || '#EC4899';
  const hexB = LITE_COLOR_HEX[colorB] || colorB || '#A855F7';

  // Coordinate math based on 300 x 300 viewBox
  // Center is (150, 150), outer radius R = 132
  const cx = 150;
  const cy = 150;
  const rCircle = 26.4; // 20% bigger than 22px (22 * 1.2 = 26.4px)

  // 6 regular hexagon vertices (Pointy-topped)
  // v0: Top corner (150, 18)
  // v1: Top-Right (264.32, 84)
  // v2: Bottom-Right (264.32, 216)
  // v3: Bottom corner (150, 282)
  // v4: Bottom-Left (35.68, 216)
  // v5: Top-Left (35.68, 84)
  const v0 = { x: 150, y: 18 };
  const v1 = { x: 264.32, y: 84 };
  const v2 = { x: 264.32, y: 216 };
  const v3 = { x: 150, y: 282 };
  const v4 = { x: 35.68, y: 216 };
  const v5 = { x: 35.68, y: 84 };

  const hexPoints = `${v0.x},${v0.y} ${v1.x},${v1.y} ${v2.x},${v2.y} ${v3.x},${v3.y} ${v4.x},${v4.y} ${v5.x},${v5.y}`;

  // Partition line targets:
  // 3 lines: all 3 corners v0, v2, v4
  // 2 lines: only 2 corners (no faint line)
  let solidTargets = [v0, v2, v4];
  if (lineType === '2-lines') {
    if (twoLineOrientation === 'top-right') {
      solidTargets = [v0, v2];
    } else if (twoLineOrientation === 'top-left') {
      solidTargets = [v0, v4];
    } else {
      solidTargets = [v4, v2];
    }
  }

  // 3 Rhombus Third Polygons (meeting at center cx, cy):
  // Third 0 (Bottom): cx,cy -> v4 -> v3 -> v2
  // Third 1 (Top-Right): cx,cy -> v2 -> v1 -> v0
  // Third 2 (Top-Left): cx,cy -> v0 -> v5 -> v4
  const thirdPolygons = [
    `${cx},${cy} ${v4.x},${v4.y} ${v3.x},${v3.y} ${v2.x},${v2.y}`,
    `${cx},${cy} ${v2.x},${v2.y} ${v1.x},${v1.y} ${v0.x},${v0.y}`,
    `${cx},${cy} ${v0.x},${v0.y} ${v5.x},${v5.y} ${v4.x},${v4.y}`
  ];

  // Centroids of each third of the hexagon tile:
  // Bottom Third: (150, 216)
  // Top-Right Third: (207.16, 117)
  // Top-Left Third: (92.84, 117)
  const thirdCenters = [
    { x: 150, y: 216 },
    { x: 207.16, y: 117 },
    { x: 92.84, y: 117 }
  ];

  const faceIconSize = 28;
  const centerIconSize = 22;
  const clipId = `hex-clip-${colorA || 'c'}-${colorB || 'b'}-${lineType}-${Math.random().toString(36).substr(2, 6)}`;

  const finalCenterColor = centerColor ? (LITE_COLOR_HEX[centerColor] || centerColor) : hexB;
  const finalCenterIcon = centerIcon || colorB;

  return (
    <svg
      viewBox="0 0 300 300"
      width="100%"
      height="100%"
      className={`select-none block ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Clip path ensuring lines stop flush at the hex boundary */}
        <clipPath id={clipId}>
          <polygon points={hexPoints} />
        </clipPath>
      </defs>

      {/* 1. Main Hexagon Tile Surface */}
      {thirdsColors ? (
        // Multi-color thirds (e.g. Special Triad Tiles with white wall blank)
        <g clipPath={`url(#${clipId})`}>
          {thirdPolygons.map((pts, idx) => (
            <polygon
              key={`third-poly-${idx}`}
              points={pts}
              fill={thirdsColors[idx] || hexA}
            />
          ))}
        </g>
      ) : (
        // Standard solid colored hexagon tile
        <polygon
          points={hexPoints}
          fill={hexA}
        />
      )}

      {/* 2. Partition Lines (Clipped to hexagon boundary) */}
      <g clipPath={`url(#${clipId})`}>
        {solidTargets.map((target, idx) => {
          if (lineTheme === 'contrast') {
            return (
              <g key={`solid-line-${idx}`}>
                {/* Dark backing stroke for clarity on bright colors */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={target.x}
                  y2={target.y}
                  stroke="#090D16"
                  strokeWidth={9}
                  strokeOpacity={0.35}
                />
                {/* Crisp white core divider line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={target.x}
                  y2={target.y}
                  stroke="#FFFFFF"
                  strokeWidth={5}
                />
              </g>
            );
          } else if (lineTheme === 'white') {
            return (
              <line
                key={`solid-line-${idx}`}
                x1={cx}
                y1={cy}
                x2={target.x}
                y2={target.y}
                stroke="#FFFFFF"
                strokeWidth={5.5}
              />
            );
          } else {
            // 'dark'
            return (
              <line
                key={`solid-line-${idx}`}
                x1={cx}
                y1={cy}
                x2={target.x}
                y2={target.y}
                stroke="#090D16"
                strokeWidth={5.5}
                strokeOpacity={0.85}
              />
            );
          }
        })}
      </g>

      {/* 3. Color Icons on each of the three thirds of the tile */}
      {thirdCenters.map((pos, idx) => {
        const iconColor = thirdsIcons ? thirdsIcons[idx] : colorA;
        if (!iconColor) return null; // Blank third has no icon

        return (
          <g
            key={`third-icon-${idx}`}
            transform={`translate(${pos.x - faceIconSize / 2}, ${pos.y - faceIconSize / 2})`}
            className="pointer-events-none drop-shadow-sm"
          >
            <ColorSymbol color={iconColor} size={faceIconSize} strokeWidth={2.2} colorHex="#FFFFFF" />
          </g>
        );
      })}

      {/* 4. Central Circle (displays reverse color + symbol when showCenterCircle is true) */}
      {showCenterCircle && (
        <>
          {/* Subtle dark rim underneath for separation */}
          <circle
            cx={cx}
            cy={cy}
            r={rCircle + 1.5}
            fill="none"
            stroke="#090D16"
            strokeWidth="2.5"
            strokeOpacity="0.25"
          />
          {/* Solid reverse color medallion */}
          <circle
            cx={cx}
            cy={cy}
            r={rCircle}
            fill={finalCenterColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          {/* Symbol for the reverse face color inside the center circle */}
          {finalCenterIcon && (
            <g
              transform={`translate(${cx - centerIconSize / 2}, ${cy - centerIconSize / 2})`}
              className="pointer-events-none drop-shadow-sm"
            >
              <ColorSymbol color={finalCenterIcon} size={centerIconSize} strokeWidth={2.2} colorHex="#FFFFFF" />
            </g>
          )}
        </>
      )}
    </svg>
  );
};

// --- 5. MAIN HEX TILES COMPONENT ---
export default function ColonyCollapseHexTiles() {
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery', 'print', 'tts', 'screentop'
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedLineType, setSelectedLineType] = useState('All'); // 'All', '3-lines', '2-lines'
  const [twoLineOrientation, setTwoLineOrientation] = useState('bottom'); // 'bottom', 'top-right', 'top-left'
  const [globalSide, setGlobalSide] = useState('interactive'); // 'interactive', 'fronts', 'backs'
  const [tileFlipState, setTileFlipState] = useState({}); // tileId -> 'A' | 'B'
  const [lineTheme, setLineTheme] = useState('contrast'); // 'contrast', 'white', 'dark'
  const [showCutLines, setShowCutLines] = useState(true);

  const printRef = useRef(null);

  // Toggle individual tile side in interactive mode
  const handleFlipTile = (tileId) => {
    setTileFlipState((prev) => ({
      ...prev,
      [tileId]: (prev[tileId] || 'A') === 'A' ? 'B' : 'A'
    }));
  };

  // Get current side for a tile
  const getTileSide = (tileId) => {
    if (globalSide === 'fronts') return 'A';
    if (globalSide === 'backs') return 'B';
    return tileFlipState[tileId] || 'A';
  };

  // Filter tiles
  const filteredTiles = LITE_HEX_TILES.filter((tile) => {
    const matchesColor =
      selectedColor === 'All' || tile.colorA === selectedColor || tile.colorB === selectedColor;
    const matchesLineType = selectedLineType === 'All' || tile.lineType === selectedLineType;
    return matchesColor && matchesLineType;
  });

  const [ttsTransparentBg, setTtsTransparentBg] = useState(true);
  const [screentopTransparentBg, setScreentopTransparentBg] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [triadTransparentBg, setTriadTransparentBg] = useState(true);

  // --- EXPORT HANDLERS ---
  const exportSpecialTriadTile = async (tileId) => {
    const el = document.getElementById(`special-triad-tile-svg-${tileId}`);
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `ColonyCollapseLite_${tileId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export special triad tile error:', err);
    }
  };

  const exportTriadClusterPNG = async () => {
    const el = document.getElementById('special-triad-cluster-export');
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        cacheBust: true,
        backgroundColor: triadTransparentBg ? null : '#000000',
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `ColonyCollapseLite_SpecialTriad_Cluster_${triadTransparentBg ? 'Transparent' : 'Black'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export triad cluster error:', err);
    }
  };

  const exportTriadZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('special_triad_tiles');

      for (const tile of SPECIAL_TRIAD_TILES) {
        const el = document.getElementById(`special-triad-tile-svg-${tile.id}`);
        if (el) {
          const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          folder.file(`${tile.id}.png`, base64Data, { base64: true });
        }
      }

      const clusterEl = document.getElementById('special-triad-cluster-export');
      if (clusterEl) {
        const dataUrlCluster = await toPng(clusterEl, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
        const base64Cluster = dataUrlCluster.replace(/^data:image\/png;base64,/, '');
        folder.file('special_triad_cluster_assembled.png', base64Cluster, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'ColonyCollapseLite_SpecialTriadTiles_Transparent.zip';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export triad zip:', err);
      alert('Failed to generate ZIP: ' + err.message);
    }
  };

  const exportIndividualTile = async (tileId, side = 'A') => {
    const el = document.getElementById(`gallery-tile-svg-${tileId}-${side}`);
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `ColonyCollapseLite_${tileId}_Side${side}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export individual tile error:', err);
    }
  };

  const exportAllTilesZip = async () => {
    setIsZipping(true);
    setZipProgress(0);
    try {
      const zip = new JSZip();
      const folder = zip.folder('colony_collapse_hex_tiles');

      const total = LITE_HEX_TILES.length * 2; // Front and back
      let count = 0;

      for (const tile of LITE_HEX_TILES) {
        // Export Front (Side A)
        const elA = document.getElementById(`hidden-tile-export-${tile.id}-A`);
        if (elA) {
          const dataUrlA = await toPng(elA, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
          const base64DataA = dataUrlA.replace(/^data:image\/png;base64,/, '');
          folder.file(`${tile.id}_SideA_${tile.colorA}_center_${tile.colorB}.png`, base64DataA, { base64: true });
        }
        count++;
        setZipProgress(Math.round((count / total) * 100));

        // Export Back (Side B)
        const elB = document.getElementById(`hidden-tile-export-${tile.id}-B`);
        if (elB) {
          const dataUrlB = await toPng(elB, { cacheBust: true, backgroundColor: null, pixelRatio: 2 });
          const base64DataB = dataUrlB.replace(/^data:image\/png;base64,/, '');
          folder.file(`${tile.id}_SideB_${tile.colorB}_center_${tile.colorA}.png`, base64DataB, { base64: true });
        }
        count++;
        setZipProgress(Math.round((count / total) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'ColonyCollapseLite_HexTiles_Transparent_All60Faces.zip';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to create zip package:', err);
      alert('Failed to generate ZIP: ' + err.message);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  const exportTTSFrontSheet = () => {
    const node = document.getElementById('tts-hex-front-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, backgroundColor: ttsTransparentBg ? null : '#000000', quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ColonyCollapseLite_HexTiles_TTS_30Fronts_${ttsTransparentBg ? 'Transparent' : 'Black'}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  const exportTTSBackSheet = () => {
    const node = document.getElementById('tts-hex-back-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, backgroundColor: ttsTransparentBg ? null : '#000000', quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ColonyCollapseLite_HexTiles_TTS_30Backs_${ttsTransparentBg ? 'Transparent' : 'Black'}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  const exportScreentopSheet = () => {
    const node = document.getElementById('screentop-hex-sheet-export');
    if (!node) return;

    toPng(node, { cacheBust: true, backgroundColor: screentopTransparentBg ? null : '#000000', quality: 0.95 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `ColonyCollapseLite_HexTiles_Screentop_60FaceSheet_${screentopTransparentBg ? 'Transparent' : 'Black'}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Export error:', err));
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl no-print">
        {/* View Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('gallery')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'gallery' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Tile Gallery (30 Tiles)
          </button>
          <button
            onClick={() => setViewMode('triad')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'triad' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Special Triad (3 Tiles)
          </button>
          <button
            onClick={() => setViewMode('print')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'print' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Printable Sheets (Side A & B)
          </button>
          <button
            onClick={() => setViewMode('tts')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'tts' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" /> TTS Sheets (30 Fronts / 30 Backs)
          </button>
          <button
            onClick={() => setViewMode('screentop')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'screentop' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" /> Screentop (60-Face Sheet)
          </button>
        </div>

        {/* Gallery Filters & Style Options */}
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
                Interactive
              </button>
              <button
                onClick={() => setGlobalSide('fronts')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  globalSide === 'fronts' ? 'bg-purple-600 text-white shadow' : 'hover:text-white'
                }`}
              >
                Fronts (Side A)
              </button>
              <button
                onClick={() => setGlobalSide('backs')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  globalSide === 'backs' ? 'bg-purple-600 text-white shadow' : 'hover:text-white'
                }`}
              >
                Backs (Side B)
              </button>
            </div>

            {/* Line Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">Partition:</span>
              <select
                value={selectedLineType}
                onChange={(e) => setSelectedLineType(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="All">All Partitions</option>
                <option value="3-lines">3 Lines (Three Thirds)</option>
                <option value="2-lines">2 Lines (1/3 & 2/3)</option>
              </select>
            </div>

            {/* 2-Line Orientation */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">2-Line Layout:</span>
              <select
                value={twoLineOrientation}
                onChange={(e) => setTwoLineOrientation(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="bottom">Bottom 1/3 (Symmetrical)</option>
                <option value="top-right">Top-Right 1/3</option>
                <option value="top-left">Top-Left 1/3</option>
              </select>
            </div>

            {/* Color Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="All">All 6 Colors</option>
                {Object.keys(LITE_COLOR_HEX).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Line Theme Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-bold">Line Style:</span>
              <select
                value={lineTheme}
                onChange={(e) => setLineTheme(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="contrast">High Contrast (Dual)</option>
                <option value="white">Crisp White</option>
                <option value="dark">Dark Slate</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- VIEW MODE 1: TILE GALLERY ---------------- */}
      {viewMode === 'gallery' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 font-semibold px-1 gap-2">
            <span>Showing {filteredTiles.length} of 30 double-sided hexagon tiles</span>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                onClick={exportAllTilesZip}
                disabled={isZipping}
                className="bg-pink-600 hover:bg-pink-500 disabled:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Archive className="w-3.5 h-3.5" />
                {isZipping ? `Packaging Zip (${zipProgress}%)...` : 'Export All 60 Tile Faces (ZIP - Transparent PNG)'}
              </button>
              <span className="flex items-center gap-1 text-pink-400">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                Click any tile to flip
              </span>
            </div>
          </div>

          {/* Hexagon Tiles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {filteredTiles.map((tile) => {
              const side = getTileSide(tile.id);
              const colorA = side === 'A' ? tile.colorA : tile.colorB;
              const colorB = side === 'A' ? tile.colorB : tile.colorA;

              return (
                <div key={tile.id} className="flex flex-col gap-2 group">
                  {/* Tile SVG Canvas Card */}
                  <div
                    onClick={() => handleFlipTile(tile.id)}
                    className="relative aspect-square w-full rounded-2xl bg-slate-900/60 p-3 border border-slate-800/80 hover:border-pink-500/50 hover:bg-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex items-center justify-center"
                    title={`Click to flip! Face: ${colorA}, Reverse in center: ${colorB}`}
                  >
                    {/* Badge showing line partition */}
                    <div className="absolute top-2 left-2 z-10 bg-slate-950/80 border border-slate-700/60 text-[10px] font-black text-slate-300 px-2 py-0.5 rounded-full shadow-sm">
                      {tile.lineType === '3-lines' ? '3 Lines' : '2 Lines'}
                    </div>

                    {/* Side indicator badge */}
                    <div className="absolute top-2 right-2 z-10 bg-slate-950/80 border border-slate-700/60 text-[10px] font-black text-amber-400 px-2 py-0.5 rounded-full shadow-sm">
                      Side {side}
                    </div>

                    {/* The SVG Hexagon Tile Container for display and individual export */}
                    <div
                      id={`gallery-tile-svg-${tile.id}-${side}`}
                      className="w-full h-full max-w-[220px] max-h-[220px] flex items-center justify-center bg-transparent"
                    >
                      <HexTileSVG
                        colorA={colorA}
                        colorB={colorB}
                        lineType={tile.lineType}
                        twoLineOrientation={twoLineOrientation}
                        lineTheme={lineTheme}
                      />
                    </div>
                  </div>

                  {/* Tile Meta, Flip & Download Button */}
                  <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs font-bold flex flex-col gap-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LITE_COLOR_HEX[colorA] }}></span>
                        {colorA} <span className="text-slate-500 font-normal">→</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LITE_COLOR_HEX[colorB] }}></span>
                        {colorB}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFlipTile(tile.id)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 cursor-pointer bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 transition"
                          title="Flip tile side"
                        >
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => exportIndividualTile(tile.id, side)}
                          className="text-[11px] text-pink-400 hover:text-pink-300 font-extrabold flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition"
                          title="Download this tile face as transparent PNG"
                        >
                          <Download className="w-2.5 h-2.5" /> PNG
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {tile.lineType === '3-lines' ? 'Three Thirds (1/3 ea)' : 'One Third & Two Thirds'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------- VIEW MODE 1B: SPECIAL TRIAD TILES (3 TILES) ---------------- */}
      {viewMode === 'triad' && (
        <section className="space-y-8">
          {/* Header Banner */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl no-print">
            <div className="space-y-1 max-w-2xl">
              <h3 className="font-black text-white text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Special 3-Tile Triad Set (Wall-White Inner Thirds)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                A set of 3 specialized hexagon tiles designed to form an interlocking triad cluster. 
                Each tile features <strong>two colored outer thirds</strong> and <strong>one wall-white inner third</strong> with no icon, so when placed together, their inner thirds form a seamless white center wall matching the background!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={triadTransparentBg}
                  onChange={(e) => setTriadTransparentBg(e.target.checked)}
                  className="rounded text-pink-500 focus:ring-pink-500 bg-slate-900 border-slate-700"
                />
                Transparent Background
              </label>
              <button
                onClick={exportTriadClusterPNG}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> Download Assembled Cluster PNG
              </button>
              <button
                onClick={exportTriadZip}
                className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Archive className="w-4 h-4" /> Export Triad Set ZIP (Transparent)
              </button>
            </div>
          </div>

          {/* ASSEMBLED TRIAD CLUSTER PREVIEW */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                Assembled Triad Cluster Preview
              </span>
              <span className="text-xs text-slate-400">
                Notice how the 3 inner white thirds meet flush in the middle to create the wall-white interior!
              </span>
            </div>

            <div className="flex justify-center items-center py-6 overflow-x-auto">
              <div
                id="special-triad-cluster-export"
                className={`relative select-none p-4 rounded-xl ${triadTransparentBg ? 'bg-transparent' : 'bg-black'}`}
                style={{ width: '450px', height: '420px' }}
              >
                {/* 1. TOP TILE (Purple top-left, Red top-right, White bottom) */}
                <div
                  className="absolute"
                  style={{ width: '220px', height: '220px', left: '115px', top: '10px' }}
                >
                  <HexTileSVG
                    thirdsColors={SPECIAL_TRIAD_TILES[0].thirdsColors}
                    thirdsIcons={SPECIAL_TRIAD_TILES[0].thirdsIcons}
                    showCenterCircle={false}
                    lineTheme={lineTheme}
                  />
                </div>

                {/* 2. BOTTOM-LEFT TILE (Green top-left, Blue bottom, White top-right) */}
                <div
                  className="absolute"
                  style={{ width: '220px', height: '220px', left: '20px', top: '174px' }}
                >
                  <HexTileSVG
                    thirdsColors={SPECIAL_TRIAD_TILES[1].thirdsColors}
                    thirdsIcons={SPECIAL_TRIAD_TILES[1].thirdsIcons}
                    showCenterCircle={false}
                    lineTheme={lineTheme}
                  />
                </div>

                {/* 3. BOTTOM-RIGHT TILE (Orange top-right, Pink bottom, White top-left) */}
                <div
                  className="absolute"
                  style={{ width: '220px', height: '220px', left: '210px', top: '174px' }}
                >
                  <HexTileSVG
                    thirdsColors={SPECIAL_TRIAD_TILES[2].thirdsColors}
                    thirdsIcons={SPECIAL_TRIAD_TILES[2].thirdsIcons}
                    showCenterCircle={false}
                    lineTheme={lineTheme}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* INDIVIDUAL TRIAD TILES GALLERY */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-300">
              Individual Triad Tiles (Downloadable Transparent PNGs)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SPECIAL_TRIAD_TILES.map((tile) => (
                <div key={tile.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                  {/* Hexagon Tile Display & Export Node */}
                  <div className="relative aspect-square w-full rounded-xl bg-slate-950/60 p-4 border border-slate-800 flex items-center justify-center">
                    <div
                      id={`special-triad-tile-svg-${tile.id}`}
                      className="w-full h-full max-w-[240px] max-h-[240px] flex items-center justify-center bg-transparent"
                    >
                      <HexTileSVG
                        thirdsColors={tile.thirdsColors}
                        thirdsIcons={tile.thirdsIcons}
                        showCenterCircle={false}
                        lineTheme={lineTheme}
                      />
                    </div>
                  </div>

                  {/* Meta Information & Download */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-sm">{tile.name}</span>
                      <button
                        onClick={() => exportSpecialTriadTile(tile.id)}
                        className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                      >
                        <Download className="w-3.5 h-3.5" /> PNG
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {tile.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- VIEW MODE 2: PRINTABLE SHEETS ---------------- */}
      {viewMode === 'print' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4 no-print">
            <div>
              <h3 className="font-bold text-white text-base">Printable Double-Sided Hexagon Tile Sheets</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                A4 / Letter sheets formatted for 2-sided printing. Side A (Fronts) and Side B (Backs) align accurately so that punching or cutting produces perfect double-sided tiles.
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

          {/* Printable Pages (30 tiles = 2 pages of 15 tiles each, plus 2 matching back pages) */}
          <div ref={printRef} className="print-area space-y-12">
            {/* PAGE 1: Fronts (Tiles 1 to 15) */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
              <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Page 1: Front Sides (Side A) — Tiles 1 to 15
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 print:gap-2">
                {LITE_HEX_TILES.slice(0, 15).map((tile) => (
                  <div key={`p1-hex-${tile.id}`} className={`relative aspect-square flex items-center justify-center ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                    <HexTileSVG colorA={tile.colorA} colorB={tile.colorB} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                  </div>
                ))}
              </div>
            </div>

            {/* PAGE 2: Fronts (Tiles 16 to 30) */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
              <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Page 2: Front Sides (Side A) — Tiles 16 to 30
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 print:gap-2">
                {LITE_HEX_TILES.slice(15, 30).map((tile) => (
                  <div key={`p2-hex-${tile.id}`} className={`relative aspect-square flex items-center justify-center ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                    <HexTileSVG colorA={tile.colorA} colorB={tile.colorB} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                  </div>
                ))}
              </div>
            </div>

            {/* PAGE 3: Backs (Matching Tiles 1 to 15) */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full page-break-after">
              <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Page 3: Back Sides (Side B) — Tiles 1 to 15 (Matching Reverse Faces)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 print:gap-2">
                {LITE_HEX_TILES.slice(0, 15).map((tile) => (
                  <div key={`p3-hex-${tile.id}`} className={`relative aspect-square flex items-center justify-center ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                    <HexTileSVG colorA={tile.colorB} colorB={tile.colorA} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                  </div>
                ))}
              </div>
            </div>

            {/* PAGE 4: Backs (Matching Tiles 16 to 30) */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xl max-w-[210mm] mx-auto print:p-0 print:m-0 print:shadow-none print:w-full">
              <div className="text-center pb-2 border-b border-slate-200 mb-4 print:hidden">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Page 4: Back Sides (Side B) — Tiles 16 to 30 (Matching Reverse Faces)
                </span>
              </div>
              <div className="grid grid-cols-5 gap-3 print:gap-2">
                {LITE_HEX_TILES.slice(15, 30).map((tile) => (
                  <div key={`p4-hex-${tile.id}`} className={`relative aspect-square flex items-center justify-center ${showCutLines ? 'p-1 border border-dashed border-slate-300 print:border-slate-400' : ''}`}>
                    <HexTileSVG colorA={tile.colorB} colorB={tile.colorA} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
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
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3 no-print">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white text-lg flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-pink-400" />
                  Tabletop Simulator (TTS) Hex Tile Sheets (30 Fronts & 30 Backs)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl mt-1">
                  TTS custom token sheets arranged in a 6-column × 5-row grid (30 tiles per sheet).
                  Position #1 on the Front Sheet directly corresponds to Position #1 on the Back Sheet.
                </p>
              </div>

              {/* Transparency Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={ttsTransparentBg}
                  onChange={(e) => setTtsTransparentBg(e.target.checked)}
                  className="rounded text-pink-500 focus:ring-pink-500 bg-slate-900 border-slate-700"
                />
                Transparent Background
              </label>
            </div>
          </div>

          {/* 1. TTS Front Sheet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg border border-slate-800">
              <span className="font-extrabold text-sm text-pink-400">1. TTS Hex Front Sheet — 30 Tile Fronts (Side A)</span>
              <button
                onClick={exportTTSFrontSheet}
                className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> Download Front Sheet PNG (1800×1500px)
              </button>
            </div>

            <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
              <div
                id="tts-hex-front-sheet-export"
                className={`p-0 m-0 leading-none select-none ${ttsTransparentBg ? 'bg-transparent' : 'bg-black'}`}
                style={{ width: '1800px', display: 'grid', gridTemplateColumns: 'repeat(6, 300px)', gap: 0 }}
              >
                {LITE_HEX_TILES.map((tile) => (
                  <div key={`tts-hex-front-${tile.id}`} className={`w-[300px] h-[300px] p-2 flex items-center justify-center ${ttsTransparentBg ? 'bg-transparent' : 'bg-black'}`}>
                    <HexTileSVG colorA={tile.colorA} colorB={tile.colorB} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. TTS Back Sheet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg border border-slate-800">
              <span className="font-extrabold text-sm text-purple-400">2. TTS Hex Back Sheet — 30 Matching Backs (Side B)</span>
              <button
                onClick={exportTTSBackSheet}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shadow"
              >
                <Download className="w-4 h-4" /> Download Back Sheet PNG (1800×1500px)
              </button>
            </div>

            <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
              <div
                id="tts-hex-back-sheet-export"
                className={`p-0 m-0 leading-none select-none ${ttsTransparentBg ? 'bg-transparent' : 'bg-black'}`}
                style={{ width: '1800px', display: 'grid', gridTemplateColumns: 'repeat(6, 300px)', gap: 0 }}
              >
                {LITE_HEX_TILES.map((tile) => (
                  <div key={`tts-hex-back-${tile.id}`} className={`w-[300px] h-[300px] p-2 flex items-center justify-center ${ttsTransparentBg ? 'bg-transparent' : 'bg-black'}`}>
                    <HexTileSVG colorA={tile.colorB} colorB={tile.colorA} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- VIEW MODE 4: SCREENTOP EXPORT ---------------- */}
      {viewMode === 'screentop' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 p-5 rounded-xl border border-slate-800 gap-4 no-print">
            <div>
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-purple-400" />
                Screentop.co 60-Face Hex Tile Sheet (Alternating Front & Back)
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Contains all 60 tile faces (30 Fronts and 30 Backs) arranged in alternating pairs on a 10-column × 6-row grid sheet: <br />
                <code className="text-pink-300">[Tile 1 Front, Tile 1 Back, Tile 2 Front, Tile 2 Back, ...]</code>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={screentopTransparentBg}
                  onChange={(e) => setScreentopTransparentBg(e.target.checked)}
                  className="rounded text-pink-500 focus:ring-pink-500 bg-slate-900 border-slate-700"
                />
                Transparent Background
              </label>

              <button
                onClick={exportScreentopSheet}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black px-5 py-2.5 rounded-lg text-xs flex items-center gap-2 transition shadow-lg cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" /> Download Screentop 60-Face Sheet PNG (3000×1800px)
              </button>
            </div>
          </div>

          {/* Scrollable Container for 60-tile sheet */}
          <div className="overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl">
            <div
              id="screentop-hex-sheet-export"
              className={`p-0 m-0 leading-none select-none ${screentopTransparentBg ? 'bg-transparent' : 'bg-black'}`}
              style={{ width: '3000px', display: 'grid', gridTemplateColumns: 'repeat(10, 300px)', gap: 0 }}
            >
              {LITE_HEX_TILES.flatMap((tile) => [
                <div key={`screentop-hex-${tile.id}-A`} className={`w-[300px] h-[300px] p-2 flex items-center justify-center ${screentopTransparentBg ? 'bg-transparent' : 'bg-black'}`}>
                  <HexTileSVG colorA={tile.colorA} colorB={tile.colorB} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                </div>,
                <div key={`screentop-hex-${tile.id}-B`} className={`w-[300px] h-[300px] p-2 flex items-center justify-center ${screentopTransparentBg ? 'bg-transparent' : 'bg-black'}`}>
                  <HexTileSVG colorA={tile.colorB} colorB={tile.colorA} lineType={tile.lineType} twoLineOrientation={twoLineOrientation} lineTheme={lineTheme} />
                </div>
              ])}
            </div>
          </div>
        </section>
      )}

      {/* Offscreen container for batch zip export with 100% transparent backgrounds */}
      <div style={{ position: 'fixed', left: '-99999px', top: 0, opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
        {LITE_HEX_TILES.map((tile) => (
          <React.Fragment key={`hidden-export-${tile.id}`}>
            <div
              id={`hidden-tile-export-${tile.id}-A`}
              className="w-[300px] h-[300px] bg-transparent flex items-center justify-center"
            >
              <HexTileSVG
                colorA={tile.colorA}
                colorB={tile.colorB}
                lineType={tile.lineType}
                twoLineOrientation={twoLineOrientation}
                lineTheme={lineTheme}
              />
            </div>
            <div
              id={`hidden-tile-export-${tile.id}-B`}
              className="w-[300px] h-[300px] bg-transparent flex items-center justify-center"
            >
              <HexTileSVG
                colorA={tile.colorB}
                colorB={tile.colorA}
                lineType={tile.lineType}
                twoLineOrientation={twoLineOrientation}
                lineTheme={lineTheme}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
