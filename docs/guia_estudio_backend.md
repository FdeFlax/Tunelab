# Guia de estudio del backend de Tunelab

Este documento es para entender el backend del proyecto sin dar por hecho que ya sabes que es una API, FastAPI, SQLAlchemy o MySQL. La idea es que puedas explicar en el TFG que hace cada parte, por que esta ahi y como se conecta con la web.

## 1. Idea general

La aplicacion tiene dos partes principales:

- Frontend: la parte visual hecha con React. Es lo que ves en el navegador: Dashboard, Ensayo, Control, Registro e Inspeccion.
- Backend: la parte de servidor hecha con FastAPI. No se ve directamente, pero recibe peticiones del frontend y guarda/lee datos en MySQL.

El backend esta en:

```text
C:\app\nuevo_tunelviento_app\backend
```

Su trabajo principal ahora mismo es:

- Recibir ensayos creados desde la pantalla de Ensayo.
- Guardar mediciones cuando se detiene una medicion en Control.
- Guardar muestras de cada medicion.
- Guardar eventos o incidencias.
- Devolver los ensayos y mediciones para que Registro pueda mostrarlos.
- Separar los datos por usuario, pensando en UACloud/eServices.

La idea resumida es esta:

```text
Usuario en navegador
      |
      v
Frontend React
      |
      v
Peticiones HTTP a /api/...
      |
      v
Backend FastAPI
      |
      v
SQLAlchemy
      |
      v
Base de datos MySQL
```

## 2. Que es FastAPI

FastAPI es una libreria de Python para crear APIs.

Una API es una puerta de entrada para que el frontend pida o envie datos. Por ejemplo:

- "Dame los ensayos de este usuario".
- "Crea un ensayo nuevo".
- "Guarda esta medicion".
- "Dame las muestras de esta medicion".

FastAPI no pinta pantallas. FastAPI responde datos, normalmente en JSON.

Ejemplo simple:

```text
GET http://127.0.0.1:8010/api/salud
```

Respuesta:

```json
{"estado": "ok"}
```

Eso significa que el backend esta encendido.

## 3. Que hace el backend en tu proyecto

El backend de Tunelab no controla todavia directamente el tunel real. Ahora mismo hace de capa de gestion de datos:

- Guarda fichas de ensayo.
- Guarda mediciones.
- Guarda muestras.
- Guarda eventos.
- Permite consultar esos datos desde Registro.
- Prepara la app para que, mas adelante, cada usuario de UACloud vea solo sus datos.

Importante: el control fisico real del tunel todavia dependera de la integracion futura con el sistema real, DAQ, variador, MATLAB antiguo o la forma que indiquen los tecnicos.

## 4. Carpetas y archivos del backend

### `backend`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend
```

Es la carpeta raiz del servidor.

Contiene:

- `app`: codigo Python real del backend.
- `.env`: configuracion local real, con cadena de conexion.
- `.env.example`: ejemplo de configuracion sin secretos reales.
- `requirements.txt`: librerias Python necesarias.
- `tunelab_local.db`: base SQLite antigua/de apoyo. No es la base principal si estas usando MySQL.
- `.venv`: entorno virtual de Python, si esta creado. No se sube normalmente a Git.

Debes dominar:

- `app`
- `.env.example`
- `requirements.txt`

Puedes ignorar al estudiar:

- `__pycache__`
- `.venv`
- `tunelab_local.db`, salvo para explicar que fue una base local de pruebas/fallback.

## 5. Archivo `requirements.txt`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\requirements.txt
```

Contenido actual:

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
SQLAlchemy==2.0.36
PyMySQL==1.1.1
python-dotenv==1.0.1
pydantic-settings==2.7.1
```

Que significa cada libreria:

- `fastapi`: crea la API/backend.
- `uvicorn`: arranca el servidor para poder acceder por `http://127.0.0.1:8010`.
- `SQLAlchemy`: permite trabajar con la base de datos usando clases Python en vez de escribir todo el SQL a mano.
- `PyMySQL`: conector que permite a SQLAlchemy hablar con MySQL.
- `python-dotenv`: ayuda a leer variables desde `.env`.
- `pydantic-settings`: gestiona configuracion de forma ordenada.

