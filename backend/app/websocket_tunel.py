from fastapi import WebSocket


class GestorWebSocketTunel:
    def __init__(self):
        self.conexiones: list[WebSocket] = []

    async def conectar(self, websocket: WebSocket):
        await websocket.accept()
        self.conexiones.append(websocket)

    def desconectar(self, websocket: WebSocket):
        if websocket in self.conexiones:
            self.conexiones.remove(websocket)

    async def enviar_a_todos(self, mensaje: dict):
        desconectadas = []

        for websocket in self.conexiones:
            try:
                await websocket.send_json(mensaje)
            except Exception:
                desconectadas.append(websocket)

        for websocket in desconectadas:
            self.desconectar(websocket)

    async def avisar_cambio_conexion(self):
        # Este aviso no contiene datos del usuario. Solo dice a las pantallas
        # que vuelvan a consultar el estado real por la API normal.
        await self.enviar_a_todos({"tipo": "conexion_tunel_actualizada"})

    async def avisar_liberacion_docente(self, usuario_liberado: str | None):
        # Cuando un docente libera el tunel, la pantalla del usuario liberado
        # debe detener su medicion local si estaba midiendo.
        await self.enviar_a_todos({
            "tipo": "tunel_liberado_por_docente",
            "usuario_liberado": usuario_liberado,
        })


gestor_websocket_tunel = GestorWebSocketTunel()

