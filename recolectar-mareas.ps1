# Script para recolectar datos de estaciones de marea de Sudamerica
# usando el CLI de neaps (ya instalado). Genera un archivo JSON por puerto
# en la carpeta .\tide-stations-data

$carpeta = ".\tide-stations-data"
New-Item -ItemType Directory -Force -Path $carpeta | Out-Null

$puertos = @{
    "buenos_aires"      = "-34.6,-58.4"
    "mar_del_plata"     = "-38.0,-57.5"
    "ushuaia"           = "-54.8,-68.3"
    "montevideo"        = "-34.9,-56.2"
    "rio_de_janeiro"    = "-22.9,-43.2"
    "santos"            = "-23.96,-46.3"
    "florianopolis"     = "-27.3,-48.6"
    "salvador"          = "-12.97,-38.5"
    "recife"            = "-8.05,-34.9"
    "fortaleza"         = "-3.7,-38.5"
    "valparaiso"        = "-33.05,-71.6"
    "punta_arenas"      = "-53.16,-70.9"
    "iquique"           = "-20.2,-70.15"
    "callao_lima"       = "-12.05,-77.15"
    "guayaquil"         = "-2.2,-79.9"
    "cartagena"         = "10.4,-75.5"
    "buenaventura"      = "3.88,-77.0"
}

foreach ($nombre in $puertos.Keys) {
    $coords = $puertos[$nombre]
    Write-Host "Consultando $nombre ($coords)..."
    $salida = neaps extremes --near="$coords" --format json 2>&1
    $salida | Out-File -FilePath "$carpeta\$nombre.json" -Encoding utf8
}

Write-Host ""
Write-Host "Listo. Archivos guardados en $carpeta"
Write-Host "Ahora comprimi esa carpeta en un .zip y subila al chat."
