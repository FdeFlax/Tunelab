function crearTablaCrc32() {
  const tabla = [];

  for (let i = 0; i < 256; i += 1) {
    let crc = i;

    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    tabla.push(crc >>> 0);
  }

  return tabla;
}

const TABLA_CRC32 = crearTablaCrc32();

function calcularCrc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = TABLA_CRC32[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function escribirUint16(valor) {
  return new Uint8Array([valor & 0xff, (valor >>> 8) & 0xff]);
}

function escribirUint32(valor) {
  return new Uint8Array([
    valor & 0xff,
    (valor >>> 8) & 0xff,
    (valor >>> 16) & 0xff,
    (valor >>> 24) & 0xff,
  ]);
}

function crearEntradaZip(nombre, contenido, posicion) {
  const codificador = new TextEncoder();
  const nombreBytes = codificador.encode(nombre);
  const contenidoBytes = codificador.encode(contenido);
  const crc = calcularCrc32(contenidoBytes);
  const cabeceraLocal = new Uint8Array([
    ...escribirUint32(0x04034b50),
    ...escribirUint16(20),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(crc),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint16(nombreBytes.length),
    ...escribirUint16(0),
    ...nombreBytes,
  ]);
  const cabeceraCentral = new Uint8Array([
    ...escribirUint32(0x02014b50),
    ...escribirUint16(20),
    ...escribirUint16(20),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(crc),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint32(contenidoBytes.length),
    ...escribirUint16(nombreBytes.length),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint32(0),
    ...escribirUint32(posicion),
    ...nombreBytes,
  ]);

  return {
    local: new Blob([cabeceraLocal, contenidoBytes]),
    central: cabeceraCentral,
    tamanoLocal: cabeceraLocal.length + contenidoBytes.length,
  };
}

export function crearZipSinCompresion(archivos) {
  let posicion = 0;
  const locales = [];
  const centrales = [];

  archivos.forEach(({ nombre, contenido }) => {
    const archivo = crearEntradaZip(nombre, contenido, posicion);
    locales.push(archivo.local);
    centrales.push(archivo.central);
    posicion += archivo.tamanoLocal;
  });

  const tamanoCentral = centrales.reduce((total, central) => total + central.length, 0);
  const finCentral = new Uint8Array([
    ...escribirUint32(0x06054b50),
    ...escribirUint16(0),
    ...escribirUint16(0),
    ...escribirUint16(centrales.length),
    ...escribirUint16(centrales.length),
    ...escribirUint32(tamanoCentral),
    ...escribirUint32(posicion),
    ...escribirUint16(0),
  ]);

  return new Blob([...locales, ...centrales, finCentral], { type: "application/zip" });
}
