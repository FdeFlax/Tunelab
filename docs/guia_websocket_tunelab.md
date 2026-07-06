# Guia para entender los WebSocket de Tunelab

Este documento explica, con lenguaje sencillo, que son los WebSocket, por que se han usado en Tunelab y como estan implementados exactamente en el proyecto.

La idea es que puedas entenderlo de verdad y explicarlo en una defensa, no solo memorizar nombres de archivos.

---

## 1. El problema que habia que resolver

En la aplicacion hay una situacion importante: el tunel de viento solo puede estar controlado por una persona al mismo tiempo.

Ejemplo:

1. Un alumno abre la pagina de Control.
2. Otro alumno abre tambien la pagina de Control.
3. Un profesor tiene abierta la pagina Docente.
4. Si el primer alumno pulsa Conectar, los demas deberian enterarse de que el tunel esta ocupado.
5. Si el profesor desconecta al usuario, los demas deberian enterarse de que el tunel vuelve a estar libre.

Antes de usar WebSocket, una pantalla podia quedarse desactualizada hasta recargar la pagina.

Por ejemplo:

- Alumno A conecta el tunel.
- Alumno B tiene la web abierta.
- Alumno B no ve el cambio hasta que recarga.

Eso no es ideal en una aplicacion de laboratorio, porque el estado de uso del tunel debe ser compartido.

---

## 2. Que es una peticion normal de API

Antes de entender WebSocket, hay que entender la API normal.

Una peticion normal funciona asi:

```text
Frontend pregunta al backend -> backend responde -> termina la conexion
```

Ejemplo real de tu proyecto:

```text
GET /api/tunel/conexion
```

Esa peticion sirve para preguntar:

```text
El tunel esta libre u ocupado ahora mismo?
```

El backend responde algo parecido a:

```json
{
  "conectado": false,
  "ocupado": true,
  "mensaje": "Tunel ocupado por otro usuario"
}
```

El problema es que esa peticion solo responde en ese momento. Si cinco segundos despues otro usuario desconecta el tunel, el frontend no se entera automaticamente.

Para enterarse tendria dos opciones:

1. Recargar la pagina.
2. Preguntar al backend cada pocos segundos.

La segunda opcion se llama polling.

---

## 3. Que es polling y por que no era lo ideal

Polling seria hacer esto:

```text
Cada 1 segundo -> preguntar /api/tunel/conexion
Cada 1 segundo -> preguntar /api/tunel/conexion
Cada 1 segundo -> preguntar /api/tunel/conexion
```

Eso funciona, pero tiene un problema: se hacen muchas peticiones aunque no haya cambiado nada.

Ejemplo:

- 20 alumnos con la web abierta.
- Cada uno pregunta cada segundo.
- Serian 20 peticiones por segundo solo para saber si el tunel sigue igual.

Para este proyecto no seria una catastrofe, pero no es lo mas limpio si solo queremos avisar cuando algo cambia.

Por eso se uso WebSocket.

---

## 4. Que es un WebSocket explicado facil

Un WebSocket es una conexion que se queda abierta entre el navegador y el backend.

La diferencia seria esta:

```text
API normal:
Frontend pregunta -> backend responde -> se cierra

WebSocket:
Frontend se conecta -> la conexion queda abierta -> el backend puede avisar cuando pase algo
```

Una forma sencilla de verlo:

- API normal: como mandar un mensaje y esperar respuesta.
- WebSocket: como dejar una llamada abierta para que te avisen si ocurre algo.

En Tunelab, el WebSocket no controla el tunel directamente. Solo se usa como aviso.

El mensaje que manda es:

```json
{"tipo": "conexion_tunel_actualizada"}
```

Ese mensaje significa:

```text
Ha cambiado algo en la conexion del tunel. Vuelve a consultar el estado real.
```

---

## 5. Idea importante: WebSocket no sustituye a la API

Esto es clave para explicarlo bien.

En Tunelab hay dos mecanismos:

| Mecanismo | Para que sirve |
|---|---|
| API REST normal | Consultar datos reales, guardar ensayos, crear mediciones, conectar y desconectar el tunel |
| WebSocket | Avisar a las pantallas de que deben refrescar el estado del tunel |

El WebSocket no guarda ensayos.

El WebSocket no crea mediciones.

El WebSocket no envia la informacion completa del usuario.

El WebSocket solo dice:

```text
Oye, ha cambiado el estado de conexion del tunel.
```

