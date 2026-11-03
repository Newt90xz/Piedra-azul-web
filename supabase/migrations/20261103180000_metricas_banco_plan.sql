-- Métricas, banco de contenidos y plan de sala por pasos.
-- Diseño y decisiones: docs/migracion-metricas-banco/README.md.
-- Solo agrega: ninguna columna ni función deja de existir, y las versiones
-- anteriores de la app siguen funcionando con esta base.

-- ---------------------------------------------------------------------------
-- A. Métricas: foto de cada partida y categoría por ronda
-- ---------------------------------------------------------------------------

alter table public.resultados_actividad
  add column mecanica text,
  add column contenido_id text,
  add column paso smallint check (paso between 1 and 3),
  add column nivel smallint check (nivel between 1 and 3),
  add column oa text[],
  -- Sin llave foránea: es una foto, y debe sobrevivir a que se borre la sala.
  add column sala_id uuid,
  add column asignacion uuid,
  add column practica boolean not null default false,
  add column parametros jsonb check (parametros is null or pg_column_size(parametros) < 2000),
  add column version smallint not null default 1;

alter table public.rondas_resultado
  add column categoria text check (categoria in ('auditiva', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension')),
  add column tiempo_ms integer check (tiempo_ms >= 0),
  add column revelada boolean not null default false,
  add column detalle jsonb check (detalle is null or pg_column_size(detalle) < 500);

-- Relleno de lo ya jugado, con el catálogo actual.
with mapeo (actividad_id, contenido_id, paso, categoria, nivel, oa, practica) as (
  values
    ('escucho-1', 'escucho', 1::smallint, 'auditiva', 1::smallint, array['OA 3'], false),
    ('escucho-2', 'escucho', 2::smallint, 'auditiva', 1::smallint, array['OA 3'], false),
    ('escucho-3', 'escucho', 3::smallint, 'auditiva', 1::smallint, array['OA 3'], false),
    ('vocales-1', 'vocales', 1::smallint, 'letras', 1::smallint, array['OA 7', 'OA 3'], false),
    ('vocales-2', 'vocales', 2::smallint, 'letras', 1::smallint, array['OA 7', 'OA 3'], false),
    ('vocales-3', 'vocales', 3::smallint, 'letras', 1::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-m-1', 'silabas-m', 1::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-m-2', 'silabas-m', 2::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-m-3', 'silabas-m', 3::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-p-1', 'silabas-p', 1::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-p-2', 'silabas-p', 2::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-p-3', 'silabas-p', 3::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-l-1', 'silabas-l', 1::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-l-2', 'silabas-l', 2::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-l-3', 'silabas-l', 3::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-s-1', 'silabas-s', 1::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-s-2', 'silabas-s', 2::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('silabas-s-3', 'silabas-s', 3::smallint, 'silabas', 2::smallint, array['OA 7', 'OA 3'], false),
    ('largas-cortas-1', 'largas-cortas', 1::smallint, 'conteo', 2::smallint, array['OA 3'], false),
    ('largas-cortas-2', 'largas-cortas', 2::smallint, 'conteo', 2::smallint, array['OA 3'], false),
    ('largas-cortas-3', 'largas-cortas', 3::smallint, 'conteo', 2::smallint, array['OA 3'], false),
    ('rimas-1', 'rimas', 1::smallint, 'rimas', 2::smallint, array['OA 3'], false),
    ('rimas-2', 'rimas', 2::smallint, 'rimas', 2::smallint, array['OA 3'], false),
    ('rimas-3', 'rimas', 3::smallint, 'rimas', 2::smallint, array['OA 3'], false),
    ('formo-palabras-1', 'formo-palabras', 1::smallint, 'palabras', 3::smallint, array['OA 7', 'OA 3'], false),
    ('formo-palabras-2', 'formo-palabras', 2::smallint, 'palabras', 3::smallint, array['OA 7', 'OA 3'], false),
    ('formo-palabras-3', 'formo-palabras', 3::smallint, 'palabras', 3::smallint, array['OA 7', 'OA 3'], false),
    ('escribo-1', 'escribo', 1::smallint, 'escritura', 3::smallint, array['OA 8', 'OA 7'], false),
    ('escribo-2', 'escribo', 2::smallint, 'escritura', 3::smallint, array['OA 8', 'OA 7'], false),
    ('escribo-3', 'escribo', 3::smallint, 'escritura', 3::smallint, array['OA 8', 'OA 7'], false),
    ('explorar-sonido', null, null, 'letras', 1::smallint, '{}'::text[], true),
    ('sonido-inicial', null, null, 'letras', 1::smallint, '{}'::text[], false),
    ('escucha-letra', null, null, 'letras', 1::smallint, '{}'::text[], false),
    ('caza-letras', null, null, 'letras', 1::smallint, '{}'::text[], false),
    ('choque-sonidos', null, null, 'silabas', 2::smallint, '{}'::text[], true),
    ('aplausos', null, null, 'conteo', 2::smallint, '{}'::text[], false),
    ('globos-palabras', null, null, 'palabras', 3::smallint, '{}'::text[], false),
    ('silaba-inicial', null, null, 'silabas', 2::smallint, '{}'::text[], false),
    ('constructor', null, null, 'palabras', 3::smallint, '{}'::text[], false),
    ('que-dice', null, null, 'palabras', 3::smallint, '{}'::text[], false),
    ('falta-silaba', null, null, 'palabras', 3::smallint, '{}'::text[], false)
)
update public.resultados_actividad r
set contenido_id = m.contenido_id, paso = m.paso, nivel = m.nivel, oa = m.oa, practica = m.practica
from mapeo m
where m.actividad_id = r.actividad_id;

with mapeo (actividad_id, categoria) as (
  values
    ('escucho-1', 'auditiva'),
    ('escucho-2', 'auditiva'),
    ('escucho-3', 'auditiva'),
    ('vocales-1', 'letras'),
    ('vocales-2', 'letras'),
    ('vocales-3', 'letras'),
    ('silabas-m-1', 'silabas'),
    ('silabas-m-2', 'silabas'),
    ('silabas-m-3', 'silabas'),
    ('silabas-p-1', 'silabas'),
    ('silabas-p-2', 'silabas'),
    ('silabas-p-3', 'silabas'),
    ('silabas-l-1', 'silabas'),
    ('silabas-l-2', 'silabas'),
    ('silabas-l-3', 'silabas'),
    ('silabas-s-1', 'silabas'),
    ('silabas-s-2', 'silabas'),
    ('silabas-s-3', 'silabas'),
    ('largas-cortas-1', 'conteo'),
    ('largas-cortas-2', 'conteo'),
    ('largas-cortas-3', 'conteo'),
    ('rimas-1', 'rimas'),
    ('rimas-2', 'rimas'),
    ('rimas-3', 'rimas'),
    ('formo-palabras-1', 'palabras'),
    ('formo-palabras-2', 'palabras'),
    ('formo-palabras-3', 'palabras'),
    ('escribo-1', 'escritura'),
    ('escribo-2', 'escritura'),
    ('escribo-3', 'escritura'),
    ('explorar-sonido', 'letras'),
    ('sonido-inicial', 'letras'),
    ('escucha-letra', 'letras'),
    ('caza-letras', 'letras'),
    ('choque-sonidos', 'silabas'),
    ('aplausos', 'conteo'),
    ('globos-palabras', 'palabras'),
    ('silaba-inicial', 'silabas'),
    ('constructor', 'palabras'),
    ('que-dice', 'palabras'),
    ('falta-silaba', 'palabras')
)
update public.rondas_resultado x
set categoria = m.categoria
from public.resultados_actividad r
join mapeo m on m.actividad_id = r.actividad_id
where r.id = x.resultado_id;

-- Antes «acertada» era justo lo contrario de que se revelara la respuesta.
update public.rondas_resultado set revelada = not acertada;

drop function public.guardar_resultado(uuid, uuid, text, timestamptz, integer, smallint, integer, jsonb);
drop function public.guardar_resultado_sala(uuid, uuid, uuid, text, timestamptz, integer, integer, integer, jsonb);

-- p_contexto es opcional: la cola offline de versiones anteriores se sigue guardando.
create function public.guardar_resultado(
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
    case when p_contexto ->> 'paso' in ('1', '2', '3') then (p_contexto ->> 'paso')::smallint end,
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
         case when r.v ->> 'categoria' in ('auditiva', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then r.v ->> 'categoria' end,
         case when r.v ->> 'tiempo_ms' ~ '^[0-9]{1,7}$' then (r.v ->> 'tiempo_ms')::integer end,
         coalesce(r.v ->> 'revelada' = 'true', false),
         case when jsonb_typeof(r.v -> 'detalle') = 'object' and pg_column_size(r.v -> 'detalle') < 500 then r.v -> 'detalle' end
  from jsonb_array_elements(p_rondas) with ordinality as r (v, ord);
end $$;

create function public.guardar_resultado_sala(
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
    case when p_contexto ->> 'paso' in ('1', '2', '3') then (p_contexto ->> 'paso')::smallint end,
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
         case when t.r ->> 'categoria' in ('auditiva', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then t.r ->> 'categoria' end,
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

-- Historial de sesiones (RF-17): sesiones_alumno es la sesión viva y se sobrescribe.
create table public.sesiones_registro (
  id bigint generated always as identity primary key,
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  inicio timestamptz not null default now(),
  visto_en timestamptz not null default now(),
  fin timestamptz
);
create index sesiones_registro_estudiante_idx on public.sesiones_registro (estudiante_id, inicio desc);

alter table public.sesiones_registro enable row level security;
create policy sesiones_registro_docente on public.sesiones_registro
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
revoke all on public.sesiones_registro from anon, authenticated;
grant select on public.sesiones_registro to authenticated;

create or replace function public.entrar_alumno(p_estudiante uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_token uuid := gen_random_uuid();
  v_visto timestamptz;
begin
  -- Dos dispositivos que eligen al mismo niño a la vez.
  perform pg_advisory_xact_lock(hashtextextended(p_estudiante::text, 0));
  if not exists (select 1 from public.estudiantes where id = p_estudiante and activo) then
    raise exception 'perfil_invalido';
  end if;
  select visto_en into v_visto from public.sesiones_alumno where estudiante_id = p_estudiante;
  if found and v_visto > now() - interval '10 minutes' then
    raise exception 'perfil_ocupado';
  end if;
  insert into public.sesiones_alumno (estudiante_id, token_hash)
  values (p_estudiante, privado.hash_token(v_token))
  on conflict (estudiante_id) do update
    set token_hash = excluded.token_hash, iniciada_en = now(), visto_en = now();
  -- La anterior quedó abierta si el dispositivo se apagó sin salir.
  update public.sesiones_registro set fin = visto_en where estudiante_id = p_estudiante and fin is null;
  insert into public.sesiones_registro (estudiante_id) values (p_estudiante);
  return v_token;
end;
$$;

create or replace function public.salir_alumno(p_estudiante uuid, p_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.sesiones_alumno
  where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token);
  if found then
    update public.sesiones_registro set fin = now(), visto_en = now() where estudiante_id = p_estudiante and fin is null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- B. Banco de contenidos (RNF-14)
-- ---------------------------------------------------------------------------

-- No son datos personales: el dispositivo del alumno las lee sin sesión. Por ahora
-- se editan solo desde el panel de Supabase: la app no tiene todavía un rol de
-- administrador, y una docente no debería cambiarle el banco a las demás.
create table public.palabras (
  id text primary key check (id ~ '^[a-zñ0-9-]{1,40}$'),
  texto text not null check (char_length(texto) between 1 and 40),
  silabas text[] not null check (cardinality(silabas) between 1 and 12),
  emoji text not null check (char_length(emoji) between 1 and 16),
  foto_url text,
  picto_url text,
  -- En falso no se ofrece si es nueva; las del código siguen disponibles.
  activa boolean not null default true
);

create table public.letras (
  id text primary key check (char_length(id) = 1),
  grafema text not null,
  fonema text not null check (char_length(fonema) between 1 and 20),
  -- Las letras que suenan igual lo comparten: no pueden ser opciones de una misma ronda.
  sonido text not null,
  apoyo_articulatorio text not null,
  orden smallint not null
);

alter table public.palabras enable row level security;
alter table public.letras enable row level security;
create policy palabras_lectura on public.palabras for select to anon, authenticated using (activa);
create policy letras_lectura on public.letras for select to anon, authenticated using (true);
revoke all on public.palabras, public.letras from anon, authenticated;
grant select on public.palabras, public.letras to anon, authenticated;

insert into public.palabras (id, texto, silabas, emoji) values
  ('avion', 'avión', array['a', 'vión'], '✈️'),
  ('abeja', 'abeja', array['a', 'be', 'ja'], '🐝'),
  ('arbol', 'árbol', array['ár', 'bol'], '🌳'),
  ('elefante', 'elefante', array['e', 'le', 'fan', 'te'], '🐘'),
  ('estrella', 'estrella', array['es', 'tre', 'lla'], '⭐'),
  ('iglesia', 'iglesia', array['i', 'gle', 'sia'], '⛪'),
  ('isla', 'isla', array['is', 'la'], '🏝️'),
  ('oso', 'oso', array['o', 'so'], '🐻'),
  ('ojo', 'ojo', array['o', 'jo'], '👁️'),
  ('uvas', 'uvas', array['u', 'vas'], '🍇'),
  ('unicornio', 'unicornio', array['u', 'ni', 'cor', 'nio'], '🦄'),
  ('mano', 'mano', array['ma', 'no'], '✋'),
  ('mono', 'mono', array['mo', 'no'], '🐒'),
  ('manzana', 'manzana', array['man', 'za', 'na'], '🍎'),
  ('mama', 'mamá', array['ma', 'má'], '👩'),
  ('mapa', 'mapa', array['ma', 'pa'], '🗺️'),
  ('mariposa', 'mariposa', array['ma', 'ri', 'po', 'sa'], '🦋'),
  ('pato', 'pato', array['pa', 'to'], '🦆'),
  ('perro', 'perro', array['pe', 'rro'], '🐶'),
  ('pelota', 'pelota', array['pe', 'lo', 'ta'], '⚽'),
  ('papa', 'papá', array['pa', 'pá'], '👨'),
  ('puma', 'puma', array['pu', 'ma'], '🐆'),
  ('pera', 'pera', array['pe', 'ra'], '🍐'),
  ('pan', 'pan', array['pan'], '🍞'),
  ('luna', 'luna', array['lu', 'na'], '🌙'),
  ('lupa', 'lupa', array['lu', 'pa'], '🔍'),
  ('leon', 'león', array['le', 'ón'], '🦁'),
  ('lapiz', 'lápiz', array['lá', 'piz'], '✏️'),
  ('sol', 'sol', array['sol'], '☀️'),
  ('sapo', 'sapo', array['sa', 'po'], '🐸'),
  ('silla', 'silla', array['si', 'lla'], '🪑'),
  ('sopa', 'sopa', array['so', 'pa'], '🍲'),
  ('taza', 'taza', array['ta', 'za'], '☕'),
  ('tomate', 'tomate', array['to', 'ma', 'te'], '🍅'),
  ('tortuga', 'tortuga', array['tor', 'tu', 'ga'], '🐢'),
  ('zapato', 'zapato', array['za', 'pa', 'to'], '👞'),
  ('gato', 'gato', array['ga', 'to'], '🐱'),
  ('casa', 'casa', array['ca', 'sa'], '🏠'),
  ('coneja', 'coneja', array['co', 'ne', 'ja'], '🐰'),
  ('parque', 'parque', array['par', 'que'], '🏞️'),
  ('flores', 'flores', array['flo', 'res'], '🌸'),
  ('flor', 'flor', array['flor'], '🌸'),
  ('zanahoria', 'zanahoria', array['za', 'na', 'ho', 'ria'], '🥕'),
  ('pollito', 'pollito', array['po', 'lli', 'to'], '🐥'),
  ('playa', 'playa', array['pla', 'ya'], '🏖️'),
  ('helado', 'helado', array['he', 'la', 'do'], '🍦'),
  ('raton', 'ratón', array['ra', 'tón'], '🐭'),
  ('queso', 'queso', array['que', 'so'], '🧀'),
  ('chocolate', 'chocolate', array['cho', 'co', 'la', 'te'], '🍫'),
  ('moto', 'moto', array['mo', 'to'], '🏍️'),
  ('muneca', 'muñeca', array['mu', 'ñe', 'ca'], '🪆'),
  ('maleta', 'maleta', array['ma', 'le', 'ta'], '🧳'),
  ('lobo', 'lobo', array['lo', 'bo'], '🐺'),
  ('leche', 'leche', array['le', 'che'], '🥛'),
  ('limon', 'limón', array['li', 'món'], '🍋'),
  ('semilla', 'semilla', array['se', 'mi', 'lla'], '🌱'),
  ('sirena', 'sirena', array['si', 're', 'na'], '🧜‍♀️'),
  ('sofa', 'sofá', array['so', 'fá'], '🛋️'),
  ('galleta', 'galleta', array['ga', 'lle', 'ta'], '🍪'),
  ('dado', 'dado', array['da', 'do'], '🎲'),
  ('noche', 'noche', array['no', 'che'], '🌃');

insert into public.letras (id, grafema, fonema, sonido, apoyo_articulatorio, orden) values
  ('a', 'A', 'aaaa', 'a', 'Boca bien abierta.', 1),
  ('b', 'B', 'b', 'b', 'Labios juntos y se sueltan suave.', 2),
  ('c', 'C', 'k', 'k', 'La parte de atrás de la lengua sube y se suelta.', 3),
  ('d', 'D', 'd', 'd', 'La lengua toca los dientes de arriba.', 4),
  ('e', 'E', 'eeee', 'e', 'Boca abierta, como sonriendo.', 5),
  ('f', 'F', 'ffff', 'f', 'Dientes de arriba sobre el labio de abajo y sale aire.', 6),
  ('g', 'G', 'g', 'g', 'La parte de atrás de la lengua sube; la garganta vibra.', 7),
  ('h', 'H', 'hache', 'h', 'No suena: se dice su nombre.', 8),
  ('i', 'I', 'iiii', 'i', 'Sonrisa grande, dientes casi juntos.', 9),
  ('j', 'J', 'jjjj', 'j', 'Sale aire desde la garganta.', 10),
  ('k', 'K', 'k', 'k', 'La parte de atrás de la lengua sube y se suelta.', 11),
  ('l', 'L', 'llll', 'l', 'La lengua toca detrás de los dientes de arriba.', 12),
  ('m', 'M', 'mmmm', 'm', 'Labios juntos, la nariz vibra.', 13),
  ('n', 'N', 'nnnn', 'n', 'La lengua toca detrás de los dientes; la nariz vibra.', 14),
  ('ñ', 'Ñ', 'ññññ', 'ñ', 'La lengua toca el paladar; la nariz vibra.', 15),
  ('o', 'O', 'oooo', 'o', 'Labios redondos.', 16),
  ('p', 'P', 'p', 'p', 'Labios juntos y sale aire de golpe.', 17),
  ('q', 'Q', 'k', 'k', 'La parte de atrás de la lengua sube y se suelta.', 18),
  ('r', 'R', 'rrrr', 'r', 'La punta de la lengua vibra.', 19),
  ('s', 'S', 'ssss', 's', 'Dientes juntos, sale aire como una serpiente.', 20),
  ('t', 'T', 't', 't', 'La lengua toca los dientes y se suelta.', 21),
  ('u', 'U', 'uuuu', 'u', 'Labios redondos hacia adelante.', 22),
  ('v', 'V', 'b', 'b', 'Labios juntos y se sueltan suave.', 23),
  ('w', 'W', 'doble ve', 'w', 'Se dice su nombre.', 24),
  ('x', 'X', 'ks', 'x', 'Dos sonidos seguidos: k y s.', 25),
  ('y', 'Y', 'yyyy', 'y', 'La lengua sube al paladar.', 26),
  ('z', 'Z', 'ssss', 's', 'Dientes juntos, sale aire como una serpiente.', 27);

-- ---------------------------------------------------------------------------
-- C. Plan de sala por pasos y plantillas (RF-15)
-- ---------------------------------------------------------------------------

alter table public.salas
  add column plan jsonb not null default '[]'
    check (jsonb_typeof(plan) = 'array' and jsonb_array_length(plan) <= 36 and pg_column_size(plan) < 16000);

create function privado.pasos_de_contenidos(p_contenidos text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('juego', u.c || '-' || n) order by u.o, n), '[]'::jsonb)
  from unnest(p_contenidos) with ordinality as u (c, o), generate_series(1, 3) as n
$$;
revoke all on function privado.pasos_de_contenidos(text[]) from public, anon;
grant execute on function privado.pasos_de_contenidos(text[]) to authenticated;

update public.salas set plan = privado.pasos_de_contenidos(contenidos);

-- Las versiones anteriores de la app solo escriben contenidos: el plan se arma de ahí.
create function privado.plan_desde_contenidos() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.plan = '[]'::jsonb) or (tg_op = 'UPDATE' and new.contenidos is distinct from old.contenidos and new.plan = old.plan) then
    new.plan := privado.pasos_de_contenidos(new.contenidos);
  end if;
  return new;
end;
$$;
revoke all on function privado.plan_desde_contenidos() from public, anon;
grant execute on function privado.plan_desde_contenidos() to authenticated;

create trigger salas_plan_desde_contenidos before insert or update of contenidos on public.salas
for each row execute function privado.plan_desde_contenidos();

-- Configuraciones de actividades que guarda cada docente. El plan copia los
-- parámetros: editar una plantilla no le cambia la actividad a quien la está jugando.
create table public.plantillas_actividad (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null default auth.uid() references public.docentes (id) on delete cascade,
  juego_id text not null check (juego_id ~ '^[a-z0-9-]{1,60}$'),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  parametros jsonb not null check (jsonb_typeof(parametros) = 'object' and pg_column_size(parametros) < 2000),
  creado_en timestamptz not null default now(),
  unique (docente_id, juego_id, nombre)
);

alter table public.plantillas_actividad enable row level security;
create policy plantillas_docente on public.plantillas_actividad
  for all to authenticated using (docente_id = auth.uid()) with check (docente_id = auth.uid());
revoke all on public.plantillas_actividad from anon, authenticated;
grant select, insert, update, delete on public.plantillas_actividad to authenticated;

drop function public.alumno_actual(uuid, uuid);

create function public.alumno_actual(p_estudiante uuid, p_token uuid)
returns table (
  id uuid, curso_id uuid, nombre text, avatar text, personaje jsonb, color text, activo boolean,
  nivel_habilitado integer, monedas integer, ajustes jsonb, comprados text[],
  sala_id uuid, sala_nombre text, sala_tipo text, sala_actividad text, siguiente_sala uuid, siguiente_tipo text,
  plan jsonb, contenidos text[], juegos text[], asignacion uuid,
  paso integer, repeticiones integer
)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.sesiones_alumno set visto_en = now()
  where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token);
  if not found then
    return;
  end if;
  update public.sesiones_registro set visto_en = now() where estudiante_id = p_estudiante and fin is null;
  return query
  select e.id, e.curso_id, e.nombre, e.avatar, e.personaje, e.color, e.activo,
         e.nivel_habilitado::integer, e.monedas, e.ajustes,
         coalesce((select array_agg(c.articulo_id order by c.comprado_en) from public.articulos_comprados c where c.estudiante_id = e.id), '{}'),
         s.id, s.nombre, s.tipo, s.actividad, sig.id, sig.tipo,
         s.plan, s.contenidos, s.juegos, s.asignacion,
         case when p.sala_id = s.id and p.asignacion = s.asignacion then p.paso::integer else 0 end,
         case when p.sala_id = s.id and p.asignacion = s.asignacion then p.repeticiones::integer else 0 end
  from public.estudiantes e
  left join public.sala_miembros m on m.estudiante_id = e.id
  left join public.salas s on s.id = m.sala_id
  left join public.salas sig on sig.id = s.siguiente_sala and sig.curso_id = s.curso_id
  left join public.progreso_sala p on p.estudiante_id = e.id
  where e.id = p_estudiante and e.activo;
end;
$$;

revoke execute on function public.alumno_actual(uuid, uuid) from public;
grant execute on function public.alumno_actual(uuid, uuid) to anon, authenticated;

-- El total de pasos ahora es el largo del plan.
create or replace function public.registrar_progreso(
  p_estudiante uuid, p_token uuid, p_asignacion uuid, p_paso integer, p_aprobado boolean, p_resultado uuid
)
returns table (paso integer, repeticiones integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  s public.salas;
  p public.progreso_sala;
  v_total integer;
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  select sa.* into s
  from public.sala_miembros m join public.salas sa on sa.id = m.sala_id
  where m.estudiante_id = p_estudiante;
  if not found or s.tipo <> 'trabajo' then
    raise exception 'sin_sala';
  end if;
  if s.asignacion <> p_asignacion then
    raise exception 'plan_cambiado';
  end if;
  v_total := jsonb_array_length(s.plan);

  select * into p from public.progreso_sala where estudiante_id = p_estudiante for update;
  if not found or p.sala_id <> s.id or p.asignacion <> s.asignacion then
    p.estudiante_id := p_estudiante;
    p.sala_id := s.id;
    p.asignacion := s.asignacion;
    p.paso := 0;
    p.repeticiones := 0;
    p.necesita_ayuda := false;
    p.ultimo_resultado := null;
  end if;

  -- Solo cuenta la actividad en curso y una vez por resultado.
  if p.paso = p_paso and p.paso < v_total and p.ultimo_resultado is distinct from p_resultado then
    p.ultimo_resultado := p_resultado;
    if p_aprobado then
      p.paso := p.paso + 1;
      p.repeticiones := 0;
      p.necesita_ayuda := false;
    else
      p.repeticiones := p.repeticiones + 1;
      if p.repeticiones >= 2 then
        p.necesita_ayuda := true;
      end if;
    end if;
  end if;

  insert into public.progreso_sala (estudiante_id, sala_id, asignacion, paso, repeticiones, necesita_ayuda, ultimo_resultado, actualizado)
  values (p.estudiante_id, p.sala_id, p.asignacion, p.paso, p.repeticiones, p.necesita_ayuda, p.ultimo_resultado, now())
  on conflict (estudiante_id) do update
    set sala_id = excluded.sala_id, asignacion = excluded.asignacion, paso = excluded.paso,
        repeticiones = excluded.repeticiones, necesita_ayuda = excluded.necesita_ayuda,
        ultimo_resultado = excluded.ultimo_resultado, actualizado = now();
  return query select p.paso::integer, p.repeticiones::integer;
end;
$$;

create or replace function public.pasar_sala_conectada(p_estudiante uuid, p_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.salas;
  v_destino uuid;
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  select sa.* into s
  from public.sala_miembros m join public.salas sa on sa.id = m.sala_id
  where m.estudiante_id = p_estudiante;
  if not found or s.tipo <> 'trabajo' then
    raise exception 'sin_sala';
  end if;
  select d.id into v_destino from public.salas d where d.id = s.siguiente_sala and d.curso_id = s.curso_id;
  if not found then
    raise exception 'sin_sala_conectada';
  end if;
  if jsonb_array_length(s.plan) = 0 or not exists (
    select 1 from public.progreso_sala p
    where p.estudiante_id = p_estudiante and p.sala_id = s.id and p.asignacion = s.asignacion
      and p.paso >= jsonb_array_length(s.plan)
  ) then
    raise exception 'sin_terminar';
  end if;
  update public.sala_miembros set sala_id = v_destino, unido_en = now() where estudiante_id = p_estudiante;
end;
$$;
