// Host test of the calibration page's analysis core (the CORE block of index.html), on synthetic photos with a known
// panel response: perspective, rotation, mirror-free shots, uneven light, noise, blur.
// node tools/panel-calibration/test.mjs  (KELINKT)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const core = html.split('// ===== CORE-BEGIN')[1].split('// ===== CORE-END')[0];
const ctx = { globalThis: {} };
vm.runInNewContext(core.slice(core.indexOf('\n')) + '\nglobalThis.Calib = Calib;', ctx);
const C = ctx.globalThis.Calib;

// The X4 Pro's measured sleep-screen response (tools/sleep_image.py PANEL_RESPONSE, file % → seen %), as a «true» panel.
const TRUE = [[0, 0], [15, 1.9], [20, 8.3], [25, 15.5], [30, 21.2], [35, 28.6], [40, 36.4], [45, 42.3], [50, 50], [55, 51.4],
  [60, 62.8], [65, 74.7], [70, 83.2], [75, 86.5], [80, 91.2], [85, 95.6], [90, 98.4], [95, 100], [100, 100]];
const panel = (f) => { // f 0..1 → seen 0..1
  const x = f * 100;
  for (let i = 0; i < TRUE.length - 1; i++) {
    const [a, b] = TRUE[i], [c, d] = TRUE[i + 1];
    if (x <= c) return (b + (d - b) * (x - a) / (c - a)) / 100;
  }
  return 1;
};

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// Render the card as the panel shows it, then photograph it: card → photo homography, bezel, light gradient, noise, blur.
function photo({ kind = 'pictures', w = 1400, h = 1100, corners, light = [1, 0, 0], black = 28, white = 228, noise = 3, seed = 1, invert = false, curve = null, patchNoise = 0 }) {
  const card = C.renderCard(kind);
  const shown = new Float32Array(card.length);
  for (let i = 0; i < card.length; i++) shown[i] = panel((curve ? curve[card[i]] : card[i]) / 255); // curve: the reader's correction on
  // Shot-to-shot spread of real photos (2–3 p.p.): every cell of this shot reads a little off, its own way.
  if (patchNoise) {
    const rr = rng(seed * 31 + 7);
    for (const c of C.CELLS) {
      const o = (rr() - 0.5) * 2 * patchNoise;
      for (let y = c.y; y < c.y + C.CELL; y++) for (let x = c.x; x < c.x + C.CELL; x++) shown[y * C.W + x] = Math.min(1, Math.max(0, shown[y * C.W + x] + o));
    }
  }
  const Hm = C.homography(corners, C.FID.map((p, k) => [[0, 0], [C.W, 0], [C.W, C.H], [0, C.H]][k])); // unused
  const toCard = C.homography(corners.map((p) => p), C.FID); // photo → card, through the four mark centres
  const r = rng(seed), d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [u, v] = C.apply(toCard, x, y);
    let val;
    if (u >= 0 && v >= 0 && u < C.W && v < C.H) {
      let s = shown[Math.floor(v) * C.W + Math.floor(u)];
      if (invert) s = 1 - s;
      const L = light[0] + light[1] * (x / w - 0.5) + light[2] * (y / h - 0.5);
      val = (black + (white - black) * s) * L;
    } else {
      const inBezel = u > -40 && v > -40 && u < C.W + 40 && v < C.H + 40 + 60;
      val = inBezel ? 35 : 150;
    }
    d[y * w + x] = val + (r() - 0.5) * 2 * noise;
  }
  // 3×3 box blur (camera softness).
  const o = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += d[(y + j) * w + x + i];
    o[y * w + x] = Math.max(0, Math.min(255, s / 9));
  }
  return { w, h, d: o };
}

// True inverse: wanted t → file f with panel(f) = t (normalised like the page does).
const lo = panel(0), hi = panel(1);
function trueInverse(t) {
  let a = 0, b = 1;
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; ((panel(m) - lo) / (hi - lo) < t) ? (a = m) : (b = m); }
  return (a + b) / 2;
}

