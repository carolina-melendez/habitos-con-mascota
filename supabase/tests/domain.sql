-- SOLO en la base efímera del script de pruebas. Todo se revierte al terminar.
begin;
create schema test_brotito;
create function test_brotito.ok(valor boolean, etiqueta text) returns void
language plpgsql as $$ begin
  if valor is distinct from true then raise exception 'FALLO: %',etiqueta; end if;
  raise notice 'OK: %',etiqueta;
end $$;
create function test_brotito.falla(consulta text, codigo text, etiqueta text) returns void
language plpgsql as $$
declare obtenido text;
begin
  begin execute consulta;
  exception when others then get stacked diagnostics obtenido = returned_sqlstate; end;
  perform test_brotito.ok(obtenido = codigo,etiqueta || ' [' || coalesce(obtenido,'sin error') || ']');
end $$;
create function test_brotito.revision() returns bigint language sql stable as $$ select revision from public.perfiles where id = auth.uid(); $$;
grant usage on schema test_brotito to authenticated,anon;
grant execute on all functions in schema test_brotito to authenticated,anon;
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
set local role authenticated;
do $$
declare hoy date := (clock_timestamp() at time zone 'UTC')::date;
  agua uuid; mascota uuid; habito uuid; compra uuid; plan jsonb; resumen jsonb; antes bigint;
  dias smallint[] := array[0,1,2,3,4,5,6]::smallint[]; i integer;
