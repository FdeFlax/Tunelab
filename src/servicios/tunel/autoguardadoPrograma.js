export function validarPrograma(programa) {
  if (!programa.nombre.trim()) return "Escribe el nombre de la medición.";
  if (programa.nombre.trim().length > 40) return "El nombre admite hasta 40 caracteres.";
  if (!programa.etapas.length || programa.etapas.length > 15) return "La medición admite de 1 a 15 etapas.";
  for (const etapa of programa.etapas) {
    if (!Number.isFinite(etapa.consigna) || etapa.consigna < 1 || etapa.consigna > 100) {
      return "La consigna debe estar entre 1 y 100 %.";
    }
    if (!Number.isInteger(etapa.duracion_segundos) || etapa.duracion_segundos < 1 || etapa.duracion_segundos > 3600) {
      return "El tiempo estable debe ser un número entero entre 1 y 3600 segundos.";
    }
  }
  return "";
}

export function crearAutoguardadoPrograma({ guardar, onGuardado, onError, onGuardando = () => {}, espera = 500 }) {
  let temporizador = null;
  let pendiente = null;
  let enCurso = null;
  let cerrado = false;

  function guardarAhora() {
    clearTimeout(temporizador);
    temporizador = null;
    if (enCurso || !pendiente) return enCurso || Promise.resolve();
    const datos = pendiente;
    pendiente = null;
    if (!cerrado) onGuardando(true);
    enCurso = guardar(datos)
      .then(respuesta => { if (!cerrado) onGuardado(respuesta); })
      .catch(error => { if (!cerrado) onError(error); })
      .finally(() => {
        enCurso = null;
        if (pendiente && !temporizador) return guardarAhora();
        if (!cerrado) onGuardando(false);
      });
    return enCurso;
  }

  return {
    programar(datos) {
      pendiente = datos;
      clearTimeout(temporizador);
      temporizador = datos ? setTimeout(guardarAhora, espera) : null;
    },
    guardarAhora,
    cerrar() {
      cerrado = true;
      if (enCurso && pendiente) {
        const datos = pendiente;
        pendiente = null;
        clearTimeout(temporizador);
        temporizador = null;
        return Promise.allSettled([enCurso, guardar(datos)]);
      }
      return guardarAhora();
    },
  };
}
