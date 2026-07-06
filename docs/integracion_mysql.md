# Integracion MySQL de Tunelab

Esta carpeta prepara la version de la app para guardar ensayos y mediciones en MySQL.
No sustituye todavia el flujo visual actual: deja preparada la capa de datos para cuando los tecnicos confirmen servidor, usuario y forma de entrada desde UACloud/eServices.

## Que se ha anadido

- `database/schema_mysql.sql`: script SQL con las tablas propuestas.
- `backend/`: API nueva y pequena hecha desde cero, sin reutilizar el backend antiguo.
- `backend/.env.example`: ejemplo de cadena de conexion local.
- `src/servicios/api/`: cliente del frontend para hablar con la API.
- `PaginaEnsayos2`: al preparar una ficha, intenta guardarla en MySQL si la API esta disponible.
- `PaginaControl2`: al detener una medicion, intenta guardar la medicion, sus muestras y un evento de cierre en MySQL.

## Arquitectura pensada

```text
React/Vite
  -> Backend FastAPI
      -> MySQL local durante desarrollo
      -> MySQL servidor UA cuando lo configuren los tecnicos
```

La web no debe conectarse directamente a MySQL. Siempre debe pasar por el backend.

## Tablas principales

- `usuarios`: representa a quien llega desde UACloud/eServices.
- `ensayos`: ficha general de una practica o prueba.
- `mediciones`: capturas realizadas dentro de un ensayo.
- `muestras_medicion`: valores temporales de velocidad, potencia, frecuencia, etc.
- `eventos_medicion`: avisos, errores y mensajes del sistema.
- `comandos_tunel`: trazabilidad de ordenes enviadas al tunel.
- `informes_medicion`: registro de informes/exportaciones generadas.

## Como se probaria en local mas adelante

1. Instalar MySQL local.
2. Crear una base llamada `tunel_viento`.
3. Copiar `backend/.env.example` a `backend/.env`.
4. Cambiar `DATABASE_URL` con tu usuario y contrasena local.
5. Instalar dependencias:

```powershell
cd C:\app\nuevo_tunelviento_app\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

6. Arrancar API:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

## Pendiente antes de conectar el frontend

- Confirmar con los tecnicos el identificador real que mandara UACloud/eServices.
- Confirmar si los alumnos solo ven sus propios ensayos.
- Confirmar frecuencia real de muestreo.
- Confirmar variables reales disponibles del tunel: velocidad, presion, temperatura, frecuencia, corriente, rpm.
- Confirmar si la UA gestionara backups y HTTPS.

## Estado actual de la integracion

La integracion esta hecha de forma progresiva:

1. El frontend sigue funcionando en modo demo aunque no exista MySQL.
2. La pagina de ensayos intenta crear el usuario y el ensayo en la API.
3. Si la API no esta arrancada, la ficha queda en modo temporal y la app no se rompe.
4. Control sigue funcionando en modo temporal, pero al detener medicion intenta persistir los datos en MySQL.
5. Registro todavia sigue usando el flujo de importacion de archivos.

Esto es intencionado para poder ensenar la web sin depender todavia del servidor de base de datos.
