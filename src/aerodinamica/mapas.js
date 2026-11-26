const stops = [[36, 76, 141], [39, 167, 187], [133, 205, 181], [246, 223, 108], [237, 133, 81], [178, 59, 69]];
export const gradienteRapidez = `linear-gradient(to right, ${stops.map(c => `rgb(${c.join(',')})`).join(',')})`;
export function colorRapidez(value, maximo) {
  if (value === null) return [37, 55, 72, 255];
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(maximo) || maximo <= 0) throw new Error('El mapa contiene una rapidez o escala inválida.');
  const scale = Math.min(1, value / maximo) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scale));
  return [...stops[index].map((c, i) => Math.round(c + (stops[index + 1][i] - c) * (scale - index))), 255];
}
export function pixelesPlano(plane) {
  const {
    width,
    height,
    speed_ms: values,
    escalaMaxMs
  } = plane;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width * height > 2000000 || !Array.isArray(values) || values.length !== height || values.some(row => !Array.isArray(row) || row.length !== width)) throw new Error('El mapa recibido está incompleto.');
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) pixels.set(colorRapidez(values[y][x], escalaMaxMs), ((height - 1 - y) * width + x) * 4);
  return pixels;
}
export function pintarPlano(canvas, plane) {
  const pixels = pixelesPlano(plane);
  canvas.width = plane.width;
  canvas.height = plane.height;
  canvas.style.setProperty('aspect-ratio', `${plane.width}/${plane.height}`);
  canvas.getContext('2d').putImageData(new ImageData(pixels, plane.width, plane.height), 0, 0);
}
