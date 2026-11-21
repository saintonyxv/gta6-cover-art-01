// ViceCover Studio — the editor.
//
// This module owns the page: it holds the cover state (layout, per-panel
// placements, grade, lettering, export size), keeps the photo tray, wires
// every control in index.html, and repaints the canvas through render.js
// whenever anything changes. The canvas always carries the full export
// resolution; CSS scales it down for display, and pointer maths converts
// display pixels back to cover units.

import { LAYOUTS, layoutById, heroIndex, panelBounds, pointInPanel } from './layouts.js';
import { GRADES, gradeById } from './grades.js';
import { SCENES } from './scenes.js';
import { renderCover } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const trayEl = document.getElementById('tray');

const EXPORT_SIZES = [
  { id: 'square', name: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: '1920 × 1080', w: 1920, h: 1080 },
];

const SAMPLES = [
  { id: 'sample-pier', name: 'Pier (sample)', url: 'samples/pier.jpg' },
  { id: 'sample-boulevard', name: 'Boulevard (sample)', url: 'samples/boulevard.jpg' },
];

/** Every image the tray can place, by id; scenes need no entry here. */
const sources = new Map();
/** Tray entries in display order: {id, name, thumb} — thumb is an element. */
const trayItems = [];

let sizeId = 'portrait';
let selectedPanel = 0;

const cover = {
  layout: layoutById('collage'),
  panels: [],
  gradeId: 'sunset',
  gradeStrength: 0.85,
  vignette: true,
  title: 'VICE COVER',
  subtitle: 'Tales from the Coast',
  caption: 'One city. Every story.',
  badge: 'NEW',
  stripOn: true,
  stripText: 'VICE CITY EDITION',
};

/** A placement with neutral framing and the cover's current grade. */
function freshPlacement(sourceId) {
  return {
    sourceId,
    fx: 0.5,
    fy: 0.5,
    zoom: 1,
    gradeId: cover.gradeId,
    gradeStrength: cover.gradeStrength,
    grade: gradeById(cover.gradeId),
  };
}

/** Reset all panel placements for the current layout from a source plan. */
function planPanels(plan) {
  cover.panels = cover.layout.panels.map((panel, i) => freshPlacement(plan(i)));
  selectedPanel = heroIndex(cover.layout);
}

/** The composition the editor (and a fresh page) opens with. */
function defaultComposition() {
  cover.layout = layoutById('collage');
  planPanels((i) => ['sample-pier', 'scene-skyline', 'scene-palms', 'sample-boulevard', 'scene-strip'][i] ?? 'scene-palms');
}

/** Repaint the canvas from state, marking the selected panel in the editor. */
function redraw(markSelection = true) {
  renderCover(canvas, cover, sources, markSelection ? selectedPanel : -1);
  syncPanelControls();
}

/** Loads an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// ---------------------------------------------------------------- tray ----

function addTrayItem(id, name, thumb) {
  trayItems.push({ id, name, thumb });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tray-item';
  button.dataset.sourceId = id;
  button.append(thumb);
  const label = document.createElement('span');
  label.textContent = name;
  button.append(label);
  button.addEventListener('click', () => placeInSelectedPanel(id));
  trayEl.append(button);
}

function refreshTrayActive() {
  const current = cover.panels[selectedPanel]?.sourceId;
  for (const el of trayEl.children) {
    el.classList.toggle('active', el.dataset.sourceId === current);
  }
}

/** A small painted thumbnail for a procedural scene. */
function sceneThumb(scene) {
  const thumb = document.createElement('canvas');
  thumb.width = 108;
  thumb.height = 108;
  scene.paint(thumb.getContext('2d'), 0, 0, 108, 108);
  return thumb;
}

function photoThumb(img) {
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = '';
  return thumb;
}

async function addSample(sample) {
  const img = await loadImage(sample.url);
  sources.set(sample.id, img);
  addTrayItem(sample.id, sample.name, photoThumb(img));
}

let userPhotoCount = 0;

