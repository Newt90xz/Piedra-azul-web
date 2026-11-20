-- Temas de vocabulario (frontend/src/contenido/temas.ts).
--   · Cada palabra del banco tiene un tema: animales, frutas, profesiones,
--     oficios, medios de transporte, meses, estaciones del año…
--   · 56 palabras nuevas con pictograma ARASAAC. «Fresa» pasa a «frutilla».
--   · Categoría nueva «vocabulario» en las rondas guardadas (actividades
--     «Adivina cuál es» y «Encuentra el que no va»).

alter table public.palabras
  add column if not exists tema text check (tema is null or tema ~ '^[a-z]{1,20}$');

-- Palabras nuevas. Si ya existía una fila con ese id (desactivada), se reactiva.
insert into public.palabras (id, texto, silabas, emoji, tema) values
  ('frutilla', 'frutilla', array['fru', 'ti', 'lla'], '🍓', 'frutas'),
  ('platano', 'plátano', array['plá', 'ta', 'no'], '🍌', 'frutas'),
  ('naranja', 'naranja', array['na', 'ran', 'ja'], '🍊', 'frutas'),
  ('sandia', 'sandía', array['san', 'dí', 'a'], '🍉', 'frutas'),
  ('durazno', 'durazno', array['du', 'raz', 'no'], '🍑', 'frutas'),
  ('kiwi', 'kiwi', array['ki', 'wi'], '🥝', 'frutas'),
  ('cereza', 'cereza', array['ce', 're', 'za'], '🍒', 'frutas'),
  ('mango', 'mango', array['man', 'go'], '🥭', 'frutas'),
  ('coco', 'coco', array['co', 'co'], '🥥', 'frutas'),
  ('mora', 'mora', array['mo', 'ra'], '🫐', 'frutas'),
  ('papaya', 'papaya', array['pa', 'pa', 'ya'], '🧡', 'frutas'),
  ('ciruela', 'ciruela', array['ci', 'rue', 'la'], '🟣', 'frutas'),
  ('doctora', 'doctora', array['doc', 'to', 'ra'], '👩‍⚕️', 'profesiones'),
  ('profesora', 'profesora', array['pro', 'fe', 'so', 'ra'], '👩‍🏫', 'profesiones'),
  ('dentista', 'dentista', array['den', 'tis', 'ta'], '🦷', 'profesiones'),
  ('veterinaria', 'veterinaria', array['ve', 'te', 'ri', 'na', 'ria'], '🐾', 'profesiones'),
  ('piloto', 'piloto', array['pi', 'lo', 'to'], '🧑‍✈️', 'profesiones'),
  ('astronauta', 'astronauta', array['as', 'tro', 'nau', 'ta'], '🧑‍🚀', 'profesiones'),
  ('cientifica', 'científica', array['cien', 'tí', 'fi', 'ca'], '👩‍🔬', 'profesiones'),
  ('bombero', 'bombero', array['bom', 'be', 'ro'], '🧑‍🚒', 'oficios'),
  ('carabinero', 'carabinero', array['ca', 'ra', 'bi', 'ne', 'ro'], '👮', 'oficios'),
  ('cartero', 'cartero', array['car', 'te', 'ro'], '📮', 'oficios'),
  ('panadero', 'panadero', array['pa', 'na', 'de', 'ro'], '🥖', 'oficios'),
  ('carpintero', 'carpintero', array['car', 'pin', 'te', 'ro'], '🔨', 'oficios'),
  ('pescador', 'pescador', array['pes', 'ca', 'dor'], '🎣', 'oficios'),
  ('jardinero', 'jardinero', array['jar', 'di', 'ne', 'ro'], '🌻', 'oficios'),
  ('peluquera', 'peluquera', array['pe', 'lu', 'que', 'ra'], '💇', 'oficios'),
  ('cocinero', 'cocinero', array['co', 'ci', 'ne', 'ro'], '🧑‍🍳', 'oficios'),
  ('mecanico', 'mecánico', array['me', 'cá', 'ni', 'co'], '🧑‍🔧', 'oficios'),
  ('albanil', 'albañil', array['al', 'ba', 'ñil'], '🧱', 'oficios'),
  ('agricultor', 'agricultor', array['a', 'gri', 'cul', 'tor'], '🧑‍🌾', 'oficios'),
  ('pintor', 'pintor', array['pin', 'tor'], '🎨', 'oficios'),
  ('micro', 'micro', array['mi', 'cro'], '🚌', 'transporte'),
  ('barco', 'barco', array['bar', 'co'], '🚢', 'transporte'),
  ('camion', 'camión', array['ca', 'mión'], '🚚', 'transporte'),
  ('helicoptero', 'helicóptero', array['he', 'li', 'cóp', 'te', 'ro'], '🚁', 'transporte'),
  ('cohete', 'cohete', array['co', 'he', 'te'], '🚀', 'transporte'),
  ('submarino', 'submarino', array['sub', 'ma', 'ri', 'no'], '🤿', 'transporte'),
  ('ambulancia', 'ambulancia', array['am', 'bu', 'lan', 'cia'], '🚑', 'transporte'),
  ('tractor', 'tractor', array['trac', 'tor'], '🚜', 'transporte'),
  ('enero', 'enero', array['e', 'ne', 'ro'], '1️⃣', 'meses'),
  ('febrero', 'febrero', array['fe', 'bre', 'ro'], '2️⃣', 'meses'),
  ('marzo', 'marzo', array['mar', 'zo'], '3️⃣', 'meses'),
  ('abril', 'abril', array['a', 'bril'], '4️⃣', 'meses'),
  ('mayo', 'mayo', array['ma', 'yo'], '5️⃣', 'meses'),
  ('junio', 'junio', array['ju', 'nio'], '6️⃣', 'meses'),
  ('julio', 'julio', array['ju', 'lio'], '7️⃣', 'meses'),
  ('agosto', 'agosto', array['a', 'gos', 'to'], '8️⃣', 'meses'),
  ('septiembre', 'septiembre', array['sep', 'tiem', 'bre'], '9️⃣', 'meses'),
  ('octubre', 'octubre', array['oc', 'tu', 'bre'], '🔟', 'meses'),
  ('noviembre', 'noviembre', array['no', 'viem', 'bre'], '1️⃣1️⃣', 'meses'),
  ('diciembre', 'diciembre', array['di', 'ciem', 'bre'], '1️⃣2️⃣', 'meses'),
  ('primavera', 'primavera', array['pri', 'ma', 've', 'ra'], '🌷', 'estaciones'),
  ('verano', 'verano', array['ve', 'ra', 'no'], '🌞', 'estaciones'),
  ('otono', 'otoño', array['o', 'to', 'ño'], '🍂', 'estaciones'),
  ('invierno', 'invierno', array['in', 'vier', 'no'], '⛄', 'estaciones')
