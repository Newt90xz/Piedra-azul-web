-- Personaje por capas, tienda de artículos y parque en tiempo real (RF-24).
-- Diseño: docs/avatares-tienda-playground/.
--   1. El emoji da paso a un personaje (estudiantes.personaje). A quienes ya
--      existen se les asigna uno de los 12 base, repartidos dentro de su curso.
--   2. La tienda vende artículos. Los avatares de emoji salen de la tienda: se
--      devuelven las monedas a quien los compró.
--   3. El playground pasa a ser un parque: cada sala tiene un canal secreto de
--      Realtime. Las posiciones no pasan por la base (RNF-09).

-- ---------------------------------------------------------------------------
-- Personaje
-- ---------------------------------------------------------------------------

alter table public.estudiantes
  add column personaje jsonb check (personaje is null or (jsonb_typeof(personaje) = 'object' and pg_column_size(personaje) < 2000));

grant insert (personaje), update (personaje) on public.estudiantes to authenticated;

with numerados as (
  select id, (row_number() over (partition by curso_id order by nombre, id) - 1) % 12 as n
  from public.estudiantes
)
update public.estudiantes e
set personaje = (array[
    '{"piel": 2, "colorPelo": "negro", "pelo": "pelo_corto", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 4, "colorPelo": "cafe_oscuro", "pelo": "pelo_rulos", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 1, "colorPelo": "rubio", "pelo": "pelo_chasquilla", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 3, "colorPelo": "cafe_claro", "pelo": "pelo_colitas", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 5, "colorPelo": "negro", "pelo": "pelo_trenza", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 6, "colorPelo": "negro", "pelo": "pelo_afro", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 2, "colorPelo": "cobrizo", "pelo": "pelo_liso", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 3, "colorPelo": "negro", "pelo": "pelo_mono", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 4, "colorPelo": "cafe_claro", "pelo": "pelo_puntas", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 1, "colorPelo": "cobrizo", "pelo": "pelo_ondas", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 5, "colorPelo": "cafe_oscuro", "pelo": "pelo_rapado", "ojos": "ojos_redondos", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb,
    '{"piel": 3, "colorPelo": "rubio", "pelo": "pelo_melena", "ojos": "ojos_alegres", "expresion": "feliz", "manoArriba": false, "apoyos": [], "puestos": {}}'::jsonb
  ])[numerados.n + 1]
from numerados
where numerados.id = e.id;

-- ---------------------------------------------------------------------------
-- Catálogo (mismo que frontend/src/contenido/tienda.ts; precio 0: gratis)
-- ---------------------------------------------------------------------------

create table privado.articulos (
  id text primary key,
  espacio text not null,
  precio integer not null check (precio >= 0)
);

