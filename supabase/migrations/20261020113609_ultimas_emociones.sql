-- Última emoción de cada estudiante en una sola consulta (antes: una consulta
-- con todo el historial por cada niño). security_invoker: rige el RLS de
-- registros_emocion de quien consulta, no el de quien creó la vista.
create view public.ultimas_emociones with (security_invoker = true) as
  select distinct on (estudiante_id) estudiante_id, emocion, fecha
  from public.registros_emocion
  order by estudiante_id, fecha desc;

revoke all on public.ultimas_emociones from anon, authenticated;
grant select on public.ultimas_emociones to authenticated;
