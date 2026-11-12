param(
    [string]$EjecutableMySql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe',
    [string]$ConfiguracionMySql = 'C:\ProgramData\MySQL\MySQL Server 8.4\my.ini'
)

# Preparacion del equipo: reutiliza los datos existentes y solo eleva este paso.
$ErrorActionPreference = 'Stop'
$registroServicio = Join-Path (Split-Path -Parent $PSScriptRoot) 'logs\mysql-servicio.log'
$administrador = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $administrador.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    foreach ($ruta in @($PSCommandPath, $EjecutableMySql, $ConfiguracionMySql)) {
        if ($ruta.Contains('"')) { throw 'La ruta de MySQL no puede contener comillas.' }
    }
    try {
        $argumentos = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -EjecutableMySql "{1}" -ConfiguracionMySql "{2}"' -f $PSCommandPath, $EjecutableMySql, $ConfiguracionMySql
        $proceso = Start-Process powershell.exe -ArgumentList $argumentos -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    } catch {
        $causa = $_.Exception
        while ($causa.InnerException) { $causa = $causa.InnerException }
        throw "Windows no ha permitido preparar el servicio MySQL: $($causa.Message) Abre iniciar-tunelab.cmd y acepta la preparacion inicial."
    }
    if ($proceso.ExitCode -ne 0) { throw "No se pudo preparar MySQL. Consulta $registroServicio." }
    return
}

New-Item -ItemType Directory -Path (Split-Path $registroServicio) -Force | Out-Null
Start-Transcript -LiteralPath $registroServicio -Force | Out-Null
try {
    $mysqld = (Resolve-Path -LiteralPath $EjecutableMySql).Path
    $config = (Resolve-Path -LiteralPath $ConfiguracionMySql).Path
    $servicios = @(Get-CimInstance Win32_Service -Filter "PathName LIKE '%mysqld%'")
    if ($servicios.Count -gt 1) { throw 'Hay varios servicios MySQL. No se modificara ninguno automaticamente.' }
    $nombre = 'TunelabMySQL'
    if ($servicios.Count -eq 1) {
        $existente = $servicios[0]
        $orden = $existente.PathName.Replace('"', '').Replace('/', '\').ToLowerInvariant()
        if (-not $orden.StartsWith($mysqld.ToLowerInvariant() + ' ') -or -not $orden.Contains('--defaults-file=' + $config.ToLowerInvariant())) {
            throw "Ya existe el servicio $($existente.Name) con otra configuracion. No se creara un duplicado."
        }
        $nombre = $existente.Name
        Write-Host "Reutilizando el servicio $nombre."
    } else {
        if (Get-Service -Name $nombre -ErrorAction SilentlyContinue) { throw "El nombre $nombre ya pertenece a otro servicio." }
        if (Get-Process -Name mysqld -ErrorAction SilentlyContinue) { throw 'MySQL esta abierto manualmente. Cierralo de forma normal antes de instalar el servicio; no se interrumpiran procesos.' }
        & $mysqld --install $nombre "--defaults-file=$config"
        if ($LASTEXITCODE -ne 0) { throw 'No se ha podido registrar el servicio MySQL.' }
    }

    Set-Service -Name $nombre -StartupType Automatic
    if ((Get-Service -Name $nombre).Status -ne 'Running') {
        Start-Service -Name $nombre
        (Get-Service -Name $nombre).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }
    Write-Host "Servicio $nombre listo, con inicio automatico. Datos y configuracion existentes conservados."
} finally {
    Stop-Transcript | Out-Null
}
