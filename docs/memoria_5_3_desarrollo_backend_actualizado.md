# 5.3. Desarrollo del backend

Se incorporó un backend basado en una API REST con el objetivo de separar la interfaz web de la gestión de datos. La aplicación frontend, desarrollada con React y Vite, se encarga de la interacción con el usuario, la visualización del túnel, la preparación de ensayos y la representación de resultados. El backend, por su parte, actúa como una capa intermedia encargada de recibir peticiones, validar la información, aplicar comprobaciones básicas de acceso y guardar o recuperar datos desde una base de datos relacional.

Esta separación evita que el frontend acceda directamente a la base de datos. En su lugar, la comunicación se realiza mediante peticiones HTTP que intercambian información en formato JSON. De este modo, el frontend únicamente necesita conocer qué rutas ofrece la API y qué datos debe enviar o recibir, mientras que los detalles internos de almacenamiento quedan concentrados en el backend.

El backend se desarrolló con FastAPI, un framework de Python orientado a la creación de APIs. Para el acceso a base de datos se utilizó SQLAlchemy, que permite definir las tablas mediante clases de Python y trabajar con ellas sin escribir directamente todas las consultas SQL. La base de datos prevista para la integración institucional es MySQL, por compatibilidad con el entorno indicado para eServices. Durante el desarrollo local también se mantiene la posibilidad de usar SQLite como alternativa de prueba si no se proporciona una cadena de conexión MySQL.

El flujo general de funcionamiento puede resumirse así:

```text
Frontend React/Vite -> API REST FastAPI -> SQLAlchemy/PyMySQL -> MySQL
```

Esta arquitectura facilita que el sistema pueda evolucionar. Por ejemplo, el diseño del frontend puede modificarse sin alterar directamente la base de datos, y el backend puede adaptarse posteriormente a un servidor institucional o a un sistema real de identificación de usuarios proporcionado por UACloud/eServices.

## 5.3.1. Organización general del backend

El backend se encuentra dentro de la carpeta:

```text
backend/app
```

Los archivos principales son los siguientes:

| Archivo | Función principal |
|---|---|
| `backend/app/main.py` | Crea la aplicación FastAPI, configura CORS y registra las rutas de la API. |
| `backend/app/configuracion.py` | Centraliza la configuración del backend, incluyendo la cadena de conexión y los orígenes permitidos. |
| `backend/app/base_datos.py` | Crea el motor de base de datos y proporciona sesiones para cada petición. |
| `backend/app/tablas.py` | Define las tablas principales mediante SQLAlchemy ORM. |
| `backend/app/datos_api.py` | Define los modelos Pydantic usados para validar entradas y salidas de la API. |
| `backend/app/rutas.py` | Contiene los endpoints principales de usuarios, ensayos, mediciones, muestras, eventos, conexión del túnel y vista docente. |
| `backend/app/usuario_actual.py` | Gestiona la identificación provisional del usuario y las comprobaciones de rol. |
| `backend/app/__init__.py` | Marca la carpeta `app` como paquete Python. Puede estar vacío. |

Esta organización permite separar responsabilidades. La configuración no está mezclada con las rutas, las tablas no están mezcladas con los modelos de respuesta, y la lógica de identificación del usuario se encuentra en un archivo independiente.

## 5.3.2. Configuración y arranque de la API

El archivo principal del backend es:

```text
backend/app/main.py
```

En este archivo se crea la aplicación FastAPI:

```python
app = FastAPI(title=configuracion.app_nombre)
```

También se incorpora el middleware de CORS. CORS controla desde qué páginas web se permite llamar a la API. Durante el desarrollo local se permiten los puertos habituales de Vite, como `localhost:5173` o `localhost:5174`. En un despliegue real, esta configuración debería restringirse al dominio oficial asignado por eServices o por la infraestructura de la Universidad de Alicante.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.cors_origins_lista,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Finalmente, se conectan todas las rutas definidas en `rutas.py` usando el prefijo `/api`:

```python
app.include_router(router, prefix="/api")
```

Esto significa que si en `rutas.py` se define una ruta como `/salud`, en la aplicación completa queda disponible como:

```text
/api/salud
```

También existe una ruta raíz sencilla que permite comprobar que el backend está encendido:

```python
@app.get("/")
def raiz():
    return {"estado": "ok", "servicio": configuracion.app_nombre}
```

## 5.3.3. Configuración de entorno y conexión con la base de datos

La configuración se centraliza en:

```text
backend/app/configuracion.py
```

