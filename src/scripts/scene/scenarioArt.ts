// Drawings for the scenario holograms over a planet's city: a little app window
// showing what the scenario looks like in the kit (a tracker table, a mind map,
// a timeline, a floor plan…). Pure canvas 2D, no images or text that needs
// translating: rows of text are drawn as bars.
import { rng } from './common';

type C = CanvasRenderingContext2D;
const W = 640;
const H = 400;
const INK = '#e9ecff';
const DIM = 'rgba(233,236,255,0.32)';
const FAINT = 'rgba(233,236,255,0.12)';
const GREEN = '#5fe3a1';
const RED = '#ff6b7a';
const AMBER = '#ffc35c';
const CYAN = '#7fe3ff';
const MONO = '600 13px ui-monospace, "SF Mono", Menlo, monospace';

function rr(c: C, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
const fill = (c: C, col: string, x: number, y: number, w: number, h: number, r = 3) => {
  c.fillStyle = col;
  rr(c, x, y, w, h, r);
  c.fill();
};
const stroke = (c: C, col: string, x: number, y: number, w: number, h: number, r = 3, lw = 1.5) => {
  c.strokeStyle = col;
  c.lineWidth = lw;
  rr(c, x, y, w, h, r);
  c.stroke();
};
const line = (c: C, col: string, lw: number, pts: number[]) => {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.stroke();
};
const dot = (c: C, col: string, x: number, y: number, r: number) => {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};
const text = (c: C, col: string, s: string, x: number, y: number, font = MONO, align: CanvasTextAlign = 'left') => {
  c.fillStyle = col;
  c.font = font;
  c.textAlign = align;
  c.fillText(s, x, y);
};
/** A row of "words": bars with gaps, in one colour. */
function words(c: C, col: string, x: number, y: number, w: number, r: () => number, h = 6) {
  let cx = x;
  while (cx < x + w - 12) {
    const ww = Math.min(x + w - cx, 14 + r() * 46);
    fill(c, col, cx, y, ww, h, h / 2);
    cx += ww + 6;
  }
}
function paragraph(c: C, x: number, y: number, w: number, lines: number, r: () => number, col = DIM, gap = 14) {
  for (let i = 0; i < lines; i++) words(c, col, x, y + i * gap, i === lines - 1 ? w * (0.4 + r() * 0.4) : w, r);
}
function arrow(c: C, col: string, x1: number, y1: number, x2: number, y2: number, lw = 2) {
  line(c, col, lw, [x1, y1, x2, y2]);
  const a = Math.atan2(y2 - y1, x2 - x1);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x2, y2);
  c.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4));
  c.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4));
  c.fill();
}
/** A spreadsheet or table: header row, column lines, row stripes. Returns the column x positions. */
function grid(c: C, x: number, y: number, cols: number[], rows: number, rowH: number, K: string, letters = false) {
  const w = cols.reduce((a, b) => a + b, 0);
  fill(c, 'rgba(255,255,255,0.05)', x, y, w, rowH * (rows + 1), 4);
  fill(c, `${K}33`, x, y, w, rowH, 4);
  const xs: number[] = [];
  let cx = x;
  for (const cw of cols) {
    xs.push(cx);
    cx += cw;
    line(c, FAINT, 1, [cx, y, cx, y + rowH * (rows + 1)]);
  }
  for (let i = 1; i <= rows; i++) line(c, FAINT, 1, [x, y + rowH * i, x + w, y + rowH * i]);
  if (letters) cols.forEach((_, i) => text(c, DIM, String.fromCharCode(65 + i), xs[i] + cols[i] / 2, y + rowH - 8, MONO, 'center'));
  return xs;
}

