// ViceCover Studio — fixed scenes for the kit's screenshots.
//
// A `?shot=` query turns the editor into a still life: `cover` shows the
// finished cover on its own (the page CSS hides the controls under the
// `shot-cover` body class) and `editor` shows the full editor with a sample
// photo placed. `photo` names the kit sample (samples/<photo>.jpg) and
// `caption` supplies the cover's title. Once the scene has painted,
// window.__shotReady flips true so the capture script knows it can shoot.

/**
 * Set up a shot scene. `stage` is the editor's shot API: it loads a sample
 * photo into the tray, builds the fixed composition around it, renders, and
 * resolves once the words and panels are on the canvas.
 */
export async function runShot(shot, query, stage) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  await stage(photo, caption, shot);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