En este archivo se define la clase `Configuracion`, basada en `BaseSettings`. Su función es guardar valores de configuración que pueden venir del propio código o de un archivo `.env`.

```python
class Configuracion(BaseSettings):
    app_nombre: str = "Tunelab API"
    database_url: str = "sqlite:///./tunelab_local.db"
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

El campo `database_url` contiene la cadena de conexión con la base de datos. En desarrollo, si no existe un archivo `.env`, se usa SQLite como opción sencilla de prueba. Sin embargo, para la versión pensada para el entorno institucional se usa MySQL, configurando la cadena mediante la variable `DATABASE_URL` en el archivo `.env`.

Una cadena MySQL tiene una forma similar a esta:

```text
mysql+pymysql://usuario:contraseña@localhost:3306/tunelab
```

Esta cadena indica:

| Parte | Significado |
|---|---|
| `mysql+pymysql` | Tipo de base de datos y conector usado desde Python. |
| `usuario` | Usuario de MySQL. |
| `contraseña` | Contraseña de MySQL. |
| `localhost` | Servidor donde está la base de datos. |
| `3306` | Puerto habitual de MySQL. |
| `tunelab` | Nombre de la base de datos. |

La conexión real se crea en:

```text
backend/app/base_datos.py
```

El fragmento principal es:

```python
engine = create_engine(configuracion.database_url, pool_pre_ping=True)
SesionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

`engine` representa la conexión general con la base de datos. `SesionLocal` es una fábrica de sesiones. Cada operación que necesita acceder a la base de datos usa una sesión, que se abre al comenzar la petición y se cierra al finalizar.

```python
def obtener_sesion():
    sesion = SesionLocal()
    try:
        yield sesion
    finally:
        sesion.close()
```

Esta función se utiliza como dependencia en FastAPI. Así, las rutas no tienen que abrir y cerrar manualmente la conexión cada vez; FastAPI se encarga de proporcionar una sesión válida durante la ejecución del endpoint.

## 5.3.4. Modelo de datos y persistencia

Las tablas se definen en:

```text
backend/app/tablas.py
```

En este archivo se utiliza SQLAlchemy ORM. Cada clase representa una tabla de la base de datos y cada objeto de esa clase representa una fila concreta.

Las entidades principales son:

| Entidad | Qué representa |
|---|---|
| `Usuario` | Usuario que accede a la aplicación, asociado a un identificador de UACloud/eServices o a una identidad simulada durante el desarrollo. |
| `Ensayo` | Ficha de ensayo preparada por un usuario. |
| `Medicion` | Resumen de una medición realizada dentro de un ensayo. |
| `MuestraMedicion` | Muestra temporal recogida durante una medición. |
| `EventoMedicion` | Evento, aviso o incidencia asociado a un ensayo o a una medición. |
| `TunelConexion` | Estado de ocupación del túnel, para saber qué usuario tiene reservado el control en un momento dado. |

Las relaciones principales son:

```text
Usuario 1:N Ensayo
Ensayo 1:N Medicion
Medicion 1:N MuestraMedicion
Ensayo/Medicion 1:N EventoMedicion
Usuario 1:1/N TunelConexion, según el uso del control del túnel
```

La entidad `Usuario` permite asociar los datos creados a una persona concreta. En la versión actual, el usuario se simula durante el desarrollo local, pero la estructura está preparada para recibir posteriormente los datos reales que proporcione UACloud/eServices.

La entidad `Ensayo` representa la ficha inicial de una prueba. Guarda datos como código, nombre, objetivo, descripción, estado y usuario propietario. Esto permite que cada alumno pueda consultar sus propios ensayos.

La entidad `Medicion` almacena el resumen de una captura ya finalizada. Incluye duración, velocidad media, velocidad máxima, velocidad mínima, temperatura media y potencia media, entre otros campos. Esta información se utiliza para mostrar listados e informes sin tener que cargar siempre todas las muestras temporales.

La entidad `MuestraMedicion` guarda la evolución temporal de la medición. Cada muestra puede contener velocidad, temperatura, potencia, frecuencia, corriente y rpm. Gracias a esta tabla se pueden reconstruir gráficas y tablas de resultados.

La entidad `EventoMedicion` permite registrar mensajes e incidencias, por ejemplo que una medición se ha finalizado o que ha ocurrido algún aviso durante el proceso.

Por último, la entidad `TunelConexion` se añadió para controlar la ocupación del túnel. Como el túnel físico no debería ser utilizado simultáneamente por varios usuarios, esta tabla permite saber quién está conectado al control en cada momento y bloquear el acceso de otros usuarios hasta que se libere.