Despues de recibir ese aviso, cada pantalla llama otra vez a la API normal.

---

## 6. Archivos que intervienen

En tu proyecto intervienen estos archivos:

| Archivo | Parte | Que hace |
|---|---|---|
| `backend/app/websocket_tunel.py` | Backend | Guarda las conexiones abiertas y envia avisos |
| `backend/app/rutas.py` | Backend | Define la ruta `/ws/tunel` y llama al aviso cuando alguien conecta/desconecta |
| `src/servicios/api/tunelEventosApi.js` | Frontend | Abre el WebSocket desde el navegador y recibe mensajes |
| `src/pages/PaginaControl2.jsx` | Frontend | Escucha avisos y actualiza el estado de conexion en Control |
| `src/pages/PaginaDashboard2.jsx` | Frontend | Escucha avisos y actualiza el estado en Dashboard |
| `src/pages/PaginaDocente.jsx` | Frontend | Escucha avisos y actualiza quien esta usando el tunel |

---

## 7. Backend: gestor de WebSocket

Archivo:

```text
backend/app/websocket_tunel.py
```

Este archivo contiene una clase llamada:

```python
class GestorWebSocketTunel:
```

Esta clase es como una pequena centralita.

Su trabajo es:

1. Guardar que pantallas estan conectadas.
2. Quitar pantallas que se desconectan.
3. Avisar a todas cuando cambia el estado del tunel.

La lista de conexiones es esta:

```python
self.conexiones: list[WebSocket] = []
```

Eso significa:

```text
Aqui guardo todos los navegadores que ahora mismo estan escuchando avisos del tunel.
```

---

## 8. Cuando una pantalla se conecta al WebSocket

En el backend aparece esto:

```python
async def conectar(self, websocket: WebSocket):
    await websocket.accept()
    self.conexiones.append(websocket)
```

Explicacion linea a linea:

```python
async def conectar(self, websocket: WebSocket):
```

Define una funcion asincrona. Es asincrona porque las conexiones WebSocket funcionan esperando mensajes sin bloquear el servidor.

```python
await websocket.accept()
```

Acepta la conexion del navegador.

Es como decir:

```text
Vale, navegador, te dejo conectarte a este canal.
```

```python
self.conexiones.append(websocket)
```

Guarda esa conexion en la lista.

Asi, cuando haya que avisar, el backend sabe a quien mandar el mensaje.

---

## 9. Cuando una pantalla se desconecta

El backend tiene esto:

```python
def desconectar(self, websocket: WebSocket):
    if websocket in self.conexiones:
        self.conexiones.remove(websocket)
```

Esto elimina de la lista una pantalla que ya no esta conectada.

Puede pasar si:

- El usuario cierra la pestaña.
- Cambia de pagina.
- Se pierde la conexion.
- El backend detecta que esa conexion ya no responde.

---

## 10. Como se avisa a todas las pantallas

La funcion importante es esta:

```python
async def avisar_cambio_conexion(self):
```

Dentro se recorre la lista de conexiones:

```python
for websocket in self.conexiones:
```

Y a cada una se le envia este mensaje:

```python
await websocket.send_json({"tipo": "conexion_tunel_actualizada"})
```

Ese es el mensaje principal de todo el sistema WebSocket.

No manda datos del ensayo.

No manda contrasenas.

No manda informacion completa del usuario.

Solo manda un aviso:

```json
{
  "tipo": "conexion_tunel_actualizada"
}
```

Esto esta hecho asi por seguridad y simplicidad.

El mensaje solo significa:

```text
El estado de conexion del tunel ha cambiado. Vuelve a preguntarlo por API.
```

---

## 11. Por que el mensaje no contiene todos los datos

Podria haberse enviado directamente algo asi:

```json
{
  "tipo": "conexion_tunel_actualizada",
  "ocupado": true,
  "usuario": "Alumno Demo"
}
```

Pero se eligio no hacerlo asi.

La razon es que es mas limpio que el WebSocket solo avise y que la API REST siga siendo la fuente de datos real.

Ventajas:

- Se evita duplicar logica.
- Se evita mandar mas datos de los necesarios.
- Todas las pantallas consultan el mismo endpoint.
- Si cambia la forma de calcular si el tunel esta ocupado, se cambia en un solo sitio.

El endpoint que da el estado real es:

```text
GET /api/tunel/conexion
```

---

## 12. La ruta WebSocket en FastAPI

