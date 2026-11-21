// main.js — ViceCover Studio editor wiring.
//
// The cover canvas is kept at full export resolution at all times, so the
// on-screen preview is pixel-identical to the exported PNG and exporting
// is a single click. All processing is local: photos are read with
// createObjectURL and drawn to canvases; nothing is uploaded anywhere.
// A `?shot=` query sets up a fixed scene for a screenshot instead
// (./shots.js).

import { LAYOUTS, layoutById, pointInPoly, panelBBox, coverFit } from "./layouts.js";
import { GRADES, gradeById } from "./grades.js";
import { SCENES, makeScene } from "./scenes.js";
import { createCoverRenderer } from "./cover.js";
import { runShot } from "./shots.js";

const SIZES = [
  { id: "square", w: 1080, h: 1080, label: "1080 × 1080 · Square post" },
  { id: "portrait", w: 1080, h: 1350, label: "1080 × 1350 · Portrait post" },
  { id: "wide", w: 1920, h: 1080, label: "1920 × 1080 · Wide / video" },
];

const params = new URLSearchParams(location.search);
const shotMode = params.get("shot");

const state = {
  sizeId: params.get("size") || "portrait",
  layoutId: params.get("layout") || "classic",
  gradeId: params.get("grade") || "vice",
  strength: 0.85,
  vignette: true,
  title: params.get("title") || "VICE HEAT",
  subtitle: params.get("subtitle") || "LEONIDA",
  caption: params.get("caption") || "WELCOME BACK TO NEON CITY",
  tag: params.get("tag") || "EST. 2026",
  stripOn: params.get("strip") === "1",
  stripText: "NEXT-GEN EDITION",
  selected: 0,
  // Per-panel placement, reused across layouts by panel index.
  panels: [],
};
for (let i = 0; i < 6; i++) {
  state.panels.push({ src: null, fx: 0.5, fy: 0.5, zoom: 1 });
}

// ---- Sources (sample photos + built-in scenes, then user photos) ------
const sources = [];
let photoSeq = 0;

function addSource(id, name, canvas, kind) {
  const src = { id, name, canvas, kind, version: 0 };
  sources.push(src);
  return src;
}

function sourceById(id) {
  return sources.find((s) => s.id === id) || null;
}

// The kit's two sample photos. Each starts as a painted placeholder
// canvas; the real photo is drawn in when it loads, then the UI refreshes.
const SAMPLES = [
  { id: "sample:pier", name: "Pier", url: "samples/pier.jpg" },
  { id: "sample:boulevard", name: "Boulevard", url: "samples/boulevard.jpg" },
];

function placeholderCanvas(name) {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 720;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, "#3d0a54");
  grad.addColorStop(1, "#ff5e62");
  g.fillStyle = grad;
  g.fillRect(0, 0, 720, 720);
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "900 44px 'Arial Black', Impact, sans-serif";
  g.textAlign = "center";
  g.fillText(name.toUpperCase(), 360, 370);
  return c;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const sampleReady = new Map(); // sample id -> promise of the source
for (const sample of SAMPLES) {
  const src = addSource(sample.id, sample.name, placeholderCanvas(sample.name), "photo");
  sampleReady.set(
    sample.id,
    loadImage(sample.url).then((img) => {
      src.canvas.width = img.naturalWidth;
      src.canvas.height = img.naturalHeight;
      src.canvas.getContext("2d").drawImage(img, 0, 0);
      src.version += 1; // content changed: graded copies are now stale
      refreshTrayItem(src);
      render(false);
      return src;
    }).catch(() => src)
  );
}

for (const scene of SCENES) {
  addSource(`scene:${scene.id}`, scene.name, makeScene(scene.id, 1200), "scene");
}

// Default cover: the pier photo takes the hero panel, the boulevard photo
// the lower-left, and built-in scenes fill the rest — a complete cover
// the moment the page opens.
const defaultPanels = [
  "sample:pier",
  "scene:neon",
  "scene:heli",
  "sample:boulevard",
  "scene:driver",
  "scene:sunset",
];
defaultPanels.forEach((id, idx) => {
  state.panels[idx].src = sourceById(id);
});
state.panels.forEach((p, idx) => {
  if (!p.src) p.src = sources[idx % sources.length];
});

