import React from 'react';
import BeeMark from './ColonyCollapseBeeMark.jsx';

// --- DIAL TOKEN --------------------------------------------------------
// The token that sits in the display board's central socket and rotates to
// point at the active tile slot. Flat colour, a triangular pointer nose, and
// the same bee mark every other token carries - no gradients or graduation
// ticks, matching the plain style of the discs and markers elsewhere.
// Orientation convention: the nose points straight up (0deg) by default -
// callers rotate the whole token to aim it, same as every other place in
// this game that points something at one of the display's six slots.
const NEUTRAL_FILL = '#C7CDD9';
const NEUTRAL_DEEP = '#5C6578';
const NEUTRAL_INK = '#1F2937';

const TOKEN_SIZE = 240;

export const DialTokenSVG = ({ size = TOKEN_SIZE, className = '' }) => {
  const cx = TOKEN_SIZE / 2;
  const cy = TOKEN_SIZE / 2;
  const r = 80;
  const noseTipY = cy - r - 30;
  const noseBaseY = cy - r + 8;
  const noseHalfWidth = 20;
  const glyphSize = 96;

  return (
    <svg
      viewBox={`0 0 ${TOKEN_SIZE} ${TOKEN_SIZE}`}
      width={size}
      height={size}
      className={`select-none block ${className}`}
      style={{ width: size, height: size }}
    >
      <polygon
        points={`${cx},${noseTipY} ${cx - noseHalfWidth},${noseBaseY} ${cx + noseHalfWidth},${noseBaseY}`}
        fill={NEUTRAL_FILL}
        stroke={NEUTRAL_DEEP}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r={r} fill={NEUTRAL_FILL} stroke={NEUTRAL_DEEP} strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke={NEUTRAL_DEEP} strokeWidth="2.5" strokeOpacity="0.4" />
      <g transform={`translate(${cx - glyphSize / 2}, ${cy - glyphSize / 2})`}>
        <BeeMark size={glyphSize} bodyColor={NEUTRAL_INK} stripeColor={NEUTRAL_FILL} />
      </g>
    </svg>
  );
};

export default DialTokenSVG;
