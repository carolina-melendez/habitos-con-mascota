-- Lectura de metadatos y catálogos; no modifica filas.
select
  (select count(*) from pg_catalog.pg_tables where schemaname = 'public' and tablename = any(array[
    'perfiles','especies','mascotas_usuario','plantillas','habitos','versiones_habito',
    'nombres_habito','registros_diarios','accesorios','compras','equipamiento'])) as tablas_brotito,
  (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) as tablas_con_rls,
  (select count(*) from pg_catalog.pg_policies where schemaname = 'public') as politicas,
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'brotito\_%' escape '\' and p.prosecdef) as operaciones_servidor,
  (select count(*) from public.especies) as especies,
  (select count(*) from public.plantillas) as plantillas,
  (select count(*) from public.accesorios) as accesorios,
  (select count(*) from information_schema.role_table_grants where table_schema = 'public'
    and grantee in ('anon','authenticated') and privilege_type <> 'SELECT') as permisos_escritura_directa,
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'brotito_private' or (n.nspname = 'public' and p.proname like 'brotito\_%' escape '\'))
    and has_function_privilege('anon',p.oid,'EXECUTE')) as funciones_accesibles_anonimo;
