# Guardado de mediciones

## Funcionamiento actual — 23/11/2026

Cada medición tiene un nombre, una consigna y una duración. No hay secuencias ni
borradores de programas en el servidor. Para comparar 25 %, 50 % y 75 % se realizan
tres mediciones dentro del mismo ensayo.

1. El usuario conecta su sesión al simulador, selecciona el ensayo e introduce
   nombre, consigna (1–100 %, pasos de 0,1) y duración (1–300 segundos, máximo 5 minutos).
2. Tras la comprobación previa, `POST /api/tunel/capturas` envía `ensayo_id`,
   `nombre`, `consigna`, `duracion_segundos` y una `clave` UUID.
3. El servidor valida propiedad, cupo y nombre único dentro del ensayo. Enciende
   a cero, aplica la consigna indicada e inicia el registro con su primera muestra.
4. `CapturadorTunel` adquiere muestras periódicamente aunque se cierre el navegador.
   Registra también la transición; no espera a que el flujo sea estable.
5. Al alcanzar la duración prevista finaliza la medición y apaga el túnel. La sesión
   permanece conectada para poder preparar otra medición.
6. `POST /api/tunel/capturas/{medicion_id}/detener` cancela antes del plazo, apaga
   el túnel y conserva las muestras parciales. El apagado y la liberación docente
   también conservan lo registrado.

El ciclo de adquisición se ejecuta aproximadamente una vez por segundo. El cierre
ocurre en el primer ciclo que alcanza el plazo; se guarda la duración real además
de `duracion_prevista_segundos`. No se inventan muestras para rellenar retrasos.

La clave de inicio permite reintentar una solicitud sin crear otra medición. Una
parada repetida dirigida a una medición antigua no detiene una nueva. Si falla el
almacenamiento, se apaga el simulador y se conservan las muestras confirmadas.
Tras un reinicio, las capturas interrumpidas quedan marcadas como error.

## Datos y archivos

- Las relaciones usan el ID numérico del ensayo, sin códigos adicionales `A-001`.
- El nombre del ensayo puede repetirse; el de la medición es único en su ensayo.
- Se eliminó la tabla `programas_etapas` con la migración `0a63de149258`.
- Las mediciones nuevas tienen `programa = null`. El campo JSON se conserva solo
  para consultar informes históricos por etapas; no ejecuta ninguna secuencia.
- La exportación JSON 1.3 incluye la consigna y la duración prevista y real.
  Continúan siendo legibles los archivos 1.0, 1.1 y 1.2.
- El formulario se envía al iniciar. Ya no hay autoguardado de configuración;
  cambiar de ensayo o recargar descarta el borrador, pero no una captura en curso.

## Simplificación realizada

Se retiraron `programador_etapas.py`, `datos_programa.py`, sus rutas de consulta,
guardado, inicio y parada, y `autoguardadoPrograma.js`. La captura y su temporizador
se gestionan en `capturas.py`, sin coordinar otra ejecución paralela.

Se mantienen las comprobaciones de permisos, límites, nombres, idempotencia,
guardado transaccional y recuperación. El historial del diseño por etapas está en
[ENSAYOS_POR_ETAPAS.md](ENSAYOS_POR_ETAPAS.md), marcado como documentación histórica.

## Comprobación

`backend/tests/test_capturas.py` cubre adquisición sin navegador, plazo sin esperar
estabilidad, cierre con retraso, cancelación, reintentos, permisos, límites,
fallos de escritura y recuperación. Usa SQLite aislado, no la base del laboratorio.
Las pruebas del frontend comprueban el formulario, inicio/parada y sincronización.