Un ejemplo simplificado de tabla es:

```python
class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identificador_uacloud: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(160))
    rol: Mapped[RolUsuario] = mapped_column(SqlEnum(RolUsuario), default=RolUsuario.alumno)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
```

Este fragmento indica que la tabla `usuarios` tendrá un identificador interno, un identificador de UACloud, un nombre, un correo, un rol y un estado activo/inactivo.

## 5.3.5. Modelos de validación de la API

Los modelos de entrada y salida se definen en:

```text
backend/app/datos_api.py
```

Estos modelos están creados con Pydantic. No son tablas de la base de datos. Su función es validar los datos que entran y salen por la API.

Esto permite separar dos conceptos:

| Tipo de modelo | Archivo | Función |
|---|---|---|
| Tablas SQLAlchemy | `tablas.py` | Definen cómo se guardan los datos en la base de datos. |
| Modelos Pydantic | `datos_api.py` | Definen qué datos recibe y devuelve la API. |

Por ejemplo, para crear una medición se usa `MedicionCrear`:

```python
class MedicionCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    velocidad_objetivo: float | None = None
    potencia_objetivo: float | None = None
    temperatura_objetivo: float | None = None
    duracion_segundos: int | None = None
    velocidad_media: float | None = None
    velocidad_maxima: float | None = None
    velocidad_minima: float | None = None
    temperatura_media: float | None = None
    potencia_media: float | None = None
```

Este modelo indica qué datos puede enviar el frontend cuando quiere guardar una medición.

Para devolver una medición al frontend se usa `MedicionRespuesta`:

```python
class MedicionRespuesta(BaseModel):
    id: int
    ensayo_id: int
    nombre: str
    estado: str
    duracion_segundos: int | None
    velocidad_media: float | None
    creado_en: datetime

    model_config = {"from_attributes": True}
```

La respuesta incluye campos que el frontend no debería inventar, como `id`, `ensayo_id` o `creado_en`. Estos datos proceden de la base de datos o del backend.

Esta separación evita que el frontend controle datos internos como el identificador numérico, la fecha de creación o el usuario propietario.

## 5.3.6. Implementación de rutas y endpoints

Las rutas se implementan en:

```text
backend/app/rutas.py
```

FastAPI permite agrupar rutas mediante un `APIRouter`. En este proyecto, todas las rutas se registran posteriormente en `main.py` con el prefijo `/api`.

Los endpoints principales actuales son:

| Método y ruta | Finalidad |
|---|---|
| `GET /api/salud` | Comprobar que el backend está activo. |
| `GET /api/usuarios` | Listar usuarios registrados internamente. |
| `POST /api/usuarios/asegurar` | Asegurar/recuperar la ficha interna del usuario actual en desarrollo local. |
| `GET /api/ensayos` | Listar los ensayos del usuario actual. |
| `POST /api/ensayos` | Crear un nuevo ensayo asociado al usuario actual. |
| `PUT /api/ensayos/{ensayo_id}` | Editar un ensayo existente del usuario actual. |
| `GET /api/ensayos/{ensayo_id}/mediciones` | Consultar las mediciones de un ensayo propio. |
| `POST /api/ensayos/{ensayo_id}/mediciones` | Guardar el resumen de una medición finalizada. |
| `DELETE /api/mediciones/{medicion_id}` | Borrar una medición propia. |
| `POST /api/mediciones/{medicion_id}/muestras` | Guardar en bloque las muestras temporales de una medición. |
| `GET /api/mediciones/{medicion_id}/muestras` | Recuperar las muestras de una medición propia. |
| `GET /api/mediciones/{medicion_id}/eventos` | Consultar eventos asociados a una medición propia. |
| `POST /api/eventos` | Registrar un evento. |
| `GET /api/tunel/conexion` | Consultar si el túnel está libre u ocupado. |
| `POST /api/tunel/conectar` | Reservar el control del túnel para el usuario actual. |
| `POST /api/tunel/desconectar` | Liberar el control del túnel. |
| `POST /api/tunel/docente/desconectar` | Permitir que un docente libere el túnel si ha quedado ocupado. |
| `GET /api/docente/ensayos` | Consultar ensayos desde la vista docente. |
| `GET /api/docente/ensayos/{ensayo_id}/mediciones` | Consultar mediciones de un ensayo desde la vista docente. |
| `DELETE /api/docente/mediciones/{medicion_id}` | Borrar una medición desde la vista docente. |
| `DELETE /api/docente/ensayos/{ensayo_id}` | Borrar un ensayo completo desde la vista docente. |
| `GET /api/docente/mediciones/{medicion_id}/muestras` | Consultar muestras de una medición desde la vista docente. |
| `GET /api/docente/mediciones/{medicion_id}/eventos` | Consultar eventos de una medición desde la vista docente. |

