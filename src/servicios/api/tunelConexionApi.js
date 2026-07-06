import { pedirApi } from "./clienteApi";

export async function verConexionTunelApi() {
  return pedirApi("/tunel/conexion");
}

export async function conectarTunelApi() {
  return pedirApi("/tunel/conectar", {
    method: "POST",
  });
}

export async function desconectarTunelApi() {
  return pedirApi("/tunel/desconectar", {
    method: "POST",
  });
}

export async function desconectarTunelDocenteApi() {
  return pedirApi("/tunel/docente/desconectar", {
    method: "POST",
  });
}
