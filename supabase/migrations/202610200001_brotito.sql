-- Ejecutar completo una sola vez en el proyecto aprobado. No contiene datos personales.
begin;

create schema brotito_private;
revoke all on schema brotito_private from public, anon, authenticated;

create function brotito_private.dias_validos(dias smallint[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(dias) between 1 and 7
    and not exists(select 1 from unnest(dias) d where d is null or d not between 0 and 6)
    and cardinality(dias) = (select count(distinct d) from unnest(dias) d), false);
$$;

create table public.perfiles (
  id uuid primary key references auth.users(id),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  zona_horaria text not null,
  revision bigint not null default 0 check (revision >= 0),
  creado_en timestamptz not null default now()
);
create table public.especies (id text primary key, nombre text not null);
create table public.mascotas_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.perfiles(id),
  especie_id text not null references public.especies(id),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 30),
  adoptada_en timestamptz not null default now()
);
create table public.plantillas (
  id text primary key, nombre text not null,
  tipo_registro text not null check (tipo_registro in ('quantity','binary')),
  unidades_permitidas text[] not null check (cardinality(unidades_permitidas) > 0),
  meta_sugerida integer not null check (meta_sugerida between 1 and 1000),
  activa boolean not null default true
);
create table public.habitos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id),
  plantilla_id text references public.plantillas(id),
  tipo_registro text not null check (tipo_registro in ('quantity','binary')),
  unidad text not null check (char_length(btrim(unidad)) between 1 and 20),
  hora_referencia time,
  fecha_inicio date not null check (isfinite(fecha_inicio)),
  archivado_desde date check (isfinite(archivado_desde)),
  revision bigint not null default 0,
  creado_en timestamptz not null default now()
);
create index habitos_usuario on public.habitos(usuario_id);
create table public.versiones_habito (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos(id),
  vigente_desde date not null check (isfinite(vigente_desde)),
  meta integer not null check (meta between 1 and 1000),
  dias_semana smallint[] not null check (brotito_private.dias_validos(dias_semana)),
  unique(habito_id, vigente_desde), unique(habito_id,id)
);
create table public.nombres_habito (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos(id),
  vigente_desde date not null check (isfinite(vigente_desde)),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  unique(habito_id,vigente_desde)
);
create table public.registros_diarios (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos(id),
  version_id uuid not null,
  fecha_local date not null check (isfinite(fecha_local)),
  cantidad integer not null check (cantidad between 0 and 100000),
  meta_del_dia integer not null check (meta_del_dia between 1 and 1000),
  xp_por_cumplir integer not null default 10 check (xp_por_cumplir = 10),
  monedas_por_cumplir integer not null default 5 check (monedas_por_cumplir = 5),
  actualizado_en timestamptz not null default now(),
  unique(habito_id,fecha_local),
  foreign key(habito_id,version_id) references public.versiones_habito(habito_id,id)
);
create index registros_version on public.registros_diarios(version_id);
create table public.accesorios (
  id text primary key, nombre text not null,
  categoria text not null check (categoria in ('cabeza','cuello','rostro')),
  precio_monedas integer not null check (precio_monedas > 0),
  activo boolean not null default true
);
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  orden bigint generated always as identity unique,
  usuario_id uuid not null references public.perfiles(id),
  accesorio_id text not null references public.accesorios(id),
  precio_pagado integer not null check (precio_pagado > 0),
  estado text not null default 'adquirido' check (estado in ('adquirido','devuelto')),
  comprada_en timestamptz not null default now(),
  devuelta_en timestamptz,
  registro_reversion_id uuid references public.registros_diarios(id),
  check ((estado = 'adquirido' and devuelta_en is null and registro_reversion_id is null)
    or (estado = 'devuelto' and devuelta_en is not null and registro_reversion_id is not null))
);
create unique index compra_adquirida_unica on public.compras(usuario_id,accesorio_id) where estado = 'adquirido';
create index compras_usuario_orden on public.compras(usuario_id,orden desc);
create index compras_reversion on public.compras(registro_reversion_id);
create table public.equipamiento (
  mascota_id uuid not null references public.mascotas_usuario(id),
  categoria text not null check (categoria in ('cabeza','cuello','rostro')),
  compra_id uuid not null unique references public.compras(id),
  primary key(mascota_id,categoria)
);

insert into public.especies values
  ('flori','Flori'),('musguito','Musguito'),('seti','Seti'),('lumi','Lumi'),('semillin','Semillín');
