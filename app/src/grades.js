// ViceCover Studio — colour grades.
//
// A grade is a small function that maps one pixel (r, g, b in 0..255) to a
// new pixel. The engine runs the chosen grade over an ImageData buffer, then
// blends the graded pixels back toward the originals by the strength slider,
// so strength 0 is always the untouched image and 1 is the full look. Every
// grade here is a pure function of its input — no randomness, no state — which
// keeps renders (and screenshots) perfectly repeatable.

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Perceived luminance, Rec. 601 weights — good enough for poster work. */
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Push each channel away from (or toward) the pixel's own grey. */
function saturate(r, g, b, amount) {
  const grey = luminance(r, g, b);
  return [
    grey + (r - grey) * amount,
    grey + (g - grey) * amount,
    grey + (b - grey) * amount,
  ];
}

/** S-curve contrast around mid-grey; k in roughly -1..1. */
function contrast(r, g, b, k) {
  const f = (v) => {
    const n = v / 255;
    const curved = n + k * n * (1 - n) * (n - 0.5) * 4;
    return curved * 255;
  };
  return [f(r), f(g), f(b)];
}

/** Add a colour wash whose weight follows luminance: shadows or highlights. */
function tint(r, g, b, colour, weight, onHighlights) {
  const lum = luminance(r, g, b) / 255;
  const w = weight * (onHighlights ? lum * lum : (1 - lum) * (1 - lum));
  return [
    r + (colour[0] - r) * w,
    g + (colour[1] - g) * w,
    b + (colour[2] - b) * w,
  ];
}

/** Warm sunset: amber highlights, plum shadows, lifted saturation. */
function gradeSunset(r, g, b) {
  let [nr, ng, nb] = saturate(r, g, b, 1.22);
  [nr, ng, nb] = tint(nr, ng, nb, [255, 176, 92], 0.34, true);
  [nr, ng, nb] = tint(nr, ng, nb, [66, 32, 92], 0.3, false);
  [nr, ng, nb] = contrast(nr, ng, nb, 0.12);
  return [nr, ng, nb];
}

/** Neon: cyan shadows against magenta light, colours turned up hard. */
function gradeNeon(r, g, b) {
  let [nr, ng, nb] = saturate(r, g, b, 1.45);
  [nr, ng, nb] = tint(nr, ng, nb, [24, 190, 220], 0.36, false);
  [nr, ng, nb] = tint(nr, ng, nb, [255, 64, 170], 0.32, true);
  [nr, ng, nb] = contrast(nr, ng, nb, 0.18);
  return [nr, ng, nb];
}

/** Poster: quantise to a handful of levels, then strong contrast + colour. */
function gradePoster(r, g, b) {
  const levels = 5;
  const snap = (v) => Math.round((v / 255) * (levels - 1)) / (levels - 1) * 255;
  let [nr, ng, nb] = contrast(snap(r), snap(g), snap(b), 0.22);
  [nr, ng, nb] = saturate(nr, ng, nb, 1.3);
  return [nr, ng, nb];
}

/** Golden: honeyed mid-tones, gentle glow in the highlights, soft contrast. */
function gradeGolden(r, g, b) {
  let [nr, ng, nb] = tint(r, g, b, [246, 196, 96], 0.26, true);
  [nr, ng, nb] = tint(nr, ng, nb, [120, 78, 30], 0.16, false);
  [nr, ng, nb] = saturate(nr, ng, nb, 1.12);
  [nr, ng, nb] = contrast(nr, ng, nb, 0.06);
  return [nr + 6, ng + 3, nb - 4];
}

/** Noir: near-monochrome, crushed blacks, one cold wash over everything. */
function gradeNoir(r, g, b) {
  let [nr, ng, nb] = saturate(r, g, b, 0.22);
  [nr, ng, nb] = contrast(nr, ng, nb, 0.3);
  [nr, ng, nb] = tint(nr, ng, nb, [70, 92, 120], 0.18, false);
  const floor = 10;
  return [
    floor + (nr - floor) * 0.94,
    floor + (ng - floor) * 0.94,
    floor + (nb - floor) * 0.97,
  ];
}

/** The grade catalogue, in picker order. `fn: null` means "no grade". */
export const GRADES = [
  { id: 'original', name: 'Original', fn: null },
  { id: 'sunset', name: 'Vice Sunset', fn: gradeSunset },
  { id: 'neon', name: 'Neon Nights', fn: gradeNeon },
  { id: 'poster', name: 'Poster Pop', fn: gradePoster },
  { id: 'golden', name: 'Golden Hour', fn: gradeGolden },
  { id: 'noir', name: 'Midnight Noir', fn: gradeNoir },
];

/** Look a grade up by id; unknown ids mean the original image. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}

/**
 * Apply a grade to an ImageData buffer in place. `strength` runs 0..1 and is
 * the mix between each original pixel and its graded version; at 0 (or with
 * the Original grade) the buffer is left exactly as it was.
 */
export function applyGrade(imageData, grade, strength) {
  if (!grade || !grade.fn || strength <= 0) return;
  const mix = Math.min(1, strength);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [nr, ng, nb] = grade.fn(r, g, b);
    data[i] = clamp255(r + (nr - r) * mix);
    data[i + 1] = clamp255(g + (ng - g) * mix);
    data[i + 2] = clamp255(b + (nb - b) * mix);
  }
}
