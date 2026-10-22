// Draws the shareable "Future Card" as a PNG (1080×1350, portrait — fits Instagram and WhatsApp)
// and shares it via the Web Share API, falling back to download / copy link.
// Privacy: the card shows dream names, near/far labels and a money skill — never amounts.

import type { GoalStatus } from '../engine/goals';

export interface CardData {
  headline: string;
  quote: string;
  strength: string;
  dreams: { title: string; emoji: string; label: string; status: GoalStatus; progress: number }[];
  skill: string;
  url: string;
}

const W = 1080;
const H = 1350;
const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
const PILL: Record<GoalStatus, { bg: string; fg: string; bar: string }> = {
  on_track: { bg: '#E1F3EA', fg: '#17603F', bar: '#5BD19A' },
  adjust: { bg: '#FCEFD6', fg: '#8A5A00', bar: '#F2B54B' },
  explore: { bg: '#FFDCEC', fg: '#A00C57', bar: '#FF8CC2' },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawCard(data: CardData): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load(`800 72px ${FONT}`), document.fonts.load(`600 40px ${FONT}`)]);
  } catch {
    /* fall back to system fonts */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // Background: deep indigo to magenta, with soft glows
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1E1660');
  g.addColorStop(0.6, '#2F1A6E');
  g.addColorStop(1, '#C8106C');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, col: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W - 120, 140, 420, 'rgba(255,140,194,0.35)');
  glow(80, H - 200, 480, 'rgba(26,86,229,0.35)');

  const pad = 88;
  // Brand
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(pad, 88, 56, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#E6187F';
  ctx.beginPath();
  ctx.arc(pad + 28, 116, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 38px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Design Your Life', pad + 80, 117);

  // Eyebrow + headline
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FF8CC2';
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('MY FUTURE CARD', pad, 240);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 66px ${FONT}`;
  let y = 318;
  for (const line of wrap(ctx, data.headline, W - pad * 2).slice(0, 2)) {
    ctx.fillText(line, pad, y);
    y += 76;
  }

  // Dream tiles: emoji inside a progress ring, title and status underneath
  y += 40;
  const tiles = data.dreams.slice(0, 3);
  const colW2 = (W - pad * 2) / Math.max(1, tiles.length);
  const r = 92;
  tiles.forEach((d, k) => {
    const cx = pad + colW2 * k + colW2 / 2;
    const cy = y + r;
    const pill = PILL[d.status];
    ctx.lineWidth = 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = pill.bar;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.04, Math.min(1, d.progress)));
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.font = `84px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.emoji, cx, cy + 4);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 32px ${FONT}`;
    wrap(ctx, d.title, colW2 - 24).slice(0, 2).forEach((line, li) => ctx.fillText(line, cx, cy + r + 58 + li * 38));
    ctx.font = `700 24px ${FONT}`;
    const tw = ctx.measureText(d.label).width + 32;
    ctx.fillStyle = pill.bg;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy + r + 112, tw, 42, 21);
    ctx.fill();
    ctx.fillStyle = pill.fg;
    ctx.fillText(d.label, cx, cy + r + 141);
    ctx.textAlign = 'left';
  });
  y += r * 2 + 222;

  // Personal quote
  ctx.fillStyle = '#FFDCEC';
  ctx.font = `italic 500 34px ${FONT}`;
  for (const line of wrap(ctx, `“${data.quote}”`, W - pad * 2).slice(0, 2)) {
    ctx.fillText(line, pad, y);
    y += 46;
  }
  y += 20;

  // Strength + working on
  const boxY = Math.min(Math.max(y, H - 400), H - 340);
  const colW = (W - pad * 2 - 24) / 2;
  const box = (x: number, label: string, text: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(x, boxY, colW, 176, 32);
    ctx.fill();
    ctx.fillStyle = '#FF8CC2';
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(label, x + 32, boxY + 52);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 34px ${FONT}`;
    let ty = boxY + 98;
    for (const line of wrap(ctx, text, colW - 64).slice(0, 2)) {
      ctx.fillText(line, x + 32, ty);
      ty += 44;
    }
  };
  box(pad, 'MY STRENGTH', data.strength);
  box(pad + colW + 24, 'WORKING ON', data.skill);

  // Footer
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('What would yours look like? →', pad, H - 112);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(data.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), pad, H - 70);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText('Illustrative only — not financial advice. No amounts shown.', pad, H - 34);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}

export function shareText(data: CardData) {
  return `“${data.quote}” I tried a few versions of my future — ${data.headline.toLowerCase()}. Next money skill I’m working on: ${data.skill.toLowerCase()}. Try yours in 3 minutes:`;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'copied' | 'cancelled';

/** Share the card image where supported; otherwise share the link, or copy it. */
export async function shareCard(data: CardData): Promise<ShareOutcome> {
  const text = shareText(data);
  try {
    const blob = await drawCard(data);
    const file = new File([blob], 'my-future-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `${text} ${data.url}` });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text, url: data.url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text} ${data.url}`);
    return 'copied';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    try {
      await navigator.clipboard.writeText(`${text} ${data.url}`);
      return 'copied';
    } catch {
      return 'cancelled';
    }
  }
}

export async function downloadCard(data: CardData) {
  const blob = await drawCard(data);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my-future-card.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
