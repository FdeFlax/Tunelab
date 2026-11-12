# Guardado al terminar una captura

Corrección del 9 de septiembre de 2026 del hallazgo 2 de la auditoría.

Antes, `Detener medicion` enviaba la captura a la API, mientras que `Apagar tunel` solo conservaba el informe en memoria. Registro consulta la API y no encontraba esa medición.

Ambas acciones de Control utilizan ahora `finalizarCaptura`. Primero se ejecuta la parada solicitada y después se envían la nueva medición y todas sus muestras. El guardado se asocia al ensayo que estaba activo al terminar. Apagar sin una captura activa no vuelve a enviar el informe anterior; detener nuevamente una captura ya finalizada tampoco crea otro registro.

La API recibe ahora esa captura completa mediante una única petición a `POST /ensayos/{ensayo_id}/mediciones/finalizar`. El backend exige al menos una muestra y confirma conjuntamente la medición, sus muestras y el evento de auditoría. Si falla la validación o la transacción, revierte todo: no queda una medición vacía en Registro.

La pantalla muestra «Medición guardada en Registro» después de completar el envío de muestras. Si falla, muestra un aviso para descargar el informe antes de recargar o cerrar la página. El apagado no espera al guardado para enviar la orden de parada. Un error de guardado tampoco impide intentar liberar la conexión después de apagar. La API ya crea el evento de finalización, por lo que se ha eliminado el segundo evento redundante enviado por Control.

## Verificación

Desde la raíz del proyecto:

```powershell
node --experimental-vm-modules --test --test-isolation=none tests/finalizarCaptura.test.mjs
npx eslint src/pages/PaginaControl2.jsx src/servicios/tunel/finalizarCaptura.js
npm run build
```

Las siete pruebas automáticas de frontend pasan. Ejecutan el simulador y los servicios de finalización y API del proyecto con el reloj de captura controlado y respuestas HTTP simuladas. Cubren 25 muestras al apagar, parada seguida de apagado sin duplicar, apagado sin captura, el fallo de la petición completa, la obligación de tener ensayo activo y ensayo sin vínculo con la base de datos. Las 15 pruebas de backend incluyen una captura con medición, dos muestras y evento, además del rechazo de una captura vacía sin crear filas.

También se verificó la web compilada contra FastAPI y SQLite en memoria: se creó un ensayo, se capturaron 33 muestras y se apagó durante la medición. Registro mostró la captura y, tras recargar el navegador, recuperó sus 33 muestras. No se utilizó MySQL ni hardware. ESLint de los archivos modificados y la compilación terminaron correctamente; persiste el aviso previo de tamaño del visor 3D.

## Alcance pendiente

Esta corrección cubre la parada y el apagado solicitados desde Control, con guardado transaccional de la captura completa. Falta recuperación automática al cerrar el navegador e idempotencia: si el navegador pierde la respuesta después de que el servidor confirme, un reintento podría duplicar la medición. La liberación forzada por un docente y el funcionamiento con hardware requieren su propia verificación.
