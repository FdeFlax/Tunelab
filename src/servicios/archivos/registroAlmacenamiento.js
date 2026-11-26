const CLAVE_ARCHIVOS_REGISTRO = "tunelab_registro_archivos_cargados";

export function cargarArchivosRegistroGuardados() {
  try {
    const guardado = sessionStorage.getItem(CLAVE_ARCHIVOS_REGISTRO);
    const archivos = JSON.parse(guardado || "[]");
    return Array.isArray(archivos) ? archivos : [];
  } catch {
    return [];
  }
}

export function guardarArchivosRegistro(archivos) {
  try {
    if (archivos.length) {
      sessionStorage.setItem(CLAVE_ARCHIVOS_REGISTRO, JSON.stringify(archivos));
    } else {
      sessionStorage.removeItem(CLAVE_ARCHIVOS_REGISTRO);
    }
  } catch {
    // Registro sigue funcionando si el navegador no permite persistencia temporal.
  }
}

export function crearClaveEnsayoImportado(ensayo = {}) {
  if (ensayo.id) return `ensayo-${ensayo.id}`;
  // Los archivos antiguos conservan su agrupación aunque no tengan ID.
  return JSON.stringify([ensayo.codigo, ensayo.nombre, ensayo.fecha, ensayo.hora]);
}

export function agruparArchivosPorEnsayo(archivos) {
  const grupos = new Map();

  archivos.forEach((archivo) => {
    const clave = crearClaveEnsayoImportado(archivo.ensayo);

    if (!grupos.has(clave)) {
      grupos.set(clave, {
        id: clave,
        ensayo: archivo.ensayo,
        archivos: [],
        totalMuestras: 0,
      });
    }

    const grupo = grupos.get(clave);
    grupo.archivos.push(archivo);
    grupo.totalMuestras += archivo.medicion?.totalMuestras || 0;
  });

  return Array.from(grupos.values());
}