insert into privado.articulos (id, espacio, precio) values
  ('pelo_corto', 'pelo', 0),
  ('pelo_rulos', 'pelo', 0),
  ('pelo_chasquilla', 'pelo', 0),
  ('pelo_colitas', 'pelo', 0),
  ('pelo_trenza', 'pelo', 0),
  ('pelo_afro', 'pelo', 0),
  ('pelo_liso', 'pelo', 0),
  ('pelo_mono', 'pelo', 0),
  ('pelo_puntas', 'pelo', 0),
  ('pelo_ondas', 'pelo', 0),
  ('pelo_rapado', 'pelo', 0),
  ('pelo_melena', 'pelo', 0),
  ('pelo_guerrero', 'pelo', 250),
  ('pelo_guerrero_dorado', 'pelo', 400),
  ('pelo_leon', 'pelo', 250),
  ('pelo_rizos_reales', 'pelo', 150),
  ('pelo_algodon', 'pelo', 150),
  ('pelo_fuego', 'pelo', 250),
  ('pelo_electrico', 'pelo', 150),
  ('pelo_largo_rosado', 'pelo', 150),
  ('pelo_coletas', 'pelo', 150),
  ('pelo_trenza_real', 'pelo', 150),
  ('pelo_cresta', 'pelo', 150),
  ('pelo_estrella', 'pelo', 150),
  ('pelo_arcoiris', 'pelo', 400),
  ('pelo_galaxia', 'pelo', 400),
  ('ojos_redondos', 'ojos', 0),
  ('ojos_alegres', 'ojos', 0),
  ('ojos_anime', 'ojos', 80),
  ('ojos_estrella', 'ojos', 80),
  ('ojos_corazon', 'ojos', 80),
  ('ojos_gato', 'ojos', 150),
  ('ojos_dino', 'ojos', 150),
  ('ojos_robot', 'ojos', 150),
  ('ojos_brillantes', 'ojos', 150),
  ('ojos_fuego', 'ojos', 250),
  ('lentes_opticos', 'apoyo', 0),
  ('audifono_medico', 'apoyo', 0),
  ('silla_ruedas', 'apoyo', 0),
  ('gorra_futbol', 'cabeza', 40),
  ('orejas_gato', 'cabeza', 40),
  ('tiara', 'cabeza', 80),
  ('casco_bombero', 'cabeza', 80),
  ('orejas_leon', 'cabeza', 80),
  ('cintillo_ninja', 'cabeza', 80),
  ('gorro_dino', 'cabeza', 150),
  ('gorro_mamut', 'cabeza', 150),
  ('sombrero_pirata', 'cabeza', 150),
  ('casco_piloto', 'cabeza', 150),
  ('gorro_tiburon', 'cabeza', 150),
  ('gorro_jirafa', 'cabeza', 150),
  ('cuernos_dragon', 'cabeza', 150),
  ('sombrero_mago', 'cabeza', 150),
  ('corona', 'cabeza', 250),
  ('casco_astronauta', 'cabeza', 250),
  ('lentes_sol', 'cara', 40),
  ('parche_pirata', 'cara', 40),
  ('pintura_leon', 'cara', 40),
  ('antifaz', 'cara', 80),
  ('lentes_pixel', 'cara', 80),
  ('bandana_ninja', 'cara', 80),
  ('lentes_estrella', 'cara', 80),
  ('visor_robot', 'cara', 150),
  ('polera_futbol_roja', 'ropa', 40),
  ('polera_futbol_azul', 'ropa', 40),
  ('polera_dino', 'ropa', 40),
  ('polera_auto', 'ropa', 40),
  ('polera_estrella', 'ropa', 40),
  ('polera_pixel', 'ropa', 40),
  ('polera_ola', 'ropa', 40),
  ('polera_rayo', 'ropa', 40),
  ('vestido_princesa', 'traje', 250),
  ('traje_heroe', 'traje', 250),
  ('vestido_estrellas', 'traje', 250),
  ('traje_pirata', 'traje', 250),
  ('traje_ninja', 'traje', 250),
  ('kimono_azul', 'traje', 250),
  ('traje_piloto', 'traje', 250),
  ('buzo_dino', 'traje', 250),
  ('buzo_tiburon', 'traje', 250),
  ('traje_escenario', 'traje', 250),
  ('traje_astronauta', 'traje', 400),
  ('cola_sirena', 'traje', 400),
  ('zapatillas_rojas', 'zapatos', 40),
  ('botas_lluvia', 'zapatos', 40),
  ('zapatos_futbol', 'zapatos', 40),
  ('botas_heroe', 'zapatos', 80),
  ('zapatos_cristal', 'zapatos', 150),
  ('zapatillas_cohete', 'zapatos', 250),
  ('capa_roja', 'espalda', 80),
  ('aleta_tiburon', 'espalda', 80),
  ('capa_real', 'espalda', 150),
  ('alas_mariposa', 'espalda', 150),
  ('alas_dragon', 'espalda', 250),
  ('mochila_cohete', 'espalda', 400),
  ('balon', 'mano', 40),
  ('microfono', 'mano', 40),
  ('control', 'mano', 40),
  ('bandera_pirata', 'mano', 40),
  ('globo', 'mano', 40),
  ('varita', 'mano', 80),
  ('escudo_estrella', 'mano', 80),
  ('guitarra', 'mano', 150),
  ('gatito', 'mascota', 80),
  ('perrito', 'mascota', 80),
  ('perezoso', 'mascota', 150),
  ('tiburoncito', 'mascota', 150),
  ('jirafita', 'mascota', 150),
  ('loro', 'mascota', 150),
  ('cachorro_leon', 'mascota', 250),
  ('mamut_bebe', 'mascota', 250),
  ('dino_bebe', 'mascota', 250),
  ('dragoncito', 'mascota', 400),
  ('patineta', 'vehiculo', 150),
  ('scooter', 'vehiculo', 150),
  ('auto_carrera', 'vehiculo', 400),
  ('camion_bombero', 'vehiculo', 400),
  ('moto', 'vehiculo', 400),
  ('nave', 'vehiculo', 400);

revoke all on privado.articulos from public, anon, authenticated;

