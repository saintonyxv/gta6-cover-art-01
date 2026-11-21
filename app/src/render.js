// ViceCover Studio — the cover compositor.
//
// renderCover paints a whole cover onto a canvas that is already sized to the
// export resolution. The pipeline, back to front:
//
//   1. each panel's source is drawn cover-fit into the panel's bounding box on
//      its own layer, the colour grade is applied to that layer, and the
//      layer is pasted through the panel's polygon clip;
//   2. an optional vignette darkens the cover's edges;
//   3. white keylines are stroked around every panel;
//   4. the lettering goes on: platform strip, title, subtitle, caption bar
//      and badge;
//   5. the classic white-then-black frame closes the cover.
//
// Grading per panel (rather than once over the flattened cover) keeps the
// white gutters and frame pure white, the way printed poster art behaves.

import { panelBounds, tracePanel } from './layouts.js';
import { applyGrade } from './grades.js';
import { sceneById } from './scenes.js';

/** Pixel size of a drawable source (an image or a canvas). */
function sourceSize(src) {
  return {
    w: src.naturalWidth ?? src.width,
    h: src.naturalHeight ?? src.height,
  };
}

/**
 * Render one panel's placed source into a fresh layer the size of the panel's
 * bounding box at cover resolution, grade included. Returns null when the
 * placement has no usable source. Scenes are painted straight into the layer;
 * photos are drawn cover-fit using the placement's focus point and zoom.
 */
function renderPanelLayer(placement, sources, box, coverW, coverH) {
  const layer = document.createElement('canvas');
  layer.width = Math.max(1, Math.round(box.w * coverW));
  layer.height = Math.max(1, Math.round(box.h * coverH));
  const ctx = layer.getContext('2d');

  const scene = sceneById(placement.sourceId);
  if (scene) {
    scene.paint(ctx, 0, 0, layer.width, layer.height);
    return layer;
  }
  const img = sources.get(placement.sourceId);
  if (!img) return null;
  const { w: iw, h: ih } = sourceSize(img);
  if (!iw || !ih) return null;

  const base = Math.max(layer.width / iw, layer.height / ih);
  const scale = base * placement.zoom;
  const drawnW = iw * scale;
  const drawnH = ih * scale;
  // The focus point selects which part of the overflowing image sits in the
  // middle of the box; clamp so the image always covers the box completely.
  const midX = layer.width / 2 + (0.5 - placement.fx) * (drawnW - layer.width);
  const midY = layer.height / 2 + (0.5 - placement.fy) * (drawnH - layer.height);
  ctx.drawImage(img, midX - drawnW / 2, midY - drawnH / 2, drawnW, drawnH);

  if (placement.gradeId !== 'original') {
    const pixels = ctx.getImageData(0, 0, layer.width, layer.height);
    applyGrade(pixels, placement.grade, placement.gradeStrength);
    ctx.putImageData(pixels, 0, 0);
  }
  return layer;
}

