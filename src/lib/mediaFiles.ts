export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-msvideo,video/avi';
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

export function mediaKind(file: File): 'image' | 'video' | null {
  if (IMAGE_ACCEPT.split(',').includes(file.type)) return 'image';
  if (VIDEO_ACCEPT.split(',').includes(file.type)) return 'video';
  if (!file.type) {
    if (/\.(jpe?g|png|webp|gif)$/i.test(file.name)) return 'image';
    if (/\.(mp4|mov|webm|avi)$/i.test(file.name)) return 'video';
  }
  return null;
}

export function mediaFileError(file: File, allowVideo = false, language = 'es'): string | null {
  const kind = mediaKind(file);
  const es = language === 'es';
  if (!kind || (!allowVideo && kind === 'video')) return es ? 'Formato no admitido. Selecciona uno de los formatos indicados.' : 'Unsupported format. Select one of the listed formats.';
  const limit = kind === 'image' ? 20 : 500;
  if (file.size > limit * 1024 * 1024) return es ? `El archivo supera el máximo de ${limit} MB.` : `The file exceeds the ${limit} MB limit.`;
  return null;
}
