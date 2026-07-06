import { API_URL } from "./clienteApi";

function crearUrlWebSocket(ruta) {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}${ruta}`;
  return url.toString();
}

export function escucharEventosTunel(onCambioConexion) {
  const socket = new WebSocket(crearUrlWebSocket("/ws/tunel"));

  socket.addEventListener("message", (evento) => {
    try {
      const datos = JSON.parse(evento.data);

      if (datos.tipo === "conexion_tunel_actualizada") {
        onCambioConexion?.();
      }
    } catch {
      // Si llega algo que no sea JSON, se ignora.
    }
  });

  socket.addEventListener("error", () => {
    // El backend puede no estar disponible durante desarrollo.
    // No rompemos la pantalla por un fallo del canal en tiempo real.
  });

  return () => {
    socket.close();
  };
}