Explicacion para defensa:

> El backend se ha construido con FastAPI porque permite crear endpoints de forma clara y documentada. Uvicorn lo ejecuta como servidor ASGI. Para la persistencia se usa SQLAlchemy como ORM y PyMySQL como driver de conexion con MySQL.

## 6. Archivo `.env.example`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\.env.example
```

Sirve como plantilla de configuracion.

Ejemplo:

```env
DATABASE_URL=mysql+pymysql://usuario:contrasena@localhost:3306/tunel_viento
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
APP_NOMBRE=Tunelab API
```

Que es cada cosa:

- `DATABASE_URL`: cadena de conexion a la base de datos.
- `CORS_ORIGINS`: lista de webs autorizadas para llamar al backend.
- `APP_NOMBRE`: nombre mostrado por FastAPI.

En local, `DATABASE_URL` apunta a tu MySQL del PC. En eServices, los tecnicos cambiaran esa cadena para apuntar al servidor real.

Muy importante:

- `.env.example` se puede compartir.
- `.env` no deberia subirse con contrasenas reales.

## 7. Archivo `app/main.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\main.py
```

Este es el punto de entrada del backend.

Hace tres cosas:

1. Crea la aplicacion FastAPI.
2. Configura CORS.
3. Incluye las rutas de la API bajo `/api`.

Fragmento importante:

```python
app = FastAPI(title=configuracion.app_nombre)
```

Esto crea la app.

Fragmento importante:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.cors_origins_lista,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Esto permite que el frontend llame al backend. En local se permite `localhost`. En produccion deberia permitirse solo el dominio real de eServices/UACloud.

Fragmento importante:

```python
app.include_router(router, prefix="/api")
```

Esto significa que todas las rutas definidas en `rutas.py` cuelgan de `/api`.

Ejemplo:

```text
/salud
```

se convierte en:

```text
/api/salud
```

Tambien existe:

```python
@app.get("/")
def raiz():
    return {"estado": "ok", "servicio": configuracion.app_nombre}
```

Sirve para comprobar rapidamente que el backend responde.

## 8. Archivo `app/configuracion.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\configuracion.py
```

Este archivo centraliza la configuracion del backend.

Define una clase:

```python
class Configuracion(BaseSettings):
```

Esto permite leer variables desde `.env`.

Campos importantes:

- `app_nombre`
- `database_url`
- `cors_origins`

La linea mas importante para base de datos es:

```python
database_url: str = "sqlite:///./tunelab_local.db"
```

Eso es un valor por defecto. Si existe `.env`, se usa lo que diga `.env`. Por eso ahora puedes usar MySQL sin cambiar el codigo.

La propiedad:

```python
def cors_origins_lista(self) -> list[str]:
```

convierte el texto de `CORS_ORIGINS` en una lista de origenes.

Ejemplo:

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

se transforma en:

```python
["http://localhost:5173", "http://localhost:5174"]
```

Explicacion para defensa:

> La configuracion no esta escrita directamente en el codigo, sino que se lee desde variables de entorno. Esto permite cambiar la base de datos o el dominio permitido sin modificar la aplicacion.

## 9. Archivo `app/base_datos.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\base_datos.py
```

Este archivo conecta Python con la base de datos.

Fragmento importante:

```python
engine = create_engine(configuracion.database_url, pool_pre_ping=True)
```

`engine` es el motor de conexion. Usa `DATABASE_URL` para saber si debe conectarse a MySQL, SQLite u otra base compatible.

`pool_pre_ping=True` ayuda a comprobar que la conexion sigue viva antes de usarla. Es util cuando hay conexiones que pueden quedarse abiertas o caducar.

Fragmento importante:

```python
SesionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