create table public.articulos_comprados (
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  articulo_id text not null,
  comprado_en timestamptz not null default now(),
  primary key (estudiante_id, articulo_id)
);

alter table public.articulos_comprados enable row level security;
create policy articulos_docente on public.articulos_comprados
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
revoke all on public.articulos_comprados from anon, authenticated;
grant select on public.articulos_comprados to authenticated;

-- ---------------------------------------------------------------------------
-- Salida de los avatares de emoji: se devuelve lo gastado
-- ---------------------------------------------------------------------------

update public.estudiantes e
set monedas = e.monedas + g.total
from (
  select estudiante_id, sum(coalesce(privado.precio_avatar(avatar_id), 0))::integer as total
  from public.avatares_comprados
  group by estudiante_id
) g
where g.estudiante_id = e.id;

drop function public.comprar_avatar(uuid, uuid, text);
drop function public.usar_avatar(uuid, uuid, text);
drop function public.mensajes_playground(uuid, uuid);
drop function public.perfiles_alumnos();
drop function public.alumno_actual(uuid, uuid);
drop table public.avatares_comprados;
drop function privado.precio_avatar(text);
alter table public.estudiantes drop column avatar_tienda;

-- ---------------------------------------------------------------------------
-- Funciones del dispositivo del alumno (rol anon)
-- ---------------------------------------------------------------------------

create function public.perfiles_alumnos()
returns table (id uuid, nombre text, personaje jsonb, color text, ocupado boolean)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.nombre, e.personaje, e.color,
         coalesce(s.visto_en > now() - interval '10 minutes', false)
  from public.estudiantes e
  left join public.sesiones_alumno s on s.estudiante_id = e.id
  where e.activo
  order by e.nombre, e.id;
$$;