begin
  perform test_brotito.falla('select public.brotito_iniciar_perfil(''Ana'',''invalida'')','P0001','Zona horaria inválida');
  perform public.brotito_iniciar_perfil('Ana','UTC');
  perform public.brotito_iniciar_perfil('Otro nombre','America/El_Salvador');
  perform test_brotito.ok((select zona_horaria = 'UTC' and nombre = 'Ana' from public.perfiles),'Perfil idempotente y zona fija');
  mascota := public.brotito_adoptar('flori','Flor',test_brotito.revision(),hoy);
  perform test_brotito.falla(format('select public.brotito_adoptar(''seti'',''Dos'',%s,%L)',test_brotito.revision(),hoy),'23505','Una mascota por usuario');
  perform test_brotito.falla(format('select public.brotito_crear_habito(''Agua'',''quantity'',''páginas'',2,ARRAY[1]::smallint[],%L,''agua'',null,%s,%L)',hoy,test_brotito.revision(),hoy),'P0001','Unidad de plantilla validada');
  perform test_brotito.falla(format('select public.brotito_crear_habito(''Agua'',''quantity'',''vasos'',2,ARRAY[1,1]::smallint[],%L,''agua'',null,%s,%L)',hoy,test_brotito.revision(),hoy),'P0001','Días duplicados rechazados');
  perform test_brotito.falla(format('select public.brotito_crear_habito(''Agua'',''quantity'',''vasos'',2,null,%L,''agua'',null,%s,%L)',hoy,test_brotito.revision(),hoy),'P0001','Frecuencia nula rechazada');
  agua := public.brotito_crear_habito('Agua','quantity','vasos',2,dias,hoy,'agua',null,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 1 from public.nombres_habito where habito_id = agua),'Versión inicial del nombre');
  perform public.brotito_guardar_registro(agua,1,false,test_brotito.revision(),hoy);
  perform test_brotito.ok((public.brotito_resumen()->>'xp')::integer = 0,'Avance parcial sin recompensa');
  perform public.brotito_guardar_registro(agua,2,false,test_brotito.revision(),hoy);
  perform public.brotito_guardar_registro(agua,3,false,test_brotito.revision(),hoy);
  perform test_brotito.ok((public.brotito_resumen()->>'xp')::integer = 10 and (select count(*) = 1 from public.registros_diarios),'Completar y exceder no duplica recompensa');
  antes := test_brotito.revision();
  perform public.brotito_editar_habito(agua,'Agua tranquila',4,dias,antes,hoy);
  perform test_brotito.ok((select meta_del_dia = 2 and cantidad = 3 from public.registros_diarios where habito_id = agua),'Editar conserva meta y registro de hoy');
  perform test_brotito.ok((select meta = 4 from public.versiones_habito where habito_id = agua and vigente_desde = hoy+1),'Meta desde mañana');
  perform test_brotito.falla(format('select public.brotito_archivar_habito(%L,%s,%L)',agua,antes,hoy),'40001','Edición concurrente invalida revisión');
  perform public.brotito_editar_habito(agua,'Agua tranquila',5,dias,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 2 and max(meta) = 5 from public.versiones_habito where habito_id = agua),'Segunda edición reemplaza pendiente');
  perform public.brotito_editar_habito(agua,'Agua tranquila',2,dias,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 1 from public.versiones_habito where habito_id = agua),'Volver a meta vigente cancela cambio');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,0,false,%s,%L)',agua,test_brotito.revision(),hoy),'P0001','Corrección exige confirmación');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,0,true,%s,%L)',agua,test_brotito.revision(),hoy-1),'40001','Día cerrado rechazado');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,null,true,%s,%L)',agua,test_brotito.revision(),hoy),'P0001','Cantidad nula rechazada');
  for i in 1..7 loop
    habito := public.brotito_crear_habito('Rutina '||i,'binary','veces',1,dias,hoy,null,null,test_brotito.revision(),hoy);
    perform public.brotito_guardar_registro(habito,1,false,test_brotito.revision(),hoy);
  end loop;
  perform test_brotito.ok((public.brotito_resumen()->>'saldo')::integer = 40,'Saldo calculado desde ocho hábitos');
  compra := public.brotito_comprar('panuelo',test_brotito.revision(),hoy);
  perform public.brotito_equipar(compra,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 1 from public.equipamiento),'Compra propia equipada');
  antes := test_brotito.revision();
  plan := public.brotito_previsualizar_registro(agua,0,antes,hoy);
  perform test_brotito.ok(jsonb_array_length(plan->'devueltas') = 1 and (plan->'despues'->>'saldo')::integer = 35,'Vista previa devuelve compra al precio pagado');
  perform test_brotito.ok(test_brotito.revision() = antes and (select estado = 'adquirido' from public.compras where id = compra),'Vista previa no cambia registros ni compras');
  perform public.brotito_guardar_registro(agua,0,true,antes,hoy);
  perform test_brotito.ok((select estado = 'devuelto' and registro_reversion_id is not null from public.compras where id = compra)
    and (select count(*) = 0 from public.equipamiento),'Corrección devuelve y desequipa en conjunto');
  perform public.brotito_guardar_registro(agua,2,false,test_brotito.revision(),hoy);
  perform test_brotito.ok((public.brotito_resumen()->>'saldo')::integer = 40 and (select estado = 'devuelto' from public.compras where id = compra),'Recompletar recupera recompensa sin recompra');
  compra := public.brotito_comprar('panuelo',test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 2 from public.compras),'Se permite recomprar tras devolución');
  perform public.brotito_equipar(compra,test_brotito.revision(),hoy);
  perform public.brotito_editar_habito(agua,'Mi agua',4,dias,test_brotito.revision(),hoy);
  perform public.brotito_archivar_habito(agua,test_brotito.revision(),hoy);
  perform test_brotito.ok((public.brotito_resumen()->>'xp')::integer = 80 and (public.brotito_resumen()->>'saldo')::integer = 0
    and (select count(*) = 1 from public.equipamiento),'Archivo conserva XP, saldo y equipo');
  perform test_brotito.ok((select count(*) = 1 from public.versiones_habito where habito_id = agua),'Archivo cancela meta pendiente');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,0,true,%s,%L)',agua,test_brotito.revision(),hoy),'P0001','Archivado no permite registrar');
  perform test_brotito.falla(format('select public.brotito_editar_habito(%L,''Cambio'',4,ARRAY[1]::smallint[],%s,%L)',agua,test_brotito.revision(),hoy),'P0001','Archivado no permite editar');
  perform test_brotito.falla('update public.registros_diarios set cantidad = 100','42501','Sin escritura directa de recompensas');
  perform test_brotito.falla('update public.perfiles set revision = 0','42501','Sin manipulación de revisión o zona');
  perform test_brotito.falla('insert into public.compras(usuario_id,accesorio_id,precio_pagado) values(auth.uid(),''corona'',1)','42501','Sin compras directas a precio elegido');
  perform test_brotito.falla('select brotito_private.totales()','42501','Funciones internas inaccesibles');
  -- Ganar 60 monedas adicionales permite comprar corona sin devolver el pañuelo anterior.
  for i in 8..19 loop
    habito := public.brotito_crear_habito('Rutina '||i,'binary','veces',1,dias,hoy,null,null,test_brotito.revision(),hoy);
    perform public.brotito_guardar_registro(habito,1,false,test_brotito.revision(),hoy);
  end loop;
  compra := public.brotito_comprar('corona',test_brotito.revision(),hoy);
  perform public.brotito_equipar(compra,test_brotito.revision(),hoy);
  antes := test_brotito.revision();
  plan := public.brotito_previsualizar_registro(habito,0,antes,hoy);
  perform test_brotito.ok(jsonb_array_length(plan->'devueltas') = 1 and plan->'devueltas'->0->>'accesorio_id' = 'corona','Revertir compra más reciente primero');
  perform public.brotito_quitar_accesorio('cabeza',antes,hoy);
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,0,true,%s,%L)',habito,antes,hoy),'40001','Vista previa antigua invalida confirmación');
  perform public.brotito_equipar(compra,test_brotito.revision(),hoy);
  perform public.brotito_guardar_registro(habito,0,true,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 1 from public.equipamiento where categoria = 'cuello')
    and (select count(*) = 0 from public.equipamiento where categoria = 'cabeza'),'Devolución conserva compras y equipo anteriores');
  perform test_brotito.ok((public.brotito_resumen()->>'saldo')::integer = 55,'Saldo de corrección incluye reembolso real');
  antes := test_brotito.revision();
  perform test_brotito.falla(format('select public.brotito_comprar(''corona'',%s,%L)',antes,hoy),'P0001','No gastar saldo insuficiente tras corrección');
  perform test_brotito.ok(test_brotito.revision() = antes,'Fallo no avanza revisión');
  perform test_brotito.falla(format('select public.brotito_comprar(''panuelo'',%s,%L)',antes,hoy),'23505','No duplicar accesorio adquirido');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,2,false,%s,%L)',habito,antes,hoy),'P0001','Sí/no solo admite cero o uno');
  habito := public.brotito_crear_habito('Futuro','quantity','vasos',2,dias,hoy+5,'agua',null,test_brotito.revision(),hoy);
  perform public.brotito_editar_habito(habito,'Futuro nuevo',4,dias,test_brotito.revision(),hoy);
  perform test_brotito.ok((select count(*) = 2 from public.versiones_habito where habito_id = habito),'Editar antes del inicio conserva versión base');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,4,false,%s,%L)',habito,test_brotito.revision(),hoy),'P0001','Inicio futuro no admite progreso hoy');
  habito := public.brotito_crear_habito('Descanso hoy','binary','veces',1,array[(extract(dow from hoy+1)::integer)::smallint],hoy,null,null,test_brotito.revision(),hoy);
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,1,false,%s,%L)',habito,test_brotito.revision(),hoy),'P0001','Día no programado no admite progreso');
  resumen := public.brotito_jardin();
  perform test_brotito.ok(resumen->>'userId' = auth.uid()::text and (resumen->>'revision')::bigint = test_brotito.revision(),'Snapshot pertenece al usuario y revisión actual');
  perform test_brotito.ok(jsonb_array_length(resumen->'state'->'records') = 20 and resumen->'totals' = public.brotito_resumen() - 'revision' - 'fecha_local','Snapshot conserva registros y totales coherentes');