Archivo:

```text
backend/app/rutas.py
```

La ruta es:

```python
@router.websocket("/ws/tunel")
async def websocket_tunel(websocket: WebSocket):
```

Esto crea el canal WebSocket.

Como en `main.py` las rutas tienen prefijo `/api`, la URL final es:

```text
ws://127.0.0.1:8010/api/ws/tunel
```

En local, si el backend esta en:

```text
http://127.0.0.1:8010/api
```

El WebSocket se abre en:

```text
ws://127.0.0.1:8010/api/ws/tunel
```

Si algun dia esta en HTTPS, se usaria:

```text
wss://...
```

`wss` es la version segura de `ws`, igual que `https` es la version segura de `http`.

---

## 13. Que pasa dentro de la ruta WebSocket

En `backend/app/rutas.py` aparece:

```python
await gestor_websocket_tunel.conectar(websocket)
```

Esto guarda la conexion del navegador en la lista.

Luego aparece:

```python
await websocket.send_json({"tipo": "conexion_tunel_actualizada"})
```

Esto manda un primer aviso nada mas conectarse.

Por que se hace?

Para que al abrir la pagina, el frontend refresque el estado del tunel desde el principio.

Despues aparece:

```python
while True:
    await websocket.receive_text()
```

Esto mantiene la conexion abierta.

Aunque el frontend no mande mensajes importantes, el backend se queda esperando. Asi no se cierra el canal.

Si el navegador se desconecta, se captura aqui:

```python
except WebSocketDisconnect:
    gestor_websocket_tunel.desconectar(websocket)
```

Eso limpia la conexion de la lista.

---

## 14. Donde se dispara el aviso en el backend

El aviso se dispara cuando cambia el uso del tunel.

En `backend/app/rutas.py`, despues de conectar el tunel:

```python
await gestor_websocket_tunel.avisar_cambio_conexion()
```

Tambien se llama despues de desconectar:

```python
await gestor_websocket_tunel.avisar_cambio_conexion()
```

Y tambien cuando un docente libera el tunel:

```python
await gestor_websocket_tunel.avisar_cambio_conexion()
```

Por tanto, los momentos importantes son:

| Accion | Endpoint | Hay aviso WebSocket? |
|---|---|---|
| Usuario conecta el tunel | `POST /api/tunel/conectar` | Si |
| Usuario desconecta el tunel | `POST /api/tunel/desconectar` | Si |
| Docente libera el tunel | `POST /api/tunel/docente/desconectar` | Si |

---

## 15. Frontend: donde se abre el WebSocket

Archivo:

```text
src/servicios/api/tunelEventosApi.js
```

La funcion principal es:

```javascript
export function escucharEventosTunel(onCambioConexion) {
```

Esta funcion recibe otra funcion como parametro.

Ese parametro se llama:

```javascript
onCambioConexion
```

Significa:

```text
Funcion que quiero ejecutar cuando el backend avise de que cambio la conexion del tunel.
```

---

## 16. Como el frontend construye la URL del WebSocket

En el frontend aparece:

