begin;
-- Una lectura coherente del jardín: mismo bloqueo de perfil que las mutaciones.
create function public.brotito_jardin() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare perfil public.perfiles; mascota jsonb; habitos jsonb; registros jsonb; compras jsonb; equipo jsonb; hoy date;
begin
  select * into perfil from public.perfiles where id = brotito_private.usuario() for share;
  if not found then raise exception 'Primero configura tu perfil.'; end if;
  hoy := (clock_timestamp() at time zone perfil.zona_horaria)::date;
  select jsonb_build_object('petId',especie_id,'petName',nombre) into mascota
    from public.mascotas_usuario where usuario_id = perfil.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',h.id,'templateId',coalesce(h.plantilla_id,'propio'),'name',nombre.nombre,
    'kind',h.tipo_registro,'unit',h.unidad,'target',base.meta,'days',base.dias_semana,
    'startDate',h.fecha_inicio,'time',to_char(h.hora_referencia,'HH24:MI'),
    'archivedOn',h.archivado_desde,'revisions',versiones.datos,'nameHistory',nombres.datos
  ) order by h.creado_en,h.id),'[]'::jsonb) into habitos
  from public.habitos h
  cross join lateral (select v.meta,v.dias_semana from public.versiones_habito v where v.habito_id = h.id order by v.vigente_desde limit 1) base
  cross join lateral (select n.nombre from public.nombres_habito n where n.habito_id = h.id and n.vigente_desde <= hoy order by n.vigente_desde desc limit 1) nombre
  cross join lateral (select jsonb_agg(jsonb_build_object('from',v.vigente_desde,'target',v.meta,'days',v.dias_semana) order by v.vigente_desde) datos from public.versiones_habito v where v.habito_id = h.id) versiones
  cross join lateral (select jsonb_agg(jsonb_build_object('from',n.vigente_desde,'name',n.nombre) order by n.vigente_desde) datos from public.nombres_habito n where n.habito_id = h.id) nombres
  where h.usuario_id = perfil.id;
  select coalesce(jsonb_agg(jsonb_build_object('habitId',r.habito_id,'date',r.fecha_local,'amount',r.cantidad,'target',r.meta_del_dia) order by r.fecha_local,r.id),'[]'::jsonb)
    into registros from public.registros_diarios r join public.habitos h on h.id = r.habito_id where h.usuario_id = perfil.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'itemId',accesorio_id,'paid',precio_pagado,
    'boughtAt',comprada_en,'status',case when estado = 'adquirido' then 'owned' else 'returned' end) order by orden),'[]'::jsonb)
    into compras from public.compras where usuario_id = perfil.id;
  select coalesce(jsonb_object_agg(e.categoria,c.accesorio_id),'{}'::jsonb) into equipo
    from public.equipamiento e join public.compras c on c.id = e.compra_id
    join public.mascotas_usuario m on m.id = e.mascota_id where m.usuario_id = perfil.id and c.usuario_id = perfil.id and c.estado = 'adquirido';
  return jsonb_build_object('userId',perfil.id,'displayName',perfil.nombre,'revision',perfil.revision,'today',hoy,
    'pet',mascota,'totals',brotito_private.totales(),
    'state',jsonb_build_object('version',1,'timezone',perfil.zona_horaria,'habits',habitos,'records',registros,
      'commerce',jsonb_build_object('purchases',compras,'equipped',equipo)));
end $$;
revoke all on function public.brotito_jardin() from public,anon,authenticated;
grant execute on function public.brotito_jardin() to authenticated;
notify pgrst,'reload schema';
commit;
