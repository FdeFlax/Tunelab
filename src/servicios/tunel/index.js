import tunelReal from "./tunelReal";
import tunelSimulado from "./tunelSimulado";

export const FUENTE_TUNEL_ACTIVA =
  import.meta.env.VITE_FUENTE_TUNEL === "real"
    ? "real"
    : "simulado";

export const servicioTunel =
  FUENTE_TUNEL_ACTIVA === "real"
    ? tunelReal
    : tunelSimulado;
