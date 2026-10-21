import { Output, BufferTarget, Mp4OutputFormat, CanvasSource } from 'mediabunny';

export async function fixture(fps: number): Promise<File> {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 1_000_000 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  for (let frame = 0; frame < fps; frame++) {
    const image = context.createImageData(128, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const sx = x - frame * 4 / fps;
      const value = 128 + 40 * Math.sin(sx * 0.31) + 35 * Math.cos(y * 0.27) + 20 * Math.sin((sx + y) * 0.17);
      const at = (y * 128 + x) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    await source.add(frame / fps, 1 / fps);
  }
  await output.finalize();
  return new File([target.buffer!], `synthetic-${fps}.mp4`, { type: 'video/mp4' });
}