/** Bring one user file into the tray and drop it into the selected panel. */
async function addUserFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    userPhotoCount += 1;
    const id = `user-${userPhotoCount}`;
    sources.set(id, img);
    addTrayItem(id, file.name || `Photo ${userPhotoCount}`, photoThumb(img));
    placeInSelectedPanel(id);
    status.textContent = `Added ${file.name || 'photo'} to panel ${selectedPanel + 1}.`;
  } catch {
    status.textContent = 'That file could not be read as an image.';
  }
}

// ------------------------------------------------------------- editing ----

function placeInSelectedPanel(sourceId) {
  const placement = freshPlacement(sourceId);
  placement.gradeId = cover.gradeId;
  placement.gradeStrength = cover.gradeStrength;
  placement.grade = gradeById(cover.gradeId);
  cover.panels[selectedPanel] = placement;
  refreshTrayActive();
  redraw();
}

function selectPanel(index) {
  selectedPanel = index;
  refreshTrayActive();
  redraw();
}

const focusX = document.getElementById('focus-x');
const focusY = document.getElementById('focus-y');
const zoomInput = document.getElementById('zoom');
const panelName = document.getElementById('panel-name');

/** Push the selected panel's framing into the sliders (without re-rendering). */
function syncPanelControls() {
  const placement = cover.panels[selectedPanel];
  if (!placement) return;
  panelName.textContent = `Panel ${selectedPanel + 1} of ${cover.layout.panels.length}`;
  focusX.value = String(Math.round(placement.fx * 100));
  focusY.value = String(Math.round(placement.fy * 100));
  zoomInput.value = String(Math.round(placement.zoom * 100));
  refreshTrayActive();
}

function bindFraming(input, apply) {
  input.addEventListener('input', () => {
    const placement = cover.panels[selectedPanel];
    if (!placement) return;
    apply(placement, Number(input.value) / 100);
    redraw(false);
  });
  input.addEventListener('change', () => redraw());
}

bindFraming(focusX, (p, v) => { p.fx = v; });
bindFraming(focusY, (p, v) => { p.fy = v; });
bindFraming(zoomInput, (p, v) => { p.zoom = Math.max(1, v); });

document.getElementById('recenter').addEventListener('click', () => {
  const placement = cover.panels[selectedPanel];
  if (!placement) return;
  placement.fx = 0.5;
  placement.fy = 0.5;
  placement.zoom = 1;
  redraw();
});

// Pointer work on the canvas: click picks a panel, drag reframes its photo,
// the wheel zooms it. Display pixels are converted through the canvas rect.
let drag = null;

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = cover.layout.panels.findIndex((panel) => pointInPanel(panel, point.x, point.y));
  if (hit !== -1 && hit !== selectedPanel) selectPanel(hit);
  drag = { x: point.x, y: point.y };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const placement = cover.panels[selectedPanel];
  if (!placement) return;
  const box = panelBounds(cover.layout.panels[selectedPanel]);
  placement.fx = Math.min(1, Math.max(0, placement.fx - (point.x - drag.x) / box.w));
  placement.fy = Math.min(1, Math.max(0, placement.fy - (point.y - drag.y) / box.h));
  drag = point;
  redraw(false);
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  redraw();
});

canvas.addEventListener('wheel', (event) => {
  const placement = cover.panels[selectedPanel];
  if (!placement) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.06 : 1 / 1.06;
  placement.zoom = Math.min(4, Math.max(1, placement.zoom * factor));
  redraw(false);
}, { passive: false });

// Photo intake: picker, drag-and-drop, paste.
document.getElementById('photo').addEventListener('change', async (event) => {
  for (const file of event.target.files) await addUserFile(file);
  event.target.value = '';
});

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', async (event) => {
  event.preventDefault();
  for (const file of event.dataTransfer.files) await addUserFile(file);
});

window.addEventListener('paste', async (event) => {
  for (const item of event.clipboardData?.items ?? []) {
    if (item.type.startsWith('image/')) await addUserFile(item.getAsFile());
  }
});

// -------------------------------------------------------------- pickers ----

function chipRow(el, options, currentId, onPick) {
  for (const option of options) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (option.id === currentId ? ' active' : '');
    chip.textContent = option.name;
    chip.addEventListener('click', () => {
      for (const sibling of el.children) sibling.classList.remove('active');
      chip.classList.add('active');
      onPick(option);
    });
    el.append(chip);
  }
}

