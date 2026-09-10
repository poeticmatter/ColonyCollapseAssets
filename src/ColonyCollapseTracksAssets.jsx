import React, { useState } from 'react';
import { Download, Package, LayoutGrid, Circle, Flag, Hourglass, Star, ArrowRight } from 'lucide-react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import {
  CC_COLOR_HEX,
  CC_COLOR_DEEP_HEX,
  CC_COLOR_MID_HEX,
  CC_COLOR_INK,
  CC_COLOR_ORDER,
  CC_PLAYER_COLOR_HEX,
  CC_PLAYER_COLOR_DEEP_HEX,
  CC_PLAYER_COLOR_INK,
  CC_PLAYER_COLOR_ORDER
} from './colonyCollapsePalette.js';
import IssueSymbol from './ColonyCollapseIssueSymbol.jsx';
import BeeMark from './ColonyCollapseBeeMark.jsx';

// Pointy-top hexagon vertices, same formula used for the hex tiles and board.
const hexPointsAt = (cx, cy, r) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const angle = (Math.PI / 180) * (60 * i - 90);
      return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
    })
    .join(' ');

// --- 1. THE NEUTRAL "GOLD" THEME ---------------------------------------
// The point and round tracks, and the round marker, belong to no player and
// no issue, so they take the same warm gold already used for the hub and for
// an action tile's upgraded side, rather than borrowing either palette.
const GOLD_FILL = '#F5B301';
const GOLD_MID = '#D6A23A';
const GOLD_DEEP = '#8A5A00';
const GOLD_INK = '#3F2D07';
const CELL_NUMERAL_LIGHT = '#FBF3E4';

// --- 2. PLAYER TOKENS -----------------------------------------------------
// One disc shape serves every token: a player's marker (the bee mark, the
// same one at the centre of the board), the shared control marker (flag),
// and the pawn on the board (also the bee disc, so no separate pawn asset).
const TOKEN_SIZE = 240;