end $$;

-- Otra cuenta: no ve ninguna fila privada de la primera ni puede operar sus identificadores.
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
do $$
declare hoy date := (clock_timestamp() at time zone 'UTC')::date;
begin
  perform public.brotito_iniciar_perfil('Bea','UTC');
  perform test_brotito.ok((select count(*) = 1 from public.perfiles),'RLS perfiles');
  perform test_brotito.ok((select count(*) = 0 from public.habitos),'RLS hábitos');
  perform test_brotito.ok((select count(*) = 0 from public.versiones_habito),'RLS versiones');
  perform test_brotito.ok((select count(*) = 0 from public.nombres_habito),'RLS nombres');
  perform test_brotito.ok((select count(*) = 0 from public.registros_diarios),'RLS registros');
  perform test_brotito.ok((select count(*) = 0 from public.compras),'RLS compras');
  perform test_brotito.ok((select count(*) = 0 from public.mascotas_usuario),'RLS mascotas');
  perform test_brotito.ok((select count(*) = 0 from public.equipamiento),'RLS equipo');
  perform test_brotito.ok((select count(*) = 5 from public.especies) and (select count(*) = 5 from public.plantillas),'Catálogos disponibles a cuentas');
  perform test_brotito.ok(jsonb_array_length(public.brotito_jardin()->'state'->'habits') = 0 and public.brotito_jardin()->'pet' = 'null'::jsonb,'Snapshot de segunda cuenta no incluye jardín ajeno');
  perform test_brotito.falla(format('select public.brotito_comprar(''panuelo'',0,%L)',hoy),'P0001','Cuenta sin saldo no compra');
  perform test_brotito.falla(format('select public.brotito_equipar(''00000000-0000-0000-0000-000000000000'',0,%L)',hoy),'P0001','Sin equipar compras ajenas');