chipRow(document.getElementById('layouts'), LAYOUTS, cover.layout.id, (option) => {
  const keep = cover.panels.map((p) => p.sourceId);
  cover.layout = option;
  planPanels((i) => keep[i] ?? (i === heroIndex(option) ? 'sample-pier' : 'scene-palms'));
  redraw();
});

chipRow(document.getElementById('grades'), GRADES, cover.gradeId, (option) => {
  cover.gradeId = option.id;
  for (const placement of cover.panels) {
    placement.gradeId = option.id;
    placement.gradeStrength = cover.gradeStrength;
    placement.grade = gradeById(option.id);
  }
  redraw();
});

chipRow(document.getElementById('sizes'), EXPORT_SIZES, sizeId, (option) => {
  sizeId = option.id;
  canvas.width = option.w;
  canvas.height = option.h;
  redraw();
});

document.getElementById('grade-strength').addEventListener('input', (event) => {
  cover.gradeStrength = Number(event.target.value) / 100;
  for (const placement of cover.panels) placement.gradeStrength = cover.gradeStrength;
  redraw(false);
});
document.getElementById('grade-strength').addEventListener('change', () => redraw());

document.getElementById('vignette').addEventListener('change', (event) => {
  cover.vignette = event.target.checked;
  redraw();
});

// ------------------------------------------------------------ lettering ----

function bindText(id, apply) {
  document.getElementById(id).addEventListener('input', (event) => {
    apply(event.target.value);
    redraw(false);
  });
  document.getElementById(id).addEventListener('change', () => redraw());
}

bindText('title', (v) => { cover.title = v; });
bindText('subtitle', (v) => { cover.subtitle = v; });
bindText('caption', (v) => { cover.caption = v; });
bindText('badge', (v) => { cover.badge = v; });
bindText('strip-text', (v) => { cover.stripText = v; });
document.getElementById('strip-on').addEventListener('change', (event) => {
  cover.stripOn = event.target.checked;
  redraw();
});

// --------------------------------------------------------------- export ----

document.getElementById('export').addEventListener('click', () => {
  renderCover(canvas, cover, sources, -1);
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vicecover-${canvas.width}x${canvas.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    status.textContent = `Saved vicecover-${canvas.width}x${canvas.height}.png`;
    redraw();
  }, 'image/png');
});

// ---------------------------------------------------------------- shots ----

/**
 * The stage shots.js drives: load the named sample, make it the hero of the
 * classic collage (editor shot) or of a full-bleed cover (cover shot), set
 * the caption as the title, and render without the selection marker.
 */
async function stageShot(photoName, caption, shot) {
  const sample = SAMPLES.find((s) => s.id === `sample-${photoName}`) ?? SAMPLES[0];
  // Load every kit sample, not just the staged one: the editor composition
  // below places the other sample in a lower panel.
  for (const s of SAMPLES) {
    if (!sources.has(s.id)) sources.set(s.id, await loadImage(s.url));
  }
  cover.title = caption;
  cover.subtitle = 'Tales from the Coast';
  cover.caption = caption;
  if (shot === 'cover') {
    cover.layout = layoutById('full-bleed');
    canvas.width = 1080;
    canvas.height = 1080;
    planPanels(() => sample.id);
  } else {
    cover.layout = layoutById('collage');
    canvas.width = 1080;
    canvas.height = 1350;
    planPanels((i) => [sample.id, 'scene-skyline', 'scene-palms', 'sample-pier', 'scene-strip'][i] ?? 'scene-palms');
    document.getElementById('title').value = caption;
    document.getElementById('caption').value = caption;
  }
  renderCover(canvas, cover, sources, -1);
}

// ----------------------------------------------------------------- boot ----

async function boot() {
  for (const scene of SCENES) addTrayItem(scene.id, scene.name, sceneThumb(scene));
  for (const sample of SAMPLES) await addSample(sample);
  defaultComposition();
  redraw();
}

const shotKind = new URLSearchParams(location.search).get('shot');
if (shotKind) {
  runShot(shotKind, new URLSearchParams(location.search), stageShot);
} else {
  boot();
}
