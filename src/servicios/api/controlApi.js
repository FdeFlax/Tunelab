import { API_URL, leerIdentidadApi, pedirApi } from "./clienteApi";

const guardadosPrograma = new Map();

function enviarPost(ruta, datos) {
  return pedirApi(ruta, {
    method: "POST",
    body: JSON.stringify(datos || {}),
  });
}

export function verEstadoTunelApi() {
  return pedirApi("/tunel/estado");
}

export function aplicarConsignaTunelApi(potenciaPorcentaje) {
  return enviarPost("/tunel/consigna", {
    potencia_porcentaje: potenciaPorcentaje,
  });
}

export function encenderTunelApi() {
  return enviarPost("/tunel/encender", {
    potencia_porcentaje: 0,
  });
}

export function apagarTunelApi() {
  return enviarPost("/tunel/apagar");
}

export function iniciarMedicionTunelApi(datos) {
  return enviarPost("/tunel/medicion/iniciar", datos);
}

export function detenerMedicionTunelApi(medicionId) {
  return enviarPost("/tunel/medicion/detener", { medicion_id: medicionId });
}

export function leerMuestrasCapturaApi(medicionId, despuesDe = 0) {
  return pedirApi(`/tunel/capturas/${medicionId}/muestras?despues_de=${despuesDe}`);
}

export async function leerProgramaEtapasApi(ensayoId) {
  await guardadosPrograma.get(ensayoId)?.catch(() => {});
  return pedirApi(`/tunel/programas/${ensayoId}`);
}

export function guardarProgramaEtapasApi(ensayoId, programa) {
  const anterior = guardadosPrograma.get(ensayoId) || Promise.resolve();
  const guardado = anterior.catch(() => {}).then(() => pedirApi(`/tunel/programas/${ensayoId}`, {
    method: "PUT",
    body: JSON.stringify(programa),
  }));
  guardadosPrograma.set(ensayoId, guardado);
  const limpiar = () => {
    if (guardadosPrograma.get(ensayoId) === guardado) guardadosPrograma.delete(ensayoId);
  };
  void guardado.then(limpiar, limpiar);
  return guardado;
}

export function iniciarProgramaEtapasApi(datos) {
  return enviarPost("/tunel/programa/iniciar", datos);
}

export function detenerProgramaEtapasApi(datos) {
  return enviarPost("/tunel/programa/detener", datos);
}

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

function crearUrlWebSocket(ruta) {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}${ruta}`;
  const identidad = leerIdentidadApi();
  if (identidad?.identificador) {
    url.searchParams.set("perfil_demo", identidad.identificador);
  }
  return url.toString();
}

export function escucharEventosTunel(onCambioConexion, onLiberacionDocente) {
  const socket = new WebSocket(crearUrlWebSocket("/ws/tunel"));

  socket.addEventListener("message", (evento) => {
    try {
      const datos = JSON.parse(evento.data);

      if (datos.tipo === "conexion_tunel_actualizada") {
        if (onCambioConexion) {
          onCambioConexion();
        }
      }

      if (datos.tipo === "tunel_liberado_por_docente") {
        if (onLiberacionDocente) {
          onLiberacionDocente(datos);
        }
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
