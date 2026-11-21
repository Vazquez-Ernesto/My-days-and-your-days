// Fotos de perfil: se recortan en cuadrado y se achican en el teléfono antes de guardarlas o enviarlas.
export const AVATAR_SIZE = 192;

/** Archivo de imagen → data URL JPEG de 192×192 (recorte centrado). ~10-20 KB. */
export async function resizeImage(file, size = AVATAR_SIZE) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function initial(name) {
  return (name?.trim()?.[0] ?? '♥').toUpperCase();
}
