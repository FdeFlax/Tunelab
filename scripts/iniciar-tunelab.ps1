param(
    [switch]$NoAbrirNavegador,
    [switch]$Diagnostico,
    [string]$ServicioMySql,
    [string]$EjecutableMySql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe',
    [string]$ConfiguracionMySql = 'C:\ProgramData\MySQL\MySQL Server 8.4\my.ini'
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $raiz 'backend'
$python = Join-Path $backend '.venv\Scripts\python.exe'
$vite = Join-Path $raiz 'node_modules\vite\bin\vite.js'
$logs = Join-Path $raiz 'logs'
$urlWeb = 'http://127.0.0.1:5173/'
$urlApi = 'http://127.0.0.1:8010/api/listo'
. (Join-Path $raiz 'scripts\arranque-local.ps1')

$mutex = [System.Threading.Mutex]::new($false, 'Local\Tunelab-arranque-local')
$bloqueado = $false
$codigoSalida = 0
try {
    try { $bloqueado = $mutex.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $bloqueado = $true }
    if (-not $bloqueado) { throw 'Ya hay un arranque o diagnostico de Tunelab en curso. Espera a que termine.' }
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $script:registro = Join-Path $logs 'arranque.log'
    Set-Content -LiteralPath $script:registro -Value "Tunelab - $(Get-Date -Format s)" -Encoding UTF8
    Write-Host "`nTunelab - $(if ($Diagnostico) {'diagnostico (sin iniciar servicios)'} else {'arranque local'})`n"

    if (-not (Test-Path $python)) { throw 'Falta backend/.venv. Consulta la instalacion inicial en docs/ARRANQUE_LOCAL.md.' }
    if (-not (Test-Path $vite)) { throw 'Faltan dependencias de la web. Ejecuta npm ci en la carpeta del proyecto.' }
    $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $node) { throw 'No se encuentra Node.js en PATH. Instala una version compatible con Vite y vuelve a abrir el lanzador.' }
    $config = Ejecutar-Json $python @('-m', 'app.diagnostico', '--configuracion') $backend
    if ($config.estado -ne 'ok') { throw $config.detalle }
    if ($config.motor -ne 'mysql') { throw 'Este lanzador necesita MySQL configurado en DATABASE_URL (backend/.env).' }
    $webConfig = Ejecutar-Json $node @((Join-Path $raiz 'scripts\comprobar-frontend.mjs')) $raiz
    if ($webConfig.estado -ne 'ok') { throw $webConfig.detalle }
    Escribir-Estado 'OK' 'Dependencias y configuracion leidas.'

    if (-not $Diagnostico -and -not (Test-Puerto $config.host $config.puerto)) {
        if ($config.host -notin @('localhost', '127.0.0.1', '::1')) { throw 'La base de datos configurada es remota y no responde. Este lanzador solo inicia MySQL en el equipo local.' }
        Escribir-Estado '...' 'Comprobando el servicio de MySQL...'
        Iniciar-MySql $ServicioMySql $EjecutableMySql $ConfiguracionMySql
        $limite = (Get-Date).AddSeconds(30)
        while (-not (Test-Puerto $config.host $config.puerto) -and (Get-Date) -lt $limite) { Start-Sleep -Milliseconds 500 }
        if (-not (Test-Puerto $config.host $config.puerto)) { throw 'MySQL no escucha en el puerto configurado. Consulta logs\mysql-error.log y el registro de su servicio, si lo utilizas.' }
    }
    $bd = Ejecutar-Json $python @('-m', 'app.diagnostico') $backend
    if ($bd.estado -ne 'ok') {
        Escribir-Estado 'ERROR' $bd.detalle
        if (-not $Diagnostico) { throw 'La base de datos no esta lista. No se abrira el navegador.' }
    } else { Escribir-Estado 'OK' "MySQL admite consultas. Esquema: $($bd.esquema)." }

    $api = Leer-JsonHttp $urlApi
    if (-not $Diagnostico -and -not (Test-Puerto '127.0.0.1' 8010)) {
        Escribir-Estado '...' 'Aplicando migraciones pendientes...'
        $migracion = Start-Process -FilePath $python -ArgumentList '-m', 'alembic', 'upgrade', 'head' `
            -WorkingDirectory $backend -WindowStyle Hidden -Wait -PassThru `
            -RedirectStandardOutput (Join-Path $logs 'migraciones.log') -RedirectStandardError (Join-Path $logs 'migraciones-error.log')
        if ($migracion.ExitCode -ne 0) { throw 'No se pudo actualizar la base de datos. Consulta migraciones-error.log en la carpeta de registros.' }
        Escribir-Estado '...' 'Iniciando el servidor...'
        $procesoApi = Start-Process -FilePath $python -ArgumentList '-m', 'uvicorn', 'app.main:app', `
            '--host', '127.0.0.1', '--port', '8010', '--no-proxy-headers' `
            -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logs 'backend.log') -RedirectStandardError (Join-Path $logs 'backend-error.log')
        $api = Esperar-Servidor $urlApi $procesoApi 'backend-error.log'
    }
    $problemaApi = Obtener-ProblemaApi $api $config.instalacion
    if ($problemaApi) {
        Escribir-Estado 'ERROR' $problemaApi
        if (-not $Diagnostico) { throw 'El servidor no esta listo. No se abrira el navegador.' }
    } else { Escribir-Estado 'OK' 'Servidor, base de datos y captura listos.' }

    $web = Leer-JsonHttp ($urlWeb + '__tunelab_local')
    if (-not $Diagnostico -and -not (Test-Puerto '127.0.0.1' 5173)) {
        Escribir-Estado '...' 'Iniciando la web...'
        $procesoWeb = Start-Process -FilePath $node -ArgumentList "`"$vite`"", '--host', '127.0.0.1', `
            '--port', '5173', '--strictPort' -WorkingDirectory $raiz -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logs 'frontend.log') -RedirectStandardError (Join-Path $logs 'frontend-error.log')
        $web = Esperar-Servidor ($urlWeb + '__tunelab_local') $procesoWeb 'frontend-error.log'
    }
    $webLista = Test-Identidad $web $config.instalacion
    if (-not $webLista) {
        Escribir-Estado 'ERROR' 'La web de esta carpeta no esta disponible en 5173. Si el puerto esta ocupado, cierra esa instancia antigua o ajena; no se cambiara al 5174.'
        if (-not $Diagnostico) { throw 'No se pudo verificar la web. No se abrira el navegador.' }
    } else { Escribir-Estado 'OK' 'Web correcta disponible en el puerto 5173.' }
    $accesoListo = $config.acceso_local -and $config.origen_local
    if (Test-Identidad $api $config.instalacion) { $accesoListo = $accesoListo -and $api.acceso_local -and $api.origen_local }
    if (-not $accesoListo) { Escribir-Estado 'ERROR' 'El acceso demo local esta bloqueado. Revisa ENTORNO=desarrollo, AUTENTICACION_MODO=demo y CORS_ORIGINS en backend/.env; reinicia la API tras modificarlos. No uses la demo en un servidor publico.' }
    if ($bd.estado -ne 'ok' -or $problemaApi -or -not $webLista -or -not $accesoListo) { throw 'Hay comprobaciones pendientes. Corrige los mensajes anteriores y vuelve a ejecutar el lanzador.' }
    # El acceso demo puede crear su usuario en la primera visita: no hacerlo en diagnostico.
    if (-not $Diagnostico -and -not (Test-AccesoLocal ($urlApi -replace '/listo$', '/usuarios'))) {
        throw 'La API responde, pero el acceso de prueba no funciona. Consulta backend-error.log. No se abrira el navegador.'
    }
    Escribir-Estado 'OK' "Tunelab listo: $urlWeb"
    if (-not $Diagnostico -and -not $NoAbrirNavegador) { Start-Process $urlWeb }
} catch {
    $codigoSalida = 1
    Write-Host "`nNo se ha completado: $($_.Exception.Message)" -ForegroundColor Red
    if ($bloqueado -and $script:registro) { Add-Content -LiteralPath $script:registro -Value $_.Exception.Message }
} finally {
    if ($bloqueado) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
Write-Host "`nRegistros: $logs"
exit $codigoSalida
