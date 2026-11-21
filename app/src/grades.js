// grades.js — colour grades for the cover panels.
//
// Each grade is a pure per-pixel function (r, g, b) -> [r, g, b], in the
// spirit of the Vice City sunset / neon poster look. applyGrade() walks an
// ImageData once and blends the graded pixel with the original by the
// strength slider (0..1). Pure math only — no DOM — so it can be
// unit-tested in Node with a fake ImageData.

function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function saturate(r, g, b, s) {
  const l = luma(r, g, b);
  return [l + (r - l) * s, l + (g - l) * s, l + (b - l) * s];
}

export function contrast(r, g, b, c) {
  return [
    (r - 128) * c + 128,
    (g - 128) * c + 128,
    (b - 128) * c + 128,
  ];
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

export const GRADES = [
  {
    id: "vice",
    name: "Vice Sunset",
    fn(r, g, b) {
      let p = contrast(r, g, b, 1.1);
      p = saturate(p[0], p[1], p[2], 1.38);
      const l = luma(p[0], p[1], p[2]) / 255;
      // Split tone: pink shadows, teal highlights, warm overall cast.
      const sr = mix(255, 64, l),
        sg = mix(110, 224, l),
        sb = mix(180, 208, l);
      return [
        mix(p[0] * 1.05, sr, 0.14),
        mix(p[1], sg, 0.12),
        mix(p[2] * 0.94, sb, 0.14),
      ];
    },
  },
  {
    id: "neon",
    name: "Neon Nights",
    fn(r, g, b) {
      const t = luma(r, g, b) / 255;
      let dr, dg, db;
      if (t < 0.5) {
        const u = t / 0.5;
        dr = mix(16, 178, u);
        dg = mix(6, 44, u);
        db = mix(64, 196, u);
      } else {
        const v = (t - 0.5) / 0.5;
        dr = mix(178, 72, v);
        dg = mix(44, 240, v);
        db = mix(196, 255, v);
      }
      // Keep a slice of the original colour so faces stay readable.
      return [mix(dr, r, 0.22), mix(dg, g, 0.22), mix(db, b, 0.22)];
    },
  },
  {
    id: "poster",
    name: "Poster Pop",
    fn(r, g, b) {
      let p = saturate(r, g, b, 1.3);
      p = contrast(p[0], p[1], p[2], 1.08);
      const levels = 5;
      return [
        Math.round((p[0] / 255) * (levels - 1)) * (255 / (levels - 1)),
        Math.round((p[1] / 255) * (levels - 1)) * (255 / (levels - 1)),
        Math.round((p[2] / 255) * (levels - 1)) * (255 / (levels - 1)),
      ];
    },
  },
  {
    id: "golden",
    name: "Golden Hour",
    fn(r, g, b) {
      const p = saturate(r * 1.1, g * 1.02, b * 0.82, 1.15);
      return [p[0] * 0.92 + 14, p[1] * 0.92 + 12, p[2] * 0.92 + 8];
    },
  },
  {
    id: "noir",
    name: "Midnight Noir",
    fn(r, g, b) {
      const l = luma(r, g, b);
      const p = contrast(l, l, l, 1.32);
      return [p[0] * 0.96, p[1], p[2] * 1.05];
    },
  },
  {
    id: "none",
    name: "Original",
    fn(r, g, b) {
      return [r, g, b];
    },
  },
];

export function gradeById(id) {
  for (const grade of GRADES) {
    if (grade.id === id) return grade;
  }
  return GRADES[0];
}

// imageData: { data: Uint8ClampedArray, width, height }. Mutates in
// place and returns it. strength 0 leaves the image untouched.
export function applyGrade(imageData, gradeId, strength) {
  const grade = gradeById(gradeId);
  if (gradeId === "none" || strength <= 0) return imageData;
  const s = Math.min(1, Math.max(0, strength));
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const out = grade.fn(d[i], d[i + 1], d[i + 2]);
    d[i] = clamp(mix(d[i], out[0], s));
    d[i + 1] = clamp(mix(d[i + 1], out[1], s));
    d[i + 2] = clamp(mix(d[i + 2], out[2], s));
  }
  return imageData;
}