end $$;
reset role;
-- IDs reales de la primera cuenta para verificar intentos cruzados sin depender de RLS en la búsqueda.
do $$
declare ajeno uuid; compra uuid;
begin
  select id into ajeno from public.habitos where usuario_id = '11111111-1111-1111-1111-111111111111' and archivado_desde is null limit 1;
  select id into compra from public.compras where estado = 'adquirido' limit 1;
  perform set_config('test.habito_ajeno',ajeno::text,true);
  perform set_config('test.compra_ajena',compra::text,true);
end $$;
set local role authenticated;
do $$
declare hoy date := (clock_timestamp() at time zone 'UTC')::date;
begin
  perform public.brotito_adoptar('seti','Setita',test_brotito.revision(),hoy);
  perform test_brotito.falla(format('select public.brotito_equipar(%L,%s,%L)',current_setting('test.compra_ajena'),test_brotito.revision(),hoy),'P0001','Compra real ajena inaccesible');
  perform test_brotito.falla(format('select public.brotito_archivar_habito(%L,%s,%L)',current_setting('test.habito_ajeno'),test_brotito.revision(),hoy),'P0001','Archivo ajeno rechazado');
  perform test_brotito.falla(format('select public.brotito_guardar_registro(%L,0,true,%s,%L)',current_setting('test.habito_ajeno'),test_brotito.revision(),hoy),'P0001','Registro ajeno rechazado');
end $$;
set local role anon;
do $$ begin
  perform test_brotito.falla('select * from public.perfiles','42501','Anónimo sin acceso a perfiles');
  perform test_brotito.falla('select public.brotito_resumen()','42501','Anónimo sin RPC');
  perform test_brotito.falla('select public.brotito_jardin()','42501','Anónimo sin snapshot');
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
  perform test_brotito.falla('select public.brotito_resumen()','28000','RPC exige identidad autenticada');
end $$;
reset role;
select test_brotito.ok((select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'),'RLS habilitado en todas las tablas');
rollback;
