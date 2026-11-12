# Funciones compartidas del lanzador. Al cargar este archivo no se inicia nada.
function Escribir-Estado([string]$estado, [string]$mensaje) {
    Write-Host "[$estado] $mensaje"
    Add-Content -LiteralPath $script:registro -Value "[$estado] $mensaje"
}

function Test-Puerto([string]$servidor, [int]$puerto) {
    $cliente = [System.Net.Sockets.TcpClient]::new()
    try { return $cliente.ConnectAsync($servidor, $puerto).Wait(750) -and $cliente.Connected }
    catch { return $false }
    finally { $cliente.Dispose() }
}

function Leer-JsonHttp([string]$url) {
    try {
        $respuesta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        return $respuesta.Content | ConvertFrom-Json
    } catch {
        # PowerShell 5.1 lanza una excepcion tambien para los 503 con diagnostico.
        $respuesta = $_.Exception.Response
        if ($respuesta -and $respuesta.StatusCode -eq 503) {
            $lector = [System.IO.StreamReader]::new($respuesta.GetResponseStream())
            try { return $lector.ReadToEnd() | ConvertFrom-Json } catch { return $null }
            finally { $lector.Dispose() }
        }
        return $null
    }
}

function Test-Identidad($respuesta, [string]$instalacion) {
    return $respuesta -and $respuesta.protocolo -eq 'tunelab-local-v1' -and $respuesta.instalacion -eq $instalacion
}

function Test-AccesoLocal([string]$url) {
    try {
        $respuesta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -Headers @{ 'X-Usuario-Uacloud' = 'alu_demo' }
        $usuarios = @($respuesta.Content | ConvertFrom-Json)
        return $respuesta.StatusCode -eq 200 -and $usuarios.Count -eq 1 -and $usuarios[0].identificador_uacloud -eq 'alu_demo'
    } catch { return $false }
}

function Obtener-ProblemaApi($respuesta, [string]$instalacion) {
    if (-not (Test-Identidad $respuesta $instalacion)) { return 'La API de esta carpeta no responde con la comprobacion actual. Si 8010 ya esta ocupado, comprueba si sigue abierta una version anterior y reiniciala al terminar los ensayos.' }
    if ($respuesta.base_datos.estado -ne 'ok') {
        if ($respuesta.base_datos.detalle) { return $respuesta.base_datos.detalle }
        return 'El servidor no confirma la disponibilidad de la base de datos.'
    }
    if ($respuesta.base_datos.esquema -ne 'actualizado') { return 'Hay migraciones pendientes. Cierra la API al terminar los ensayos y vuelve a lanzar Tunelab para aplicarlas.' }
    if ($respuesta.controlador -ne 'listo' -or $respuesta.estado -ne 'listo') { return 'El proceso de captura no esta disponible. Consulta backend-error.log y reinicia la API al terminar los ensayos.' }
    return $null
}

function Ejecutar-Json([string]$ejecutable, [string[]]$argumentos, [string]$directorio) {
    $preferencia = $ErrorActionPreference
    Push-Location $directorio
    try {
        # Los fallos nativos se manejan con su JSON/codigo de salida, no se muestran URLs privadas.
        $ErrorActionPreference = 'Continue'
        $salida = & $ejecutable @argumentos 2> (Join-Path $logs 'diagnostico-error.log')
        $codigo = $LASTEXITCODE
        $ErrorActionPreference = $preferencia
        try { $resultado = ($salida -join "`n") | ConvertFrom-Json }
        catch { throw 'No se pudo leer la configuracion. Comprueba las dependencias instaladas; consulta diagnostico-error.log.' }
        if (-not $resultado -or ($codigo -ne 0 -and $resultado.estado -ne 'error')) { throw 'No se pudo ejecutar la comprobacion. Consulta diagnostico-error.log.' }
        return $resultado
    } finally {
        $ErrorActionPreference = $preferencia
        Pop-Location
    }
}

