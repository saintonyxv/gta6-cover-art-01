// ViceCover Studio — procedural backdrop scenes.
//
// Panels do not have to hold a photo: these three scenes are drawn from
// scratch with canvas vector shapes whenever a panel needs art. Each scene
// paints into whatever rectangle it is handed (the renderer has already
// clipped to the panel polygon), and each is fully deterministic — a small
// seeded random generator, never Math.random — so a cover renders the same
// way every time, in the editor and in the screenshots alike.

/** A tiny linear-congruential generator: same seed, same scene, always. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Vertical three-stop sky (or sea, or wall) wash over a rect. */
function wash(ctx, x, y, w, h, stops) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [at, colour] of stops) grad.addColorStop(at, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

/** A low sun disc with a soft halo. */
function sunDisc(ctx, cx, cy, radius, core, halo) {
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.6);
  glow.addColorStop(0, halo);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 2.6, cy - radius * 2.6, radius * 5.2, radius * 5.2);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * One palm tree: a curved trunk built from stacked segments and a crown of
 * drooping fronds. `lean` bends the crown sideways, `scale` is the height.
 */
function palmTree(ctx, baseX, baseY, scale, lean, colour) {
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  const segments = 7;
  let px = baseX;
  let py = baseY;
  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;
    const nx = baseX + lean * scale * t * t;
    const ny = baseY - scale * t;
    ctx.lineWidth = Math.max(1.5, scale * 0.045 * (1 - t * 0.55));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    px = nx;
    py = ny;
  }
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const angle = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
    const reach = scale * (0.42 + (i % 3) * 0.07);
    const tipX = px + Math.cos(angle) * reach;
    const tipY = py - Math.sin(angle) * reach * 0.55 + reach * 0.34;
    ctx.lineWidth = Math.max(1.2, scale * 0.02);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(
      px + Math.cos(angle) * reach * 0.55,
      py - Math.sin(angle) * reach * 0.75,
      tipX,
      tipY,
    );
    ctx.stroke();
  }
}

/** Dusk Palms: a gradient sunset over water, sun low, palms in silhouette. */
function paintPalms(ctx, x, y, w, h) {
  wash(ctx, x, y, w, h, [
    [0, '#2c1a4d'],
    [0.45, '#93335f'],
    [0.72, '#e2603f'],
    [1, '#f7a83e'],
  ]);
  const horizon = y + h * 0.68;
  sunDisc(ctx, x + w * 0.62, horizon - h * 0.06, h * 0.13, '#ffd98a', 'rgba(255, 166, 66, 0.55)');
  // Water: a darker band under the horizon with broken sun glints.
  ctx.fillStyle = 'rgba(38, 16, 66, 0.72)';
  ctx.fillRect(x, horizon, w, y + h - horizon);
  const rand = seededRandom(1103);
  ctx.fillStyle = 'rgba(255, 205, 120, 0.75)';
  for (let i = 0; i < 26; i++) {
    const gy = horizon + rand() * (h * 0.28);
    const gw = w * (0.02 + rand() * 0.1) * (1 - (gy - horizon) / h);
    const gx = x + w * 0.62 + (rand() - 0.5) * w * 0.34 - gw / 2;
    ctx.fillRect(gx, gy, gw, Math.max(1, h * 0.006));
  }
  const ink = '#1c0f30';
  palmTree(ctx, x + w * 0.16, y + h * 1.0, h * 0.52, w * 0.05, ink);
  palmTree(ctx, x + w * 0.88, y + h * 1.0, h * 0.66, -w * 0.06, ink);
  palmTree(ctx, x + w * 0.97, y + h * 1.0, h * 0.4, -w * 0.03, ink);
}

