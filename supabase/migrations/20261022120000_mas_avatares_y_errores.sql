-- Ajustes de la revisión con la educadora (Document 2):
--   1. Más avatares en la tienda (contenido/tienda.ts). El precio lo fija la base.
--   2. Cada ronda guarda la última respuesta equivocada del niño (p. ej. «3» al
--      contar las sílabas de «mariposa»). Solo la última de la ronda: si el niño
--      se desespera y toca muchas veces, no llena el registro de errores.

create or replace function privado.precio_avatar(p_avatar text) returns integer
language sql immutable set search_path = '' as $$
  select case p_avatar
    when 'pollito' then 10
    when 'pulpo' then 20
    when 'dragon' then 30
    when 'tigre' then 40
    when 'mago' then 50
    when 'robot' then 60
    when 'sirena' then 70
    when 'superheroe' then 80
    when 'astronauta' then 90
  end
$$;
revoke all on function privado.precio_avatar(text) from public, anon, authenticated;

alter table public.rondas_resultado
  add column error text check (char_length(error) between 1 and 20);

create or replace function public.guardar_resultado(
  p_id uuid,
  p_estudiante_id uuid,
  p_actividad_id text,
  p_fecha timestamptz,
  p_duracion_ms integer,
  p_estrellas smallint,
  p_monedas integer,
  p_rondas jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.resultados_actividad (id, estudiante_id, actividad_id, fecha, duracion_ms, estrellas, monedas)
  values (p_id, p_estudiante_id, p_actividad_id, p_fecha, p_duracion_ms, p_estrellas, p_monedas)
  on conflict (id) do nothing;
  if not found then
    return;
  end if;

  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada, error)
  select p_id, (r.ord - 1)::smallint, r.v ->> 'item', (r.v ->> 'intentos')::smallint, (r.v ->> 'acertada')::boolean,
         nullif(left(r.v ->> 'error', 20), '')
  from jsonb_array_elements(p_rondas) with ordinality as r (v, ord);
end $$;

create or replace function public.guardar_resultado_sala(
  p_id uuid, p_estudiante_id uuid, p_token uuid, p_actividad_id text, p_fecha timestamptz,
  p_duracion_ms integer, p_estrellas integer, p_monedas integer, p_rondas jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  insertadas integer;
  n_rondas integer;
begin
  if not privado.dispositivo_valido(p_estudiante_id, p_token) then
    raise exception 'sin_sala';
  end if;
  n_rondas := case when jsonb_typeof(p_rondas) = 'array' then jsonb_array_length(p_rondas) else 0 end;
  if n_rondas not between 1 and 10
     or p_estrellas not between 0 and 3
     or p_monedas not between 0 and 12 * n_rondas
     or p_duracion_ms < 0
     or p_actividad_id !~ '^[a-z0-9-]{1,60}$'
     or p_fecha > now() + interval '5 minutes'
     or p_fecha < now() - interval '30 days'
  then
    raise exception 'resultado_invalido';
  end if;
  insert into public.resultados_actividad (id, estudiante_id, actividad_id, fecha, duracion_ms, estrellas, monedas)
  values (p_id, p_estudiante_id, p_actividad_id, p_fecha, p_duracion_ms, p_estrellas, p_monedas)
  on conflict (id) do nothing;
  get diagnostics insertadas = row_count;
  if insertadas = 0 then return; end if;
  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada, error)
  select p_id, (t.ord - 1)::integer, t.r ->> 'item', (t.r ->> 'intentos')::integer, (t.r ->> 'acertada')::boolean,
         nullif(left(t.r ->> 'error', 20), '')
  from jsonb_array_elements(p_rondas) with ordinality as t (r, ord);
end;
$$;