function Esperar-Servidor([string]$url, $proceso, [string]$registroError) {
    $limite = (Get-Date).AddSeconds(40)
    do {
        if ($proceso.HasExited) { throw "El proceso se ha cerrado antes de arrancar. Consulta $registroError." }
        $respuesta = Leer-JsonHttp $url
        if ($respuesta) { return $respuesta }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $limite)
    throw "El servidor no responde a tiempo. Consulta $registroError. No vuelvas a abrir otras copias sin revisar el error."
}

function Iniciar-MySql([string]$nombreServicio, [string]$ejecutable, [string]$configuracion) {
    $nombres = if ($nombreServicio) { @($nombreServicio) } else { @('TunelabMySQL', 'MySQL84', 'MySQL80', 'MySQL') }
    $servicio = Get-Service -Name $nombres -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nombreServicio -and -not $servicio) { throw "No existe el servicio MySQL indicado: $nombreServicio." }
    if (-not $servicio) {
        $otros = @(Get-CimInstance Win32_Service -Filter "PathName LIKE '%mysqld%'" -ErrorAction Stop)
        if ($otros.Count -gt 1) { throw 'Hay varios servicios MySQL. Indica -ServicioMySql para elegir el que usa Tunelab.' }
        if ($otros.Count -eq 1) { $servicio = Get-Service -Name $otros[0].Name }
    }
    if ($servicio) {
        if ($servicio.Status -eq 'Running') { return }
        try { Start-Service -Name $servicio.Name }
        catch {
            if ($servicio.Name -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Inicia el servicio MySQL desde Servicios de Windows.' }
            try {
                $orden = "Start-Service -Name '$($servicio.Name)' -ErrorAction Stop"
                $elevado = Start-Process powershell.exe -ArgumentList '-NoProfile', '-Command', "`"$orden`"" `
                    -Verb RunAs -WindowStyle Hidden -Wait -PassThru
                if ($elevado.ExitCode -ne 0) { throw 'No se pudo iniciar el servicio.' }
            } catch { throw 'Windows no ha autorizado el inicio del servicio MySQL o el servicio ha fallado. Revisa Servicios de Windows y vuelve a intentarlo.' }
        }
        return
    }
    if (-not (Test-Path -LiteralPath $ejecutable) -or -not (Test-Path -LiteralPath $configuracion)) { throw 'No se encuentra MySQL. Consulta docs/ARRANQUE_LOCAL.md para indicar su servicio o rutas en este equipo.' }
    if (Get-Process -Name mysqld -ErrorAction SilentlyContinue) {
        Escribir-Estado '...' 'MySQL ya tiene un proceso. Esperando su puerto sin abrir otra copia.'
        return
    }
    # MySQL no necesita administrador si el usuario puede escribir en sus datos.
    # No cambiar permisos ni inicializar otra base si esta instalacion falla.
    $proceso = Start-Process -FilePath $ejecutable -ArgumentList "--defaults-file=`"$configuracion`"", '--console' `
        -WindowStyle Hidden -WorkingDirectory (Split-Path $configuracion) -PassThru `
        -RedirectStandardOutput (Join-Path $logs 'mysql.log') -RedirectStandardError (Join-Path $logs 'mysql-error.log')
    $limite = (Get-Date).AddSeconds(3)
    do {
        if ($proceso.HasExited) {
            $errorMySql = Get-Content -LiteralPath (Join-Path $logs 'mysql-error.log') -Raw -ErrorAction SilentlyContinue
            if ($errorMySql -match 'Permission denied|Access is denied|Acceso denegado') {
                Escribir-Estado '...' 'Los datos de MySQL requieren permisos de sistema. Preparacion unica del servicio: acepta el aviso de Windows.'
                & (Join-Path $PSScriptRoot 'instalar-mysql-servicio.ps1') -EjecutableMySql $ejecutable -ConfiguracionMySql $configuracion
                return
            }
            throw 'MySQL se ha cerrado al arrancar. Consulta logs\mysql-error.log antes de volver a iniciar.'
        }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $limite)
}