// ---- DOM -----------------------------------------------------------------
const canvas = document.getElementById("cover");
const statusLine = document.getElementById("statusLine");
const renderer = createCoverRenderer();

function el(id) {
  return document.getElementById(id);
}
function sizeById(id) {
  return SIZES.find((s) => s.id === id) || SIZES[1];
}
function layout() {
  return layoutById(state.layoutId);
}
function panelCount() {
  return layout().panels.length;
}
function selPanel() {
  if (state.selected >= panelCount()) state.selected = 0;
  return state.panels[state.selected];
}

function render(forExport) {
  renderer.render(
    canvas,
    { ...state, size: sizeById(state.sizeId) },
    // A cover screenshot is an export: no selection outline, ever, no
    // matter which late-arriving render asks for a preview pass.
    { forExport: !!forExport || shotMode === "cover" }
  );
  statusLine.textContent =
    `${sizeById(state.sizeId).label.split(" · ")[0]} · ${layout().name} · ` +
    `${gradeById(state.gradeId).name} · Panel ${state.selected + 1} of ${panelCount()}`;
  syncPanelControls();
}

// ---- Controls --------------------------------------------------------------
function buildSizes() {
  const group = el("sizeGroup"),
    list = el("sizeList");
  for (const s of SIZES) {
    const b1 = document.createElement("button");
    b1.textContent = s.label.split(" · ")[0];
    b1.dataset.size = s.id;
    b1.onclick = () => setSize(s.id);
    group.appendChild(b1);
    const b2 = document.createElement("button");
    b2.textContent = s.label;
    b2.dataset.size = s.id;
    b2.onclick = () => setSize(s.id);
    list.appendChild(b2);
  }
}
function setSize(id) {
  state.sizeId = id;
  document.querySelectorAll("[data-size]").forEach((b) => {
    b.classList.toggle("active", b.dataset.size === id);
  });
  render(false);
}

function buildLayouts() {
  const grid = el("layoutGrid");
  const cols = ["#ff2e88", "#22d3ee", "#ffd23f", "#7cff5e", "#b26bff", "#ff7e3d"];
  for (const lay of LAYOUTS) {
    const btn = document.createElement("button");
    btn.className = "layout-btn" + (lay.id === state.layoutId ? " active" : "");
    btn.dataset.layout = lay.id;
    const mini = document.createElement("canvas");
    mini.width = 66;
    mini.height = 84;
    const m = mini.getContext("2d");
    m.fillStyle = "#05050f";
    m.fillRect(0, 0, 66, 84);
    lay.panels.forEach((poly, idx) => {
      m.beginPath();
      poly.forEach((pt, i) => {
        if (i === 0) m.moveTo(pt[0] * 66, pt[1] * 84);
        else m.lineTo(pt[0] * 66, pt[1] * 84);
      });
      m.closePath();
      m.fillStyle = cols[idx % cols.length];
      m.fill();
      m.strokeStyle = "#fff";
      m.lineWidth = 1.6;
      m.stroke();
    });
    btn.appendChild(mini);
    const label = document.createElement("span");
    label.textContent = lay.name;
    btn.appendChild(label);
    btn.onclick = () => {
      state.layoutId = lay.id;
      state.selected = 0;
      document.querySelectorAll("[data-layout]").forEach((b) => {
        b.classList.toggle("active", b.dataset.layout === lay.id);
      });
      markTrayActive();
      render(false);
    };
    grid.appendChild(btn);
  }
}

function buildGrades() {
  const row = el("gradeRow");
  for (const g of GRADES) {
    const chip = document.createElement("button");
    chip.className = "chip" + (g.id === state.gradeId ? " active" : "");
    chip.textContent = g.name;
    chip.dataset.grade = g.id;
    chip.onclick = () => {
      state.gradeId = g.id;
      document.querySelectorAll("[data-grade]").forEach((b) => {
        b.classList.toggle("active", b.dataset.grade === g.id);
      });
      render(false);
    };
    row.appendChild(chip);
  }
}

