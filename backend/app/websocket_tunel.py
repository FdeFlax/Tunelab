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

    async def avisar_cambio_conexion(self):
        # Este aviso no contiene datos del usuario. Solo dice a las pantallas
        # que vuelvan a consultar el estado real por la API normal.
        desconectadas = []

        for websocket in self.conexiones:
            try:
                await websocket.send_json({"tipo": "conexion_tunel_actualizada"})
            except Exception:
                desconectadas.append(websocket)

        for websocket in desconectadas:
            self.desconectar(websocket)


gestor_websocket_tunel = GestorWebSocketTunel()