Un ejemplo representativo es la creación de un ensayo:

```python
@router.post("/ensayos", response_model=EnsayoRespuesta)
def crear_ensayo(
    datos: EnsayoCrear,
    sesion: Session = Depends(obtener_sesion),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    valores = datos.model_dump()
    valores["codigo"] = valores["codigo"] or generar_codigo_ensayo(sesion)
    valores["usuario_id"] = usuario_actual.id

    ensayo = Ensayo(**valores)
    sesion.add(ensayo)
    sesion.commit()
    sesion.refresh(ensayo)
    return ensayo
```

Este endpoint recibe los datos del ensayo, obtiene una sesión de base de datos, identifica al usuario actual, genera un código automático si hace falta y guarda el ensayo en la base de datos.

El patrón general de muchas rutas es:

```text
1. Recibir datos desde el frontend.
2. Validarlos con Pydantic.
3. Obtener el usuario actual.
4. Abrir una sesión de base de datos.
5. Comprobar propiedad o rol si procede.
6. Ejecutar la operación con SQLAlchemy.
7. Confirmar cambios con commit.
8. Devolver una respuesta JSON.
```

## 5.3.7. Gestión de usuarios y roles

La gestión del usuario actual se encuentra en:

```text
backend/app/usuario_actual.py
```

Durante el desarrollo local todavía no existe una integración real con UACloud/eServices. Por ello, se utiliza una identificación provisional mediante cabeceras HTTP. El frontend envía datos como identificador, nombre, correo y rol. Con esos datos, el backend puede asociar ensayos y mediciones a un usuario concreto.

Este sistema no debe interpretarse como el mecanismo final de autenticación. Su función es permitir el desarrollo y las pruebas locales antes de disponer de la integración institucional.

En el despliegue final, lo esperable es que eServices proporcione la identidad del usuario que ha iniciado sesión. El backend debería confiar únicamente en la información validada por la infraestructura institucional, no en datos escritos manualmente por el usuario.

Actualmente se distinguen dos grandes perfiles:

| Rol | Función en la aplicación |
|---|---|
| Alumno | Puede preparar ensayos, realizar mediciones y consultar sus propios datos. |
| Docente/técnico/admin | Puede consultar ensayos de distintos usuarios, revisar mediciones, borrar registros y liberar la ocupación del túnel. |

Las rutas normales aplican comprobaciones de propiedad. Por ejemplo, un alumno no debe poder acceder a un ensayo de otro usuario. Para ello se utilizan funciones auxiliares como:

```python
def obtener_ensayo_del_usuario(
    ensayo_id: int,
    usuario: Usuario,
    sesion: Session,
) -> Ensayo:
    ensayo = sesion.scalar(
        select(Ensayo).where(
            Ensayo.id == ensayo_id,
            Ensayo.usuario_id == usuario.id,
        )
    )
    if not ensayo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ensayo no encontrado",
        )
    return ensayo
```

Esta función busca un ensayo que coincida con el identificador solicitado y que además pertenezca al usuario actual. Si no se encuentra, se devuelve un error. Así se evita que un usuario pueda consultar o modificar datos de otro alumno desde las rutas normales.

Las rutas docentes utilizan una dependencia específica, `obtener_usuario_docente`, que comprueba que el usuario tiene un rol autorizado antes de permitir el acceso.

## 5.3.8. Control de conexión y ocupación del túnel

Además de guardar ensayos y mediciones, el backend incorpora un mecanismo para controlar la ocupación del túnel. Esta parte es importante porque, en un laboratorio, el túnel físico no debería ser operado simultáneamente por varios usuarios.

Para ello se añadieron endpoints específicos:

```text
GET  /api/tunel/conexion
POST /api/tunel/conectar
POST /api/tunel/desconectar
POST /api/tunel/docente/desconectar
```

La ruta `GET /api/tunel/conexion` permite saber si el túnel está libre u ocupado y, si está ocupado, qué usuario tiene la conexión activa.

La ruta `POST /api/tunel/conectar` intenta reservar el túnel para el usuario actual. Si ya está ocupado por otro usuario, el backend no concede la conexión.

La ruta `POST /api/tunel/desconectar` libera la conexión del usuario actual.