function thumbURL(srcCanvas) {
  const t = document.createElement("canvas");
  t.width = 144;
  t.height = 144;
  const g = t.getContext("2d");
  const fit = coverFit(srcCanvas.width, srcCanvas.height, 144, 144, 0.5, 0.5, 1);
  g.drawImage(srcCanvas, fit.dx, fit.dy, fit.dw, fit.dh);
  return t.toDataURL("image/png");
}

function addTrayItem(src) {
  const tray = el("tray");
  const fig = document.createElement("figure");
  fig.dataset.src = src.id;
  const img = document.createElement("img");
  img.src = thumbURL(src.canvas);
  img.alt = src.name;
  const cap = document.createElement("figcaption");
  cap.textContent = src.name;
  fig.appendChild(img);
  fig.appendChild(cap);
  fig.title = `${src.name} — click to place in the selected panel`;
  fig.onclick = () => {
    selPanel().src = src;
    markTrayActive();
    render(false);
  };
  tray.appendChild(fig);
}

function refreshTrayItem(src) {
  const fig = document.querySelector(`#tray figure[data-src="${CSS.escape(src.id)}"]`);
  if (fig) fig.querySelector("img").src = thumbURL(src.canvas);
}

function markTrayActive() {
  const current = selPanel().src;
  document.querySelectorAll("#tray figure").forEach((f) => {
    f.classList.toggle("active", !!current && f.dataset.src === current.id);
  });
  el("selLabel").textContent = `— panel ${state.selected + 1} of ${panelCount()}`;
}

function syncPanelControls() {
  const p = selPanel();
  el("zoom").value = Math.round(p.zoom * 100);
  el("focusX").value = Math.round(p.fx * 100);
  el("focusY").value = Math.round(p.fy * 100);
  markTrayActive();
}

// ---- Photo intake ------------------------------------------------------------
function addPhotoFile(file) {
  if (!file || file.type.indexOf("image/") !== 0) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const cap = 1400;
    const scale = Math.min(1, cap / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    photoSeq += 1;
    const name = file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 18) || `Photo ${photoSeq}`;
    const src = addSource(`photo:${photoSeq}:${name}`, name, c, "photo");
    addTrayItem(src);
    selPanel().src = src;
    render(false);
  };
  img.src = url;
}

