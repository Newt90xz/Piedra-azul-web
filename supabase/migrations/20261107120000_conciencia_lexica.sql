-- Conciencia léxica: contenido «Palabras en la oración» (4 actividades).
--   · Categoría nueva «oraciones» en las rondas guardadas.
--   · Un contenido puede tener más de 3 actividades: paso de 1 a 9.
--   · Palabras nuevas del banco: personas, cosas y acciones de las oraciones.

alter table public.rondas_resultado drop constraint if exists rondas_resultado_categoria_check;
alter table public.rondas_resultado
  add constraint rondas_resultado_categoria_check
  check (categoria in ('auditiva', 'oraciones', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension'));

alter table public.resultados_actividad drop constraint if exists resultados_actividad_paso_check;
alter table public.resultados_actividad
  add constraint resultados_actividad_paso_check check (paso between 1 and 9);

-- Mismas funciones que en 20261103180000, con la categoría y los pasos nuevos.
create or replace function public.guardar_resultado(
  p_id uuid,
  p_estudiante_id uuid,
  p_actividad_id text,
  p_fecha timestamptz,
  p_duracion_ms integer,
  p_estrellas smallint,
  p_monedas integer,
  p_rondas jsonb,
  p_contexto jsonb default null
) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.resultados_actividad (id, estudiante_id, actividad_id, fecha, duracion_ms, estrellas, monedas, mecanica, contenido_id, paso, nivel, oa, sala_id, asignacion, practica, parametros, version)
  values (p_id, p_estudiante_id, p_actividad_id, p_fecha, p_duracion_ms, p_estrellas, p_monedas,
    nullif(left(p_contexto ->> 'mecanica', 20), ''),
    nullif(left(p_contexto ->> 'contenidoId', 60), ''),
    case when p_contexto ->> 'paso' ~ '^[1-9]$' then (p_contexto ->> 'paso')::smallint end,
    case when p_contexto ->> 'nivel' in ('1', '2', '3') then (p_contexto ->> 'nivel')::smallint end,
    case when jsonb_typeof(p_contexto -> 'oa') = 'array' and jsonb_array_length(p_contexto -> 'oa') <= 6
      then array(select left(v, 10) from jsonb_array_elements_text(p_contexto -> 'oa') as v) end,
    case when p_contexto ->> 'salaId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then (p_contexto ->> 'salaId')::uuid end,
    case when p_contexto ->> 'asignacion' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then (p_contexto ->> 'asignacion')::uuid end,
    coalesce(p_contexto ->> 'practica' = 'true', false),
    case when jsonb_typeof(p_contexto -> 'parametros') = 'object' and pg_column_size(p_contexto -> 'parametros') < 2000 then p_contexto -> 'parametros' end,
    case when p_contexto ->> 'version' ~ '^[0-9]{1,3}$' then (p_contexto ->> 'version')::smallint else 1 end)
  on conflict (id) do nothing;
  if not found then
    return;
  end if;

  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada, error, categoria, tiempo_ms, revelada, detalle)
  select p_id, (r.ord - 1)::smallint, r.v ->> 'item', (r.v ->> 'intentos')::smallint, (r.v ->> 'acertada')::boolean,
         nullif(left(r.v ->> 'error', 20), ''),
         case when r.v ->> 'categoria' in ('auditiva', 'oraciones', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then r.v ->> 'categoria' end,
         case when r.v ->> 'tiempo_ms' ~ '^[0-9]{1,7}$' then (r.v ->> 'tiempo_ms')::integer end,
         coalesce(r.v ->> 'revelada' = 'true', false),
         case when jsonb_typeof(r.v -> 'detalle') = 'object' and pg_column_size(r.v -> 'detalle') < 500 then r.v -> 'detalle' end
  from jsonb_array_elements(p_rondas) with ordinality as r (v, ord);
end $$;

create or replace function public.guardar_resultado_sala(
  p_id uuid, p_estudiante_id uuid, p_token uuid, p_actividad_id text, p_fecha timestamptz,
  p_duracion_ms integer, p_estrellas integer, p_monedas integer, p_rondas jsonb,
  p_contexto jsonb default null
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
  insert into public.resultados_actividad (id, estudiante_id, actividad_id, fecha, duracion_ms, estrellas, monedas, mecanica, contenido_id, paso, nivel, oa, sala_id, asignacion, practica, parametros, version)
  values (p_id, p_estudiante_id, p_actividad_id, p_fecha, p_duracion_ms, p_estrellas, p_monedas,
    nullif(left(p_contexto ->> 'mecanica', 20), ''),
    nullif(left(p_contexto ->> 'contenidoId', 60), ''),
    case when p_contexto ->> 'paso' ~ '^[1-9]$' then (p_contexto ->> 'paso')::smallint end,
    case when p_contexto ->> 'nivel' in ('1', '2', '3') then (p_contexto ->> 'nivel')::smallint end,
    case when jsonb_typeof(p_contexto -> 'oa') = 'array' and jsonb_array_length(p_contexto -> 'oa') <= 6
      then array(select left(v, 10) from jsonb_array_elements_text(p_contexto -> 'oa') as v) end,
    case when p_contexto ->> 'salaId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then (p_contexto ->> 'salaId')::uuid end,
    case when p_contexto ->> 'asignacion' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then (p_contexto ->> 'asignacion')::uuid end,
    coalesce(p_contexto ->> 'practica' = 'true', false),
    case when jsonb_typeof(p_contexto -> 'parametros') = 'object' and pg_column_size(p_contexto -> 'parametros') < 2000 then p_contexto -> 'parametros' end,
    case when p_contexto ->> 'version' ~ '^[0-9]{1,3}$' then (p_contexto ->> 'version')::smallint else 1 end)
  on conflict (id) do nothing;
  get diagnostics insertadas = row_count;
  if insertadas = 0 then return; end if;
  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada, error, categoria, tiempo_ms, revelada, detalle)
  select p_id, (t.ord - 1)::integer, t.r ->> 'item', (t.r ->> 'intentos')::integer, (t.r ->> 'acertada')::boolean,
         nullif(left(t.r ->> 'error', 20), ''),
         case when t.r ->> 'categoria' in ('auditiva', 'oraciones', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then t.r ->> 'categoria' end,
         case when t.r ->> 'tiempo_ms' ~ '^[0-9]{1,7}$' then (t.r ->> 'tiempo_ms')::integer end,
         coalesce(t.r ->> 'revelada' = 'true', false),
         case when jsonb_typeof(t.r -> 'detalle') = 'object' and pg_column_size(t.r -> 'detalle') < 500 then t.r -> 'detalle' end
  from jsonb_array_elements(p_rondas) with ordinality as t (r, ord);
end;
$$;

revoke execute on function public.guardar_resultado(uuid, uuid, text, timestamptz, integer, smallint, integer, jsonb, jsonb) from public, anon;
grant execute on function public.guardar_resultado(uuid, uuid, text, timestamptz, integer, smallint, integer, jsonb, jsonb) to authenticated;
revoke execute on function public.guardar_resultado_sala(uuid, uuid, uuid, text, timestamptz, integer, integer, integer, jsonb, jsonb) from public;
grant execute on function public.guardar_resultado_sala(uuid, uuid, uuid, text, timestamptz, integer, integer, integer, jsonb, jsonb) to anon, authenticated;

insert into public.palabras (id, texto, silabas, emoji) values
  ('nino', 'niño', array['ni', 'ño'], '👦'),
  ('nina', 'niña', array['ni', 'ña'], '👧'),
  ('agua', 'agua', array['a', 'gua'], '💧'),
  ('libro', 'libro', array['li', 'bro'], '📚'),
  ('pez', 'pez', array['pez'], '🐟'),
  ('come', 'come', array['co', 'me'], '😋'),
  ('bebe', 'bebe', array['be', 'be'], '🥤'),
  ('duerme', 'duerme', array['duer', 'me'], '😴'),
  ('salta', 'salta', array['sal', 'ta'], '🤸'),
  ('corre', 'corre', array['co', 'rre'], '🏃'),
  ('nada', 'nada', array['na', 'da'], '🏊'),
  ('canta', 'canta', array['can', 'ta'], '🎤'),
  ('lee', 'lee', array['le', 'e'], '📖'),
  ('baila', 'baila', array['bai', 'la'], '💃'),
  ('juega', 'juega', array['jue', 'ga'], '🧸'),
  ('pinta', 'pinta', array['pin', 'ta'], '🎨'),
  ('lava', 'lava', array['la', 'va'], '🧼')
on conflict (id) do nothing;