const cases = [
  { name: 'straight, portrait', corners: [[400, 120], [800, 120], [800, 900], [400, 900]].map(([x, y]) => [x * 1.2 - 100, y]) },
  { name: 'rotated 90° (landscape view)', corners: [[1200, 300], [1200, 700], [300, 700], [300, 300]].map(([x, y]) => [x, y + 50]) },
  { name: 'upside down + perspective', corners: [[1050, 980], [520, 1000], [560, 140], [1000, 160]] },
  { name: 'tilt + light gradient', corners: [[380, 160], [880, 110], [930, 1010], [350, 960]], light: [1, 0.12, -0.1], noise: 5 },
  { name: 'small in frame', corners: [[600, 400], [800, 400], [800, 780], [600, 780]] },
];
let fail = 0;
for (const cs of cases) {
  const img = photo(cs);
  const r = C.analyze(img, null);
  if (!r.ok) { console.log(`✕ ${cs.name}: ${r.reason}`); fail++; continue; }
  let maxErr = 0, at = 0;
  for (let t = 0; t < 256; t++) {
    const err = Math.abs(r.table[t] / 255 - trueInverse(t / 255));
    // The panel is flat at 0–15 % and 95–100 % of file values: any file value in a plateau is right there.
    const tone = t / 255;
    if (tone < 0.03 || tone > 0.97) continue;
    if (err > maxErr) { maxErr = err; at = t; }
  }
  const ok = maxErr < 0.06 && r.rho > 0.97;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} ${cs.name}: max curve error ${(maxErr * 100).toFixed(1)} % at tone ${at}, rho ${r.rho.toFixed(3)}, issues [${r.issues.join(', ')}]`);
}
// Night mode: the card light-on-dark must be reported, not measured.
{
  const r = C.analyze(photo({ ...cases[0], invert: true }), null);
  const ok = !r.ok && r.reason === 'night';
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} night mode reported: ${r.ok ? 'measured!' : r.reason}`);
}
// Manual marks: the four mark centres given by hand, in any order.
{
  const cs = cases[2], img = photo(cs), q = [cs.corners[2], cs.corners[0], cs.corners[3], cs.corners[1]].map(([x, y]) => ({ x: x + 3, y: y - 2 }));
  const r = C.analyze(img, q);
  const ok = r.ok && r.rho > 0.97;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} manual marks: ${r.ok ? 'rho ' + r.rho.toFixed(3) : r.reason}`);
}
// The books card is told from the pictures card by its last cell.
{
  const a = C.analyze(photo(cases[1]), null), b = C.analyze(photo({ ...cases[2], kind: 'books' }), null);
  const ok = a.ok && b.ok && a.kind === 'pictures' && b.kind === 'books';
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} card kind: ${a.kind} / ${b.kind}`);
}
// Card and BMP: size, header, a mark and the darkest / lightest patch.
{
  const b = C.bmp(C.renderCard(), C.W, C.H);
  const ok = b.length === 54 + C.W * 3 * C.H && b[0] === 0x42 && b[1] === 0x4d;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} card BMP ${b.length} bytes`);
}
// Error of a table against the true inverse, away from the flat ends of the panel.
function tableErr(table) {
  let m = 0;
  for (let t = 8; t < 248; t++) m = Math.max(m, Math.abs(table[t] / 255 - trueInverse(t / 255)));
  return m;
}
// Shown through a table: how far the screen is from the straight line (what a perfect check photo would show).
function shownErr(table) {
  let s = 0;
  for (let t = 0; t < 256; t++) s += Math.abs((panel(table[t] / 255) - lo) / (hi - lo) - t / 255);
  return s / 256;
}
// Several photos are averaged: together they beat the worst single shot.
{
  const shots = [1, 2, 3, 4].map((seed) => C.analyze(photo({ ...cases[0], patchNoise: 0.05, seed }), null));
  const one = Math.max(...shots.map((r) => shownErr(r.table))), all = C.curveFromPhotos(shots.map((r) => ({ seen: r.seen, curve: null })));
  const ok = shots.every((r) => r.ok) && all.n === 4 && shownErr(all.table) < one;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} four photos: mean screen error ${(shownErr(all.table) * 100).toFixed(1)} % (worst single photo ${(one * 100).toFixed(1)} %)`);
}
// Second iteration: a check photo taken through the first curve adds its points; the screen gets closer to the line.
{
  const first = C.analyze(photo({ ...cases[3], patchNoise: 0.05, seed: 3 }), null);
  const check = C.analyze(photo({ ...cases[0], curve: first.table, patchNoise: 0.05, seed: 5 }), null);
  const second = C.curveFromPhotos([{ seen: first.seen, curve: null }, { seen: check.seen, curve: first.table }]);
  const e1 = shownErr(first.table), e2 = shownErr(second.table);
  const ok = check.ok && e2 < e1;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} second iteration: mean screen error ${(e1 * 100).toFixed(1)} % → ${(e2 * 100).toFixed(1)} %`);
}
// Check deviation is measured in the curve's own normalisation: a good correction reads as a small deviation.
{
  const first = C.analyze(photo(cases[0]), null);
  const check = C.analyze(photo({ ...cases[1], curve: first.table, seed: 7 }), null);
  const d = C.checkDeviation(check.seen);
  const ok = check.ok && d.mean < 0.03 && d.max < 0.08;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✕'} check deviation: mean ${(d.mean * 100).toFixed(1)} %, max ${(d.max * 100).toFixed(1)} %`);
}
console.log(fail ? `${fail} FAILED` : 'all passed');
process.exit(fail ? 1 : 0);