/** Neon Skyline: night towers with lit windows under a violet sky. */
function paintSkyline(ctx, x, y, w, h) {
  wash(ctx, x, y, w, h, [
    [0, '#070b26'],
    [0.6, '#1d1450'],
    [1, '#3d1a5e'],
  ]);
  // Stars first, so the towers cover the low ones.
  const starRand = seededRandom(721);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let i = 0; i < 40; i++) {
    const sx = x + starRand() * w;
    const sy = y + starRand() * h * 0.5;
    ctx.fillRect(sx, sy, Math.max(1, w * 0.0022), Math.max(1, w * 0.0022));
  }
  sunDisc(ctx, x + w * 0.8, y + h * 0.2, h * 0.055, '#f4f1de', 'rgba(210, 215, 255, 0.28)');
  // Back row of towers, then a nearer, darker row with lit windows.
  const rand = seededRandom(4177);
  const rows = [
    { base: 0.86, min: 0.3, max: 0.62, fill: '#241a52', lit: null },
    { base: 1.0, min: 0.42, max: 0.8, fill: '#0d0a26', lit: ['#ffd76a', '#7ae7ff', '#ff8ad4'] },
  ];
  for (const row of rows) {
    let tx = x - w * 0.03;
    while (tx < x + w) {
      const tw = w * (0.07 + rand() * 0.09);
      const th = h * (row.min + rand() * (row.max - row.min));
      const top = y + h * row.base - th;
      ctx.fillStyle = row.fill;
      ctx.fillRect(tx, top, tw, th);
      if (row.lit) {
        const cols = Math.max(1, Math.floor(tw / (w * 0.022)));
        const rowsDown = Math.max(2, Math.floor(th / (h * 0.045)));
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rowsDown; cy++) {
            if (rand() > 0.42) continue;
            ctx.fillStyle = row.lit[Math.floor(rand() * row.lit.length)];
            ctx.fillRect(
              tx + (cx + 0.25) * (tw / cols),
              top + (cy + 0.3) * (th / rowsDown),
              tw / cols * 0.5,
              th / rowsDown * 0.42,
            );
          }
        }
      }
      tx += tw + w * 0.012;
    }
  }
  // Wet-street sheen along the very bottom.
  const sheen = ctx.createLinearGradient(0, y + h * 0.94, 0, y + h);
  sheen.addColorStop(0, 'rgba(122, 231, 255, 0)');
  sheen.addColorStop(1, 'rgba(122, 231, 255, 0.2)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y + h * 0.94, w, h * 0.06);
}

/** Coast Strip: a beach road at noon — sand, sea, and a striped awning band. */
function paintStrip(ctx, x, y, w, h) {
  wash(ctx, x, y, w, h * 0.52, [
    [0, '#7fd4f2'],
    [1, '#cdeffd'],
  ]);
  sunDisc(ctx, x + w * 0.18, y + h * 0.16, h * 0.07, '#fff6c8', 'rgba(255, 240, 170, 0.5)');
  // Sea band with a foam edge, then sand.
  ctx.fillStyle = '#2aa7b8';
  ctx.fillRect(x, y + h * 0.4, w, h * 0.16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(x, y + h * 0.545, w, h * 0.014);
  wash(ctx, x, y + h * 0.56, w, h * 0.44, [
    [0, '#f2d492'],
    [1, '#e3b96a'],
  ]);
  // The road: a dark diagonal-free band across the sand with a dashed line.
  ctx.fillStyle = '#3c3f45';
  ctx.fillRect(x, y + h * 0.78, w, h * 0.15);
  ctx.fillStyle = '#ffd94d';
  const dash = w * 0.09;
  for (let dx = x + w * 0.02; dx < x + w; dx += dash * 1.9) {
    ctx.fillRect(dx, y + h * 0.848, dash, h * 0.012);
  }
  // Awning stripes along the top of the sand, like beachfront stalls.
  const stripes = 9;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff5d73' : '#ffffff';
    ctx.fillRect(x + (i * w) / stripes, y + h * 0.56, w / stripes, h * 0.045);
  }
  palmTree(ctx, x + w * 0.93, y + h * 0.8, h * 0.34, -w * 0.04, '#274d2a');
}

/** The scene catalogue, in tray order. */
export const SCENES = [
  { id: 'scene-palms', name: 'Dusk Palms', paint: paintPalms },
  { id: 'scene-skyline', name: 'Neon Skyline', paint: paintSkyline },
  { id: 'scene-strip', name: 'Coast Strip', paint: paintStrip },
];

/** Look a scene up by its source id. */
export function sceneById(id) {
  return SCENES.find((scene) => scene.id === id) ?? null;
}
