import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import servicioTunel from "../servicios/tunel/tunelApi";
import { conectarTunelApi, desconectarTunelApi, verConexionTunelApi, escucharEventosTunel } from "../servicios/api/controlApi";

export function useTunel() {
  const estadoTunel = useSyncExternalStore(
    servicioTunel.suscribirse,
    servicioTunel.obtenerEstado,
    servicioTunel.obtenerEstado
  );

  return {
    estadoTunel,
    accionesTunel: servicioTunel,
  };
}

export function useConexionTunel() {
  const [conexion, setConexion] = useState(null);
  const [avisoConexion, setAvisoConexion] = useState('');

  const cargarConexion = useCallback(() => {
    return verConexionTunelApi().then(respuesta => {
      setConexion(respuesta);
      setAvisoConexion('');
    }).catch(() => {
      // Una actualización silenciosa no sustituye el aviso de la última orden.
    });
  }, []);

  useEffect(() => {
    void cargarConexion();
    return escucharEventosTunel(cargarConexion);
  }, [cargarConexion]);

  async function conectar() {
    try {
      const respuesta = await conectarTunelApi();
      setConexion(respuesta);
      setAvisoConexion(respuesta.mensaje || '');
    } catch {
      setAvisoConexion('No se ha podido conectar con el túnel');
    }
  }

  async function desconectar({
    mensaje = 'Túnel desconectado',
    error = 'No se ha podido desconectar el túnel',
  } = {}) {
    try {
      const respuesta = await desconectarTunelApi();
      setConexion(respuesta);
      await cargarConexion();
      setAvisoConexion(respuesta.ocupado ? '' : respuesta.mensaje || mensaje);
    } catch {
      setAvisoConexion(error);
    }
  }

  return { conexion, avisoConexion, setAvisoConexion, conectar, desconectar };
}