insert into public.plantillas(id,nombre,tipo_registro,unidades_permitidas,meta_sugerida) values
  ('agua','Consumir agua','quantity',array['vasos'],8),
  ('lectura','Leer un ratito','quantity',array['minutos','páginas'],20),
  ('caminar','Caminar','quantity',array['minutos'],15),
  ('movimiento','Mover el cuerpo','binary',array['veces'],1),
  ('descanso','Prepararme para dormir','binary',array['veces'],1);
insert into public.accesorios(id,nombre,categoria,precio_monedas) values
  ('panuelo','Pañuelo de durazno','cuello',40),
  ('corona','Corona de flores','cabeza',60),('gafas','Gafas de pétalo','rostro',90);

-- Lectura restringida por dueño; toda escritura de clientes pasa por RPC.
do $$
declare t text;
begin
  foreach t in array array['perfiles','especies','mascotas_usuario','plantillas','habitos',
    'versiones_habito','nombres_habito','registros_diarios','accesorios','compras','equipamiento'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
create policy perfil_propio on public.perfiles for select to authenticated using(id = (select auth.uid()));
create policy mascota_propia on public.mascotas_usuario for select to authenticated using(usuario_id = (select auth.uid()));
create policy habito_propio on public.habitos for select to authenticated using(usuario_id = (select auth.uid()));
create policy compra_propia on public.compras for select to authenticated using(usuario_id = (select auth.uid()));
create policy versiones_propias on public.versiones_habito for select to authenticated using(
  exists(select 1 from public.habitos h where h.id = habito_id and h.usuario_id = (select auth.uid())));
create policy nombres_propios on public.nombres_habito for select to authenticated using(
  exists(select 1 from public.habitos h where h.id = habito_id and h.usuario_id = (select auth.uid())));
create policy registros_propios on public.registros_diarios for select to authenticated using(
  exists(select 1 from public.habitos h where h.id = habito_id and h.usuario_id = (select auth.uid())));
create policy equipo_propio on public.equipamiento for select to authenticated using(
  exists(select 1 from public.mascotas_usuario m where m.id = mascota_id and m.usuario_id = (select auth.uid())));
create policy especies_lectura on public.especies for select to authenticated using(true);
create policy plantillas_lectura on public.plantillas for select to authenticated using(true);
create policy accesorios_lectura on public.accesorios for select to authenticated using(true);

create function brotito_private.usuario() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión.' using errcode = '28000'; end if;
  return auth.uid();
end $$;

-- Serializa todas las mutaciones del usuario; revisión global invalida vistas previas antiguas.
create function brotito_private.bloquear(p_revision bigint, p_fecha date) returns date
language plpgsql set search_path = '' as $$
declare perfil public.perfiles; hoy date;
begin
  select * into perfil from public.perfiles where id = brotito_private.usuario() for update;
  if not found then raise exception 'Primero configura tu perfil.'; end if;
  hoy := (clock_timestamp() at time zone perfil.zona_horaria)::date;
  if p_fecha is distinct from hoy then raise exception 'Cambió el día. Vuelve a revisar.' using errcode = '40001'; end if;
  if p_revision is distinct from perfil.revision then raise exception 'Cambió tu progreso. Vuelve a revisar.' using errcode = '40001'; end if;
  return hoy;
end $$;
create function brotito_private.avanzar() returns void
language sql set search_path = '' as $$
  update public.perfiles set revision = revision + 1 where id = auth.uid();
$$;
create function brotito_private.totales() returns jsonb
language sql stable set search_path = '' as $$
  with ganado as (
    select coalesce(sum(r.xp_por_cumplir),0) xp, coalesce(sum(r.monedas_por_cumplir),0) monedas
    from public.registros_diarios r join public.habitos h on h.id = r.habito_id
    where h.usuario_id = auth.uid() and r.cantidad >= r.meta_del_dia
  ), gasto as (
    select coalesce(sum(precio_pagado),0) monedas from public.compras
    where usuario_id = auth.uid() and estado = 'adquirido'
  ) select jsonb_build_object('xp',g.xp,'monedas_ganadas',g.monedas,'saldo',g.monedas-c.monedas,
    'etapa',case when g.xp >= 600 then 4 when g.xp >= 300 then 3 when g.xp >= 100 then 2 else 1 end)
  from ganado g cross join gasto c;
$$;

create function public.brotito_resumen() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare perfil public.perfiles;
begin
  select * into perfil from public.perfiles where id = brotito_private.usuario() for share;
  if not found then raise exception 'Primero configura tu perfil.'; end if;
  return brotito_private.totales() || jsonb_build_object('revision',perfil.revision,
    'fecha_local',(clock_timestamp() at time zone perfil.zona_horaria)::date);
end $$;

create function public.brotito_iniciar_perfil(p_nombre text, p_zona_horaria text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := brotito_private.usuario();
begin
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 80 then raise exception 'Nombre inválido.'; end if;
  if p_zona_horaria is null or not exists(select 1 from pg_catalog.pg_timezone_names where name = p_zona_horaria) then
    raise exception 'Zona horaria inválida.';
  end if;
  insert into public.perfiles(id,nombre,zona_horaria) values(uid,btrim(p_nombre),p_zona_horaria) on conflict(id) do nothing;
  -- Reintentar nunca cambia una zona ya establecida ni reinicia el progreso.
  return public.brotito_resumen();
end $$;

create function public.brotito_adoptar(p_especie text, p_nombre text, p_revision bigint, p_fecha date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare mascota uuid;
begin
  perform brotito_private.bloquear(p_revision,p_fecha);
  insert into public.mascotas_usuario(usuario_id,especie_id,nombre)
    values(auth.uid(),p_especie,btrim(p_nombre)) returning id into mascota;
  perform brotito_private.avanzar();
  return mascota;
end $$;

create function brotito_private.validar_config(p_tipo text,p_meta integer,p_dias smallint[]) returns void
language plpgsql set search_path = '' as $$
begin
  if p_tipo is null or p_tipo not in ('quantity','binary') or p_meta is null or p_meta not between 1 and 1000
    or (p_tipo = 'binary' and p_meta <> 1) or not brotito_private.dias_validos(p_dias) then
    raise exception 'Meta o frecuencia inválida.';
  end if;
end $$;

create function public.brotito_crear_habito(p_nombre text,p_tipo text,p_unidad text,p_meta integer,
  p_dias smallint[],p_inicio date,p_plantilla text,p_hora time,p_revision bigint,p_fecha date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare hoy date; nuevo uuid; plantilla public.plantillas;
begin
  hoy := brotito_private.bloquear(p_revision,p_fecha);
  perform brotito_private.validar_config(p_tipo,p_meta,p_dias);
  if p_inicio is null or not isfinite(p_inicio) or p_inicio < hoy then raise exception 'Elige una fecha desde hoy.'; end if;
  if p_plantilla is not null then
    select * into plantilla from public.plantillas where id = p_plantilla and activa;
    if not found or p_tipo is distinct from plantilla.tipo_registro or p_unidad is null
      or not (p_unidad = any(plantilla.unidades_permitidas)) then raise exception 'Plantilla o unidad inválida.'; end if;
    if p_plantilla = 'descanso' and p_hora is null then raise exception 'Indica una hora de referencia.'; end if;
  end if;
  if p_hora = '24:00:00'::time then raise exception 'Hora inválida.'; end if;
  insert into public.habitos(usuario_id,plantilla_id,tipo_registro,unidad,hora_referencia,fecha_inicio)
    values(auth.uid(),p_plantilla,p_tipo,btrim(p_unidad),p_hora,p_inicio) returning id into nuevo;
  -- La configuración existe desde hoy; el inicio del hábito es un límite independiente.
  insert into public.versiones_habito(habito_id,vigente_desde,meta,dias_semana) values(nuevo,hoy,p_meta,p_dias);
  insert into public.nombres_habito(habito_id,vigente_desde,nombre) values(nuevo,hoy,btrim(p_nombre));
  perform brotito_private.avanzar();
  return nuevo;
end $$;

create function public.brotito_editar_habito(p_habito uuid,p_nombre text,p_meta integer,p_dias smallint[],
  p_revision bigint,p_fecha date) returns date
language plpgsql security definer set search_path = '' as $$
declare hoy date; habito public.habitos; actual public.versiones_habito;
begin
  hoy := brotito_private.bloquear(p_revision,p_fecha);
  select * into habito from public.habitos where id = p_habito and usuario_id = auth.uid() and archivado_desde is null;
  if not found then raise exception 'Hábito no disponible.'; end if;
  perform brotito_private.validar_config(habito.tipo_registro,p_meta,p_dias);
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 60 then raise exception 'Nombre inválido.'; end if;
  insert into public.nombres_habito(habito_id,vigente_desde,nombre) values(p_habito,hoy,btrim(p_nombre))
    on conflict(habito_id,vigente_desde) do update set nombre = excluded.nombre;
  select * into actual from public.versiones_habito where habito_id = p_habito and vigente_desde <= hoy order by vigente_desde desc limit 1;
  delete from public.versiones_habito where habito_id = p_habito and vigente_desde > hoy;
  if p_meta <> actual.meta or not (p_dias @> actual.dias_semana and p_dias <@ actual.dias_semana) then
    insert into public.versiones_habito(habito_id,vigente_desde,meta,dias_semana) values(p_habito,hoy+1,p_meta,p_dias);
  end if;
  update public.habitos set revision = revision + 1 where id = p_habito;
  perform brotito_private.avanzar();
  return hoy+1;
end $$;

create function public.brotito_archivar_habito(p_habito uuid,p_revision bigint,p_fecha date) returns void
language plpgsql security definer set search_path = '' as $$
declare hoy date;
begin
  hoy := brotito_private.bloquear(p_revision,p_fecha);
  update public.habitos set archivado_desde = hoy, revision = revision + 1
    where id = p_habito and usuario_id = auth.uid() and archivado_desde is null;
  if not found then raise exception 'Hábito no disponible.'; end if;
  delete from public.versiones_habito where habito_id = p_habito and vigente_desde > hoy;
  perform brotito_private.avanzar();
end $$;

-- Plan compartido por consulta y confirmación: nunca confía en XP, saldo o devoluciones del cliente.
create function brotito_private.plan_registro(p_habito uuid,p_cantidad integer,p_hoy date) returns jsonb
language plpgsql set search_path = '' as $$
declare habito public.habitos; config public.versiones_habito; anterior public.registros_diarios;
  antes jsonb; despues jsonb; diferencia integer; xp bigint; monedas bigint; saldo bigint;
  compra public.compras; devueltas jsonb := '[]'::jsonb;
begin
  select * into habito from public.habitos where id = p_habito and usuario_id = auth.uid();
  if not found or habito.archivado_desde is not null or habito.fecha_inicio > p_hoy then raise exception 'Hábito no disponible hoy.'; end if;
  select * into config from public.versiones_habito where habito_id = p_habito and vigente_desde <= p_hoy order by vigente_desde desc limit 1;
  if not found or not (extract(dow from p_hoy)::smallint = any(config.dias_semana)) then raise exception 'Hábito no programado hoy.'; end if;
  if p_cantidad is null or p_cantidad not between 0 and 100000 or (habito.tipo_registro = 'binary' and p_cantidad not in (0,1)) then
    raise exception 'Cantidad inválida.';
  end if;
  select * into anterior from public.registros_diarios where habito_id = p_habito and fecha_local = p_hoy;
  diferencia := (case when p_cantidad >= config.meta then 1 else 0 end) -
    (case when anterior.cantidad >= anterior.meta_del_dia then 1 else 0 end);
  antes := brotito_private.totales();
  xp := (antes->>'xp')::bigint + diferencia * 10;
  monedas := (antes->>'monedas_ganadas')::bigint + diferencia * 5;
  saldo := (antes->>'saldo')::bigint + diferencia * 5;
  for compra in select * from public.compras where usuario_id = auth.uid() and estado = 'adquirido' order by orden desc loop
    exit when saldo >= 0;
    saldo := saldo + compra.precio_pagado;
    devueltas := devueltas || jsonb_build_array(jsonb_build_object('id',compra.id,'accesorio_id',compra.accesorio_id,'precio_pagado',compra.precio_pagado));
  end loop;
  if saldo < 0 then raise exception 'Saldo inconsistente.'; end if;
  despues := jsonb_build_object('xp',xp,'monedas_ganadas',monedas,'saldo',saldo,
    'etapa',case when xp >= 600 then 4 when xp >= 300 then 3 when xp >= 100 then 2 else 1 end);
  return jsonb_build_object('antes',antes,'despues',despues,'devueltas',devueltas,
    'version_id',config.id,'meta_del_dia',config.meta,'requiere_confirmacion',diferencia < 0);
end $$;

create function public.brotito_previsualizar_registro(p_habito uuid,p_cantidad integer,p_revision bigint,p_fecha date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hoy date;
begin
  hoy := brotito_private.bloquear(p_revision,p_fecha);
  return brotito_private.plan_registro(p_habito,p_cantidad,hoy) || jsonb_build_object('revision',p_revision,'fecha_local',hoy);
end $$;

create function public.brotito_guardar_registro(p_habito uuid,p_cantidad integer,p_confirmar boolean,p_revision bigint,p_fecha date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare hoy date; plan jsonb; registro uuid; devolucion jsonb;
begin
  hoy := brotito_private.bloquear(p_revision,p_fecha);
  plan := brotito_private.plan_registro(p_habito,p_cantidad,hoy);
  if (plan->>'requiere_confirmacion')::boolean and p_confirmar is distinct from true then
    raise exception 'Revisa y confirma la corrección.';
  end if;
  insert into public.registros_diarios(habito_id,version_id,fecha_local,cantidad,meta_del_dia)
    values(p_habito,(plan->>'version_id')::uuid,hoy,p_cantidad,(plan->>'meta_del_dia')::integer)
    on conflict(habito_id,fecha_local) do update set cantidad = excluded.cantidad, actualizado_en = clock_timestamp()
    returning id into registro;
  for devolucion in select value from jsonb_array_elements(plan->'devueltas') loop
    delete from public.equipamiento where compra_id = (devolucion->>'id')::uuid;
    update public.compras set estado = 'devuelto', devuelta_en = clock_timestamp(), registro_reversion_id = registro
      where id = (devolucion->>'id')::uuid and usuario_id = auth.uid();
  end loop;
  update public.habitos set revision = revision + 1 where id = p_habito;
  perform brotito_private.avanzar();
  return plan || jsonb_build_object('registro_id',registro,'revision',p_revision+1,'fecha_local',hoy);
end $$;

create function public.brotito_comprar(p_accesorio text,p_revision bigint,p_fecha date) returns uuid
language plpgsql security definer set search_path = '' as $$
declare item public.accesorios; compra uuid;
begin
  perform brotito_private.bloquear(p_revision,p_fecha);
  select * into item from public.accesorios where id = p_accesorio and activo for share;
  if not found then raise exception 'Accesorio no disponible.'; end if;
  if (brotito_private.totales()->>'saldo')::bigint < item.precio_monedas then raise exception 'Monedas insuficientes.'; end if;
  insert into public.compras(usuario_id,accesorio_id,precio_pagado) values(auth.uid(),item.id,item.precio_monedas) returning id into compra;
  perform brotito_private.avanzar();
  return compra;
end $$;

create function public.brotito_equipar(p_compra uuid,p_revision bigint,p_fecha date) returns void
language plpgsql security definer set search_path = '' as $$
declare mascota uuid; categoria_item text;
begin
  perform brotito_private.bloquear(p_revision,p_fecha);
  select id into mascota from public.mascotas_usuario where usuario_id = auth.uid();
  if mascota is null then raise exception 'Primero elige tu mascota.'; end if;
  select a.categoria into categoria_item from public.compras c join public.accesorios a on a.id = c.accesorio_id
    where c.id = p_compra and c.usuario_id = auth.uid() and c.estado = 'adquirido';
  if not found then raise exception 'Compra no disponible.'; end if;
  insert into public.equipamiento(mascota_id,categoria,compra_id) values(mascota,categoria_item,p_compra)
    on conflict(mascota_id,categoria) do update set compra_id = excluded.compra_id;
  perform brotito_private.avanzar();
end $$;

create function public.brotito_quitar_accesorio(p_categoria text,p_revision bigint,p_fecha date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform brotito_private.bloquear(p_revision,p_fecha);
  if p_categoria is null or p_categoria not in ('cabeza','cuello','rostro') then raise exception 'Categoría inválida.'; end if;
  delete from public.equipamiento e using public.mascotas_usuario m
    where e.mascota_id = m.id and m.usuario_id = auth.uid() and e.categoria = p_categoria;
  perform brotito_private.avanzar();
end $$;

-- Evita EXECUTE público implícito en funciones nuevas. Solo se tocan objetos de esta migración.
do $$
declare funcion record;
begin
  for funcion in select p.oid::regprocedure firma, n.nspname esquema
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'brotito_private' or (n.nspname = 'public' and p.proname like 'brotito\_%' escape '\') loop
    execute format('revoke all on function %s from public, anon, authenticated',funcion.firma);
    if funcion.esquema = 'public' then execute format('grant execute on function %s to authenticated',funcion.firma); end if;
  end loop;
end $$;
revoke all on sequence public.compras_orden_seq from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