// ---- Pointer interaction -------------------------------------------------------
let drag = null;
function canvasPoint(evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - r.left) / r.width) * canvas.width,
    y: ((evt.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener("pointerdown", (evt) => {
  const pt = canvasPoint(evt);
  const lay = layout();
  for (let i = lay.panels.length - 1; i >= 0; i--) {
    if (pointInPoly(pt.x / canvas.width, pt.y / canvas.height, lay.panels[i])) {
      state.selected = i;
      break;
    }
  }
  drag = { x: pt.x, y: pt.y };
  canvas.setPointerCapture(evt.pointerId);
  render(false);
});
canvas.addEventListener("pointermove", (evt) => {
  if (!drag) return;
  const pt = canvasPoint(evt);
  const dx = pt.x - drag.x,
    dy = pt.y - drag.y;
  drag = { x: pt.x, y: pt.y };
  moveFocus(dx, dy);
});
canvas.addEventListener("pointerup", () => {
  drag = null;
});
canvas.addEventListener(
  "wheel",
  (evt) => {
    evt.preventDefault();
    const p = selPanel();
    p.zoom = Math.min(3, Math.max(1, p.zoom * (evt.deltaY < 0 ? 1.07 : 0.93)));
    render(false);
  },
  { passive: false }
);

function moveFocus(dxPx, dyPx) {
  const p = selPanel();
  const poly = layout().panels[state.selected];
  const bb = panelBBox(poly);
  const bw = bb.w * canvas.width,
    bh = bb.h * canvas.height;
  const img = renderer.gradedSource({ ...state, size: sizeById(state.sizeId) }, p.src);
  if (!img) return;
  const fit = coverFit(img.width, img.height, bw, bh, p.fx, p.fy, p.zoom);
  if (Math.abs(bw - fit.dw) > 1) {
    p.fx = Math.min(1, Math.max(0, p.fx + dxPx / (bw - fit.dw)));
  }
  if (Math.abs(bh - fit.dh) > 1) {
    p.fy = Math.min(1, Math.max(0, p.fy + dyPx / (bh - fit.dh)));
  }
  render(false);
}

// ---- Wiring ----------------------------------------------------------------------
function bindText(id, key, uppercase) {
  const input = el(id);
  input.value = state[key];
  input.addEventListener("input", () => {
    state[key] = uppercase ? input.value.toUpperCase() : input.value;
    render(false);
  });
}

function init() {
  if (params.get("coveronly") === "1") {
    document.body.classList.add("coveronly");
  }
  if (shotMode) {
    document.body.classList.add("shot", `shot-${shotMode}`);
  }
  buildSizes();
  buildLayouts();
  buildGrades();
  sources.forEach(addTrayItem);

  bindText("titleText", "title", true);
  bindText("subtitleText", "subtitle", true);
  bindText("captionText", "caption", true);
  bindText("tagText", "tag", true);
  bindText("stripText", "stripText", true);
  el("stripOn").checked = state.stripOn;
  el("stripOn").addEventListener("change", () => {
    state.stripOn = el("stripOn").checked;
    render(false);
  });
  el("vignette").addEventListener("change", () => {
    state.vignette = el("vignette").checked;
    render(false);
  });
  el("strength").addEventListener("input", () => {
    state.strength = el("strength").value / 100;
    render(false);
  });
  el("zoom").addEventListener("input", () => {
    selPanel().zoom = el("zoom").value / 100;
    render(false);
  });
  el("focusX").addEventListener("input", () => {
    selPanel().fx = el("focusX").value / 100;
    render(false);
  });
  el("focusY").addEventListener("input", () => {
    selPanel().fy = el("focusY").value / 100;
    render(false);
  });
  el("centerBtn").onclick = () => {
    const p = selPanel();
    p.fx = 0.5;
    p.fy = 0.5;
    p.zoom = 1;
    render(false);
  };

  const fileInput = el("fileInput");
  fileInput.addEventListener("change", () => {
    Array.prototype.forEach.call(fileInput.files, addPhotoFile);
    fileInput.value = "";
  });
  const wrap = el("canvasWrap"),
    zone = el("dropzone");
  ["dragover", "dragenter"].forEach((ev) => {
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      wrap.classList.add("dragging");
      zone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      wrap.classList.remove("dragging");
      zone.classList.remove("dragging");
    });
  });
  document.addEventListener("drop", (e) => {
    if (e.dataTransfer) {
      Array.prototype.forEach.call(e.dataTransfer.files, addPhotoFile);
    }
  });
  document.addEventListener("paste", (e) => {
    if (e.clipboardData) {
      Array.prototype.forEach.call(e.clipboardData.files, addPhotoFile);
    }
  });

  function doExport() {
    render(true);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      const size = sizeById(state.sizeId);
      a.href = URL.createObjectURL(blob);
      a.download = `vicecover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        render(false);
      }, 400);
    }, "image/png");
  }
  el("exportBtn").onclick = doExport;
  el("exportTop").onclick = doExport;

  setSize(state.sizeId);
  render(false);
}

init();

// ---- Fixed scenes for screenshots ---------------------------------------------
// The starter's contract (./shots.js): load(sampleUrl, caption) puts the
// named sample photo on the cover and sets the cover's main lettering to
// the caption; ?shot=cover then shows the cover alone, ?shot=editor the
// editor with the photo loaded.
if (shotMode) {
  runShot(shotMode, params, async (sample, text) => {
    const name = sample.replace(/^.*\//, "").replace(/\.jpg$/, "");
    const src =
      (await sampleReady.get(`sample:${name}`)) || sourceById("sample:pier");
    setSize("square");
    state.layoutId = "classic";
    state.selected = 0;
    // The shot photo leads: hero panel and the lower-middle panel, with
    // scenes around it — a full cover built around the one photo.
    const order = [src.id, "scene:neon", "scene:heli", "scene:driver", src.id, "scene:sunset"];
    order.forEach((id, idx) => {
      state.panels[idx].src = sourceById(id);
      state.panels[idx].fx = 0.5;
      state.panels[idx].fy = 0.5;
      state.panels[idx].zoom = 1;
    });
    state.title = text.toUpperCase();
    el("titleText").value = state.title;
    render(shotMode === "cover");
  });
}