const ART: Record<string, (c: C, K: string, r: () => number) => void> = {
  // ── note ─────────────────────────────────────────────────────────
  'page-wiki'(c, K, r) {
    fill(c, 'rgba(255,255,255,0.04)', 16, 46, 130, 338, 6);
    for (let i = 0; i < 9; i++) {
      dot(c, i === 2 ? K : DIM, 30, 70 + i * 32, 3);
      fill(c, i === 2 ? INK : DIM, 40, 66 + i * 32, 50 + r() * 50, 7, 3);
    }
    fill(c, INK, 166, 60, 260, 16, 4);
    for (let i = 0; i < 10; i++) {
      const y = 100 + i * 20;
      words(c, DIM, 166, y, 290, r);
      if (i % 3 === 1) {
        fill(c, K, 166 + 60 + r() * 120, y - 1, 64, 8, 4);
        line(c, K, 1.5, [166 + 70, y + 11, 166 + 140, y + 11]);
      }
    }
    // backlinks graph
    const nodes = Array.from({ length: 7 }, (_, i) => [540 + Math.cos(i * 0.9) * (30 + r() * 40), 200 + Math.sin(i * 0.9) * (60 + r() * 40)]);
    nodes.forEach(([x, y]) => line(c, `${K}88`, 1.5, [540, 200, x, y]));
    nodes.forEach(([x, y]) => dot(c, INK, x, y, 4));
    dot(c, K, 540, 200, 9);
  },
  'page-diagram'(c, K, r) {
    fill(c, INK, 40, 58, 230, 16, 4);
    paragraph(c, 40, 92, 560, 3, r);
    const boxes = [
      [60, 160],
      [250, 160],
      [440, 130],
      [440, 200],
    ];
    boxes.forEach(([x, y], i) => {
      stroke(c, i === 1 ? K : INK, x, y, 130, 40, 8, 2);
      fill(c, i === 1 ? K : DIM, x + 20, y + 16, 90, 8, 4);
    });
    arrow(c, INK, 190, 180, 248, 180);
    arrow(c, INK, 380, 175, 438, 152);
    arrow(c, INK, 380, 185, 438, 218);
    text(c, K, 'E = Σ wᵢ·xᵢ²', 320, 300, 'italic 600 30px "Times New Roman", serif', 'center');
    paragraph(c, 40, 336, 560, 2, r);
  },
  'page-review'(c, K, r) {
    fill(c, INK, 40, 58, 200, 16, 4);
    for (let i = 0; i < 12; i++) {
      const y = 96 + i * 22;
      words(c, DIM, 40, y, 400, r);
      if (i === 2 || i === 7) fill(c, `${GREEN}55`, 36, y - 5, 380, 16, 3);
      if (i === 4) {
        fill(c, `${RED}44`, 36, y - 5, 300, 16, 3);
        line(c, RED, 2, [40, y + 3, 330, y + 3]);
      }
      if (i === 9) {
        stroke(c, INK, 44, y - 4, 12, 12, 3);
        line(c, GREEN, 2.5, [46, y + 2, 50, y + 6, 56, y - 2]);
      }
    }
    // comment and accept / reject
    fill(c, 'rgba(255,255,255,0.08)', 466, 90, 150, 110, 10);
    dot(c, K, 486, 112, 9);
    paragraph(c, 480, 134, 120, 3, r, DIM, 13);
    fill(c, GREEN, 476, 216, 64, 24, 12);
    stroke(c, RED, 548, 216, 64, 24, 12, 2);
  },
  // ── table ────────────────────────────────────────────────────────
  'grid-tracker'(c, K, r) {
    const xs = grid(c, 20, 52, [200, 70, 150, 110, 70], 8, 36, K);
    for (let i = 0; i < 8; i++) {
      const y = 52 + 36 * (i + 1);
      fill(c, INK, xs[0] + 12, y + 14, 70 + r() * 100, 8, 4);
      dot(c, [K, CYAN, AMBER, GREEN][i % 4], xs[1] + 35, y + 18, 10);
      const p = r();
      fill(c, FAINT, xs[2] + 12, y + 13, 126, 10, 5);
      fill(c, p > 0.8 ? GREEN : K, xs[2] + 12, y + 13, 126 * p, 10, 5);
      const st = [GREEN, AMBER, CYAN, RED][Math.floor(r() * 4)];
      fill(c, `${st}44`, xs[3] + 12, y + 8, 84, 20, 10);
      fill(c, st, xs[3] + 22, y + 15, 50, 6, 3);
      fill(c, DIM, xs[4] + 12, y + 14, 44, 8, 4);
    }
  },
  'grid-crm'(c, K, r) {
    const stages = [CYAN, K, AMBER, GREEN];
    // pipeline header
    stages.forEach((s, i) => {
      fill(c, `${s}33`, 20 + i * 152, 50, 144, 34, 8);
      fill(c, s, 34 + i * 152, 63, 60, 8, 4);
      text(c, INK, String(3 + Math.floor(r() * 9)), 148 + i * 152, 72, MONO, 'right');
    });
    const xs = grid(c, 20, 100, [180, 120, 120, 90, 90], 7, 38, K);
    for (let i = 0; i < 7; i++) {
      const y = 100 + 38 * (i + 1);
      fill(c, INK, xs[0] + 12, y + 15, 60 + r() * 90, 8, 4);
      const s = stages[Math.floor(r() * 4)];
      fill(c, `${s}44`, xs[1] + 10, y + 9, 96, 20, 10);
      text(c, INK, `$${Math.floor(2 + r() * 48)}k`, xs[2] + 14, y + 24);
      dot(c, [GREEN, AMBER, RED][Math.floor(r() * 3)], xs[3] + 45, y + 19, 7);
      fill(c, DIM, xs[4] + 12, y + 15, 56, 8, 4);
    }
  },
  'grid-receipts'(c, K, r) {
    const xs = grid(c, 20, 52, [110, 150, 110, 110, 120], 4, 78, K);
    for (let i = 0; i < 4; i++) {
      const y = 52 + 78 * (i + 1);
      // the receipt image
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.moveTo(xs[0] + 30, y + 8);
      c.lineTo(xs[0] + 80, y + 8);
      for (let k = 0; k <= 6; k++) c.lineTo(xs[0] + 80 - k * (50 / 6), y + 70 - (k % 2) * 5);
      c.fill();
      for (let k = 0; k < 5; k++) fill(c, 'rgba(20,20,40,0.45)', xs[0] + 36, y + 16 + k * 9, 20 + r() * 18, 4, 2);
      fill(c, INK, xs[1] + 12, y + 26, 70 + r() * 50, 8, 4);
      fill(c, DIM, xs[1] + 12, y + 44, 90, 7, 3);
      fill(c, `${K}44`, xs[2] + 10, y + 26, 86, 22, 11);
      text(c, INK, `${(4 + r() * 180).toFixed(2)}`, xs[3] + 96, y + 44, MONO, 'right');
      // AI field sparkle
      text(c, K, '✦', xs[4] + 16, y + 44, '700 18px sans-serif');
      fill(c, DIM, xs[4] + 38, y + 34, 60, 7, 3);
    }
  },
  // ── board ────────────────────────────────────────────────────────
  'canvas-mindmap'(c, K) {
    dotsBg(c);
    const cx = 320;
    const cy = 220;
    const branches = 6;
    for (let i = 0; i < branches; i++) {
      const a = (i / branches) * Math.PI * 2 + 0.3;
      const x = cx + Math.cos(a) * 180;
      const y = cy + Math.sin(a) * 120;
      c.strokeStyle = [K, CYAN, AMBER, GREEN, RED, INK][i];
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx, cy);
      c.quadraticCurveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 20, x, y);
      c.stroke();
      fill(c, 'rgba(255,255,255,0.1)', x - 50, y - 16, 100, 32, 16);
      fill(c, INK, x - 32, y - 4, 64, 8, 4);
      for (let k = 0; k < 2; k++) {
        const bx = x + Math.cos(a) * 60 + (k ? 0 : 0);
        const by = y + (k ? 26 : -26);
        line(c, `${INK}55`, 1.5, [x + Math.cos(a) * 46, y, bx, by]);
        fill(c, DIM, bx - 22, by - 4, 44, 7, 3);
      }
    }
    fill(c, K, cx - 70, cy - 24, 140, 48, 24);
    fill(c, INK, cx - 44, cy - 5, 88, 10, 5);
  },
  'canvas-flow'(c, K) {
    dotsBg(c);
    stroke(c, GREEN, 40, 190, 90, 40, 20, 2.5);
    stroke(c, INK, 170, 190, 110, 40, 6, 2);
    // decision diamond
    c.strokeStyle = K;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(370, 160);
    c.lineTo(430, 210);
    c.lineTo(370, 260);
    c.lineTo(310, 210);
    c.closePath();
    c.stroke();
    stroke(c, AMBER, 320, 300, 110, 40, 6, 2);
    stroke(c, RED, 490, 190, 100, 40, 20, 2.5);
    arrow(c, INK, 130, 210, 168, 210);
    arrow(c, INK, 280, 210, 308, 210);
    arrow(c, INK, 430, 210, 488, 210);
    arrow(c, INK, 370, 260, 372, 298);
    // elbow back to the action
    line(c, INK, 2, [320, 320, 225, 320]);
    arrow(c, INK, 225, 320, 225, 232);
    [85, 225, 370, 375, 540].forEach((x, i) => fill(c, DIM, x - 22, [206, 206, 206, 316, 206][i], 44, 7, 3));
  },
  'canvas-stickies'(c, K, r) {
    dotsBg(c);
    const cols = [AMBER, '#ff9ad5', CYAN, GREEN];
    for (let g = 0; g < 3; g++) {
      stroke(c, `${K}aa`, 30 + g * 200, 60, 180, 300, 14, 2);
      fill(c, K, 48 + g * 200, 76, 70, 9, 4);
      for (let k = 0; k < 4; k++) {
        const x = 46 + g * 200 + (k % 2) * 80 + r() * 6;
        const y = 104 + Math.floor(k / 2) * 110 + r() * 10;
        c.save();
        c.translate(x + 35, y + 40);
        c.rotate((r() - 0.5) * 0.12);
        fill(c, cols[(g + k) % 4], -35, -40, 70, 80, 3);
        for (let l = 0; l < 3; l++) fill(c, 'rgba(20,20,40,0.45)', -25, -26 + l * 14, 30 + r() * 20, 5, 2);
        c.restore();
      }
    }
    // a freehand loop drawn around one group
    c.strokeStyle = RED;
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(320, 210, 104, 160, 0.05, 0, Math.PI * 1.85);
    c.stroke();
  },
  // ── photo ────────────────────────────────────────────────────────
  'image-retouch'(c, K) {
    const g = c.createLinearGradient(20, 50, 440, 380);
    g.addColorStop(0, '#2b2d55');
    g.addColorStop(1, '#141530');
    fill(c, g as unknown as string, 20, 50, 420, 330, 6);
    // product bottle: left half dull, right half retouched
    for (const [half, sat] of [
      [0, 0.35],
      [1, 1],
    ] as const) {
      c.save();
      c.beginPath();
      c.rect(20 + half * 210, 50, 210, 330);
      c.clip();
      c.globalAlpha = 0.5 + sat * 0.5;
      fill(c, K, 180, 150, 100, 200, 30);
      fill(c, half ? INK : DIM, 205, 100, 50, 60, 10);
      fill(c, 'rgba(255,255,255,0.5)', 196, 170, 14, 150, 7);
      c.restore();
    }
    line(c, INK, 2, [230, 50, 230, 380]);
    dot(c, INK, 230, 215, 10);
    // curves panel
    fill(c, 'rgba(255,255,255,0.06)', 456, 50, 164, 160, 8);
    line(c, FAINT, 1, [470, 190, 606, 64]);
    c.strokeStyle = K;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(470, 190);
    c.bezierCurveTo(520, 186, 540, 90, 606, 64);
    c.stroke();
    dot(c, INK, 528, 136, 5);
    // adjustment layers
    for (let i = 0; i < 4; i++) {
      fill(c, i === 0 ? `${K}44` : 'rgba(255,255,255,0.05)', 456, 226 + i * 38, 164, 32, 6);
      dot(c, [K, CYAN, AMBER, GREEN][i], 474, 242 + i * 38, 7);
      fill(c, i === 0 ? INK : DIM, 490, 238 + i * 38, 80, 7, 3);
    }
  },
  'image-poster'(c, K, r) {
    const g = c.createLinearGradient(40, 50, 330, 380);
    g.addColorStop(0, K);
    g.addColorStop(1, '#241a55');
    fill(c, g as unknown as string, 60, 48, 260, 336, 6);
    dot(c, 'rgba(255,255,255,0.85)', 190, 170, 70);
    c.save();
    c.beginPath();
    c.arc(190, 170, 70, 0, Math.PI * 2);
    c.clip();
    fill(c, K, 110, 190, 160, 60, 0);
    c.restore();
    fill(c, INK, 90, 280, 200, 22, 4);
    fill(c, INK, 90, 312, 140, 12, 4);
    fill(c, DIM, 90, 344, 110, 8, 4);
    // layers panel
    fill(c, 'rgba(255,255,255,0.06)', 360, 48, 260, 336, 8);
    const layers = ['T', 'T', '◐', '●', '▦'];
    layers.forEach((l, i) => {
      const y = 64 + i * 60;
      fill(c, i === 2 ? `${K}44` : 'rgba(255,255,255,0.05)', 372, y, 236, 50, 6);
      fill(c, 'rgba(255,255,255,0.12)', 382, y + 8, 34, 34, 4);
      text(c, INK, l, 399, y + 31, '700 16px sans-serif', 'center');
      if (i === 2 || i === 3) stroke(c, INK, 424, y + 8, 34, 34, 4, 1.5);
      fill(c, i === 2 ? INK : DIM, 470, y + 21, 70 + r() * 50, 8, 4);
      text(c, DIM, '👁', 594, y + 31, '14px sans-serif', 'center');
    });
  },
  'image-social'(c, K) {
    const frames = [
      [30, 70, 180, 180],
      [230, 50, 130, 230],
      [380, 90, 240, 135],
    ];
    frames.forEach(([x, y, w, h], i) => {
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, K);
      g.addColorStop(1, '#241a55');
      fill(c, g as unknown as string, x, y, w, h, 6);
      dot(c, 'rgba(255,255,255,0.8)', x + w * 0.5, y + h * 0.42, Math.min(w, h) * 0.22);
      fill(c, INK, x + w * 0.15, y + h * 0.75, w * 0.7, 10, 4);
      text(c, DIM, ['1:1', '9:16', '16:9'][i], x + w / 2, y + h + 22, MONO, 'center');
    });
    ['PNG', 'JPG', 'PNG'].forEach((f, i) => {
      fill(c, `${K}44`, 120 + i * 150, 330, 100, 30, 15);
      text(c, INK, `↓ ${f}`, 170 + i * 150, 350, MONO, 'center');
    });
  },
  // ── film / motion ────────────────────────────────────────────────
  'timeline-edit'(c, K, r) {
    viewer(c, 170, 46, 300, 170, K);
    tracks(c, K, r, 236, ['V2', 'V1', 'A1', 'A2'], true);
  },
  'timeline-grade'(c, K, r) {
    viewer(c, 30, 46, 300, 170, K);
    // three colour wheels
    for (let i = 0; i < 3; i++) {
      const x = 400 + i * 76;
      const g = c.createConicGradient(0, x, 110);
      ['#ff5d5d', '#ffd25d', '#5dff9a', '#5dd8ff', '#9a5dff', '#ff5d5d'].forEach((col, k) => g.addColorStop(k / 5, col));
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, 110, 30, 0, Math.PI * 2);
      c.fill();
      dot(c, 'rgba(10,10,30,0.55)', x, 110, 18);
      dot(c, INK, x + (r() - 0.5) * 14, 110 + (r() - 0.5) * 14, 4);
    }
    text(c, K, 'CUBE', 476, 176, MONO, 'center');
    tracks(c, K, r, 236, ['V1', 'A1'], false);
    ['EDL', 'FCPXML', 'OTIO'].forEach((f, i) => {
      fill(c, `${K}33`, 60 + i * 180, 344, 150, 28, 14);
      text(c, INK, `↗ ${f}`, 135 + i * 180, 363, MONO, 'center');
    });
  },
  'video-captions'(c, K, r) {
    viewer(c, 40, 46, 400, 230, K);
    fill(c, 'rgba(0,0,0,0.65)', 120, 226, 240, 30, 4);
    fill(c, INK, 136, 236, 208, 9, 4);
    // waveform + caption blocks
    for (let i = 0; i < 140; i++) {
      const h = 4 + Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.11)) * 30 * (0.5 + r() * 0.5);
      fill(c, `${K}aa`, 40 + i * 2.85, 318 - h / 2, 1.8, h, 1);
    }
    for (let i = 0; i < 4; i++) fill(c, `${CYAN}55`, 46 + i * 100, 348, 86, 22, 4);
    fill(c, 'rgba(255,255,255,0.06)', 460, 46, 160, 324, 8);
    for (let i = 0; i < 6; i++) {
      text(c, K, `${i + 1}`, 476, 76 + i * 50);
      text(c, DIM, `00:0${i}:1${i},200`, 492, 76 + i * 50, '600 10px ui-monospace, monospace');
      fill(c, INK, 476, 86 + i * 50, 80 + r() * 50, 7, 3);
    }
  },
  'motion-title'(c, K, r) {
    fill(c, '#0b0c22', 30, 46, 380, 214, 6);
    text(c, INK, 'KITION', 220, 170, '800 64px system-ui, sans-serif', 'center');
    fill(c, K, 110, 186, 220, 6, 3);
    for (let i = 0; i < 18; i++) dot(c, `${K}aa`, 60 + r() * 330, 70 + r() * 170, 1.5 + r() * 2.5);
    // keyframe graph
    fill(c, 'rgba(255,255,255,0.05)', 30, 276, 580, 98, 6);
    c.strokeStyle = K;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(50, 360);
    c.bezierCurveTo(150, 360, 170, 296, 270, 296);
    c.bezierCurveTo(380, 296, 400, 330, 590, 330);
    c.stroke();
    for (const [x, y] of [
      [50, 360],
      [270, 296],
      [590, 330],
    ]) {
      c.save();
      c.translate(x, y);
      c.rotate(Math.PI / 4);
      fill(c, INK, -6, -6, 12, 12, 1);
      c.restore();
    }
    // layers
    fill(c, 'rgba(255,255,255,0.05)', 426, 46, 184, 214, 6);
    ['T', '■', '◯', '⊕'].forEach((l, i) => {
      text(c, i === 0 ? K : INK, l, 446, 82 + i * 48, '700 16px sans-serif');
      fill(c, i === 0 ? INK : DIM, 470, 72 + i * 48, 90, 8, 4);
    });
  },
  'motion-lower'(c, K) {
    viewer(c, 30, 46, 580, 300, K);
    // the lower third wiping in through a mask
    fill(c, K, 70, 252, 260, 40, 4);
    fill(c, 'rgba(10,10,30,0.8)', 70, 292, 200, 26, 4);
    fill(c, INK, 86, 266, 160, 12, 5);
    fill(c, DIM, 86, 301, 120, 8, 4);
    c.setLineDash([8, 6]);
    stroke(c, CYAN, 62, 244, 300, 82, 4, 2);
    c.setLineDash([]);
    arrow(c, CYAN, 380, 286, 340, 286);
    tracksLite(c, K);
  },
  'motion-roto'(c, K) {
    viewer(c, 30, 46, 580, 300, K);
    // glow behind the subject
    const g = c.createRadialGradient(320, 200, 10, 320, 200, 170);
    g.addColorStop(0, `${K}cc`);
    g.addColorStop(1, `${K}00`);
    c.fillStyle = g;
    c.fillRect(140, 60, 360, 280);
    // subject silhouette and its roto spline
    const pts = [
      [320, 96],
      [356, 120],
      [362, 170],
      [420, 220],
      [440, 340],
      [200, 340],
      [220, 220],
      [280, 170],
      [284, 120],
    ];
    c.fillStyle = '#0b0c22';
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.strokeStyle = CYAN;
    c.lineWidth = 2;
    c.stroke();
    pts.forEach(([x, y]) => {
      fill(c, INK, x - 4, y - 4, 8, 8, 1);
    });
    tracksLite(c, K);
  },
  // ── doc ──────────────────────────────────────────────────────────
  'page-contract'(c, K, r) {
    paper(c, 140, 40, 360, 350);
    fill(c, '#222545', 240, 62, 160, 14, 4);
    for (let i = 0; i < 6; i++) {
      const y = 100 + i * 38;
      text(c, '#222545', `${i + 1}.`, 166, y + 8, '700 12px sans-serif');
      for (let l = 0; l < 2; l++) words(c, 'rgba(34,37,69,0.45)', 186, y + l * 14, 290, r, 5);
      if (i === 2) {
        line(c, RED, 2, [186, y + 2, 330, y + 2]);
        fill(c, `${GREEN}`, 336, y - 2, 100, 7, 3);
      }
    }
    line(c, '#222545', 1.5, [180, 350, 300, 350]);
    c.strokeStyle = K;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(190, 344);
    c.bezierCurveTo(210, 320, 220, 360, 240, 336);
    c.bezierCurveTo(255, 320, 260, 350, 290, 338);
    c.stroke();
    // lock + review badge
    fill(c, `${K}44`, 520, 70, 90, 90, 12);
    stroke(c, INK, 548, 100, 34, 28, 4, 2.5);
    c.strokeStyle = INK;
    c.beginPath();
    c.arc(565, 100, 10, Math.PI, 0);
    c.stroke();
    fill(c, `${AMBER}44`, 520, 176, 90, 26, 13);
    text(c, INK, 'REVIEW', 565, 194, '700 11px ui-monospace, monospace', 'center');
  },
  'page-report'(c, K, r) {
    for (const x of [60, 340]) {
      paper(c, x, 40, 240, 340);
      fill(c, '#222545', x + 20, 58, 120, 12, 4);
      line(c, 'rgba(34,37,69,0.3)', 1, [x + 20, 78, x + 220, 78]);
      text(c, 'rgba(34,37,69,0.6)', x === 60 ? '1' : '2', x + 120, 370, '600 10px sans-serif', 'center');
    }
    paragraph(c, 80, 94, 200, 5, r, 'rgba(34,37,69,0.4)', 13);
    for (let i = 0; i < 6; i++) {
      const h = 30 + r() * 80;
      fill(c, i === 4 ? K : `${K}88`, 92 + i * 30, 300 - h, 20, h, 2);
    }
    line(c, 'rgba(34,37,69,0.5)', 1, [84, 300, 276, 300]);
    paragraph(c, 360, 94, 200, 7, r, 'rgba(34,37,69,0.4)', 13);
    text(c, '#222545', 'x = (−b ± √Δ) / 2a', 460, 220, 'italic 15px "Times New Roman", serif', 'center');
    paragraph(c, 360, 248, 200, 6, r, 'rgba(34,37,69,0.4)', 13);
  },
  'page-resume'(c, K, r) {
    paper(c, 160, 36, 320, 352);
    fill(c, K, 160, 36, 320, 70, 0);
    dot(c, INK, 210, 71, 24);
    fill(c, INK, 248, 58, 150, 14, 5);
    fill(c, 'rgba(255,255,255,0.6)', 248, 80, 100, 8, 4);
    for (let s = 0; s < 3; s++) {
      const y = 124 + s * 86;
      fill(c, K, 280, y, 80, 9, 4);
      for (let l = 0; l < 4; l++) {
        dot(c, 'rgba(34,37,69,0.5)', 286, y + 24 + l * 14, 2);
        words(c, 'rgba(34,37,69,0.4)', 294, y + 21 + l * 14, 170, r, 5);
      }
    }
    for (let k = 0; k < 6; k++) {
      fill(c, 'rgba(34,37,69,0.15)', 176, 130 + k * 36, 84, 6, 3);
      fill(c, `${K}`, 176, 130 + k * 36, 84 * (0.4 + r() * 0.6), 6, 3);
    }
    fill(c, `${K}44`, 506, 60, 110, 30, 15);
    text(c, INK, '.docx', 561, 80, MONO, 'center');
  },
  // ── sheet ────────────────────────────────────────────────────────
  'grid-budget'(c, K, r) {
    fill(c, 'rgba(255,255,255,0.06)', 20, 46, 600, 28, 4);
    text(c, K, 'fx', 34, 65, '700 13px ui-monospace, monospace');
    text(c, INK, '=SUM(B2:B9)-C10', 64, 65);
    const xs = grid(c, 20, 84, [34, 130, 90, 90], 9, 30, K, true);
    for (let i = 0; i < 9; i++) {
      const y = 84 + 30 * (i + 1);
      text(c, DIM, String(i + 1), xs[0] + 17, y + 20, MONO, 'center');
      fill(c, i === 8 ? K : INK, xs[1] + 10, y + 11, i === 8 ? 50 : 50 + r() * 50, 8, 4);
      const v = 200 + r() * 1800;
      const over = i === 3 || i === 6;
      if (over) fill(c, `${RED}44`, xs[2] + 2, y + 2, 86, 26, 2);
      text(c, over ? RED : INK, v.toFixed(0), xs[2] + 80, y + 20, MONO, 'right');
      text(c, DIM, (v * 0.9).toFixed(0), xs[3] + 80, y + 20, MONO, 'right');
    }
    // chart
    fill(c, 'rgba(255,255,255,0.05)', 400, 84, 220, 300, 6);
    c.strokeStyle = K;
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const x = 420 + i * 26;
      const y = 340 - (60 + Math.sin(i * 0.9) * 40 + i * 14);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
    for (let i = 0; i < 8; i++) fill(c, `${CYAN}55`, 414 + i * 26, 340 - (40 + r() * 70), 12, 40 + r() * 10, 2);
    line(c, DIM, 1, [414, 342, 606, 342]);
  },
  'chart-pivot'(c, K, r) {
    const xs = grid(c, 20, 50, [120, 80, 80, 80], 7, 32, K);
    for (let i = 0; i < 7; i++) {
      const y = 50 + 32 * (i + 1);
      const total = i === 6;
      if (total) fill(c, `${K}33`, xs[0], y, 360, 32, 0);
      fill(c, total ? K : INK, xs[0] + 10, y + 12, total ? 40 : 50 + r() * 40, 8, 4);
      for (let k = 1; k < 4; k++) text(c, total ? INK : DIM, (r() * 900 + 100).toFixed(0), xs[k] + 70, y + 21, MONO, 'right');
    }
    fill(c, 'rgba(255,255,255,0.05)', 400, 50, 220, 256, 6);
    const cols = [K, CYAN, AMBER];
    for (let g = 0; g < 4; g++)
      for (let k = 0; k < 3; k++) {
        const h = 30 + r() * 150;
        fill(c, cols[k], 418 + g * 50 + k * 13, 286 - h, 11, h, 2);
      }
    line(c, DIM, 1, [412, 288, 608, 288]);
    cols.forEach((col, k) => {
      dot(c, col, 424 + k * 66, 326, 6);
      fill(c, DIM, 434 + k * 66, 322, 36, 7, 3);
    });
  },
  'grid-clean'(c, K, r) {
    const left = grid(c, 20, 60, [250], 8, 32, K);
    const right = grid(c, 370, 60, [120, 130], 8, 32, K);
    for (let i = 0; i < 8; i++) {
      const y = 60 + 32 * (i + 1);
      words(c, DIM, left[0] + 10, y + 12, 220, r, 7);
      fill(c, INK, right[0] + 10, y + 12, 50 + r() * 50, 8, 4);
      fill(c, i < 5 ? INK : `${K}`, right[1] + 10, y + 12, 50 + r() * 60, 8, 4);
      if (i >= 5) fill(c, `${K}22`, right[1] + 1, y + 1, 128, 30, 0);
    }
    arrow(c, K, 284, 200, 362, 200, 3);
    text(c, K, 'CSV', 145, 368, MONO, 'center');
    text(c, K, 'XLSX', 495, 368, MONO, 'center');
  },
  // ── slide ────────────────────────────────────────────────────────
  'slide-pitch'(c, K, r) {
    strip(c, K, r);
    const g = c.createLinearGradient(140, 50, 620, 340);
    g.addColorStop(0, '#1d1f45');
    g.addColorStop(1, `${K}88`);
    fill(c, g as unknown as string, 140, 50, 480, 270, 6);
    fill(c, INK, 176, 140, 280, 26, 6);
    fill(c, DIM, 176, 182, 200, 12, 6);
    dot(c, K, 540, 120, 40);
    fill(c, INK, 176, 270, 60, 8, 4);
    for (let i = 0; i < 4; i++) fill(c, i === 0 ? K : FAINT, 140 + i * 124, 336, 112, 40, 6);
  },
  'slide-chart'(c, K, r) {
    strip(c, K, r);
    fill(c, '#16183a', 140, 50, 480, 270, 6);
    fill(c, INK, 166, 74, 200, 16, 5);
    for (let i = 0; i < 5; i++) {
      const h = 40 + r() * 140;
      fill(c, i === 4 ? K : `${K}77`, 180 + i * 40, 290 - h, 26, h, 3);
    }
    line(c, DIM, 1, [170, 292, 384, 292]);
    // SmartArt: three linked circles
    for (let i = 0; i < 3; i++) {
      dot(c, [K, CYAN, AMBER][i], 440 + i * 56, 190, 22);
      if (i) line(c, INK, 2, [440 + i * 56 - 34, 190, 440 + i * 56 - 22, 190]);
    }
    text(c, DIM, '▶ Fade · Wipe · Zoom', 380, 352, MONO, 'center');
  },
  'slide-video'(c, K, r) {
    strip(c, K, r);
    fill(c, '#16183a', 140, 50, 480, 270, 6);
    fill(c, '#0b0c22', 180, 90, 300, 170, 6);
    dot(c, `${K}cc`, 330, 175, 34);
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(320, 158);
    c.lineTo(346, 175);
    c.lineTo(320, 192);
    c.fill();
    fill(c, FAINT, 180, 270, 300, 6, 3);
    fill(c, K, 180, 270, 120, 6, 3);
    ['PPTX', 'PDF'].forEach((f, i) => {
      fill(c, `${K}44`, 500, 100 + i * 46, 96, 32, 16);
      text(c, INK, `↓ ${f}`, 548, 121 + i * 46, MONO, 'center');
    });
  },
  // ── pdf ──────────────────────────────────────────────────────────
  'pdf-sign'(c, K, r) {
    paper(c, 150, 40, 340, 350);
    for (let i = 0; i < 5; i++) {
      const y = 76 + i * 50;
      fill(c, 'rgba(34,37,69,0.45)', 176, y, 80, 7, 3);
      stroke(c, i < 3 ? K : 'rgba(34,37,69,0.35)', 176, y + 14, 290, 24, 4, 1.5);
      if (i < 3) fill(c, '#222545', 186, y + 23, 90 + r() * 80, 7, 3);
    }
    stroke(c, K, 176, 334, 14, 14, 3, 2);
    line(c, GREEN, 2.5, [178, 340, 183, 345, 190, 334]);
    c.strokeStyle = '#3b3fbf';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(300, 350);
    c.bezierCurveTo(320, 310, 330, 370, 350, 336);
    c.bezierCurveTo(365, 316, 380, 360, 440, 334);
    c.stroke();
    // comment pin
    fill(c, AMBER, 508, 90, 100, 60, 8);
    for (let l = 0; l < 3; l++) fill(c, 'rgba(20,20,40,0.5)', 518, 102 + l * 14, 60 + r() * 20, 5, 2);
  },
  'pdf-redact'(c, K, r) {
    paper(c, 150, 40, 340, 350);
    for (let i = 0; i < 16; i++) {
      const y = 66 + i * 19;
      words(c, 'rgba(34,37,69,0.4)', 172, y, 296, r, 6);
      if (i % 4 === 1) fill(c, '#000000', 180 + r() * 100, y - 3, 90 + r() * 60, 12, 1);
    }
    c.save();
    c.translate(320, 215);
    c.rotate(-0.5);
    text(c, `${K}66`, 'CONFIDENTIAL', 0, 10, '800 34px system-ui, sans-serif', 'center');
    c.restore();
  },
  'pdf-ocr'(c, K, r) {
    paper(c, 150, 60, 340, 330);
    // speckled scan
    for (let i = 0; i < 400; i++) dot(c, 'rgba(34,37,69,0.12)', 150 + r() * 340, 60 + r() * 330, r() * 1.2);
    for (let i = 0; i < 13; i++) {
      const y = 90 + i * 22;
      words(c, 'rgba(34,37,69,0.5)', 172, y, 296, r, 6);
      if (i === 4 || i === 9) stroke(c, K, 168, y - 6, 304, 18, 3, 2);
    }
    fill(c, 'rgba(255,255,255,0.1)', 150, 18, 340, 30, 15);
    text(c, INK, '⌕', 168, 39, '700 16px sans-serif');
    fill(c, INK, 188, 30, 90, 8, 4);
    fill(c, `${K}44`, 508, 70, 110, 30, 15);
    text(c, INK, 'PDF/A', 563, 90, MONO, 'center');
  },
  // ── vector ───────────────────────────────────────────────────────
  'vector-logo'(c, K) {
    dotsBg(c);
    const pts = [
      [220, 300],
      [320, 90],
      [420, 300],
    ];
    c.fillStyle = `${K}cc`;
    c.beginPath();
    c.moveTo(220, 300);
    c.bezierCurveTo(240, 200, 280, 100, 320, 90);
    c.bezierCurveTo(360, 100, 400, 200, 420, 300);
    c.bezierCurveTo(360, 250, 280, 250, 220, 300);
    c.fill();
    dot(c, '#0b0c22', 320, 210, 34);
    // handles
    const handles = [
      [240, 200, 220, 300],
      [280, 100, 320, 90],
      [360, 100, 320, 90],
      [400, 200, 420, 300],
    ];
    handles.forEach(([hx, hy, ax, ay]) => {
      line(c, CYAN, 1.5, [ax, ay, hx, hy]);
      dot(c, CYAN, hx, hy, 5);
    });
    pts.forEach(([x, y]) => {
      fill(c, INK, x - 6, y - 6, 12, 12, 1);
      stroke(c, CYAN, x - 6, y - 6, 12, 12, 1, 2);
    });
    fill(c, INK, 230, 330, 180, 16, 5);
    stroke(c, `${CYAN}88`, 200, 70, 240, 290, 0, 1);
  },
  'vector-icons'(c, K) {
    for (let i = 0; i < 8; i++) {
      const x = 40 + (i % 4) * 148;
      const y = 60 + Math.floor(i / 4) * 160;
      stroke(c, DIM, x, y, 120, 120, 4, 1);
      text(c, DIM, `${i + 1}`, x, y - 6, '600 10px ui-monospace, monospace');
      c.strokeStyle = i % 3 ? INK : K;
      c.lineWidth = 6;
      c.lineCap = 'round';
      c.beginPath();
      const cx = x + 60;
      const cy = y + 60;
      if (i % 4 === 0) c.arc(cx, cy, 30, 0, Math.PI * 2);
      else if (i % 4 === 1) {
        c.moveTo(cx - 30, cy);
        c.lineTo(cx, cy - 30);
        c.lineTo(cx + 30, cy);
        c.lineTo(cx, cy + 30);
        c.closePath();
      } else if (i % 4 === 2) {
        c.moveTo(cx - 30, cy + 20);
        c.lineTo(cx, cy - 25);
        c.lineTo(cx + 30, cy + 20);
      } else rr(c, cx - 28, cy - 20, 56, 40, 8);
      c.stroke();
      c.lineCap = 'butt';
    }
  },
  'vector-recolor'(c, K) {
    for (const [x, pal] of [
      [30, ['#4a5bd8', '#7a8cff', '#c1c9ff', '#ffd27a']],
      [330, [K, '#ff9ad5', '#ffe0f0', '#7fe3ff']],
    ] as const) {
      fill(c, pal[2], x, 50, 280, 230, 6);
      dot(c, pal[3], x + 210, 110, 34);
      c.fillStyle = pal[1];
      c.beginPath();
      c.moveTo(x, 280);
      c.quadraticCurveTo(x + 90, 150, x + 180, 230);
      c.quadraticCurveTo(x + 230, 190, x + 280, 230);
      c.lineTo(x + 280, 280);
      c.fill();
      c.fillStyle = pal[0];
      c.beginPath();
      c.moveTo(x, 280);
      c.quadraticCurveTo(x + 120, 210, x + 280, 270);
      c.lineTo(x + 280, 280);
      c.fill();
      pal.forEach((col, k) => fill(c, col, x + 40 + k * 52, 300, 40, 40, 6));
    }
    arrow(c, INK, 312, 165, 328, 165, 3);
    text(c, DIM, '.ai', 170, 372, MONO, 'center');
    text(c, K, '.svg', 470, 372, MONO, 'center');
  },
  // ── layout ───────────────────────────────────────────────────────
  'layout-magazine'(c, K, r) {
    paper(c, 40, 50, 280, 320);
    paper(c, 320, 50, 280, 320);
    line(c, 'rgba(34,37,69,0.25)', 1, [320, 50, 320, 370]);
    const g = c.createLinearGradient(60, 70, 300, 200);
    g.addColorStop(0, K);
    g.addColorStop(1, '#241a55');
    fill(c, g as unknown as string, 60, 70, 240, 150, 2);
    fill(c, '#222545', 60, 236, 200, 18, 3);
    for (const x of [60, 340, 470]) paragraph(c, x, x === 60 ? 270 : 76, 110, x === 60 ? 6 : 19, r, 'rgba(34,37,69,0.4)', 14);
    for (let i = 0; i < 6; i++) words(c, 'rgba(34,37,69,0.4)', 186, 270 + i * 14, 114, r, 6);
    // text thread from column to column
    c.setLineDash([5, 5]);
    arrow(c, K, 300, 350, 340, 80, 2);
    arrow(c, K, 450, 340, 470, 80, 2);
    c.setLineDash([]);
  },
  'layout-brochure'(c, K, r) {
    for (let p = 0; p < 3; p++) {
      const x = 40 + p * 190;
      paper(c, x, 50, 180, 300);
      const fx = x + 16;
      stroke(c, K, fx, 66, 148, 110, 2, 1.5);
      line(c, `${K}88`, 1, [fx, 66, fx + 148, 176, fx, 176, fx + 148, 66]);
      fill(c, '#222545', fx, 192, 110, 12, 3);
      paragraph(c, fx, 214, 148, 7, r, 'rgba(34,37,69,0.4)', 14);
    }
    [K, '#222545', AMBER, CYAN, '#f5f2ff'].forEach((col, i) => {
      fill(c, col, 160 + i * 66, 362, 52, 22, 4);
      stroke(c, DIM, 160 + i * 66, 362, 52, 22, 4, 1);
    });
  },
  'layout-menu'(c, K, r) {
    paper(c, 170, 40, 300, 350);
    fill(c, K, 260, 62, 120, 16, 4);
    for (let s = 0; s < 3; s++) {
      const y = 104 + s * 92;
      fill(c, '#222545', 196, y, 70, 9, 3);
      for (let k = 0; k < 3; k++) {
        const yy = y + 24 + k * 20;
        fill(c, 'rgba(34,37,69,0.55)', 196, yy, 70 + r() * 50, 7, 3);
        c.setLineDash([2, 4]);
        line(c, 'rgba(34,37,69,0.35)', 1.5, [320, yy + 5, 410, yy + 5]);
        c.setLineDash([]);
        text(c, '#222545', `${(8 + r() * 30).toFixed(0)}`, 444, yy + 8, '700 12px ui-monospace, monospace', 'right');
      }
    }
    fill(c, 'rgba(255,255,255,0.06)', 490, 60, 130, 140, 8);
    for (let i = 0; i < 4; i++) {
      text(c, i === 1 ? K : INK, '¶', 506, 90 + i * 30, '700 15px serif');
      fill(c, i === 1 ? INK : DIM, 526, 81 + i * 30, 70, 7, 3);
    }
  },
  // ── cad ──────────────────────────────────────────────────────────
  'cad-plan'(c, K) {
    cadBg(c);
    c.strokeStyle = INK;
    c.lineWidth = 6;
    c.strokeRect(80, 70, 480, 270);
    c.lineWidth = 4;
    line(c, INK, 4, [300, 70, 300, 220]);
    line(c, INK, 4, [80, 220, 250, 220]);
    line(c, INK, 4, [350, 220, 560, 220]);
    // door swings
    c.strokeStyle = CYAN;
    c.lineWidth = 1.5;
    for (const [x, y, a] of [
      [250, 220, 0],
      [300, 170, Math.PI / 2],
    ] as const) {
      c.beginPath();
      c.arc(x, y, 50, a - Math.PI / 2, a);
      c.stroke();
    }
    // furniture blocks
    stroke(c, K, 110, 100, 90, 60, 4, 2);
    stroke(c, K, 380, 100, 140, 80, 6, 2);
    stroke(c, K, 400, 250, 120, 60, 30, 2);
    dot(c, `${K}55`, 160, 280, 26);
    dims(c, 80, 362, 560, 362, '12 000');
    dims(c, 590, 70, 590, 340, '6 750', true);
  },
  'cad-part'(c, K) {
    cadBg(c);
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(120, 120);
    c.lineTo(440, 120);
    c.arcTo(500, 120, 500, 180, 40);
    c.lineTo(500, 280);
    c.lineTo(120, 280);
    c.closePath();
    c.stroke();
    // hatch
    c.save();
    c.beginPath();
    c.rect(120, 240, 380, 40);
    c.clip();
    for (let x = 100; x < 520; x += 12) line(c, `${K}aa`, 1.2, [x, 280, x + 40, 240]);
    c.restore();
    for (const x of [200, 330]) {
      c.strokeStyle = INK;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(x, 180, 26, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([10, 4, 2, 4]);
      line(c, RED, 1, [x - 40, 180, x + 40, 180, x, 180, x, 140, x, 220]);
      c.setLineDash([]);
    }
    dims(c, 120, 330, 500, 330, '190');
    dims(c, 200, 80, 330, 80, '65');
    text(c, CYAN, 'R20', 494, 136, MONO);
  },
  'cad-site'(c, K) {
    cadBg(c);
    stroke(c, INK, 60, 60, 300, 170, 2, 3);
    line(c, INK, 1, [60, 60, 360, 230, 60, 230, 360, 60]);
    // parking array
    for (let i = 0; i < 10; i++) {
      stroke(c, K, 60 + i * 30, 260, 26, 50, 1, 1.5);
    }
    for (let i = 0; i < 4; i++) stroke(c, K, 400, 70 + i * 40, 70, 34, 1, 1.5);
    c.setLineDash([12, 6]);
    stroke(c, CYAN, 390, 60, 200, 260, 4, 1.5);
    c.setLineDash([]);
    // the command line
    fill(c, 'rgba(0,0,0,0.5)', 20, 334, 600, 44, 4);
    text(c, DIM, 'Command:', 34, 352, '600 12px ui-monospace, monospace');
    text(c, INK, 'ARRAY  R  10  1  30', 110, 352, '600 13px ui-monospace, monospace');
    text(c, K, '▍', 290, 352, MONO);
    text(c, DIM, 'Select objects: 1 found', 34, 370, '600 11px ui-monospace, monospace');
  },
};

