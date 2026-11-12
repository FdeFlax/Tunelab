$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\scripts\arranque-local.ps1')

function Verificar([bool]$condicion, [string]$caso) {
    if (-not $condicion) { throw "Fallo: $caso" }
    Write-Host "OK: $caso"
}

$valida = [pscustomobject]@{
    protocolo = 'tunelab-local-v1'; instalacion = 'esta-carpeta'; estado = 'listo'; controlador = 'listo'
    base_datos = [pscustomobject]@{estado = 'ok'; esquema = 'actualizado'}
}
Verificar (-not (Test-Identidad $null 'esta-carpeta')) 'No acepta una web que no responde'
Verificar (-not (Test-Identidad ([pscustomobject]@{estado='ok'}) 'esta-carpeta')) 'No acepta un 200 de otra aplicacion'
Verificar (-not (Test-Identidad $valida 'otra-carpeta')) 'No acepta otra copia de Tunelab'
Verificar (-not (Obtener-ProblemaApi $valida 'esta-carpeta')) 'Acepta esta instalacion preparada'
$valida.base_datos.esquema = 'pendiente'
Verificar ((Obtener-ProblemaApi $valida 'esta-carpeta') -like '*migraciones*') 'Distingue migraciones pendientes'
$valida.base_datos.esquema = 'actualizado'
$valida.controlador = 'no_disponible'
Verificar ((Obtener-ProblemaApi $valida 'esta-carpeta') -like '*captura*') 'Detecta el capturador detenido'
$valida.base_datos = [pscustomobject]@{estado='error'; detalle='MySQL no disponible'}
Verificar ((Obtener-ProblemaApi $valida 'esta-carpeta') -eq 'MySQL no disponible') 'Conserva el diagnostico de MySQL'

function Invoke-WebRequest {
    param($Uri, [switch]$UseBasicParsing, $TimeoutSec, $Headers)
    Verificar ($Headers['X-Usuario-Uacloud'] -eq 'alu_demo') 'Comprueba el mismo perfil que el acceso de la web'
    return [pscustomobject]@{StatusCode=200; Content=$script:respuestaAcceso}
}
$script:respuestaAcceso = '[{"identificador_uacloud":"alu_demo"}]'
Verificar (Test-AccesoLocal 'http://127.0.0.1:8010/api/usuarios') 'Acepta el acceso validado por la API'
$script:respuestaAcceso = '[{"identificador_uacloud":"otro"}]'
Verificar (-not (Test-AccesoLocal 'http://127.0.0.1:8010/api/usuarios')) 'No confunde un 200 ajeno con acceso correcto'
$script:respuestaAcceso = '<html>Otro servidor</html>'
Verificar (-not (Test-AccesoLocal 'http://127.0.0.1:8010/api/usuarios')) 'Rechaza una pagina HTML en el puerto de la API'
Remove-Item Function:\Invoke-WebRequest

function Get-Service { return [pscustomobject]@{Name='TunelabMySQL'; Status='Running'} }
function Start-Service { throw 'No debe iniciar de nuevo un servicio activo' }
function Start-Process { throw 'No debe crear procesos cuando el servicio ya existe' }
Iniciar-MySql '' 'no-se-usa.exe' 'no-se-usa.ini'
Verificar $true 'Reutiliza MySQL activo sin pedir permisos ni abrir otra copia'
Remove-Item Function:\Get-Service, Function:\Start-Service, Function:\Start-Process

function Leer-JsonHttp { throw 'No debe esperar una respuesta de un proceso cerrado' }
try {
    Esperar-Servidor 'http://127.0.0.1/' ([pscustomobject]@{HasExited=$true}) 'error.log'
    throw 'Se acepto un proceso cerrado'
} catch {
    Verificar ($_.Exception.Message -like '*cerrado antes de arrancar*') 'Detecta un arranque abortado sin agotar el tiempo de espera'
}