```javascript
function crearUrlWebSocket(ruta) {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}${ruta}`;
  return url.toString();
}
```

Explicacion sencilla:

```javascript
const url = new URL(API_URL);
```

Coge la URL base de la API.

Por ejemplo:

```text
http://127.0.0.1:8010/api
```

```javascript
url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
```

Cambia el protocolo.

Si la API usa:

```text
http
```

el WebSocket usa:

```text
ws
```

Si la API usa:

```text
https
```

el WebSocket usa:

```text
wss
```

```javascript
url.pathname = `${url.pathname.replace(/\/$/, "")}${ruta}`;
```

Une la ruta base de la API con `/ws/tunel`.

Resultado en local:

```text
ws://127.0.0.1:8010/api/ws/tunel
```

---

## 17. Como el frontend abre la conexion

En `tunelEventosApi.js` aparece:

```javascript
const socket = new WebSocket(crearUrlWebSocket("/ws/tunel"));
```

Esto abre la conexion WebSocket.

A partir de ese momento, el navegador queda escuchando mensajes del backend.

---

## 18. Como el frontend recibe mensajes

El frontend escucha mensajes asi:

```javascript
socket.addEventListener("message", (evento) => {
```

Esto significa:

```text
Cuando llegue un mensaje desde el backend, ejecuta este codigo.
```

El mensaje llega como texto, por eso se convierte a objeto:

```javascript
const datos = JSON.parse(evento.data);
```

Si el backend mando esto:

```json
{"tipo": "conexion_tunel_actualizada"}
```

Despues de `JSON.parse`, el frontend tiene esto:

```javascript
datos.tipo
```

con valor:

```text
conexion_tunel_actualizada
```

Entonces se comprueba:

```javascript
if (datos.tipo === "conexion_tunel_actualizada") {
  onCambioConexion?.();
}
```

Eso significa:

```text
Si el mensaje dice que cambio la conexion del tunel, ejecuta la funcion que me pasaron.
```

---

## 19. Que significa onCambioConexion?.()

Esta linea puede parecer rara:

```javascript
onCambioConexion?.();
```

Es una forma corta de decir:

```javascript
if (onCambioConexion) {
  onCambioConexion();
}
```

Es decir:

```text
Si existe la funcion onCambioConexion, ejecutala.
```

El simbolo `?.` evita error si no se ha pasado ninguna funcion.

---

## 20. Que funcion se ejecuta realmente en Control

Archivo:

```text
src/pages/PaginaControl2.jsx
```

En Control hay una funcion que consulta el estado del tunel:

```javascript
async function cargarConexion(silencioso = false) {
  const respuesta = await verConexionTunelApi();
  setConexion(respuesta);
}
```

Explicado sencillo:

```text
Pregunto al backend si el tunel esta libre, ocupado o conectado a mi sesion.
Guardo la respuesta en el estado de React.
La pantalla se actualiza.
```

Luego Control abre el WebSocket:

```javascript
useEffect(() => {
  void cargarConexion();

  return escucharEventosTunel(() => {
    void cargarConexion(true);
  });
}, []);
```

Esto significa:

1. Al abrir Control, primero consulta el estado del tunel.
2. Luego se queda escuchando WebSocket.
3. Si llega el aviso `conexion_tunel_actualizada`, vuelve a ejecutar `cargarConexion(true)`.
4. Al salir de la pantalla, se cierra el WebSocket.

---

## 21. Que funcion se ejecuta en Dashboard

Archivo:

```text
src/pages/PaginaDashboard2.jsx
```

Dashboard tambien tiene una funcion parecida:

```javascript
async function cargarConexionTunel() {
  const respuesta = await verConexionTunelApi();
  setConexionTunel(respuesta);
}
```

Y escucha el WebSocket asi:

```javascript
const cerrarEventosTunel = escucharEventosTunel(cargarConexionTunel);
```

Eso quiere decir:

```text
Cuando llegue un aviso por WebSocket, Dashboard vuelve a consultar el estado del tunel.
```

Por eso en Dashboard se puede mostrar si el tunel esta libre u ocupado.

---

## 22. Que funcion se ejecuta en Docente

Archivo:

```text
src/pages/PaginaDocente.jsx
```

Docente tiene:

```javascript
async function cargarConexionTunel() {
  const respuesta = await verConexionTunelApi();
  setConexionTunel(respuesta);
}
```

Y en el `useEffect`:

```javascript
return escucharEventosTunel(() => {
  void cargarConexionTunel();
});
```

Esto permite que la pantalla docente se actualice cuando otro usuario conecta o desconecta el tunel.

Asi el profesor puede ver quien esta usando el tunel sin recargar manualmente.

---

## 23. Flujo completo con un ejemplo real

Ejemplo: Alumno A conecta el tunel y Profesor tiene abierta la pagina docente.

### Paso 1

Profesor abre la pagina Docente.

El frontend ejecuta:

```javascript
escucharEventosTunel(...)
```

Esto abre:

```text
ws://127.0.0.1:8010/api/ws/tunel
```

El backend guarda esa conexion.

### Paso 2

Alumno A pulsa Conectar en Control.

El frontend llama a:

```text
POST /api/tunel/conectar
```

### Paso 3

El backend comprueba si el tunel esta libre.

Si esta libre:

- Guarda en MySQL que el tunel esta conectado.
- Guarda que usuario lo esta usando.
- Guarda la fecha de conexion.

### Paso 4

El backend llama a:

```python
await gestor_websocket_tunel.avisar_cambio_conexion()
```

### Paso 5

El gestor WebSocket manda a todas las pantallas:

```json
{"tipo": "conexion_tunel_actualizada"}
```

### Paso 6

La pagina Docente recibe el mensaje.

Entonces ejecuta:

```javascript
cargarConexionTunel()
```

### Paso 7

Docente llama a:

```text
GET /api/tunel/conexion
```

### Paso 8

El backend responde:

```text
Tunel ocupado por Alumno A
```

### Paso 9

La pantalla docente se actualiza.

---

## 24. Por que se hizo asi y no de otra forma

Se hizo asi porque separa muy bien dos responsabilidades:

### API REST

La API REST hace las operaciones importantes:

- conectar tunel;
- desconectar tunel;
- consultar estado;
- guardar ensayos;
- guardar mediciones;
- borrar datos;
- consultar historial.

### WebSocket

El WebSocket solo avisa:

- ha cambiado la conexion del tunel.

Esto hace que el sistema sea mas facil de mantener.

Si algun dia cambia el formato de respuesta de `/api/tunel/conexion`, no hace falta cambiar el WebSocket.

---

## 25. Que significa que el WebSocket sea un aviso y no la fuente de datos

La fuente de datos real sigue siendo MySQL y la API.

El WebSocket no decide si el tunel esta ocupado.

El WebSocket no calcula quien es el propietario.

El WebSocket no guarda nada.

Solo despierta a las pantallas.

Una frase sencilla para explicarlo:

```text
El WebSocket funciona como un timbre. Cuando alguien cambia el estado del tunel, el backend toca el timbre y todas las pantallas vuelven a mirar el estado real en la API.
```

---

## 26. Relacion con MySQL

El estado de conexion del tunel se guarda en base de datos mediante la tabla relacionada con `UsoTunel`.

Cuando un usuario conecta:

- se marca `conectado = True`;
- se guarda el usuario;
- se guarda la fecha de conexion.

Cuando desconecta:

- se marca `conectado = False`;
- se limpia el usuario;
- se limpia la fecha de conexion.

Despues de guardar esos cambios, se avisa por WebSocket.

Orden correcto:

```text
1. Cambiar datos en MySQL
2. Confirmar cambios
3. Avisar por WebSocket
4. Las pantallas consultan de nuevo la API
```

Ese orden es importante porque evita que una pantalla refresque antes de que la base de datos este actualizada.

---

## 27. Relacion con eServices

Cuando la app se integre con eServices, la idea del WebSocket no cambia demasiado.

Lo que cambiara sera principalmente:

- la URL final del backend;
- si se usa `ws://` o `wss://`;
- como se identifica el usuario real;
- el dominio permitido por CORS;
- la cadena de conexion a MySQL.

Pero el concepto sigue igual:

```text
Usuario conecta o desconecta el tunel -> backend actualiza base de datos -> backend avisa por WebSocket -> pantallas refrescan.
```

En produccion, si la web usa HTTPS, el WebSocket deberia usar WSS.

Ejemplo:

```text
https://... para API normal
wss://... para WebSocket seguro
```

---

## 28. Que se puede decir en la memoria

Una redaccion posible seria:

> Para mejorar la sincronizacion entre las distintas pantallas de la aplicacion se incorporo un canal WebSocket entre el frontend y el backend. Este canal no se utiliza para transmitir toda la informacion del sistema, sino como mecanismo de notificacion. Cuando cambia el estado de conexion del tunel, por ejemplo al conectar, desconectar o liberar el uso desde la vista docente, el backend envia un mensaje a los clientes conectados. Al recibirlo, cada vista consulta de nuevo el estado actualizado mediante la API REST. De esta forma se evita depender de recargas manuales o de consultas periodicas constantes, manteniendo separada la logica de datos de la logica de avisos en tiempo real.

---

## 29. Como explicarlo en una defensa oral

Si te preguntan:

### Que es el WebSocket en tu proyecto?

Puedes responder:

> Es un canal en tiempo real entre el navegador y el backend. Lo uso para avisar a las pantallas cuando cambia el estado de conexion del tunel.

### Para que lo usas exactamente?

> Lo uso para que Control, Dashboard y Docente sepan si el tunel ha pasado a estar libre u ocupado sin tener que recargar la pagina.

### Envia datos del tunel en tiempo real?

> Actualmente no. De momento solo envia un aviso de cambio de conexion. Los datos reales se consultan despues mediante la API REST.

### Por que no usaste solo peticiones normales?

> Porque las peticiones normales solo responden en el momento en que se hacen. Si otro usuario cambia el estado del tunel, las demas pantallas no se enterarian hasta recargar o hacer polling.

### Por que no usaste polling?

> Porque implicaria preguntar al backend de forma repetida aunque no hubiera cambios. Con WebSocket, el backend avisa solo cuando ocurre algo relevante.

### Que mensaje se manda?

> Se manda un JSON sencillo: `{ "tipo": "conexion_tunel_actualizada" }`.

### Que hace el frontend cuando recibe ese mensaje?

> Vuelve a llamar al endpoint `/api/tunel/conexion` para consultar el estado real del tunel.

---

## 30. Resumen muy corto

La implementacion WebSocket de Tunelab hace esto:

```text
1. Las pantallas abren una conexion WebSocket con el backend.
2. El backend guarda esas conexiones.
3. Cuando alguien conecta o desconecta el tunel, el backend actualiza MySQL.
4. Despues manda un aviso a todas las pantallas.
5. Las pantallas reciben el aviso.
6. Cada pantalla consulta de nuevo /api/tunel/conexion.
7. La interfaz se actualiza sin recargar la pagina.
```

La frase clave es:

```text
El WebSocket no guarda ni calcula los datos: solo avisa de que hay que refrescarlos.
```

---

## 31. Que partes deberias saber senalar en el codigo

Si tienes que mostrar codigo, ensena estos puntos:

### Backend: gestor

```text
backend/app/websocket_tunel.py
```

Aqui puedes decir:

> Este archivo guarda las conexiones WebSocket abiertas y contiene la funcion que avisa a todas las pantallas.

### Backend: ruta

```text
backend/app/rutas.py
```

Aqui puedes decir:

> Esta ruta crea el canal `/ws/tunel` y tambien llama al aviso cuando cambia la conexion del tunel.

### Frontend: cliente WebSocket

```text
src/servicios/api/tunelEventosApi.js
```

Aqui puedes decir:

> Este archivo abre la conexion WebSocket desde el navegador y ejecuta una funcion cuando llega el mensaje de actualizacion.

### Frontend: paginas que lo usan

```text
src/pages/PaginaControl2.jsx
src/pages/PaginaDashboard2.jsx
src/pages/PaginaDocente.jsx
```

Aqui puedes decir:

> Estas paginas usan el WebSocket para refrescar el estado del tunel cuando otro usuario conecta o desconecta.

---

## 32. Limitaciones actuales

La implementacion actual es suficiente para sincronizar el estado de conexion del tunel, pero tiene limites:

- No se usa todavia para telemetria en tiempo real.
- No envia velocidad, temperatura ni potencia.
- No diferencia tipos de evento mas alla de `conexion_tunel_actualizada`.
- No incluye reconexion avanzada si el backend se reinicia.

Para el estado actual del proyecto esto no es necesariamente malo. Al contrario: mantiene el sistema sencillo.

---

## 33. Mejoras futuras posibles

En un futuro se podria ampliar para:

- avisar cuando se inicia una medicion;
- avisar cuando se finaliza una medicion;
- enviar alarmas en tiempo real;
- actualizar datos de velocidad, temperatura y potencia;
- mostrar a docentes que alumno esta midiendo en ese momento;
- bloquear acciones en varias pantallas simultaneamente;
- implementar reconexion automatica si se pierde el WebSocket.

Pero para tu TFG puedes defender que se ha implementado primero el caso mas importante: la coordinacion del uso unico del tunel.

---

## 34. Esquema visual sencillo

```text
        Alumno A pulsa Conectar
                  |
                  v
        POST /api/tunel/conectar
                  |
                  v
        Backend actualiza MySQL
                  |
                  v
        avisar_cambio_conexion()
                  |
                  v
  WebSocket envia conexion_tunel_actualizada
                  |
      -----------------------------
      |             |             |
      v             v             v
   Control      Dashboard      Docente
      |             |             |
      v             v             v
 GET /tunel   GET /tunel    GET /tunel
 /conexion    /conexion     /conexion
      |             |             |
      v             v             v
 Pantallas actualizadas sin recargar
```

---

## 35. Idea final para quedarte tranquilo

No tienes que verlo como algo enorme.

En tu proyecto WebSocket es simplemente esto:

```text
Un canal abierto para avisar a todas las pantallas de que el estado del tunel ha cambiado.
```

Y el funcionamiento real se resume asi:

```text
Backend: "ha cambiado la conexion"
Frontend: "vale, vuelvo a preguntar el estado real"
```

Ese es el corazon de la implementacion.