Esto crea sesiones de base de datos. Una sesion es como una conversacion temporal con MySQL: leer, crear, modificar y confirmar.

Fragmento importante:

```python
class Base(DeclarativeBase):
    pass
```

`Base` es la clase base de todos los modelos. Las tablas (`Usuario`, `Ensayo`, `Medicion`, etc.) heredan de esta base indirectamente.

Fragmento importante:

```python
def obtener_sesion():
```

Esta funcion se usa en los endpoints para abrir una sesion de base de datos y cerrarla al terminar.

Explicacion sencilla:

> `base_datos.py` es el enchufe entre el backend y MySQL.

## 10. Archivo `app/tablas.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\tablas.py
```

Este es uno de los archivos mas importantes.

Aqui se definen las tablas de la base de datos como clases de Python.

### Tabla `usuarios`

Clase:

```python
class Usuario(Base):
```

Representa una persona que usa la app.

Campos principales:

- `id`: identificador interno.
- `identificador_uacloud`: identificador que deberia venir de UACloud/eServices.
- `nombre`: nombre del usuario.
- `email`: correo.
- `rol`: alumno, profesor, tecnico o admin.
- `activo`: si el usuario puede usar la app.
- `creado_en`: fecha de creacion.

Relacion:

```python
ensayos: Mapped[list["Ensayo"]]
```

Un usuario puede tener muchos ensayos.

### Tabla `ensayos`

Clase:

```python
class Ensayo(Base):
```

Representa una ficha de ensayo.

Campos principales:

- `id`: identificador interno.
- `codigo`: codigo tipo `A-001`.
- `nombre`: nombre visible del ensayo.
- `objetivo`: objetivo de la prueba.
- `descripcion`: notas o contexto.
- `usuario_id`: usuario propietario.
- `estado`: preparado, activo, cerrado o archivado.
- `creado_en`: fecha de creacion.
- `actualizado_en`: ultima actualizacion.

Relacion:

- Un ensayo pertenece a un usuario.
- Un ensayo tiene muchas mediciones.

### Tabla `mediciones`

Clase:

```python
class Medicion(Base):
```

Representa una medicion realizada dentro de un ensayo.

Campos principales:

- `id`: identificador interno.
- `ensayo_id`: ensayo al que pertenece.
- `nombre`: nombre de la medicion.
- `estado`: preparada, en curso, finalizada, cancelada o error.
- `duracion_segundos`: duracion.
- `velocidad_media`, `velocidad_maxima`, `velocidad_minima`.
- `temperatura_media`.
- `potencia_media`.
- `creado_en`.

Tambien tiene campos de objetivo:

- `velocidad_objetivo`
- `potencia_objetivo`
- `temperatura_objetivo`

Ojo: estos campos existen en la base de datos, aunque recientemente hemos quitado de Control el bloque visual de objetivos porque no tenia sentido como control operativo. Pueden seguir sirviendo como referencia historica si se decide usarlos en informes.

### Tabla `muestras_medicion`

Clase:

```python
class MuestraMedicion(Base):
```

Representa cada muestra o punto de datos dentro de una medicion.

Campos principales:

- `id`
- `medicion_id`
- `instante`
- `velocidad_ms`
- `temperatura_c`
- `potencia_porcentaje`
- `frecuencia_hz`
- `corriente_a`
- `rpm`

Esta tabla es importante porque permite guardar series temporales, no solo resumenes.

Ejemplo:

```text
Medicion 1
  muestra 1: velocidad 10.2 m/s, temperatura 21.1 C
  muestra 2: velocidad 10.4 m/s, temperatura 21.2 C
  muestra 3: velocidad 10.5 m/s, temperatura 21.2 C
