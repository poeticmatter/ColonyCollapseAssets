import { Sun, Leaf, Droplet, Flower, Rocket, Scale } from 'lucide-react';
import { CC_COLOR_INK } from './colonyCollapsePalette.js';

// Color-blind redundancy: one distinct silhouette per issue, never reused.
// Themed to a bee colony settling a new planet - no crown, they left the
// monarchy behind.
const IssueSymbol = ({ color, size = 24, strokeWidth = 2.2, colorHex, className = '' }) => {
  const props = { size, color: colorHex || CC_COLOR_INK[color] || '#1F2937', strokeWidth, className };
  switch (color) {
    case 'Clay':
      return <Sun {...props} />;
    case 'Sage':
      return <Leaf {...props} />;
    case 'Periwinkle':
      return <Rocket {...props} />;
    case 'Stone':
      return <Scale {...props} />;
    case 'Seafoam':
      return <Droplet {...props} />;
    case 'Mauve':
      return <Flower {...props} />;
    default:
      return null;
  }
};

export default IssueSymbol;
