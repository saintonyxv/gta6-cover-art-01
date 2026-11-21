// cover.js — the ViceCover renderer.
//
// Draws the whole cover onto the canvas at the canvas's own (full export)
// resolution: graded photos clipped into the layout's panels, the white
// keyline gutters and white/black outer frame of the classic cover grid,
// the optional platform strip, the outlined title block, and the caption
// bar with its badge. Everything is drawn from the editor state, so the
// on-screen preview is pixel-identical to the exported PNG.

import { layoutById, panelBBox, coverFit } from "./layouts.js";
import { applyGrade } from "./grades.js";

export const TITLE_FONT =
  '"Arial Black", Impact, "Franklin Gothic Heavy", "Segoe UI", sans-serif';

function pathPoly(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt[0] * W, pt[1] * H);
    else ctx.lineTo(pt[0] * W, pt[1] * H);
  });
  ctx.closePath();
}

// Shrinks the title font from startPx until text fits maxWidth.
export function fitFont(ctx, text, maxWidth, startPx) {
  let px = startPx;
  ctx.font = `900 ${px}px ${TITLE_FONT}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px *= 0.92;
    ctx.font = `900 ${px}px ${TITLE_FONT}`;
  }
  return px;
}

// A renderer owns the grade cache (graded copies of each source canvas,
// keyed by source + grade + strength bucket).
export function createCoverRenderer() {
  const gradeCache = new Map();

  function gradedSource(state, src) {
    if (!src || !src.canvas) return null;
    const bucket = Math.round(state.strength * 20);
    // The version is part of the key: a source whose canvas is redrawn
    // (a sample photo arriving over its placeholder) must not be served
    // a stale graded copy.
    const key = `${src.id}|${src.version || 0}|${state.gradeId}|${bucket}`;
    if (gradeCache.has(key)) return gradeCache.get(key);
    const c = document.createElement("canvas");
    c.width = src.canvas.width;
    c.height = src.canvas.height;
    const g = c.getContext("2d");
    g.drawImage(src.canvas, 0, 0);
    if (state.gradeId !== "none" && state.strength > 0) {
      const data = g.getImageData(0, 0, c.width, c.height);
      applyGrade(data, state.gradeId, state.strength);
      g.putImageData(data, 0, 0);
    }
    if (gradeCache.size > 14) gradeCache.clear();
    gradeCache.set(key, c);
    return c;
  }

  // state: { size:{w,h}, layoutId, gradeId, strength, vignette, title,
  // subtitle, caption, tag, stripOn, stripText, selected, panels[] }.
  // opts.forExport suppresses the selection outline.
  function render(canvas, state, opts = {}) {
    const ctx = canvas.getContext("2d");
    const W = state.size.w,
      H = state.size.h;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const lay = layoutById(state.layoutId);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // Panels: each panel's photo, graded, cover-fit into the panel's
    // bounding box and clipped to the panel polygon.
    lay.panels.forEach((poly, idx) => {
      const p = state.panels[idx];
      if (!p || !p.src) return;
      const img = gradedSource(state, p.src);
      if (!img) return;
      const bb = panelBBox(poly);
      const bx = bb.x * W,
        by = bb.y * H,
        bw = bb.w * W,
        bh = bb.h * H;
      const fit = coverFit(img.width, img.height, bw, bh, p.fx, p.fy, p.zoom);
      ctx.save();
      pathPoly(ctx, poly, W, H);
      ctx.clip();
      ctx.drawImage(img, bx + fit.dx, by + fit.dy, fit.dw, fit.dh);
      ctx.restore();
    });

    // Vignette.
    if (state.vignette) {
      const vg = ctx.createRadialGradient(
        W / 2, H / 2, Math.min(W, H) * 0.42,
        W / 2, H / 2, Math.max(W, H) * 0.78
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.38)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Panel gutters — the white keylines of the classic cover grid.
    const gutter = Math.max(3, H * 0.0055);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = gutter;
    ctx.lineJoin = "round";
    for (const poly of lay.panels) {
      pathPoly(ctx, poly, W, H);
      ctx.stroke();
    }

    // Outer frame: white border with a black keyline inside it.
    const fw = Math.max(6, H * 0.009);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, W - fw, H - fw);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(2, H * 0.0022);
    ctx.strokeRect(fw + 1, fw + 1, W - 2 * fw - 2, H - 2 * fw - 2);

    // Platform strip (optional).
    let stripH = 0;
    if (state.stripOn) {
      stripH = H * 0.048;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, stripH);
      ctx.fillStyle = "#0a0a14";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const spx = fitFont(ctx, state.stripText, W * 0.9, stripH * 0.52);
      ctx.font = `900 ${spx}px ${TITLE_FONT}`;
      ctx.fillText(state.stripText, W / 2, stripH * 0.54);
    }

    // Title block: heavy outlined display lettering, auto-fit.
    if (state.title) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      try {
        ctx.letterSpacing = "1px";
      } catch {
        /* older engines: no letter spacing, no problem */
      }
      const tpx = fitFont(ctx, state.title, W * 0.92, H * 0.104);
      ctx.font = `900 ${tpx}px ${TITLE_FONT}`;
      const ty = stripH + H * 0.148;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = tpx * 0.2;
      ctx.strokeText(state.title, W / 2, ty);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(state.title, W / 2, ty);
      if (state.subtitle) {
        const subPx = tpx * 0.34;
        ctx.font = `900 ${subPx}px ${TITLE_FONT}`;
        try {
          ctx.letterSpacing = `${Math.round(subPx * 0.3)}px`;
        } catch {
          /* ignore */
        }
        const sy = ty + subPx * 1.55;
        ctx.lineWidth = subPx * 0.22;
        ctx.strokeText(state.subtitle, W / 2, sy);
        ctx.fillStyle = "#ffd23f";
        ctx.fillText(state.subtitle, W / 2, sy);
        try {
          ctx.letterSpacing = "0px";
        } catch {
          /* ignore */
        }
      }
    }

    // Caption bar with badge.
    if (state.caption || state.tag) {
      const barH = H * 0.075;
      const grad = ctx.createLinearGradient(0, H - barH * 1.7, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.88)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - barH * 1.7, W, barH * 1.7);
      ctx.textBaseline = "middle";
      if (state.caption) {
        ctx.textAlign = "left";
        const cpx = fitFont(ctx, state.caption, W * 0.68, H * 0.032);
        ctx.font = `700 ${cpx}px ${TITLE_FONT}`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(state.caption, W * 0.038, H - barH * 0.42);
      }
      if (state.tag) {
        ctx.font = `900 ${H * 0.024}px ${TITLE_FONT}`;
        const tw = ctx.measureText(state.tag).width;
        const pad = W * 0.014;
        const boxW = tw + pad * 2,
          boxH = H * 0.042;
        const boxX = W - W * 0.038 - boxW,
          boxY = H - barH * 0.42 - boxH / 2;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(2, H * 0.0024);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = "#ffd23f";
        ctx.textAlign = "center";
        ctx.fillText(state.tag, boxX + boxW / 2, H - barH * 0.42 + 1);
      }
    }

    // Selection outline — preview only, never in an export or a shot.
    if (!opts.forExport) {
      const sel = lay.panels[state.selected];
      if (sel) {
        ctx.save();
        ctx.strokeStyle = "#ff2e88";
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 10]);
        pathPoly(ctx, sel, W, H);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  return { render, gradedSource };
}
