// The six Colony Collapse issue colors: a chalk palette, deliberately low-chroma
// and hue-offset from the vivid player colors so no issue ever reads as a washed
// out version of a player. Shared by the cards, tiles, board and action tiles.
export const CC_COLOR_HEX = {
  Clay: '#D69A78',
  Sage: '#B3BE7C',
  Periwinkle: '#99A0D6',
  Stone: '#C2B8A9',
  Seafoam: '#7FB8B2',
  Mauve: '#C193AF'
};

// One step deeper: rims, borders, banner gradients.
export const CC_COLOR_DEEP_HEX = {
  Clay: '#A85F3C',
  Sage: '#7D8A45',
  Periwinkle: '#5C64A6',
  Stone: '#8B8172',
  Seafoam: '#47857E',
  Mauve: '#8E5B79'
};

// Mid tone for the far end of a banner gradient.
export const CC_COLOR_MID_HEX = {
  Clay: '#C4855F',
  Sage: '#A2AE68',
  Periwinkle: '#858DC8',
  Stone: '#B0A493',
  Seafoam: '#68A69F',
  Mauve: '#B07E9C'
};

// Chalk fields are light, so every glyph and label on them is dark ink.
export const CC_COLOR_INK = {
  Clay: '#4A2416',
  Sage: '#3A401C',
  Periwinkle: '#262C5E',
  Stone: '#3F382E',
  Seafoam: '#17403C',
  Mauve: '#45203A'
};

// Ring order for the board: the two warm neutrals, the two greens and the two
// purples each sit opposite their nearest neighbour rather than beside it.
export const CC_COLOR_ORDER = ['Clay', 'Sage', 'Periwinkle', 'Stone', 'Seafoam', 'Mauve'];

export const CC_COLOR_TAGLINE = {
  Clay: 'Climate & Energy',
  Sage: 'Growth & Forage',
  Periwinkle: 'Expansion & Flight',
  Stone: 'Democracy & Law',
  Seafoam: 'Water & Health',
  Mauve: 'Bloom & Pollination'
};
