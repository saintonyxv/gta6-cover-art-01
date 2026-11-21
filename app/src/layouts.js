// layouts.js — panel geometry for the GTA-style multi-panel cover grid.
//
// Every layout is a list of panels in unit space (0..1 on both axes), each
// panel a polygon. Rectangles are four-point polygons; the diagonal layout
// uses slanted cuts and a triangle, like the classic game-cover collages.
// The renderer clips each photo to its polygon, so any photo can fill any
// panel. Pure geometry only — no DOM — so it can be unit-tested in Node.

export function rect(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export const LAYOUTS = [
  {
    id: "classic",
    name: "Classic Collage",
    panels: [
      rect(0.0, 0.0, 0.6, 0.56), // hero
      rect(0.6, 0.0, 0.4, 0.3),
      rect(0.6, 0.3, 0.4, 0.26),
      rect(0.0, 0.56, 0.34, 0.44),
      rect(0.34, 0.56, 0.29, 0.44),
      rect(0.63, 0.56, 0.37, 0.44),
    ],
  },
  {
    id: "diagonal",
    name: "Diagonal Cut",
    panels: [
      [
        [0, 0],
        [0.58, 0],
        [0.46, 0.52],
        [0, 0.52],
      ],
      [
        [0.58, 0],
        [1, 0],
        [1, 0.52],
        [0.46, 0.52],
      ],
      [
        [0, 0.52],
        [0.46, 0.52],
        [0.38, 1],
        [0, 1],
      ],
      [
        [0.46, 0.52],
        [1, 0.52],
        [1, 1],
        [0.68, 1],
      ],
      [
        [0.46, 0.52],
        [0.68, 1],
        [0.38, 1],
      ],
    ],
  },
  {
    id: "triptych",
    name: "Triptych",
    panels: [
      [
        [0, 0],
        [0.36, 0],
        [0.32, 1],
        [0, 1],
      ],
      [
        [0.36, 0],
        [0.68, 0],
        [0.66, 1],
        [0.32, 1],
      ],
      [
        [0.68, 0],
        [1, 0],
        [1, 1],
        [0.66, 1],
      ],
    ],
  },
  {
    id: "quad",
    name: "Quad Grid",
    panels: [
      rect(0, 0, 0.5, 0.5),
      rect(0.5, 0, 0.5, 0.5),
      rect(0, 0.5, 0.5, 0.5),
      rect(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: "strip",
    name: "Hero Strip",
    panels: [
      rect(0, 0, 1, 0.54),
      rect(0, 0.54, 0.34, 0.46),
      rect(0.34, 0.54, 0.33, 0.46),
      rect(0.67, 0.54, 0.33, 0.46),
    ],
  },
  {
    id: "hero",
    name: "Full Bleed",
    panels: [rect(0, 0, 1, 1)],
  },
];

export function layoutById(id) {
  for (const lay of LAYOUTS) {
    if (lay.id === id) return lay;
  }
  return LAYOUTS[0];
}

export function panelBBox(poly) {
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const pt of poly) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] > maxY) maxY = pt[1];
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1];
    const xj = poly[j][0],
      yj = poly[j][1];
    if (
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Cover-fit: scale the image so it covers the box (bw x bh), then place
// it by focus point (fx, fy in 0..1: 0 pins the left/top edges of the
// overflow, 1 pins the right/bottom). zoom multiplies the cover scale.
export function coverFit(iw, ih, bw, bh, fx, fy, zoom) {
  const scale = Math.max(bw / iw, bh / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  return {
    dx: (bw - dw) * fx,
    dy: (bh - dh) * fy,
    dw,
    dh,
  };
}