create function public.alumno_actual(p_estudiante uuid, p_token uuid)
returns table (
  id uuid, curso_id uuid, nombre text, avatar text, personaje jsonb, color text, activo boolean,
  nivel_habilitado integer, monedas integer, ajustes jsonb, comprados text[],
  sala_id uuid, sala_nombre text, sala_tipo text, contenidos text[], juegos text[], asignacion uuid,
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
  return query
  select e.id, e.curso_id, e.nombre, e.avatar, e.personaje, e.color, e.activo,
         e.nivel_habilitado::integer, e.monedas, e.ajustes,
         coalesce((select array_agg(c.articulo_id order by c.comprado_en) from public.articulos_comprados c where c.estudiante_id = e.id), '{}'),
         s.id, s.nombre, s.tipo, s.contenidos, s.juegos, s.asignacion,
         case when p.sala_id = s.id and p.asignacion = s.asignacion then p.paso::integer else 0 end,
         case when p.sala_id = s.id and p.asignacion = s.asignacion then p.repeticiones::integer else 0 end
  from public.estudiantes e
  left join public.sala_miembros m on m.estudiante_id = e.id
  left join public.salas s on s.id = m.sala_id
  left join public.progreso_sala p on p.estudiante_id = e.id
  where e.id = p_estudiante and e.activo;
end;
$$;

-- Compra sin ponérselo. Las monedas solo bajan aquí. Si ya lo tiene, no cobra:
-- el insert va primero para que dos compras simultáneas no cobren dos veces.
create function public.comprar_articulo(p_estudiante uuid, p_token uuid, p_articulo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_precio integer;
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  select precio into v_precio from privado.articulos where id = p_articulo and precio > 0;
  if not found then
    raise exception 'articulo_invalido';
  end if;
  insert into public.articulos_comprados (estudiante_id, articulo_id)
  values (p_estudiante, p_articulo)
  on conflict do nothing;
  if not found then
    return;
  end if;
  update public.estudiantes set monedas = monedas - v_precio
  where id = p_estudiante and monedas >= v_precio;
  if not found then
    raise exception 'monedas_insuficientes';
  end if;
end;
$$;

-- ¿Lo puede usar? Gratis o comprado, y del espacio correcto.
create function privado.puede_usar(p_estudiante uuid, p_articulo text, p_espacio text) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from privado.articulos a
    where a.id = p_articulo and a.espacio = p_espacio
      and (a.precio = 0 or exists (
        select 1 from public.articulos_comprados c where c.estudiante_id = p_estudiante and c.articulo_id = a.id
      ))
  );
$$;
revoke all on function privado.puede_usar(uuid, text, text) from public, anon, authenticated;

-- Guarda lo que lleva puesto, armado de nuevo campo a campo: lo que no esté
-- validado (claves extra, tipos raros) no llega a la tabla.
create function public.guardar_personaje(p_estudiante uuid, p_token uuid, p_personaje jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_puestos jsonb := '{}';
  v_apoyos jsonb := '[]';
  v_clave text;
  v_valor text;
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  -- coalesce: un campo que falta deja la condición en null, y también se rechaza.
  if coalesce(jsonb_typeof(p_personaje) <> 'object'
     or jsonb_typeof(p_personaje -> 'piel') <> 'number'
     or (p_personaje ->> 'piel') not in ('1', '2', '3', '4', '5', '6')
     or (p_personaje ->> 'colorPelo') is null
     or (p_personaje ->> 'colorPelo') not in ('negro', 'cafe_oscuro', 'cafe_claro', 'rubio', 'cobrizo', 'gris')
     or (p_personaje ->> 'expresion') is null
     or (p_personaje ->> 'expresion') not in ('feliz', 'tranquilo', 'triste', 'enojado')
     or jsonb_typeof(p_personaje -> 'manoArriba') <> 'boolean'
     or jsonb_typeof(p_personaje -> 'apoyos') <> 'array'
     or jsonb_typeof(p_personaje -> 'puestos') <> 'object'
     or not privado.puede_usar(p_estudiante, p_personaje ->> 'pelo', 'pelo')
     or not privado.puede_usar(p_estudiante, p_personaje ->> 'ojos', 'ojos'), true) then
    raise exception 'personaje_invalido';
  end if;

  for v_clave, v_valor in select key, value from jsonb_each_text(p_personaje -> 'puestos') loop
    if v_clave not in ('cabeza', 'cara', 'ropa', 'traje', 'zapatos', 'espalda', 'mano', 'mascota', 'vehiculo')
       or not privado.puede_usar(p_estudiante, v_valor, v_clave) then
      raise exception 'personaje_invalido';
    end if;
    v_puestos := v_puestos || jsonb_build_object(v_clave, v_valor);
  end loop;

  for v_valor in select value from jsonb_array_elements_text(p_personaje -> 'apoyos') loop
    if not privado.puede_usar(p_estudiante, v_valor, 'apoyo') then
      raise exception 'personaje_invalido';
    end if;
    v_apoyos := v_apoyos || to_jsonb(v_valor);
  end loop;

  update public.estudiantes
  set personaje = jsonb_build_object(
    'piel', (p_personaje ->> 'piel')::integer,
    'colorPelo', p_personaje ->> 'colorPelo',
    'pelo', p_personaje ->> 'pelo',
    'ojos', p_personaje ->> 'ojos',
    'expresion', p_personaje ->> 'expresion',
    'manoArriba', (p_personaje ->> 'manoArriba')::boolean,
    'apoyos', v_apoyos,
    'puestos', v_puestos
  )
  where id = p_estudiante;
end;
$$;

-- ---------------------------------------------------------------------------
-- Parque
-- ---------------------------------------------------------------------------

alter table public.salas add column canal_parque uuid not null default gen_random_uuid();

-- Compañeros del playground del alumno y el canal secreto. En el canal cada uno
-- se identifica con su ficha, no con su id.
create function public.parque_alumno(p_estudiante uuid, p_token uuid)
returns table (canal uuid, ficha text, mia boolean, nombre text, color text, personaje jsonb)
language sql stable security definer set search_path = ''
as $$
  select s.canal_parque,
         left(md5(s.canal_parque::text || x.estudiante_id::text), 12),
         x.estudiante_id = p_estudiante,
         e.nombre, e.color, e.personaje
  from public.sala_miembros m
  join public.salas s on s.id = m.sala_id and s.tipo = 'playground'
  join public.sala_miembros x on x.sala_id = s.id
  join public.estudiantes e on e.id = x.estudiante_id and e.activo
  where m.estudiante_id = p_estudiante
    and privado.dispositivo_valido(p_estudiante, p_token);
$$;

revoke execute on function
  public.perfiles_alumnos(), public.alumno_actual(uuid, uuid),
  public.comprar_articulo(uuid, uuid, text), public.guardar_personaje(uuid, uuid, jsonb),
  public.parque_alumno(uuid, uuid)
from public;
grant execute on function
  public.perfiles_alumnos(), public.alumno_actual(uuid, uuid),
  public.comprar_articulo(uuid, uuid, text), public.guardar_personaje(uuid, uuid, jsonb),
  public.parque_alumno(uuid, uuid)
to anon, authenticated;
