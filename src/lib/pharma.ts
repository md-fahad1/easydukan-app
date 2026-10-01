// ওষুধের বক্স / পাতা / পিস হিসাব — সব স্টক "পিস" এককে জমা থাকে
export type Pack = { form?: string; piecesPerStrip?: number; stripsPerBox?: number };

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r4 = (n: number) => Math.round(n * 10000) / 10000;
export const boxSize = (p: Pack) => (p.piecesPerStrip || 1) * (p.stripsPerBox || 1);
export const unitFactor = (p: Pack, u: string) => (u === 'BOX' ? boxSize(p) : u === 'STRIP' ? p.piecesPerStrip || 1 : 1);
export const pieceLabel = (p: Pack) => (p.form === 'SYRUP' ? 'বোতল' : 'পিস');
export const UNIT_BN: Record<string, string> = { BOX: 'বক্স', STRIP: 'পাতা', PIECE: 'পিস' };

// বড় unit আগে: [['BOX','বক্স'],['STRIP','পাতা'],['PIECE','পিস']]
export const unitsFor = (p: Pack): [string, string][] => {
  const u: [string, string][] = [];
  if ((p.stripsPerBox || 1) > 1) u.push(['BOX', 'বক্স']);
  if ((p.piecesPerStrip || 1) > 1) u.push(['STRIP', 'পাতা']);
  u.push(['PIECE', pieceLabel(p)]);
  return u;
};

import { bn } from './format';

// পিস থেকে "৫ বক্স ৩ পাতা ২ পিস"
export function fmtStock(pieces: number, p: Pack) {
  let rest = Math.round(pieces || 0);
  const parts: string[] = [];
  const bs = boxSize(p);
  if ((p.stripsPerBox || 1) > 1) {
    const b = Math.floor(rest / bs);
    if (b) parts.push(`${bn(b)} বক্স`);
    rest -= b * bs;
  }
  if ((p.piecesPerStrip || 1) > 1) {
    const s = Math.floor(rest / (p.piecesPerStrip || 1));
    if (s) parts.push(`${bn(s)} পাতা`);
    rest -= s * (p.piecesPerStrip || 1);
  }
  if (rest > 0 || parts.length === 0) parts.push(`${bn(rest)} ${pieceLabel(p)}`);
  return parts.join(' ');
}