const DiscTokenSVG = ({ fillHex, deepHex, className = '', children }) => (
  <svg
    viewBox={`0 0 ${TOKEN_SIZE} ${TOKEN_SIZE}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <circle cx={TOKEN_SIZE / 2} cy={TOKEN_SIZE / 2} r={TOKEN_SIZE / 2 - 8} fill={fillHex} stroke={deepHex} strokeWidth="10" />
    <circle
      cx={TOKEN_SIZE / 2}
      cy={TOKEN_SIZE / 2}
      r={TOKEN_SIZE / 2 - 22}
      fill="none"
      stroke={deepHex}
      strokeWidth="2.5"
      strokeOpacity="0.45"
    />
    {children}
  </svg>
);

const PlayerDiscSVG = ({ playerColor, icon = 'bee', className = '' }) => {
  const fillHex = CC_PLAYER_COLOR_HEX[playerColor];
  const deepHex = CC_PLAYER_COLOR_DEEP_HEX[playerColor];
  const inkHex = CC_PLAYER_COLOR_INK[playerColor];
  const glyphSize = 128;
  const glyphPos = (TOKEN_SIZE - glyphSize) / 2;

  return (
    <DiscTokenSVG fillHex={fillHex} deepHex={deepHex} className={className}>
      <g transform={`translate(${glyphPos}, ${glyphPos})`}>
        {icon === 'flag' ? (
          <Flag size={glyphSize} strokeWidth={2.3} color={inkHex} fill="none" />
        ) : (
          // The stripes read as the player color showing through the ink-colored body.
          <BeeMark size={glyphSize} bodyColor={inkHex} stripeColor={fillHex} />
        )}
      </g>
    </DiscTokenSVG>
  );
};

// The round marker belongs to no player - gold, with an hourglass for "a
// round has passed" rather than a bee or a flag.
const RoundMarkerSVG = ({ className = '' }) => {
  const glyphSize = 120;
  const glyphPos = (TOKEN_SIZE - glyphSize) / 2;
  return (
    <DiscTokenSVG fillHex={GOLD_FILL} deepHex={GOLD_DEEP} className={className}>
      <g transform={`translate(${glyphPos}, ${glyphPos})`}>
        <Hourglass size={glyphSize} strokeWidth={2.3} color={GOLD_INK} />
      </g>
    </DiscTokenSVG>
  );
};

// --- 3. ISSUE TRACK (vertical, 1-8, wide enough for 4 discs per space) ---
// Content is a plain <g> of shapes with no outer <svg> - it gets its own
// standalone wrapper below, but the combined board places it directly via a
// translate, so the two never drift out of sync.
const ISSUE_TRACK_MAX = 8;
const ISSUE_TRACK_CELL_W = 280;
const ISSUE_TRACK_CELL_H = 80;
const ISSUE_TRACK_HEADER_H = 120;
const ISSUE_TRACK_MARGIN = 20;
const ISSUE_TRACK_WIDTH = ISSUE_TRACK_CELL_W + ISSUE_TRACK_MARGIN * 2;
const ISSUE_TRACK_BODY_H = ISSUE_TRACK_HEADER_H + ISSUE_TRACK_MAX * ISSUE_TRACK_CELL_H;
const ISSUE_TRACK_HEIGHT = ISSUE_TRACK_BODY_H + ISSUE_TRACK_MARGIN * 2;

const IssueTrackContent = ({ issueColor }) => {
  const fillHex = CC_COLOR_HEX[issueColor];
  const midHex = CC_COLOR_MID_HEX[issueColor];
  const deepHex = CC_COLOR_DEEP_HEX[issueColor];
  const inkHex = CC_COLOR_INK[issueColor];
  const trackX = ISSUE_TRACK_MARGIN;
  const trackY = ISSUE_TRACK_MARGIN;
  const cellsTopY = trackY + ISSUE_TRACK_HEADER_H;
  const clipId = `issue-track-clip-${issueColor}`;
  const iconSize = 70;

  return (
    <>
      <rect x="0" y="0" width={ISSUE_TRACK_WIDTH} height={ISSUE_TRACK_HEIGHT} rx="26" fill="#0B1220" />
      <defs>
        <clipPath id={clipId}>
          <rect x={trackX} y={trackY} width={ISSUE_TRACK_CELL_W} height={ISSUE_TRACK_BODY_H} rx="20" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={trackX} y={trackY} width={ISSUE_TRACK_CELL_W} height={ISSUE_TRACK_HEADER_H} fill={fillHex} />
        {Array.from({ length: ISSUE_TRACK_MAX }).map((_, idx) => {
          const value = ISSUE_TRACK_MAX - idx;
          const cellY = cellsTopY + idx * ISSUE_TRACK_CELL_H;
          return (
            <rect
              key={`cell-fill-${value}`}
              x={trackX}
              y={cellY}
              width={ISSUE_TRACK_CELL_W}
              height={ISSUE_TRACK_CELL_H}
              fill={value % 2 === 0 ? fillHex : midHex}
            />
          );
        })}
      </g>

      <rect
        x={trackX}
        y={trackY}
        width={ISSUE_TRACK_CELL_W}
        height={ISSUE_TRACK_BODY_H}
        rx="20"
        fill="none"
        stroke={deepHex}
        strokeWidth="5"
      />
      <line x1={trackX} y1={cellsTopY} x2={trackX + ISSUE_TRACK_CELL_W} y2={cellsTopY} stroke={deepHex} strokeWidth="5" />

      <g transform={`translate(${trackX + ISSUE_TRACK_CELL_W / 2 - iconSize / 2}, ${trackY + ISSUE_TRACK_HEADER_H / 2 - iconSize / 2})`}>
        <IssueSymbol color={issueColor} size={iconSize} strokeWidth={2.2} colorHex={inkHex} />
      </g>

      {Array.from({ length: ISSUE_TRACK_MAX }).map((_, idx) => {
        const value = ISSUE_TRACK_MAX - idx;
        const cellY = cellsTopY + idx * ISSUE_TRACK_CELL_H;
        const cellMidY = cellY + ISSUE_TRACK_CELL_H / 2;
        return (
          <g key={`cell-${value}`}>
            {idx > 0 && (
              <line
                x1={trackX}
                y1={cellY}
                x2={trackX + ISSUE_TRACK_CELL_W}
                y2={cellY}
                stroke={deepHex}
                strokeOpacity="0.4"
                strokeWidth="2"
              />
            )}
            <circle cx={trackX + 38} cy={cellMidY} r="23" fill={deepHex} stroke={inkHex} strokeOpacity="0.3" strokeWidth="2" />
            <text
              x={trackX + 38}
              y={cellMidY + 9}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="26"
              fontWeight="800"
              fill={CELL_NUMERAL_LIGHT}
            >
              {value}
            </text>
          </g>
        );
      })}
    </>
  );
};

const IssueTrackSVG = ({ issueColor, className = '' }) => (
  <svg
    viewBox={`0 0 ${ISSUE_TRACK_WIDTH} ${ISSUE_TRACK_HEIGHT}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <IssueTrackContent issueColor={issueColor} />
  </svg>
);

// --- 4. POINT TRACK (hex, two rows, zigzagging up-down-up-down, 1-30) -----
// A pointy-top hex tiling: two touching rows, the lower row offset by half a
// hex-width, so stepping through 1..30 climbs up and down diagonally rather
// than running in a flat line - echoing the hex tiles and board everywhere
// else in the game, and staying much shorter than a straight column of 30.
const POINT_TRACK_MAX = 30;
const POINT_TRACK_COLUMNS = POINT_TRACK_MAX / 2;
const POINT_TRACK_HEX_R = 42;
const POINT_TRACK_MARGIN = 24;
const POINT_TRACK_STEP_X = POINT_TRACK_HEX_R * Math.sqrt(3);
const POINT_TRACK_HALF_W = POINT_TRACK_HEX_R * Math.sin(Math.PI / 3);
const POINT_TRACK_ROW_Y = POINT_TRACK_HEX_R * 1.5;
// The cap sits one step before cell 1 in the lower row - the same grid
// spacing every other hex in the track uses - so it genuinely touches both
// cell 1 (upper row) and cell 2 (lower row) rather than just sitting near them.
const POINT_TRACK_CAP_X = -POINT_TRACK_STEP_X / 2;
const POINT_TRACK_CAP_Y = POINT_TRACK_ROW_Y;
const POINT_TRACK_OFFSET_X = POINT_TRACK_MARGIN + POINT_TRACK_HALF_W - POINT_TRACK_CAP_X;
const POINT_TRACK_OFFSET_Y = POINT_TRACK_MARGIN + POINT_TRACK_HEX_R;
const POINT_TRACK_WIDTH =
  POINT_TRACK_OFFSET_X + POINT_TRACK_STEP_X * (POINT_TRACK_COLUMNS - 0.5) + POINT_TRACK_HALF_W + POINT_TRACK_MARGIN;
const POINT_TRACK_HEIGHT = POINT_TRACK_OFFSET_Y + POINT_TRACK_ROW_Y + POINT_TRACK_HEX_R + POINT_TRACK_MARGIN;

const pointTrackHexCenter = (value) => {
  const column = Math.floor((value - 1) / 2);
  const isLowerRow = (value - 1) % 2 === 1;
  const x = POINT_TRACK_STEP_X * (isLowerRow ? column + 0.5 : column);
  const y = isLowerRow ? POINT_TRACK_ROW_Y : 0;
  return { x: x + POINT_TRACK_OFFSET_X, y: y + POINT_TRACK_OFFSET_Y };
};

const PointTrackContent = () => {
  const capCenter = { x: POINT_TRACK_CAP_X + POINT_TRACK_OFFSET_X, y: POINT_TRACK_CAP_Y + POINT_TRACK_OFFSET_Y };
  const iconSize = 34;

  return (
    <>
      <rect x="0" y="0" width={POINT_TRACK_WIDTH} height={POINT_TRACK_HEIGHT} rx="20" fill="#0B1220" />

      <polygon points={hexPointsAt(capCenter.x, capCenter.y, POINT_TRACK_HEX_R)} fill={GOLD_FILL} stroke={GOLD_DEEP} strokeWidth="4" />
      <g transform={`translate(${capCenter.x - iconSize / 2}, ${capCenter.y - iconSize / 2})`}>
        <Star size={iconSize} strokeWidth={2.2} color={GOLD_INK} />
      </g>

      {Array.from({ length: POINT_TRACK_MAX }).map((_, idx) => {
        const value = idx + 1;
        const isMilestone = value % 5 === 0;
        const { x, y } = pointTrackHexCenter(value);
        return (
          <g key={`pt-${value}`}>
            <polygon
              points={hexPointsAt(x, y, POINT_TRACK_HEX_R)}
              fill={isMilestone ? GOLD_FILL : GOLD_MID}
              stroke={GOLD_DEEP}
              strokeWidth={isMilestone ? '4' : '2.5'}
            />
            <text
              x={x}
              y={y + (isMilestone ? 8 : 7)}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize={isMilestone ? '22' : '18'}
              fontWeight="800"
              fill={GOLD_INK}
            >
              {value}
            </text>
          </g>
        );
      })}
    </>
  );
};

const PointTrackSVG = ({ className = '' }) => (
  <svg
    viewBox={`0 0 ${POINT_TRACK_WIDTH} ${POINT_TRACK_HEIGHT}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <PointTrackContent />
  </svg>
);

// --- 5. ROUND TRACK (horizontal, 1-5) ------------------------------------

const ROUND_TRACK_MAX = 5;
const ROUND_TRACK_CAP_W = 130;
const ROUND_TRACK_CELL_W = 130;
const ROUND_TRACK_CELL_H = 160;
const ROUND_TRACK_MARGIN = 20;
const ROUND_TRACK_BODY_W = ROUND_TRACK_CAP_W + ROUND_TRACK_MAX * ROUND_TRACK_CELL_W;
const ROUND_TRACK_WIDTH = ROUND_TRACK_BODY_W + ROUND_TRACK_MARGIN * 2;
const ROUND_TRACK_HEIGHT = ROUND_TRACK_CELL_H + ROUND_TRACK_MARGIN * 2;

const RoundTrackContent = () => {
  const trackX = ROUND_TRACK_MARGIN;
  const trackY = ROUND_TRACK_MARGIN;
  const cellsLeftX = trackX + ROUND_TRACK_CAP_W;
  const iconSize = 60;

  return (
    <>
      <rect x="0" y="0" width={ROUND_TRACK_WIDTH} height={ROUND_TRACK_HEIGHT} rx="24" fill="#0B1220" />
      <defs>
        <clipPath id="round-track-clip">
          <rect x={trackX} y={trackY} width={ROUND_TRACK_BODY_W} height={ROUND_TRACK_CELL_H} rx="18" />
        </clipPath>
      </defs>

      <g clipPath="url(#round-track-clip)">
        <rect x={trackX} y={trackY} width={ROUND_TRACK_CAP_W} height={ROUND_TRACK_CELL_H} fill={GOLD_FILL} />
        {Array.from({ length: ROUND_TRACK_MAX }).map((_, idx) => (
          <rect
            key={`rt-fill-${idx}`}
            x={cellsLeftX + idx * ROUND_TRACK_CELL_W}
            y={trackY}
            width={ROUND_TRACK_CELL_W}
            height={ROUND_TRACK_CELL_H}
            fill={idx % 2 === 0 ? GOLD_FILL : GOLD_MID}
          />
        ))}
      </g>

      <rect x={trackX} y={trackY} width={ROUND_TRACK_BODY_W} height={ROUND_TRACK_CELL_H} rx="18" fill="none" stroke={GOLD_DEEP} strokeWidth="5" />
      <line x1={cellsLeftX} y1={trackY} x2={cellsLeftX} y2={trackY + ROUND_TRACK_CELL_H} stroke={GOLD_DEEP} strokeWidth="5" />

      <g transform={`translate(${trackX + ROUND_TRACK_CAP_W / 2 - iconSize / 2}, ${trackY + ROUND_TRACK_CELL_H / 2 - iconSize / 2})`}>
        <Hourglass size={iconSize} strokeWidth={2.2} color={GOLD_INK} />
      </g>

      {Array.from({ length: ROUND_TRACK_MAX }).map((_, idx) => {
        const value = idx + 1;
        const cellX = cellsLeftX + idx * ROUND_TRACK_CELL_W;
        return (
          <g key={`rt-${value}`}>
            {idx > 0 && (
              <line
                x1={cellX}
                y1={trackY}
                x2={cellX}
                y2={trackY + ROUND_TRACK_CELL_H}
                stroke={GOLD_DEEP}
                strokeOpacity="0.35"
                strokeWidth="2"
              />
            )}
            <text
              x={cellX + ROUND_TRACK_CELL_W / 2}
              y={trackY + ROUND_TRACK_CELL_H / 2 + 12}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="40"
              fontWeight="800"
              fill={GOLD_INK}
            >
              {value}
            </text>
          </g>
        );
      })}
    </>
  );
};

const RoundTrackSVG = ({ className = '' }) => (
  <svg
    viewBox={`0 0 ${ROUND_TRACK_WIDTH} ${ROUND_TRACK_HEIGHT}`}
    width="100%"
    height="100%"
    className={`select-none block ${className}`}
    style={{ width: '100%', height: '100%' }}
  >
    <RoundTrackContent />
  </svg>
);

// --- 6. THE TRACKS BOARD (every track, one image) -------------------------
// Round track centred along the top; the six issue tracks and the point
// track in a band beneath it, and the six issue tracks in a row beneath
// both - all three tracks are now horizontal bands except the issues.
const TRACKS_BOARD_MARGIN = 36;
const TRACKS_BOARD_GAP = 24;
const TRACKS_BOARD_ISSUE_ROW_WIDTH =
  CC_COLOR_ORDER.length * ISSUE_TRACK_WIDTH + (CC_COLOR_ORDER.length - 1) * TRACKS_BOARD_GAP;
const TRACKS_BOARD_CONTENT_WIDTH = Math.max(TRACKS_BOARD_ISSUE_ROW_WIDTH, ROUND_TRACK_WIDTH, POINT_TRACK_WIDTH);
const TRACKS_BOARD_WIDTH = TRACKS_BOARD_CONTENT_WIDTH + TRACKS_BOARD_MARGIN * 2;
const TRACKS_BOARD_POINT_Y = TRACKS_BOARD_MARGIN + ROUND_TRACK_HEIGHT + TRACKS_BOARD_GAP;
const TRACKS_BOARD_ISSUE_ROW_Y = TRACKS_BOARD_POINT_Y + POINT_TRACK_HEIGHT + TRACKS_BOARD_GAP;
const TRACKS_BOARD_HEIGHT = TRACKS_BOARD_ISSUE_ROW_Y + ISSUE_TRACK_HEIGHT + TRACKS_BOARD_MARGIN;

const TracksBoardSVG = ({ className = '' }) => {
  const roundTrackX = TRACKS_BOARD_MARGIN + (TRACKS_BOARD_CONTENT_WIDTH - ROUND_TRACK_WIDTH) / 2;
  const pointTrackX = TRACKS_BOARD_MARGIN + (TRACKS_BOARD_CONTENT_WIDTH - POINT_TRACK_WIDTH) / 2;
  const issueRowX = TRACKS_BOARD_MARGIN + (TRACKS_BOARD_CONTENT_WIDTH - TRACKS_BOARD_ISSUE_ROW_WIDTH) / 2;

  return (
    <svg
      viewBox={`0 0 ${TRACKS_BOARD_WIDTH} ${TRACKS_BOARD_HEIGHT}`}
      width="100%"
      height="100%"
      className={`select-none block ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <rect x="0" y="0" width={TRACKS_BOARD_WIDTH} height={TRACKS_BOARD_HEIGHT} fill="#080D18" />

      <g transform={`translate(${roundTrackX}, ${TRACKS_BOARD_MARGIN})`}>
        <RoundTrackContent />
      </g>

      <g transform={`translate(${pointTrackX}, ${TRACKS_BOARD_POINT_Y})`}>
        <PointTrackContent />
      </g>

      {CC_COLOR_ORDER.map((color, idx) => (
        <g
          key={`board-issue-${color}`}
          transform={`translate(${issueRowX + idx * (ISSUE_TRACK_WIDTH + TRACKS_BOARD_GAP)}, ${TRACKS_BOARD_ISSUE_ROW_Y})`}
        >
          <IssueTrackContent issueColor={color} />
        </g>
      ))}
    </svg>
  );
};

// --- 7. PLAYER BOARD (4 numbered action slots, arrows between them) ------
const PLAYER_BOARD_SLOT = 340;
const PLAYER_BOARD_SLOTS = 4;
const PLAYER_BOARD_GAP = 74;
const PLAYER_BOARD_MARGIN = 40;
const PLAYER_BOARD_HEADER_H = 96;
const PLAYER_BOARD_WIDTH =
  PLAYER_BOARD_MARGIN * 2 + PLAYER_BOARD_SLOTS * PLAYER_BOARD_SLOT + (PLAYER_BOARD_SLOTS - 1) * PLAYER_BOARD_GAP;
const PLAYER_BOARD_HEIGHT = PLAYER_BOARD_MARGIN * 2 + PLAYER_BOARD_HEADER_H + PLAYER_BOARD_SLOT;

const PlayerBoardSVG = ({ playerColor, className = '' }) => {
  const fillHex = CC_PLAYER_COLOR_HEX[playerColor];
  const deepHex = CC_PLAYER_COLOR_DEEP_HEX[playerColor];
  const inkHex = CC_PLAYER_COLOR_INK[playerColor];
  const boardX = PLAYER_BOARD_MARGIN;
  const boardY = PLAYER_BOARD_MARGIN;
  const slotsTopY = boardY + PLAYER_BOARD_HEADER_H;
  const beeSize = 56;

  return (
    <svg
      viewBox={`0 0 ${PLAYER_BOARD_WIDTH} ${PLAYER_BOARD_HEIGHT}`}
      width="100%"
      height="100%"
      className={`select-none block ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <rect
        x="0"
        y="0"
        width={PLAYER_BOARD_WIDTH}
        height={PLAYER_BOARD_HEIGHT}
        rx="30"
        fill="#0B1220"
        stroke={deepHex}
        strokeWidth="6"
      />

      {/* Header band: player color, bee mark, no name text - the color says who this is */}
      <path
        d={`M ${boardX} ${slotsTopY} V ${boardY + 22} Q ${boardX} ${boardY} ${boardX + 22} ${boardY} H ${
          boardX + PLAYER_BOARD_WIDTH - PLAYER_BOARD_MARGIN * 2 - 22
        } Q ${boardX + PLAYER_BOARD_WIDTH - PLAYER_BOARD_MARGIN * 2} ${boardY} ${
          boardX + PLAYER_BOARD_WIDTH - PLAYER_BOARD_MARGIN * 2
        } ${boardY + 22} V ${slotsTopY} Z`}
        fill={fillHex}
      />
      <g transform={`translate(${boardX + 24}, ${boardY + PLAYER_BOARD_HEADER_H / 2 - beeSize / 2})`}>
        <BeeMark size={beeSize} bodyColor={inkHex} stripeColor={fillHex} />
      </g>

      {Array.from({ length: PLAYER_BOARD_SLOTS }).map((_, idx) => {
        const slotX = boardX + idx * (PLAYER_BOARD_SLOT + PLAYER_BOARD_GAP);
        const slotCenterY = slotsTopY + PLAYER_BOARD_SLOT / 2;
        return (
          <g key={`slot-${idx}`}>
            <rect
              x={slotX}
              y={slotsTopY}
              width={PLAYER_BOARD_SLOT}
              height={PLAYER_BOARD_SLOT}
              rx="26"
              fill="#151E2E"
              stroke={deepHex}
              strokeWidth="4"
              strokeDasharray="12 10"
            />
            <circle cx={slotX + 40} cy={slotsTopY + 40} r="26" fill={fillHex} stroke={deepHex} strokeWidth="3" />
            <text
              x={slotX + 40}
              y={slotsTopY + 50}
              textAnchor="middle"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="30"
              fontWeight="800"
              fill={inkHex}
            >
              {idx + 1}
            </text>

            {idx < PLAYER_BOARD_SLOTS - 1 && (
              <g transform={`translate(${slotX + PLAYER_BOARD_SLOT + PLAYER_BOARD_GAP / 2 - 22}, ${slotCenterY - 22})`}>
                <ArrowRight size={44} strokeWidth={3} color={deepHex} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// --- 8. EXPORT HELPERS ----------------------------------------------------
const EXPORT_PIXEL_RATIO = 2;

const triggerDownload = (dataUrl, fileName) => {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

const renderNodeToPng = async (nodeId, { transparent = false } = {}) => {
  const node = document.getElementById(nodeId);
  if (!node) throw new Error(`Export node "${nodeId}" is not mounted`);
  return toPng(node, {
    cacheBust: true,
    pixelRatio: EXPORT_PIXEL_RATIO,
    backgroundColor: transparent ? null : '#0B1220'
  });
};

// --- 9. MAIN COMPONENT -----------------------------------------------------
export default function ColonyCollapseTracksAssets() {
  const [activeAsset, setActiveAsset] = useState('tokens'); // 'tokens' | 'tracks' | 'boards'
  const [busyLabel, setBusyLabel] = useState(null);

  const isBusy = busyLabel !== null;

  const runExport = async (label, task) => {
    setBusyLabel(label);
    try {
      await task();
    } catch (error) {
      console.error(`Colony Collapse tracks export failed (${label}):`, error);
      window.alert(`Export failed: ${error.message}`);
    } finally {
      setBusyLabel(null);
    }
  };

  const exportNode = (nodeId, fileName, transparent = false) =>
    runExport(nodeId, async () => {
      const dataUrl = await renderNodeToPng(nodeId, { transparent });
      triggerDownload(dataUrl, fileName);
    });

  const exportZip = (label, entries, zipFileName) =>
    runExport(label, async () => {
      const zip = new JSZip();
      for (const entry of entries) {
        const dataUrl = await renderNodeToPng(entry.nodeId, { transparent: entry.transparent });
        zip.file(entry.fileName, dataUrl.split(',')[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(URL.createObjectURL(blob), zipFileName);
    });

  const assetTabs = [
    { id: 'tokens', label: 'Tokens', sub: 'discs & markers', Icon: Circle },
    { id: 'tracks', label: 'Tracks Board', sub: 'issues, points, rounds', Icon: LayoutGrid },
    { id: 'boards', label: 'Player Boards', sub: '4 colors', Icon: LayoutGrid }
  ];

  const tokenEntries = [
    ...CC_PLAYER_COLOR_ORDER.map((color) => ({
      key: `disc-${color}`,
      nodeId: `cc-token-disc-${color}`,
      fileName: `ColonyCollapse_Token_Disc_${color}.png`,
      label: `${color} disc`
    })),
    ...CC_PLAYER_COLOR_ORDER.map((color) => ({
      key: `control-${color}`,
      nodeId: `cc-token-control-${color}`,
      fileName: `ColonyCollapse_Token_Control_${color}.png`,
      label: `${color} control`
    })),
    {
      key: 'round-marker',
      nodeId: 'cc-token-round-marker',
      fileName: 'ColonyCollapse_Token_RoundMarker.png',
      label: 'Round marker'
    }
  ];

  const boardEntries = CC_PLAYER_COLOR_ORDER.map((color) => ({
    key: `board-${color}`,
    nodeId: `cc-player-board-${color}`,
    fileName: `ColonyCollapse_PlayerBoard_${color}.png`,
    label: `${color} board`
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-b border-amber-500/30 px-6 py-5 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[280px]">
            <h1 className="text-2xl font-black text-amber-400 tracking-tight flex items-center gap-2">
              <Circle className="w-6 h-6" /> Colony Collapse — Tokens, Tracks &amp; Player Boards
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Player discs, control markers and the round marker · one combined tracks board
              (issues 1–8, points 1–30, rounds 1–5) · 4 player boards with a 4-slot action row.
            </p>
          </div>
        </div>

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
              <span className={`text-[11px] font-semibold ${activeAsset === tab.id ? 'text-slate-900/70' : 'text-slate-500'}`}>
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

      <main className="p-6">
        {/* ---------------- TOKENS ---------------- */}
        {activeAsset === 'tokens' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
              <button
                onClick={() => exportZip('tokens-zip', tokenEntries, 'ColonyCollapse_Tokens.zip')}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Package className="w-4 h-4" /> All {tokenEntries.length} tokens (.zip)
              </button>
              <p className="text-xs text-slate-500 max-w-md">
                Player discs double as the pawn on the board - no separate pawn asset needed.
              </p>
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Player discs</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5 mb-8">
              {CC_PLAYER_COLOR_ORDER.map((color) => (
                <div key={color} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                  <div className="w-full aspect-square">
                    <PlayerDiscSVG playerColor={color} icon="bee" />
                  </div>
                  <button
                    onClick={() => exportNode(`cc-token-disc-${color}`, `ColonyCollapse_Token_Disc_${color}.png`)}
                    disabled={isBusy}
                    className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-bold text-slate-300 cursor-pointer transition-colors no-print"
                  >
                    <Download className="w-3 h-3 inline mr-1" /> {color}
                  </button>
                </div>
              ))}
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Control markers</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5 mb-8">
              {CC_PLAYER_COLOR_ORDER.map((color) => (
                <div key={color} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                  <div className="w-full aspect-square">
                    <PlayerDiscSVG playerColor={color} icon="flag" />
                  </div>
                  <button
                    onClick={() => exportNode(`cc-token-control-${color}`, `ColonyCollapse_Token_Control_${color}.png`)}
                    disabled={isBusy}
                    className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-bold text-slate-300 cursor-pointer transition-colors no-print"
                  >
                    <Download className="w-3 h-3 inline mr-1" /> {color}
                  </button>
                </div>
              ))}
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Round marker</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                <div className="w-full aspect-square">
                  <RoundMarkerSVG />
                </div>
                <button
                  onClick={() => exportNode('cc-token-round-marker', 'ColonyCollapse_Token_RoundMarker.png')}
                  disabled={isBusy}
                  className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] font-bold text-slate-300 cursor-pointer transition-colors no-print"
                >
                  <Download className="w-3 h-3 inline mr-1" /> Round marker
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- TRACKS BOARD ---------------- */}
        {activeAsset === 'tracks' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
              <button
                onClick={() => exportNode('cc-tracks-board', 'ColonyCollapse_TracksBoard.png')}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" /> Tracks board PNG ({TRACKS_BOARD_WIDTH * EXPORT_PIXEL_RATIO}px)
              </button>
              <p className="text-xs text-slate-500 max-w-md">
                Round track on top, the point track beneath it, then the six issue tracks in a
                row underneath both.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <div style={{ width: TRACKS_BOARD_WIDTH * 0.42, minWidth: 640 }}>
                <TracksBoardSVG />
              </div>
            </div>
          </section>
        )}

        {/* ---------------- PLAYER BOARDS ---------------- */}
        {activeAsset === 'boards' && (
          <section>
            <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
              <button
                onClick={() => exportZip('boards-zip', boardEntries, 'ColonyCollapse_PlayerBoards.zip')}
                disabled={isBusy}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Package className="w-4 h-4" /> All {boardEntries.length} boards (.zip)
              </button>
              <p className="text-xs text-slate-500 max-w-md">
                4 program slots, numbered 1→4, in the order actions resolve each round.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {CC_PLAYER_COLOR_ORDER.map((color) => (
                <div key={color} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-3">
                  <div className="w-full max-w-3xl">
                    <PlayerBoardSVG playerColor={color} />
                  </div>
                  <button
                    onClick={() => exportNode(`cc-player-board-${color}`, `ColonyCollapse_PlayerBoard_${color}.png`)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer no-print transition-colors"
                  >
                    <Download className="w-3 h-3" /> {color} board
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ---------------- OFF-SCREEN EXPORT NODES ---------------- */}
      <div aria-hidden="true" className="no-print" style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}>
        {CC_PLAYER_COLOR_ORDER.map((color) => (
          <div key={`export-disc-${color}`} id={`cc-token-disc-${color}`} style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}>
            <PlayerDiscSVG playerColor={color} icon="bee" />
          </div>
        ))}
        {CC_PLAYER_COLOR_ORDER.map((color) => (
          <div key={`export-control-${color}`} id={`cc-token-control-${color}`} style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}>
            <PlayerDiscSVG playerColor={color} icon="flag" />
          </div>
        ))}
        <div id="cc-token-round-marker" style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}>
          <RoundMarkerSVG />
        </div>

        <div id="cc-tracks-board" style={{ width: TRACKS_BOARD_WIDTH, height: TRACKS_BOARD_HEIGHT }}>
          <TracksBoardSVG />
        </div>

        {CC_PLAYER_COLOR_ORDER.map((color) => (
          <div
            key={`export-board-${color}`}
            id={`cc-player-board-${color}`}
            style={{ width: PLAYER_BOARD_WIDTH, height: PLAYER_BOARD_HEIGHT }}
          >
            <PlayerBoardSVG playerColor={color} />
          </div>
        ))}
      </div>
    </div>
  );
}
