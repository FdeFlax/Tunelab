import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leerIdentidadApi } from '../servicios/api/clienteApi';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  asegurarUsuarioApi,
  listarEnsayosApi,
  listarMedicionesEnsayoApi,
  cargarMedicionApiCompleta,
} from "../servicios/api/registroApi";
import { crearEnsayoDesdeApi } from "../servicios/mediciones/adaptarRegistros";

export function useCatalogoEnsayos({ listarEnsayos, listarMediciones, precargar = false, mensajeError }) {
  const [ensayos, setEnsayos] = useState([]);
  const [seleccion, seleccionarEnsayo] = useState(null);
  const [medicionId, seleccionarMedicion] = useState(null);
  const [porEnsayo, setPorEnsayo] = useState({});
  const [revision, setRevision] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const generacion = useRef(0);
  const cancelarCargas = useCallback(() => { generacion.current++; }, []);

  const recargar = useCallback(async ({ mantenerSeleccion = true } = {}) => {
    const version = ++generacion.current;
    setCargando(true);
    try {
      const lista = await listarEnsayos();
      if (version !== generacion.current) return;
      setEnsayos(lista);
      if (!precargar) setPorEnsayo({});
      setError("");
      seleccionarEnsayo(actual => mantenerSeleccion && lista.some(e => e.id === actual) ? actual : lista[0]?.id ?? null);
      setRevision(actual => actual + 1);
      if (precargar) {
        const pares = await Promise.all(lista.map(async e => [e.id, await listarMediciones(e.id).catch(() => [])]));
        if (version === generacion.current) setPorEnsayo(Object.fromEntries(pares));
      }
    } catch {
      if (version === generacion.current) setError(mensajeError);
    } finally {
      if (version === generacion.current) setCargando(false);
    }
  }, [listarEnsayos, listarMediciones, mensajeError, precargar]);

  useEffect(() => {
    const refrescar = () => { if (!document.hidden) void recargar(); };
    void recargar();
    window.addEventListener("focus", refrescar);
    window.addEventListener("tunelab:registro-actualizado", refrescar);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      cancelarCargas();
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("tunelab:registro-actualizado", refrescar);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [recargar, cancelarCargas]);

  useEffect(() => {
    if (!seleccion || precargar) return;
    let vigente = true;
    listarMediciones(seleccion).then(lista => {
      if (vigente) setPorEnsayo(actual => ({ ...actual, [seleccion]: lista }));
    }).catch(() => {
      if (vigente) setPorEnsayo(actual => ({ ...actual, [seleccion]: [] }));
    });
    return () => { vigente = false; };
  }, [seleccion, revision, precargar, listarMediciones]);

  const ensayo = ensayos.find(e => e.id === seleccion) || null;
  const mediciones = useMemo(() => ensayo ? porEnsayo[ensayo.id] || [] : [], [ensayo, porEnsayo]);
  const medicion = mediciones.find(m => m.id === medicionId) || null;
  const conteos = useMemo(() => Object.fromEntries(ensayos.map(e => [e.id,
    porEnsayo[e.id]?.length ?? Number(e.total_mediciones || 0),
  ])), [ensayos, porEnsayo]);

  function setEnsayoId(id) {
    seleccionarEnsayo(id);
    seleccionarMedicion(null);
  }

  function setMediciones(cambio) {
    setPorEnsayo(actual => ({ ...actual, [seleccion]: typeof cambio === "function" ? cambio(actual[seleccion] || []) : cambio }));
  }

  return { ensayos, setEnsayos, ensayo, setEnsayoId, mediciones, setMediciones,
    medicion, medicionId, setMedicionId: seleccionarMedicion, porEnsayo, conteos,
    error, setError, cargando, recargar, setRevision };
}

export function useDetalleMedicion(medicionApiSeleccionada, usaApi = true, cargar = cargarMedicionApiCompleta) {
  const cliente = useQueryClient();
  const clave = ['detalle-medicion', leerIdentidadApi()?.identificador,
    cargar === cargarMedicionApiCompleta ? 'registro' : 'docente', medicionApiSeleccionada?.id];
  const consulta = useQuery({
    queryKey: clave,
    queryFn: ({ signal }) => cargar(medicionApiSeleccionada, signal),
    enabled: Boolean(usaApi && medicionApiSeleccionada?.id),
  });
  return {
    medicionApiDetalle: usaApi && medicionApiSeleccionada ? consulta.data ?? null : null,
    setMedicionApiDetalle: cambio => cliente.setQueryData(clave, cambio),
    errorDetalle: usaApi && medicionApiSeleccionada && consulta.isError ? 'No se han podido cargar las muestras de esta medición.' : '',
    cargandoDetalle: consulta.isLoading,
  };
}

export function useEnsayosPersistidos(usuario, accionesTunel) {
  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;

    async function cargar() {
      try {
        await asegurarUsuarioApi(usuario);
        if (cancelado) return;
        const ensayos = await listarEnsayosApi();
        if (cancelado) return;

        const guardados = await Promise.all(ensayos.map(async ensayo => {
          const mediciones = await listarMedicionesEnsayoApi(ensayo.id);
          if (cancelado) return null;
          return crearEnsayoDesdeApi(ensayo, mediciones);
        }));

        if (!cancelado) accionesTunel.cargarEnsayosPersistidos?.(guardados);
      } catch (error) {
        if (!cancelado) console.warn('No se han podido recuperar los ensayos guardados.', error);
      }
    }

    void cargar();
    return () => { cancelado = true; };
  }, [usuario, accionesTunel]);
}