```

### Tabla `eventos_medicion`

Clase:

```python
class EventoMedicion(Base):
```

Representa avisos o incidencias.

Campos principales:

- `id`
- `medicion_id`
- `ensayo_id`
- `tipo`
- `mensaje`
- `creado_en`

Puede servir para registrar cosas como:

- Medicion iniciada.
- Medicion finalizada.
- Error de DAQ.
- Alarma del variador.
- Parada de emergencia.

## 11. Relaciones de la base de datos

La estructura principal es:

```text
Usuario
  |
  | 1 usuario tiene muchos ensayos
  v
Ensayo
  |
  | 1 ensayo tiene muchas mediciones
  v
Medicion
  |
  | 1 medicion tiene muchas muestras
  v
MuestraMedicion
```

Y aparte:

```text
EventoMedicion
puede estar asociado a un ensayo, a una medicion o a ambos
```

Esta estructura tiene sentido para una app de laboratorio porque:

- Permite separar datos por usuario.
- Permite tener varios ensayos por usuario.
- Permite tener varias mediciones por ensayo.
- Permite guardar tanto resumenes como muestras completas.
- Permite registrar incidencias.

## 12. Archivo `app/datos_api.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\datos_api.py
```

Los modelos de `datos_api.py` definen que datos entran y salen de la API.

No son tablas. Son validaciones y formatos.

Ejemplo:

```python
class EnsayoCrear(BaseModel):
```

Define que necesita el backend para crear un ensayo.

Campos:

- `codigo`
- `nombre`
- `objetivo`
- `descripcion`
- `usuario_id`

Pero ojo: aunque exista `usuario_id`, el backend no deberia confiar en el `usuario_id` enviado por el frontend. En las rutas se fuerza a usar el usuario actual.

Ejemplo:

```python
class MedicionCrear(BaseModel):
```

Define que datos se envian para crear una medicion.

Ejemplo:

```python
class MuestraCrear(BaseModel):
```

Define el formato de cada muestra que se guarda.

Por que esto es importante:

- Evita recibir datos con formato incorrecto.
- Limita algunos campos, por ejemplo longitud de nombres.
- Documenta automaticamente la API en `/docs`.

Explicacion para defensa:

> Los esquemas Pydantic actuan como contrato entre el frontend y el backend: definen que datos se aceptan y que estructura se devuelve.

## 13. Archivo `app/usuario_actual.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\usuario_actual.py
```

Este archivo gestiona el usuario actual y evita que un usuario acceda a datos de otro.

Funcion principal:

```python
def obtener_usuario_actual(...)
```

Ahora mismo lee headers:

- `X-Usuario-Uacloud`
- `X-Usuario-Nombre`
- `X-Usuario-Email`
- `X-Usuario-Rol`

Esto es una simulacion/preparacion para eServices.

En local, si no llega identificador, usa:

```python
usuario-local
```

Si el usuario no existe, lo crea.

Si existe pero esta desactivado, devuelve error 403.

Funciones importantes:

```python
def obtener_ensayo_del_usuario(...)
```

Comprueba que el ensayo pertenece al usuario actual.

```python
def obtener_medicion_del_usuario(...)
```

Comprueba que la medicion pertenece a un ensayo del usuario actual.

Esto es clave para multiusuario.

Problema actual:

En produccion, no deberias confiar ciegamente en headers enviados por cualquier navegador. Esos headers deberian venir validados por eServices, proxy institucional o sistema de autenticacion real.

Explicacion honesta:

> La aplicacion esta preparada para asociar datos a usuarios de UACloud, pero la validacion definitiva de identidad dependera de la integracion con eServices. En local se simula mediante cabeceras HTTP.

## 14. Archivo `app/rutas.py`

Ruta:

```text
C:\app\nuevo_tunelviento_app\backend\app\rutas.py
```

Este archivo contiene los endpoints.

Un endpoint es una URL de la API que hace una accion.

### `GET /api/salud`

Sirve para comprobar que el backend esta funcionando.

Devuelve:

```json
{"estado": "ok"}
```

### Crear tablas en desarrollo

Antes habia un endpoint de desarrollo para crear tablas. Ahora se ha quitado de la API
para no dejar una ruta peligrosa abierta. Si necesitas crear las tablas en local se usa:

```powershell
cd C:\app\nuevo_tunelviento_app\backend
.\.venv\Scripts\python.exe crear_tablas.py
```

### `GET /api/usuarios`

Devuelve el usuario actual.

Antes podria parecer una lista de usuarios, pero ahora esta limitado para no exponer usuarios de otros.

### `POST /api/usuarios/asegurar`

Asegura que existe el usuario actual.

En la practica, cuando el frontend arranca o crea un ensayo, puede usar esto para que el backend tenga un usuario asociado.

### `GET /api/ensayos`

Devuelve los ensayos del usuario actual.

No devuelve los ensayos de todos.

Esto es muy importante para privacidad.

### `POST /api/ensayos`

Crea un ensayo para el usuario actual.

Aunque el frontend mande datos, el backend asigna:

```python
valores["usuario_id"] = usuario_actual.id
```

Eso evita que un usuario cree ensayos a nombre de otro.

### `GET /api/ensayos/{ensayo_id}/mediciones`

Devuelve las mediciones de un ensayo.

Antes comprueba que el ensayo pertenece al usuario actual.

### `POST /api/ensayos/{ensayo_id}/mediciones`

Crea una medicion dentro de un ensayo.

Antes comprueba que el ensayo pertenece al usuario actual.

### `POST /api/mediciones/{medicion_id}/muestras`

Guarda una lista de muestras para una medicion.

Antes comprueba que la medicion pertenece al usuario actual.

### `GET /api/mediciones/{medicion_id}/muestras`

Devuelve las muestras de una medicion.

### `GET /api/mediciones/{medicion_id}/eventos`

Devuelve los eventos de una medicion.

### `POST /api/eventos`

Registra un evento/incidencia.

Antes comprueba que el ensayo o la medicion pertenecen al usuario actual.

## 15. Flujo real: crear un ensayo

Paso a paso:

1. El usuario rellena la ficha en la pantalla Ensayo.
2. El frontend llama a la API para asegurar usuario.
3. El frontend llama a `POST /api/ensayos`.
4. FastAPI recibe los datos.
5. `usuario_actual.py` obtiene el usuario actual.
6. `rutas.py` crea el ensayo con `usuario_id` del usuario actual.
7. SQLAlchemy inserta el ensayo en MySQL.
8. El backend devuelve el ensayo creado.
9. El frontend vincula el ensayo local con el ensayo guardado.
10. El usuario puede ir a Control.

## 16. Flujo real: guardar una medicion

Paso a paso:

1. El usuario esta en Control.
2. Enciende el tunel.
3. Inicia la medicion.
4. La app va generando datos.
5. El usuario detiene la medicion.
6. El frontend crea un resumen.
7. El frontend llama a `POST /api/ensayos/{ensayo_id}/mediciones`.
8. El backend comprueba que el ensayo pertenece al usuario.
9. Se crea la medicion en MySQL.
10. El frontend envia las muestras a `POST /api/mediciones/{medicion_id}/muestras`.
11. El backend guarda las muestras.
12. El frontend registra un evento de medicion finalizada.
13. Registro puede consultar esos datos.

## 17. Flujo real: ver datos en Registro

Paso a paso:

1. El usuario entra en Registro.
2. El frontend llama a `GET /api/ensayos`.
3. El backend devuelve solo los ensayos de ese usuario.
4. El usuario selecciona un ensayo.
5. El frontend llama a `GET /api/ensayos/{id}/mediciones`.
6. El usuario selecciona una medicion.
7. El frontend llama a `GET /api/mediciones/{id}/muestras`.
8. Se muestran detalles, tabla y graficas.

## 18. Que es SQLAlchemy en este proyecto

SQLAlchemy es una capa entre Python y MySQL.

Sin SQLAlchemy tendrias que escribir consultas SQL manuales como:

```sql
SELECT * FROM ensayos WHERE usuario_id = 1;
```

Con SQLAlchemy, escribes Python:

```python
select(Ensayo).where(Ensayo.usuario_id == usuario_actual.id)
```

Ventajas:

- El codigo queda mas organizado.
- Las tablas se representan como clases.
- Es mas facil cambiar detalles de la base.
- Se reducen errores de SQL escrito a mano.

Desventajas:

- Hay que aprender sus conceptos.
- Puede parecer una capa extra al principio.

Para tu TFG es defendible porque es una herramienta comun en backends Python.

## 19. Que es MySQL en este proyecto

MySQL es la base de datos.

Guarda los datos de forma persistente. Es decir: aunque cierres la web, los datos siguen existiendo.

Tu app usa MySQL para:

- usuarios
- ensayos
- mediciones
- muestras
- eventos

Esto tiene sentido para una app universitaria porque:

- Puede haber varios alumnos y profesores.
- Los datos deben conservarse.
- Los tecnicos pueden administrar backups.
- eServices puede conectarse a una base central.

## 20. Que significa eServices en esta arquitectura

eServices seria el entorno institucional desde el que se accederia a la aplicacion.

Lo esperable es que eServices aporte:

- URL oficial.
- Usuario autenticado.
- Posiblemente cabeceras o datos de sesion.
- Servidor donde se despliega la app.
- Base MySQL institucional o acceso a una.

Tu backend ya esta preparado parcialmente porque:

- No tiene la conexion fija en codigo.
- Lee `DATABASE_URL` desde `.env`.
- Tiene tabla de usuarios.
- Tiene `identificador_uacloud`.
- Filtra datos por usuario.

Lo que falta cerrar con tecnicos:

- Como llega la identidad real del usuario.
- Que dominio final tendra la app.
- Que cadena MySQL final usaran.
- Si la app estara detras de proxy.
- Si ellos gestionan HTTPS.
- Como se haran backups.

## 21. Seguridad actual

Cosas buenas:

- No se guardan datos mezclados sin usuario.
- Los endpoints de ensayos y mediciones filtran por usuario.
- La conexion de base se puede sacar de `.env`.
- CORS es configurable.

Cosas que faltan antes de produccion:

- No confiar en headers enviados libremente desde el navegador.
- Mantener la creacion de tablas fuera de la API, usando `crear_tablas.py` solo en desarrollo.
- Asegurar que `.env` no se sube a Git.
- Usar HTTPS en produccion.
- Confirmar CORS con dominio real.
- Revisar permisos reales del usuario MySQL.
- Documentar backups.

Frase defendible:

> En esta fase, la aplicacion tiene una estructura preparada para multiusuario y persistencia en MySQL. La autenticacion final se integrara con eServices, por lo que la identidad del usuario no debe considerarse definitiva hasta que los tecnicos indiquen el mecanismo institucional.

## 22. Archivos que puedes ignorar

### `__pycache__`

Son archivos generados automaticamente por Python.

Ejemplo:

```text
app\__pycache__
app\api\__pycache__
app\db\__pycache__
```

No hay que estudiarlos. No contienen codigo fuente que hayas escrito.

### `.venv`

Es el entorno virtual de Python.

Contiene librerias instaladas para este proyecto.

No se estudia archivo por archivo.

### `tunelab_local.db`

Es una base SQLite local. Puede haber quedado de etapas anteriores o fallback.

Si estas usando MySQL con `.env`, no es la base importante.

## 23. Como arrancar el backend

Desde PowerShell:

```powershell
cd C:\app\nuevo_tunelviento_app\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Para probar que funciona:

