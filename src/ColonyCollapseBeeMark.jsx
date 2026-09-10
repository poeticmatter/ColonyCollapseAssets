// The bee glyph used everywhere a token or emblem needs to read as "a bee" -
// a rounded body with two banded stripes, no wings or head. Centred in a
// 48x48 box so it drops straight into an icon slot the same way every other
// glyph in this game does.
const BeeMark = ({ size = 48, bodyColor, stripeColor }) => (
  <svg viewBox="0 0 48 48" width={size} height={size}>
    <g transform="translate(24, 25)">
      <path d="M -15 -5 Q 0 -20 15 -5 Q 10 10 0 15 Q -10 10 -15 -5 Z" fill={bodyColor} />
      {/* Each stripe follows the body's own edge at that height and bows
          gently upward, like a contour line on a rounded surface. */}
      <path d="M -12 1.5 Q 0 -1.5 12 1.5" stroke={stripeColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M -8 8 Q 0 5 8 8" stroke={stripeColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  </svg>
);

export default BeeMark;
