import { strToU8, zipSync } from 'fflate';

export function crearZipSinCompresion(archivos) {
  const entradas = Object.fromEntries(archivos.map(({ nombre, contenido }) => [nombre, strToU8(contenido)]));
  return new Blob([zipSync(entradas, { level: 0 })], { type: 'application/zip' });
}
