/**
 * Student color palette — 20 visually distinct colors.
 * Assignment uses the student's creation-order index (sequential),
 * not a hash, to guarantee no two students share a color.
 */

// 20 hues spread across the full wheel, alternating warm/cool
const PALETTE: Array<{ h: number; s: number; l: number }> = [
  { h: 210, s: 70, l: 50 }, // blue
  { h: 20,  s: 80, l: 50 }, // orange
  { h: 145, s: 60, l: 40 }, // emerald
  { h: 330, s: 65, l: 52 }, // pink
  { h: 260, s: 60, l: 54 }, // violet
  { h: 45,  s: 85, l: 46 }, // amber
  { h: 175, s: 65, l: 40 }, // teal
  { h: 0,   s: 65, l: 52 }, // red
  { h: 230, s: 70, l: 55 }, // indigo
  { h: 90,  s: 55, l: 42 }, // lime-green
  { h: 300, s: 55, l: 50 }, // fuchsia
  { h: 190, s: 70, l: 44 }, // cyan
  { h: 350, s: 60, l: 50 }, // rose
  { h: 120, s: 50, l: 40 }, // green
  { h: 275, s: 55, l: 56 }, // purple
  { h: 30,  s: 75, l: 48 }, // red-orange
  { h: 200, s: 65, l: 48 }, // sky
  { h: 60,  s: 70, l: 42 }, // yellow-green
  { h: 315, s: 60, l: 50 }, // magenta
  { h: 160, s: 55, l: 40 }, // mint
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a student color.
 * @param id     - student UUID (used as fallback if index not provided)
 * @param index  - creation-order index → guarantees unique colors for first 20 students
 */
export function generateStudentColor(id: string, index?: number): string {
  const i = index !== undefined ? index : simpleHash(id);
  const { h, s, l } = PALETTE[i % PALETTE.length];
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Returns the first palette index whose color is not in the given set.
 * Pass existing students' colors to guarantee uniqueness even after deletions.
 */
export function nextUnusedColorIndex(existingColors: string[]): number {
  const used = new Set(existingColors);
  for (let i = 0; i < PALETTE.length; i++) {
    const { h, s, l } = PALETTE[i];
    if (!used.has(`hsl(${h}, ${s}%, ${l}%)`)) return i;
  }
  return existingColors.length % PALETTE.length; // all 20 taken — wrap
}

/** Returns white or dark text color for maximum contrast */
export function getContrastColor(hslColor: string): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#1e293b';
  const l = parseInt(match[3], 10);
  return l > 52 ? '#1e293b' : '#ffffff';
}

/** Convert HSL string to rgba() */
export function hslToRgba(hslColor: string, alpha = 1): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return `rgba(99,102,241,${alpha})`;
  const h = parseInt(match[1], 10) / 360;
  const s = parseInt(match[2], 10) / 100;
  const l = parseInt(match[3], 10) / 100;

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

/** Lighten an HSL color string by `amount` lightness points */
export function lightenHsl(hslColor: string, amount: number): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hslColor;
  const h = match[1];
  const s = match[2];
  const l = Math.min(100, parseInt(match[3], 10) + amount);
  return `hsl(${h}, ${s}%, ${l}%)`;
}