// ── shared pieces ───────────────────────────────────────────────────
function dotsBg(c: C) {
  for (let x = 30; x < W; x += 24) for (let y = 56; y < H - 10; y += 24) dot(c, FAINT, x, y, 1.3);
}
function cadBg(c: C) {
  fill(c, '#0a0c1e', 16, 44, W - 32, H - 60, 4);
  for (let x = 16; x < W - 16; x += 20) line(c, 'rgba(127,227,255,0.06)', 1, [x, 44, x, H - 16]);
  for (let y = 44; y < H - 16; y += 20) line(c, 'rgba(127,227,255,0.06)', 1, [16, y, W - 16, y]);
}
function dims(c: C, x1: number, y1: number, x2: number, y2: number, label: string, vertical = false) {
  arrow(c, AMBER, (x1 + x2) / 2, (y1 + y2) / 2, x1, y1, 1.5);
  arrow(c, AMBER, (x1 + x2) / 2, (y1 + y2) / 2, x2, y2, 1.5);
  c.save();
  c.translate((x1 + x2) / 2, (y1 + y2) / 2);
  if (vertical) c.rotate(-Math.PI / 2);
  fill(c, '#0a0c1e', -28, -9, 56, 16, 2);
  text(c, AMBER, label, 0, 4, '600 12px ui-monospace, monospace', 'center');
  c.restore();
}
function paper(c: C, x: number, y: number, w: number, h: number) {
  fill(c, '#f3f1ff', x, y, w, h, 3);
}
function viewer(c: C, x: number, y: number, w: number, h: number, K: string) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#1d2050');
  g.addColorStop(1, `${K}66`);
  fill(c, g as unknown as string, x, y, w, h, 6);
  dot(c, 'rgba(255,255,255,0.25)', x + w * 0.7, y + h * 0.35, Math.min(w, h) * 0.16);
  c.fillStyle = 'rgba(10,10,30,0.55)';
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x + w * 0.35, y + h * 0.5);
  c.lineTo(x + w * 0.6, y + h * 0.78);
  c.lineTo(x + w * 0.8, y + h * 0.6);
  c.lineTo(x + w, y + h);
  c.fill();
}
function tracks(c: C, K: string, r: () => number, y0: number, names: string[], cut: boolean) {
  const rowH = 30;
  fill(c, 'rgba(255,255,255,0.04)', 20, y0, 600, rowH * names.length + 10, 6);
  names.forEach((n, i) => {
    const y = y0 + 6 + i * rowH;
    text(c, DIM, n, 30, y + 19, '600 11px ui-monospace, monospace');
    let x = 64;
    while (x < 600) {
      const w = Math.min(600 - x, 50 + r() * 110);
      const audio = n.startsWith('A');
      fill(c, audio ? `${GREEN}55` : `${K}${i % 2 ? '88' : 'cc'}`, x, y + 3, w - 4, rowH - 8, 4);
      if (audio) for (let k = x + 4; k < x + w - 8; k += 4) fill(c, `${GREEN}cc`, k, y + 14 - (2 + r() * 7), 2, 4 + r() * 14, 1);
      x += w + (r() < 0.2 ? 20 : 0);
    }
  });
  const px = 310;
  line(c, RED, 2, [px, y0 - 6, px, y0 + rowH * names.length + 10]);
  fill(c, RED, px - 6, y0 - 12, 12, 10, 2);
  if (cut) {
    c.setLineDash([4, 4]);
    line(c, INK, 1.5, [200, y0 + 2, 200, y0 + rowH * 2 + 4]);
    c.setLineDash([]);
    text(c, INK, '✂', 188, y0 - 2, '16px sans-serif');
  }
}
function tracksLite(c: C, K: string) {
  fill(c, 'rgba(255,255,255,0.04)', 30, 356, 580, 28, 6);
  for (let i = 0; i < 4; i++) {
    c.save();
    c.translate(120 + i * 130, 370);
    c.rotate(Math.PI / 4);
    fill(c, i % 2 ? INK : K, -5, -5, 10, 10, 1);
    c.restore();
  }
  line(c, RED, 2, [300, 352, 300, 388]);
}
function strip(c: C, K: string, r: () => number) {
  for (let i = 0; i < 5; i++) {
    fill(c, i === 0 ? `${K}55` : 'rgba(255,255,255,0.06)', 20, 50 + i * 66, 104, 58, 4);
    if (i === 0) stroke(c, K, 20, 50 + i * 66, 104, 58, 4, 2);
    fill(c, DIM, 30, 62 + i * 66, 50 + r() * 30, 6, 3);
  }
}

/** Draw a scenario into a fresh 640×400 canvas: a dark glass window with the kit's tab. */
export function scenarioCanvas(art: string, kit: string, seed: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  const r = rng(seed);
  // window
  fill(c, 'rgba(10,12,34,0.86)', 0, 0, W, H, 16);
  fill(c, 'rgba(255,255,255,0.05)', 0, 0, W, 34, 16);
  ['#ff6b7a', '#ffc35c', '#5fe3a1'].forEach((col, i) => dot(c, col, 20 + i * 16, 17, 5));
  fill(c, `${kit}55`, 80, 8, 120, 20, 10);
  fill(c, kit, 92, 15, 60, 6, 3);
  (ART[art] ?? ART['page-wiki'])(c, kit, r);
  return cv;
}

export const SCENARIO_ARTS = Object.keys(ART);