```powershell
Invoke-RestMethod http://127.0.0.1:8010/api/salud
```

Respuesta esperada:

```json
{"estado":"ok"}
```

Tambien puedes abrir:

```text
http://127.0.0.1:8010/docs
```

Esa pagina la genera FastAPI automaticamente y muestra los endpoints.

## 24. Como explicarlo en el TFG

Explicacion corta:

> El backend de la aplicacion se ha desarrollado con FastAPI. Su funcion es actuar como capa intermedia entre el frontend y la base de datos MySQL. El frontend no accede directamente a la base de datos, sino que envia peticiones HTTP al backend. El backend valida los datos mediante esquemas Pydantic, comprueba el usuario actual, usa SQLAlchemy para operar sobre las tablas y devuelve respuestas JSON.

Explicacion sobre datos:

> La base de datos se estructura alrededor de usuarios, ensayos, mediciones, muestras y eventos. Cada usuario puede tener varios ensayos, cada ensayo varias mediciones y cada medicion multiples muestras. Esta estructura permite trazabilidad, separacion por usuario y analisis posterior de resultados.

Explicacion sobre futuro eServices:

> La configuracion de base de datos y CORS se realiza mediante variables de entorno. Esto permite que en local se use una cadena MySQL local y en el despliegue institucional los tecnicos cambien la conexion al servidor real sin modificar el codigo.

