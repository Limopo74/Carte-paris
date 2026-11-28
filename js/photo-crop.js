export function photoCrop(width, height, ratio) {
  const w = ratio ? Math.min(width, height * ratio) : width;
  const h = ratio ? Math.min(height, width / ratio) : height;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}
