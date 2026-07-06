import { useEffect, useSyncExternalStore } from "react";
import { FUENTE_TUNEL_ACTIVA, servicioTunel } from "./index";

export function useTunel() {
  useEffect(() => {
    servicioTunel.iniciar();
  }, []);

  const estadoTunel = useSyncExternalStore(
    servicioTunel.suscribirse,
    servicioTunel.obtenerEstado,
    servicioTunel.obtenerEstado
  );

  return {
    estadoTunel,
    accionesTunel: servicioTunel,
    fuenteTunel: FUENTE_TUNEL_ACTIVA,
  };
}
