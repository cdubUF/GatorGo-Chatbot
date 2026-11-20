/** Captions use the playback clock; no transcript is stored outside this tab. */
let words = [], position = 0, visible = false;
const box = () => document.querySelector('#stageCaptions');
export function captionStart(text) { words = text.trim().split(/\s+/); position = 0; visible = true; captionAt(0); }
export function captionAt(seconds, duration) {
  if (!visible) return;
  position = Math.min(words.length - 1, Math.floor(duration ? seconds / duration * words.length : seconds * 2.5));
  const start = Math.floor(Math.max(0, position) / 8) * 8;
  const node = box(); node.textContent = words.slice(start, start + 8).join(' ');
  node.hidden = !document.querySelector('#captionsToggle').checked;
}
export function captionStop() { visible = false; box().hidden = true; box().textContent = ''; }
document.querySelector('#captionsToggle').addEventListener('change', () => { box().hidden = !visible || !document.querySelector('#captionsToggle').checked; });
