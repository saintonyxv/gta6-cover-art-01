// ViceCover Studio — panel layout geometry.
//
// Every layout is a list of panels in normalised cover space: coordinates run
// 0..1 on both axes, so the same layout works at any export resolution. A
// panel is a polygon (three or more [x, y] corners, wound clockwise) plus a
// `hero` flag the editor uses when it needs a sensible default panel to fill
// first. The renderer scales these unit polygons to the real canvas.

/** The six poster layouts, in the order the editor's picker shows them. */
export const LAYOUTS = [
  {
    id: 'collage',
    name: 'Classic Collage',
    panels: [
      { hero: true, poly: [[0, 0], [0.62, 0], [0.62, 0.58], [0, 0.58]] },
      { poly: [[0.62, 0], [1, 0], [1, 0.58], [0.62, 0.58]] },
      { poly: [[0, 0.58], [0.34, 0.58], [0.34, 1], [0, 1]] },
      { poly: [[0.34, 0.58], [0.67, 0.58], [0.67, 1], [0.34, 1]] },
      { poly: [[0.67, 0.58], [1, 0.58], [1, 1], [0.67, 1]] },
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal Cut',
    panels: [
      { hero: true, poly: [[0, 0], [1, 0], [0.58, 0.52], [0, 0.38]] },
      { poly: [[1, 0], [1, 0.55], [0.58, 0.52]] },
      { poly: [[0, 0.38], [0.58, 0.52], [0.42, 1], [0, 1]] },
      { poly: [[0.58, 0.52], [1, 0.55], [1, 1], [0.42, 1]] },
    ],
  },
  {
    id: 'triptych',
    name: 'Triptych',
    panels: [
      { poly: [[0, 0], [0.34, 0], [0.34, 1], [0, 1]] },
      { hero: true, poly: [[0.34, 0], [0.67, 0], [0.67, 1], [0.34, 1]] },
      { poly: [[0.67, 0], [1, 0], [1, 1], [0.67, 1]] },
    ],
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    panels: [
      { hero: true, poly: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] },
      { poly: [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]] },
      { poly: [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]] },
      { poly: [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]] },
    ],
  },
  {
    id: 'hero-strip',
    name: 'Hero & Strip',
    panels: [
      { hero: true, poly: [[0, 0], [1, 0], [1, 0.7], [0, 0.7]] },
      { poly: [[0, 0.7], [0.34, 0.7], [0.34, 1], [0, 1]] },
      { poly: [[0.34, 0.7], [0.67, 0.7], [0.67, 1], [0.34, 1]] },
      { poly: [[0.67, 0.7], [1, 0.7], [1, 1], [0.67, 1]] },
    ],
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    panels: [
      { hero: true, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    ],
  },
];

/** Look a layout up by id; falls back to the first layout for unknown ids. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/** Index of the layout's hero panel (0 when none is flagged). */
export function heroIndex(layout) {
  const at = layout.panels.findIndex((panel) => panel.hero);
  return at === -1 ? 0 : at;
}

/** Axis-aligned bounds of a unit polygon: {x, y, w, h} in 0..1 space. */
export function panelBounds(panel) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of panel.poly) {
    if (x < left) left = x;
    if (y < top) top = y;
    if (x > right) right = x;
    if (y > bottom) bottom = y;
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Centre of a panel's bounds — handy for labels and hit-test fallbacks. */
export function panelCentre(panel) {
  const b = panelBounds(panel);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/**
 * Point-in-polygon test (even-odd ray cast) in unit space. The editor uses it
 * to pick the panel under the pointer; the renderer uses it for nothing, it
 * clips with the canvas path instead.
 */
export function pointInPanel(panel, x, y) {
  const poly = panel.poly;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Trace a panel polygon onto a context already scaled to canvas pixels. */
export function tracePanel(ctx, panel, width, height) {
  const poly = panel.poly;
  ctx.beginPath();
  ctx.moveTo(poly[0][0] * width, poly[0][1] * height);
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0] * width, poly[i][1] * height);
  }
  ctx.closePath();
}
