const DEFAULTS = {
  maxSide: 1200,       
  minSide: 800,        
  targetKB: 150,      
  startQuality: 0.86,
  minQuality: 0.68,
  qualityStep: 0.04,
};

const toBlob = (canvas, type, q) =>
  new Promise((res) => canvas.toBlob(res, type, q));

function draw(bmp, w, h, whiteBg) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (whiteBg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  return c;
}

export async function optimizeImage(file, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const ow = bmp.width, oh = bmp.height;
  let side = Math.min(o.maxSide, Math.max(ow, oh));
  const ratio = ow / oh;
  const dims = (s) => ratio >= 1
    ? [Math.round(s), Math.round(s / ratio)]
    : [Math.round(s * ratio), Math.round(s)];

  let [w, h] = dims(side);
  let canvas = draw(bmp, w, h, false);
  let type = 'image/webp';
  let blob = await toBlob(canvas, type, o.startQuality);
  if (!blob || blob.type !== 'image/webp') {
    type = 'image/jpeg';
    canvas = draw(bmp, w, h, true); 
    blob = await toBlob(canvas, type, o.startQuality);
  }

  let q = o.startQuality;
  const target = o.targetKB * 1024;
  while (blob.size > target) {
    if (q - o.qualityStep >= o.minQuality) {
      q = +(q - o.qualityStep).toFixed(2);
    } else if (side * 0.92 >= o.minSide) {
      side = Math.round(side * 0.92);
      [w, h] = dims(side);
      canvas = draw(bmp, w, h, type === 'image/jpeg');
    } else break; 
    blob = await toBlob(canvas, type, q);
  }
  bmp.close?.();

  const smallEnough = Math.max(ow, oh) <= o.maxSide;
  if (smallEnough && file.size <= blob.size && /^image\/(webp|jpeg)$/.test(file.type)) {
    return { blob: file, width: ow, height: oh,
             ext: file.type === 'image/webp' ? 'webp' : 'jpg',
             originalSize: file.size, newSize: file.size, kept: true };
  }
  return { blob, width: w, height: h, ext: type === 'image/webp' ? 'webp' : 'jpg',
           originalSize: file.size, newSize: blob.size, quality: q, kept: false };
}