## 25. Preguntas que deberias saber responder

### Pregunta 1

Que hace el backend?

Respuesta:

> Recibe peticiones del frontend, valida datos, gestiona usuarios, ensayos, mediciones, muestras y eventos, y guarda o lee esa informacion desde MySQL.

### Pregunta 2

Por que no accede el frontend directamente a MySQL?

Respuesta:

> Por seguridad y arquitectura. El frontend corre en el navegador y no debe tener credenciales de base de datos. El backend centraliza la logica, valida permisos y protege el acceso a los datos.

### Pregunta 3

Que papel tiene SQLAlchemy?

Respuesta:

> Es el ORM que permite representar tablas como clases Python y hacer consultas a MySQL desde el backend de forma estructurada.

### Pregunta 4

Como se evita que un alumno vea datos de otro?

Respuesta:

> Cada ensayo tiene un `usuario_id`. Las rutas consultan el usuario actual y filtran los ensayos y mediciones para devolver solo los que pertenecen a ese usuario.

### Pregunta 5

Esta terminada la seguridad de produccion?

Respuesta:

> No completamente. La estructura esta preparada, pero la autenticacion definitiva debe integrarse con eServices/UACloud. En local se simula la identidad mediante cabeceras.

### Pregunta 6

Que cambiara cuando se despliegue en la universidad?

