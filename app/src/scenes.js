// scenes.js — built-in sample scenes, drawn procedurally on offscreen
// canvases. Every scene is original vector-style art made of gradients
// and silhouettes: no photographs, no third-party artwork, no logos.
// They stand in for user photos so the app opens with a full cover, and
// they double as extra panels a user can drop into any slot.

// Deterministic PRNG so the scenes render identically on every load.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, w, h, n, seed, maxY) {
  const r = rng(seed);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < n; i++) {
    const x = r() * w,
      y = r() * maxY * h,
      s = r() * 2.2 + 0.6;
    ctx.globalAlpha = 0.35 + r() * 0.6;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}

function skyline(ctx, w, baseY, height, seed, color, litRatio, litColor) {
  const r = rng(seed);
  let x = -20;
  ctx.fillStyle = color;
  const tops = [];
  while (x < w + 20) {
    const bw = 60 + r() * 130;
    const bh = height * (0.45 + r() * 0.55);
    ctx.fillRect(x, baseY - bh, bw, bh);
    tops.push({ x, y: baseY - bh, w: bw, h: bh });
    x += bw + 4 + r() * 26;
  }
  // Lit windows.
  for (const b of tops) {
    for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 16) {
      for (let wy = b.y + 10; wy < baseY - 10; wy += 22) {
        if (r() < litRatio) {
          ctx.fillStyle = litColor;
          ctx.globalAlpha = 0.5 + r() * 0.5;
          ctx.fillRect(wx, wy, 7, 10);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

function palm(ctx, x, y, s, flip, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 13 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 26 * s * flip, y - 120 * s, x + 64 * s * flip, y - 190 * s);
  ctx.stroke();
  const tx = x + 64 * s * flip,
    ty = y - 190 * s;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + i * 0.14) + (flip < 0 ? Math.PI * 0.72 : 0);
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * 90 * s,
      ty + Math.sin(a) * 60 * s - 26 * s,
      tx + Math.cos(a) * 150 * s,
      ty + Math.sin(a) * 120 * s + 18 * s
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(tx - 10 * s, ty + 8 * s, 11 * s, 0, Math.PI * 2);
  ctx.arc(tx + 12 * s, ty + 12 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
}

export const SCENES = [
  {
    id: "sunset",
    name: "Sunset Palms",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#2b0a4a"],
        [0.38, "#8e1e63"],
        [0.62, "#e8487a"],
        [0.8, "#ff7e3d"],
        [1, "#ffd23f"],
      ]);
      // Sun, low over the water.
      const sg = ctx.createRadialGradient(w * 0.5, h * 0.66, 10, w * 0.5, h * 0.66, w * 0.3);
      sg.addColorStop(0, "rgba(255,236,170,0.95)");
      sg.addColorStop(0.35, "rgba(255,170,80,0.55)");
      sg.addColorStop(1, "rgba(255,140,60,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffe9a8";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.66, w * 0.115, 0, Math.PI * 2);
      ctx.fill();
      // Sea.
      const sea = ctx.createLinearGradient(0, h * 0.68, 0, h);
      sea.addColorStop(0, "#7a1f5c");
      sea.addColorStop(1, "#1c0b38");
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
      const r = rng(41);
      ctx.fillStyle = "rgba(255,190,110,0.7)";
      for (let i = 0; i < 130; i++) {
        const y = h * 0.7 + r() * h * 0.28;
        const len = 8 + r() * (30 + (y / h) * 60);
        ctx.globalAlpha = 0.15 + r() * 0.5;
        ctx.fillRect(w * 0.5 + (r() - 0.5) * w * 0.3 * (0.4 + y / h), y, len, 3);
      }
      ctx.globalAlpha = 1;
      // Birds.
      ctx.strokeStyle = "rgba(30,5,40,0.8)";
      ctx.lineWidth = 4;
      for (let b = 0; b < 5; b++) {
        const bx = w * (0.18 + b * 0.13),
          by = h * (0.16 + (b % 3) * 0.05),
          bs = 13 + (b % 2) * 6;
        ctx.beginPath();
        ctx.moveTo(bx - bs, by);
        ctx.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.6, bx, by);
        ctx.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.6, bx + bs, by);
        ctx.stroke();
      }
      palm(ctx, w * 0.1, h * 1.02, 1.9, 1, "#160a26");
      palm(ctx, w * 0.94, h * 1.04, 2.3, -1, "#12081f");
      palm(ctx, w * 0.82, h * 1.0, 1.2, -1, "#1d0d30");
    },
  },
  {
    id: "neon",
    name: "Neon Strip",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#03030c"],
        [0.6, "#0d1030"],
        [1, "#1c0f33"],
      ]);
      stars(ctx, w, h, 90, 7, 0.4);
      skyline(ctx, w, h * 0.78, h * 0.62, 12, "#070714", 0.34, "#ffd76a");
      // Neon signs.
      const signs = [
        [0.1, 0.3, "#ff2e88"],
        [0.34, 0.2, "#22d3ee"],
        [0.58, 0.34, "#ff9f1c"],
        [0.8, 0.22, "#b26bff"],
      ];
      for (const [fx, fy, color] of signs) {
        const sx = w * fx,
          sy = h * fy,
          sw = w * 0.13,
          sh = h * 0.2;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 34;
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.restore();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(sx + sw * 0.18, sy + sh * 0.3, sw * 0.64, 7);
        ctx.fillRect(sx + sw * 0.18, sy + sh * 0.52, sw * 0.5, 7);
        ctx.fillRect(sx + sw * 0.18, sy + sh * 0.74, sw * 0.58, 7);
        ctx.globalAlpha = 1;
      }
      // Wet street with reflections.
      const st = ctx.createLinearGradient(0, h * 0.78, 0, h);
      st.addColorStop(0, "#0a0a1c");
      st.addColorStop(1, "#05050f");
      ctx.fillStyle = st;
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
      const r = rng(23);
      const cols = ["#ff2e88", "#22d3ee", "#ff9f1c", "#ffd76a"];
      for (let k = 0; k < 46; k++) {
        ctx.fillStyle = cols[k % cols.length];
        ctx.globalAlpha = 0.1 + r() * 0.3;
        ctx.fillRect(r() * w, h * 0.79 + r() * h * 0.19, 26 + r() * 90, 3.5);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "coast",
    name: "Coast Run",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#1b1040"],
        [0.45, "#6d2160"],
        [0.72, "#e85d75"],
        [1, "#ffb35c"],
      ]);
      // Hills.
      ctx.fillStyle = "#2a1245";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.62);
      ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.55, h * 0.6);
      ctx.quadraticCurveTo(w * 0.8, h * 0.68, w, h * 0.58);
      ctx.lineTo(w, h * 0.72);
      ctx.lineTo(0, h * 0.72);
      ctx.fill();
      palm(ctx, w * 0.06, h * 0.78, 1.1, 1, "#1c0b31");
      palm(ctx, w * 0.97, h * 0.8, 1.3, -1, "#1c0b31");
      // Road in perspective.
      ctx.fillStyle = "#14101f";
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.66);
      ctx.lineTo(w * 0.64, h * 0.66);
      ctx.lineTo(w * 1.02, h);
      ctx.lineTo(w * -0.02, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,220,150,0.85)";
      ctx.lineWidth = 6;
      ctx.setLineDash([34, 40]);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.67);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
      // Sports car silhouette.
      const cw = w * 0.52,
        cx = w * 0.5 - cw / 2,
        cy = h * 0.86;
      ctx.fillStyle = "#0a0616";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + cw * 0.04, cy - h * 0.045, cx + cw * 0.2, cy - h * 0.055);
      ctx.quadraticCurveTo(cx + cw * 0.32, cy - h * 0.115, cx + cw * 0.48, cy - h * 0.12);
      ctx.quadraticCurveTo(cx + cw * 0.66, cy - h * 0.118, cx + cw * 0.78, cy - h * 0.06);
      ctx.quadraticCurveTo(cx + cw * 0.95, cy - h * 0.045, cx + cw, cy);
      ctx.closePath();
      ctx.fill();
      // Cabin glass.
      ctx.fillStyle = "#3ec6e0";
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.34, cy - h * 0.1);
      ctx.quadraticCurveTo(cx + cw * 0.48, cy - h * 0.108, cx + cw * 0.62, cy - h * 0.1);
      ctx.quadraticCurveTo(cx + cw * 0.6, cy - h * 0.07, cx + cw * 0.38, cy - h * 0.068);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // Wheels.
      ctx.fillStyle = "#000";
      const wr = cw * 0.075;
      ctx.beginPath();
      ctx.arc(cx + cw * 0.2, cy, wr, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.8, cy, wr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8f9bb0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx + cw * 0.2, cy, wr * 0.55, 0, Math.PI * 2);
      ctx.arc(cx + cw * 0.8, cy, wr * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      // Headlight glow.
      const hg = ctx.createRadialGradient(cx + cw * 0.03, cy - h * 0.03, 4, cx + cw * 0.03, cy - h * 0.03, cw * 0.3);
      hg.addColorStop(0, "rgba(255,240,190,0.8)");
      hg.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(cx - cw * 0.3, cy - h * 0.16, cw * 0.36, h * 0.2);
      ctx.fillStyle = "#ff3b30";
      ctx.fillRect(cx + cw * 0.965, cy - h * 0.045, cw * 0.03, h * 0.016);
    },
  },
  {
    id: "heli",
    name: "Air Patrol",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#0e2a4a"],
        [0.5, "#14607e"],
        [0.78, "#e8875a"],
        [1, "#ffc46b"],
      ]);
      stars(ctx, w, h, 40, 3, 0.3);
      skyline(ctx, w, h * 0.94, h * 0.4, 31, "#0b1626", 0.3, "#ffe9a8");
      ctx.fillStyle = "#081120";
      ctx.fillRect(0, h * 0.94, w, h * 0.06);
      // Searchlight cone.
      const hx = w * 0.68,
        hy = h * 0.3;
      const lg = ctx.createLinearGradient(hx, hy, w * 0.44, h * 0.94);
      lg.addColorStop(0, "rgba(255,246,200,0.5)");
      lg.addColorStop(1, "rgba(255,246,200,0.02)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy + 20);
      ctx.lineTo(w * 0.36, h * 0.94);
      ctx.lineTo(w * 0.54, h * 0.94);
      ctx.lineTo(hx + 8, hy + 20);
      ctx.closePath();
      ctx.fill();
      // Helicopter silhouette.
      ctx.fillStyle = "#0a0f1c";
      ctx.beginPath();
      ctx.ellipse(hx, hy, 95, 44, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath(); // tail boom
      ctx.moveTo(hx + 70, hy - 8);
      ctx.lineTo(hx + 250, hy - 34);
      ctx.lineTo(hx + 252, hy - 16);
      ctx.lineTo(hx + 74, hy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(hx + 238, hy - 58, 12, 52); // tail fin
      ctx.fillRect(hx - 60, hy + 44, 120, 8); // skid struts
      ctx.fillRect(hx - 78, hy + 54, 156, 7); // skid
      ctx.strokeStyle = "rgba(10,15,28,0.85)";
      ctx.lineWidth = 7;
      ctx.beginPath(); // main rotor
      ctx.moveTo(hx - 190, hy - 52);
      ctx.lineTo(hx + 190, hy - 58);
      ctx.stroke();
      ctx.fillRect(hx - 8, hy - 56, 16, 14);
      // Cockpit glass.
      ctx.fillStyle = "#7fd8e8";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(hx - 52, hy - 4, 30, 24, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Beacon.
      ctx.fillStyle = "#ff4040";
      ctx.beginPath();
      ctx.arc(hx + 244, hy - 62, 6, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "boardwalk",
    name: "Boardwalk Nights",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#12082e"],
        [0.55, "#33135e"],
        [1, "#6e2470"],
      ]);
      stars(ctx, w, h, 110, 17, 0.5);
      // Moon.
      ctx.fillStyle = "#f6ead2";
      ctx.beginPath();
      ctx.arc(w * 0.84, h * 0.14, w * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12082e";
      ctx.beginPath();
      ctx.arc(w * 0.865, h * 0.125, w * 0.04, 0, Math.PI * 2);
      ctx.fill();
      // Ferris wheel.
      const fx = w * 0.3,
        fy = h * 0.44,
        fr = w * 0.21;
      ctx.strokeStyle = "#0d0620";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - fr * 0.4, h * 0.8);
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + fr * 0.4, h * 0.8);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.stroke();
      const bulbCols = ["#ff2e88", "#22d3ee", "#ffd23f", "#7cff5e"];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const gx = fx + Math.cos(a) * fr * 0.62,
          gy = fy + Math.sin(a) * fr * 0.62;
        ctx.strokeStyle = "#0d0620";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr);
        ctx.stroke();
        ctx.fillStyle = "#0d0620";
        ctx.fillRect(gx - 13, gy - 4, 26, 22);
        ctx.save();
        ctx.shadowColor = bulbCols[i % 4];
        ctx.shadowBlur = 16;
        ctx.fillStyle = bulbCols[i % 4];
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // String lights across the top right.
      ctx.strokeStyle = "rgba(10,5,25,0.9)";
      ctx.lineWidth = 3;
      for (let s = 0; s < 3; s++) {
        const y0 = h * (0.1 + s * 0.09);
        ctx.beginPath();
        ctx.moveTo(w * 0.52, y0);
        ctx.quadraticCurveTo(w * 0.76, y0 + h * 0.07, w, y0 - h * 0.01);
        ctx.stroke();
        for (let t = 0.08; t < 1; t += 0.1) {
          const px = (1 - t) * (1 - t) * w * 0.52 + 2 * (1 - t) * t * w * 0.76 + t * t * w;
          const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + h * 0.07) + t * t * (y0 - h * 0.01);
          ctx.save();
          ctx.shadowColor = bulbCols[(s + Math.round(t * 10)) % 4];
          ctx.shadowBlur = 12;
          ctx.fillStyle = bulbCols[(s + Math.round(t * 10)) % 4];
          ctx.beginPath();
          ctx.arc(px, py + 7, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      // Boardwalk.
      ctx.fillStyle = "#241031";
      ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 3;
      for (let p = 1; p < 5; p++) {
        ctx.beginPath();
        ctx.moveTo(0, h * 0.8 + p * h * 0.04);
        ctx.lineTo(w, h * 0.8 + p * h * 0.04);
        ctx.stroke();
      }
      palm(ctx, w * 0.93, h * 0.86, 1.0, -1, "#0d0620");
    },
  },
  {
    id: "driver",
    name: "The Driver",
    draw(ctx, w, h) {
      sky(ctx, w, h, [
        [0, "#3d0a54"],
        [0.45, "#a11c68"],
        [0.75, "#ff5e62"],
        [1, "#ff9a5a"],
      ]);
      // Sun stripes backdrop (retro sun).
      const cx = w * 0.5,
        cy = h * 0.46,
        cr = w * 0.3;
      const sg = ctx.createLinearGradient(0, cy - cr, 0, cy + cr);
      sg.addColorStop(0, "#ffd23f");
      sg.addColorStop(1, "#ff5e62");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a11c68";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx - cr, cy + cr * (0.12 + i * 0.2), cr * 2, cr * 0.055);
      }
      skyline(ctx, w, h * 0.86, h * 0.3, 53, "#2a0a3d", 0.22, "#ffd76a");
      ctx.fillStyle = "#1c0629";
      ctx.fillRect(0, h * 0.86, w, h * 0.14);
      // Bust silhouette: head, shades, shoulders.
      ctx.fillStyle = "#0d0518";
      ctx.beginPath(); // shoulders / jacket
      ctx.moveTo(cx - w * 0.34, h);
      ctx.quadraticCurveTo(cx - w * 0.33, h * 0.78, cx - w * 0.16, h * 0.72);
      ctx.lineTo(cx + w * 0.16, h * 0.72);
      ctx.quadraticCurveTo(cx + w * 0.33, h * 0.78, cx + w * 0.34, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cx - w * 0.045, h * 0.6, w * 0.09, h * 0.14); // neck
      ctx.beginPath(); // head
      ctx.ellipse(cx, h * 0.47, w * 0.115, h * 0.135, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hair sweep.
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.375, w * 0.12, h * 0.05, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      // Sunglasses with sunset reflection.
      const gw = w * 0.185,
        gh = h * 0.05,
        gx = cx - gw / 2,
        gy = h * 0.45;
      const gg = ctx.createLinearGradient(gx, gy, gx, gy + gh);
      gg.addColorStop(0, "#ffd23f");
      gg.addColorStop(0.55, "#ff5e62");
      gg.addColorStop(1, "#7a1f5c");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + gw, gy);
      ctx.lineTo(gx + gw * 0.94, gy + gh);
      ctx.quadraticCurveTo(cx, gy + gh * 1.18, gx + gw * 0.06, gy + gh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#0d0518";
      ctx.lineWidth = 7;
      ctx.stroke();
      // Chain glint.
      ctx.strokeStyle = "#ffd76a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.05, h * 0.76);
      ctx.quadraticCurveTo(cx, h * 0.83, cx + w * 0.05, h * 0.76);
      ctx.stroke();
      palm(ctx, w * 0.05, h * 0.92, 1.2, 1, "#1c0629");
      palm(ctx, w * 0.97, h * 0.94, 1.4, -1, "#1c0629");
    },
  },
];

export function sceneById(id) {
  for (const scene of SCENES) {
    if (scene.id === id) return scene;
  }
  return null;
}

// Renders a scene onto a fresh square canvas and returns it.
export function makeScene(id, size) {
  const scene = sceneById(id);
  if (!scene) return null;
  const c = document.createElement("canvas");
  c.width = size || 1200;
  c.height = size || 1200;
  scene.draw(c.getContext("2d"), c.width, c.height);
  return c;
}