on conflict (id) do update
  set texto = excluded.texto, silabas = excluded.silabas, emoji = excluded.emoji, tema = excluded.tema, activa = true;

-- Tema de las palabras que ya estaban.
update public.palabras p set tema = v.tema
from (values
  ('abeja', 'animales'),
  ('elefante', 'animales'),
  ('oso', 'animales'),
  ('mono', 'animales'),
  ('mariposa', 'animales'),
  ('pato', 'animales'),
  ('perro', 'animales'),
  ('puma', 'animales'),
  ('leon', 'animales'),
  ('sapo', 'animales'),
  ('tortuga', 'animales'),
  ('gato', 'animales'),
  ('coneja', 'animales'),
  ('pollito', 'animales'),
  ('raton', 'animales'),
  ('lobo', 'animales'),
  ('medusa', 'animales'),
  ('paloma', 'animales'),
  ('loro', 'animales'),
  ('erizo', 'animales'),
  ('iguana', 'animales'),
  ('oveja', 'animales'),
  ('arana', 'animales'),
  ('ardilla', 'animales'),
  ('pez', 'animales'),
  ('mariquita', 'animales'),
  ('cocodrilo', 'animales'),
  ('dinosaurio', 'animales'),
  ('foca', 'animales'),
  ('vaca', 'animales'),
  ('pajaro', 'animales'),
  ('manzana', 'frutas'),
  ('pera', 'frutas'),
  ('uvas', 'frutas'),
  ('limon', 'frutas'),
  ('melon', 'frutas'),
  ('pina', 'frutas'),
  ('tomate', 'verduras'),
  ('zanahoria', 'verduras'),
  ('lechuga', 'verduras'),
  ('calabaza', 'verduras'),
  ('pan', 'alimentos'),
  ('sopa', 'alimentos'),
  ('helado', 'alimentos'),
  ('queso', 'alimentos'),
  ('chocolate', 'alimentos'),
  ('leche', 'alimentos'),
  ('galleta', 'alimentos'),
  ('pollo', 'alimentos'),
  ('sushi', 'alimentos'),
  ('ojo', 'cuerpo'),
  ('mano', 'cuerpo'),
  ('pie', 'cuerpo'),
  ('oreja', 'cuerpo'),
  ('una', 'cuerpo'),
  ('dedo', 'cuerpo'),
  ('mama', 'familia'),
  ('papa', 'familia'),
  ('nino', 'familia'),
  ('nina', 'familia'),
  ('guagua', 'familia'),
  ('abuela', 'familia'),
  ('avion', 'transporte'),
  ('auto', 'transporte'),
  ('moto', 'transporte'),
  ('tren', 'transporte'),
  ('bicicleta', 'transporte'),
  ('polera', 'ropa'),
  ('zapato', 'ropa'),
  ('bota', 'ropa'),
  ('casa', 'casa'),
  ('silla', 'casa'),
  ('mesa', 'casa'),
  ('cama', 'casa'),
  ('sofa', 'casa'),
  ('taza', 'casa'),
  ('espejo', 'casa'),
  ('escoba', 'casa'),
  ('salero', 'casa'),
  ('lata', 'casa'),
  ('lana', 'casa'),
  ('maleta', 'casa'),
  ('paraguas', 'casa'),
  ('iman', 'casa'),
  ('anillo', 'casa'),
  ('serrucho', 'casa'),
  ('microfono', 'casa'),
  ('musica', 'casa'),
  ('pelota', 'juguetes'),
  ('muneca', 'juguetes'),
  ('dado', 'juguetes'),
  ('lapiz', 'juguetes'),
  ('libro', 'juguetes'),
  ('mochila', 'juguetes'),
  ('lupa', 'juguetes'),
  ('mapa', 'juguetes'),
  ('arbol', 'naturaleza'),
  ('pino', 'naturaleza'),
  ('flores', 'naturaleza'),
  ('flor', 'naturaleza'),
  ('semilla', 'naturaleza'),
  ('estrella', 'naturaleza'),
  ('luna', 'naturaleza'),
  ('sol', 'naturaleza'),
  ('nube', 'naturaleza'),
  ('noche', 'naturaleza'),
  ('agua', 'naturaleza'),
  ('mar', 'naturaleza'),
  ('ola', 'naturaleza'),
  ('playa', 'naturaleza'),
  ('isla', 'naturaleza'),
  ('parque', 'naturaleza'),
  ('iglesia', 'naturaleza'),
  ('semaforo', 'naturaleza'),
  ('unicornio', 'personajes'),
  ('sirena', 'personajes'),
  ('payaso', 'personajes')
) as v (id, tema)
where p.id = v.id;

-- «Frutilla», como se dice en Chile, reemplaza a «fresa» (mismo pictograma).
update public.palabras set activa = false where id = 'fresa';

alter table public.rondas_resultado drop constraint if exists rondas_resultado_categoria_check;
alter table public.rondas_resultado
  add constraint rondas_resultado_categoria_check
  check (categoria in ('auditiva', 'oraciones', 'vocabulario', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension'));

-- Mismas funciones que en 20261107120000, con la categoría «vocabulario».
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
         case when r.v ->> 'categoria' in ('auditiva', 'oraciones', 'vocabulario', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then r.v ->> 'categoria' end,
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
         case when t.r ->> 'categoria' in ('auditiva', 'oraciones', 'vocabulario', 'letras', 'silabas', 'conteo', 'rimas', 'palabras', 'escritura', 'comprension') then t.r ->> 'categoria' end,
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
