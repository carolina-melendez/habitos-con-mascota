-- SOLO en base efímera. Una cuenta sintética para dos sesiones simultáneas.
insert into auth.users values('33333333-3333-3333-3333-333333333333');
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
set role authenticated;
select public.brotito_iniciar_perfil('Concurrencia','UTC');