La ruta `POST /api/tunel/docente/desconectar` permite que un profesor o técnico libere la conexión si un usuario ha dejado el túnel ocupado.

Este control no sustituye a los mecanismos físicos de seguridad del túnel ni a la parada de emergencia, pero ayuda a coordinar el uso desde la aplicación web.

## 5.3.9. Guardado de mediciones, muestras y eventos

El guardado de una medición se realiza en varias fases.

Primero se crea el registro principal de la medición. Este registro almacena datos generales, como nombre, duración, velocidad media, velocidad máxima, velocidad mínima, temperatura media y potencia media.

Después se guardan las muestras temporales asociadas a esa medición. Estas muestras permiten reconstruir las gráficas y la tabla de datos.

Finalmente, se pueden guardar eventos asociados a la medición, como mensajes informativos o incidencias.

El motivo de separar resumen y muestras es práctico. Para listar mediciones no siempre es necesario cargar todas las muestras. El resumen permite mostrar información rápida, mientras que las muestras se consultan cuando el usuario quiere ver el detalle completo.

El flujo puede resumirse así:

```text
Finaliza medición
-> se crea Medicion
-> se guardan MuestraMedicion
-> se guarda EventoMedicion
-> Registro/Docente pueden recuperar el informe
```

Esta estructura permite que el informe de medición pueda mostrarse posteriormente desde distintas pantallas, como Control, Registro o Docente.

## 5.3.10. Integración con MySQL y despliegue futuro

El proyecto se ha preparado para trabajar con MySQL porque es el sistema indicado para la futura integración con el entorno institucional. La base de datos local permite probar la estructura de tablas, endpoints y guardado de datos antes de pasar a un servidor real.

En el equipo de desarrollo, la conexión se define mediante el archivo `.env`, que no debería subirse a un repositorio público porque puede contener credenciales. Para documentar qué variables necesita el proyecto se incluyen archivos de ejemplo como `.env.example` o `.env.production.example`, sin contraseñas reales.

En un despliegue final sería necesario:

- Crear la base de datos MySQL en el servidor asignado.
- Crear las tablas necesarias.
- Configurar la variable `DATABASE_URL` con la cadena real.
- Restringir `CORS_ORIGINS` al dominio oficial de la aplicación.
- Sustituir la identificación simulada por la identidad real proporcionada por UACloud/eServices.
- Revisar permisos de docentes y alumnos según los requisitos del laboratorio.

## 5.3.11. Limitaciones actuales

Aunque el backend ya permite guardar ensayos, mediciones, muestras, eventos y controlar la ocupación del túnel, existen limitaciones que deben indicarse de forma honesta.

La primera limitación es que la integración real con UACloud/eServices todavía no está implementada. Actualmente se simulan usuarios y roles para poder desarrollar y probar la aplicación. En producción, estos datos deberían venir de la plataforma institucional.

La segunda limitación es que el control del túnel real todavía depende de la futura conexión con el hardware o con el sistema de adquisición/control disponible en el laboratorio. El backend ya define endpoints y estructura de datos, pero la comunicación física con el túnel deberá adaptarse cuando se disponga de los detalles técnicos definitivos.

La tercera limitación es que la configuración de CORS y seguridad debe endurecerse antes del despliegue. Durante el desarrollo se permiten orígenes locales para facilitar las pruebas, pero en producción solo debería permitirse el dominio real de la aplicación.

Por último, aunque el backend incluye comprobaciones básicas de propiedad y roles, la autenticación final deberá apoyarse en el sistema institucional, evitando que el frontend pueda decidir por sí mismo quién es alumno o docente.

## 5.3.12. Resumen del desarrollo del backend

El backend de Tunelab se diseñó como una capa intermedia entre la interfaz web y la base de datos. Su función principal es recibir peticiones del frontend, validar los datos, asociarlos al usuario correspondiente y almacenarlos de forma estructurada.

La solución desarrollada permite:

- Crear y editar ensayos.
- Guardar mediciones finalizadas.
- Almacenar muestras temporales de cada medición.
- Registrar eventos o incidencias.
- Consultar informes desde Registro y Docente.
- Separar datos propios de alumno y datos globales de docente.
- Controlar qué usuario tiene conectado el túnel.
- Preparar la futura integración con MySQL institucional y UACloud/eServices.

Esta arquitectura no pretende sustituir los sistemas físicos de seguridad del túnel, sino ofrecer una base software organizada para la gestión de ensayos, mediciones y trazabilidad dentro de una plataforma de laboratorio.