/** Radial edge-darkening over the whole cover, before the lettering. */
function paintVignette(ctx, w, h) {
  const radius = Math.hypot(w, h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.55, w / 2, h / 2, radius);
  grad.addColorStop(0, 'rgba(10, 4, 24, 0)');
  grad.addColorStop(1, 'rgba(10, 4, 24, 0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

const DISPLAY_FONT = (px) => `900 ${px}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
const BODY_FONT = (px, weight = 700) => `${weight} ${px}px "Helvetica Neue", Arial, sans-serif`;

/**
 * Draw a line of display type that shrinks until it fits `maxWidth`, centred
 * at (cx, baselineY), filled with `fill` and outlined in `stroke`. Returns
 * the font size used, so callers can stack lines.
 */
function fitDisplayLine(ctx, text, cx, baselineY, startPx, maxWidth, fill, stroke) {
  let px = startPx;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  while (px > 10) {
    ctx.font = DISPLAY_FONT(px);
    // The outline is part of the line's footprint: count it in the fit.
    if (ctx.measureText(text).width + px * 0.14 <= maxWidth) break;
    px -= Math.max(2, px * 0.04);
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, px * 0.14);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, baselineY);
  return px;
}

/** All of the cover's words: strip, title block, caption bar, badge. */
function paintLettering(ctx, w, h, cover) {
  const title = cover.title.trim().toUpperCase();
  const subtitle = cover.subtitle.trim().toUpperCase();

  if (cover.stripOn && cover.stripText.trim()) {
    const stripH = h * 0.052;
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, w, stripH);
    ctx.fillStyle = '#f5f2ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Spread the strip text with wide letter spacing, poster-style.
    const spaced = cover.stripText.trim().toUpperCase().split('').join('  ');
    // Shrink the spread line until it fits the cover's width.
    let stripPx = stripH * 0.44;
    while (stripPx > 8) {
      ctx.font = BODY_FONT(stripPx);
      if (ctx.measureText(spaced).width <= w * 0.92) break;
      stripPx -= 1;
    }
    ctx.fillText(spaced, w / 2, stripH * 0.54);
  }

  if (title) {
    const titlePx = fitDisplayLine(ctx, title, w / 2, h * 0.155, h * 0.115, w * 0.9, '#ffffff', '#14100e');
    if (subtitle) {
      ctx.font = BODY_FONT(titlePx * 0.3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.5, titlePx * 0.045);
      ctx.strokeStyle = '#14100e';
      const subY = h * 0.155 + titlePx * 0.48;
      ctx.strokeText(subtitle, w / 2, subY);
      ctx.fillStyle = '#ffd94d';
      ctx.fillText(subtitle, w / 2, subY);
    }
  }

  if (cover.caption.trim()) {
    const barH = h * 0.075;
    ctx.fillStyle = 'rgba(12, 10, 18, 0.88)';
    ctx.fillRect(0, h - barH, w, barH);
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(0, h - barH, w, Math.max(2, h * 0.006));
    ctx.fillStyle = '#ffffff';
    ctx.font = BODY_FONT(barH * 0.42);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cover.caption.trim().toUpperCase(), w / 2, h - barH * 0.46);
  }

  if (cover.badge.trim()) {
    const badge = cover.badge.trim().toUpperCase();
    ctx.font = BODY_FONT(h * 0.026);
    const padX = h * 0.02;
    const bw = ctx.measureText(badge).width + padX * 2;
    const bh = h * 0.05;
    const bx = w - bw - w * 0.035;
    const by = h * 0.185;
    ctx.fillStyle = '#e8365d';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh * 0.24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + bw / 2, by + bh * 0.54);
  }
}

/** White keylines around each panel (the lettering is painted over these). */
function paintKeylines(ctx, w, h, layout) {
  ctx.lineJoin = 'round';
  for (const panel of layout.panels) {
    tracePanel(ctx, panel, w, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, w * 0.006);
    ctx.stroke();
  }
}

/** The classic white-then-black frame, painted over everything else. */
function paintFrame(ctx, w, h) {
  const white = Math.max(3, w * 0.011);
  const black = Math.max(2, w * 0.005);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = white * 2;
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = '#0c0c10';
  ctx.lineWidth = black * 2;
  ctx.strokeRect(-white - black, -white - black, w + (white + black) * 2, h + (white + black) * 2);
}

/**
 * Paint the whole cover described by `cover` (the editor's state) onto
 * `canvas`, using `sources` (a Map of source id to image) for photo panels.
 * When `markPanel` is a panel index, that panel gets a dashed amber outline —
 * the editor's selection hint; exports and screenshots pass -1.
 */
export function renderCover(canvas, cover, sources, markPanel = -1) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = cover.layout;

  ctx.fillStyle = '#191424';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((panel, index) => {
    const placement = cover.panels[index];
    if (!placement) return;
    const box = panelBounds(panel);
    const layer = renderPanelLayer(placement, sources, box, w, h);
    if (!layer) return;
    ctx.save();
    tracePanel(ctx, panel, w, h);
    ctx.clip();
    ctx.drawImage(layer, box.x * w, box.y * h);
    ctx.restore();
  });

  if (cover.vignette) paintVignette(ctx, w, h);
  paintKeylines(ctx, w, h, layout);
  paintLettering(ctx, w, h, cover);
  paintFrame(ctx, w, h);

  if (markPanel >= 0 && layout.panels[markPanel]) {
    ctx.save();
    tracePanel(ctx, layout.panels[markPanel], w, h);
    ctx.setLineDash([w * 0.014, w * 0.01]);
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = Math.max(2, w * 0.0045);
    ctx.stroke();
    ctx.restore();
  }
}
