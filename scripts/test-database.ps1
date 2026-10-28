$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
$testContainer = $null
try {
    $testContainer = (docker compose --profile database-test run --rm -d database-test).Trim()
    if ($LASTEXITCODE -ne 0 -or $testContainer -notmatch '^[a-f0-9]{64}$') { throw 'No se pudo iniciar la base aislada.' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker exec $testContainer pg_isready -U postgres *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { throw 'La base aislada no inició a tiempo.' }
    $sqlFiles = @('/sql/tests/bootstrap.sql') + @(Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | ForEach-Object { '/sql/migrations/' + $_.Name }) + @('/sql/tests/domain.sql')
    foreach ($file in $sqlFiles) {
        docker exec $testContainer psql -X -q -U postgres -v ON_ERROR_STOP=1 -f $file
        if ($LASTEXITCODE -ne 0) { throw "Falló la verificación de $file" }
    }
    docker exec $testContainer psql -X -q -U postgres -v ON_ERROR_STOP=1 -f /sql/tests/concurrency-seed.sql
    if ($LASTEXITCODE -ne 0) { throw 'Falló preparación de concurrencia.' }
    $raceSql = @'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);
select public.brotito_adoptar('flori','Prueba concurrente',0,(clock_timestamp() at time zone 'UTC')::date);
select pg_sleep(2);
commit;
'@
    $jobs = 1..2 | ForEach-Object {
        Start-Job -ScriptBlock {
            param($containerId,$sql)
            $output = docker exec $containerId psql -X -q -U postgres -v ON_ERROR_STOP=1 -c $sql 2>&1
            [pscustomobject]@{ Code = $LASTEXITCODE; Output = ($output -join "`n") }
        } -ArgumentList $testContainer,$raceSql
    }
    $results = $jobs | Wait-Job | Receive-Job
    $jobs | Remove-Job
    if (@($results | Where-Object Code -eq 0).Count -ne 1 -or @($results | Where-Object Code -ne 0).Count -ne 1) {
        throw 'La carrera de dos sesiones no se serializó como se esperaba.'
    }
    if (($results | Where-Object Code -ne 0).Output -notmatch 'tu progreso') { throw "Error inesperado en concurrencia: $(($results | Where-Object Code -ne 0).Output)" }
    $raceCount = docker exec $testContainer psql -X -At -U postgres -c "select count(*) from public.mascotas_usuario where usuario_id = '33333333-3333-3333-3333-333333333333'"
    if ($LASTEXITCODE -ne 0 -or $raceCount.Trim() -ne '1') { throw 'La carrera creó un número incorrecto de mascotas.' }
    Write-Output 'OK: dos sesiones simultáneas; una mutación confirmada y otra rechazada por revisión antigua.'
    Write-Output 'Base de datos: migración y pruebas aprobadas.'
} finally {
    if ($testContainer -match '^[a-f0-9]{64}$') { docker stop $testContainer | Out-Null }
    Pop-Location
}