Respuesta:

> Se cambiara la cadena `DATABASE_URL` para apuntar al MySQL institucional, se configurara `CORS_ORIGINS` con el dominio real y se conectara la identidad del usuario con el sistema de eServices/UACloud.

## 26. Que deberias mejorar si hay tiempo

Prioridad alta:

- Preparar un script SQL claro para los tecnicos.
- Documentar las tablas y relaciones.
- Confirmar como eServices enviara el usuario autenticado.

Prioridad media:

- Anadir migraciones con Alembic si el proyecto crece.
- Anadir tests automaticos del backend.
- Mejorar manejo de errores.
- Validar limites de muestras/mediciones tambien en backend.

Prioridad baja:

- Crear panel de administracion.
- Exportar informes desde backend.
- Registrar mas eventos tecnicos del tunel real.

## 27. Resumen final

Lo que debes memorizar:

- FastAPI es el backend.
- MySQL guarda los datos.
- SQLAlchemy conecta Python con MySQL.
- Pydantic valida lo que entra y sale.
- `main.py` arranca la app.
- `configuracion.py` lee `.env`.
- `base_datos.py` abre la conexion a la base.
- `tablas.py` define tablas.
- `datos_api.py` define datos de entrada/salida.
- `usuario_actual.py` gestiona usuario actual y permisos.
- `rutas.py` define endpoints.
- `crear_tablas.py` crea las tablas en local si hace falta.

La frase mas importante:

> El backend actua como una capa segura entre la interfaz web y la base de datos, permitiendo guardar y consultar ensayos, mediciones y muestras de forma estructurada y preparada para varios usuarios.
