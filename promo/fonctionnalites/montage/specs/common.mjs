const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const PH = { w: 1075, h: 2330 };
export const cam = (rec, y, s = 1, x) => {
  const k = (s * 1080) / rec.w,
    hw = 540 / k,
    hh = 960 / k;
  return {
    s,
    x: clamp(
      x ?? rec.w / 2,
      Math.min(hw, rec.w / 2),
      Math.max(rec.w - hw, rec.w / 2),
    ),
    y: clamp(y, Math.min(hh, rec.h / 2), Math.max(rec.h - hh, rec.h / 2)),
    k,
  };
};
export const box = (c, x, y, w, h, pad = 14) => ({
  x: 540 + (x - c.x) * c.k - pad,
  y: 960 + (y - c.y) * c.k - pad,
  w: w * c.k + 2 * pad,
  h: h * c.k + 2 * pad,
});
export const pt = (c, x, y) => ({
  x: 540 + (x - c.x) * c.k,
  y: 960 + (y - c.y) * c.k,
});
export const C = (c) => [{ t: 0, s: c.s, x: c.x, y: c.y }];
