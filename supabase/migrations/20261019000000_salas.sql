-- Salas de trabajo: la docente crea varias salas por curso; los alumnos, sin
-- cuenta, eligen una sala abierta y luego su propio perfil. Una sala tiene un
-- interruptor abierta/cerrada y un límite de cupos. Un alumno está en una sola
-- sala a la vez (sala_miembros.estudiante_id es clave primaria).
--
-- Acceso de los alumnos: `anon` no toca tablas; solo ejecuta las funciones
-- security definer de abajo. Todo lo que escriben exige ser miembro de una sala.

create table public.salas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  abierta boolean not null default true,
  cupos integer not null default 6 check (cupos between 1 and 40),
  creado_en timestamptz not null default now(),
  unique (curso_id, nombre)
);

create table public.sala_miembros (
  estudiante_id uuid primary key references public.estudiantes (id) on delete cascade,
  sala_id uuid not null references public.salas (id) on delete cascade,
  unido_en timestamptz not null default now()
);
create index sala_miembros_sala_id_idx on public.sala_miembros (sala_id);

alter table public.salas enable row level security;
alter table public.sala_miembros enable row level security;

-- Docente: gestiona solo las salas de sus cursos.
create policy salas_docente on public.salas
  for all to authenticated
  using (exists (select 1 from public.cursos c where c.id = salas.curso_id and c.docente_id = (select auth.uid())))
  with check (exists (select 1 from public.cursos c where c.id = salas.curso_id and c.docente_id = (select auth.uid())));

-- Docente: conecta/desconecta alumnos de su mismo curso (puede superar el cupo).
create policy miembros_docente on public.sala_miembros
  for all to authenticated
  using (exists (
    select 1 from public.salas s join public.cursos c on c.id = s.curso_id
    where s.id = sala_miembros.sala_id and c.docente_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.salas s
    join public.cursos c on c.id = s.curso_id
    join public.estudiantes e on e.curso_id = s.curso_id
    where s.id = sala_miembros.sala_id
      and e.id = sala_miembros.estudiante_id
      and c.docente_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Funciones para el dispositivo del alumno (rol anon).
-- ---------------------------------------------------------------------------

-- Salas abiertas. Solo nombres: ningún dato de niños.
create function public.salas_abiertas()
returns table (id uuid, nombre text, curso text, cupos integer, ocupados integer)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.nombre, c.nombre, s.cupos,
         (select count(*)::integer from public.sala_miembros m where m.sala_id = s.id)
  from public.salas s
  join public.cursos c on c.id = s.curso_id
  where s.abierta
  order by c.nombre, s.nombre;
$$;

-- Perfiles que se muestran tras elegir sala: solo nombre de pila y avatar
-- (sin foto, RNF-09). Una sala cerrada solo se muestra a quienes ya están en ella.
create function public.perfiles_de_sala(p_sala uuid)
returns table (id uuid, nombre text, avatar text, color text, sala_id uuid)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.nombre, e.avatar, e.color, m.sala_id
  from public.salas s
  join public.estudiantes e on e.curso_id = s.curso_id and e.activo
  left join public.sala_miembros m on m.estudiante_id = e.id
  where s.id = p_sala and (s.abierta or m.sala_id = s.id)
  order by e.nombre;
$$;

create function public.unirse_sala(p_sala uuid, p_estudiante uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.salas;
begin
  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'sala_inexistente'; end if;
  if not exists (
    select 1 from public.estudiantes e where e.id = p_estudiante and e.curso_id = s.curso_id and e.activo
  ) then raise exception 'perfil_invalido'; end if;
  -- Reconectar a la misma sala siempre se permite.
  if exists (select 1 from public.sala_miembros where estudiante_id = p_estudiante and sala_id = p_sala) then
    return;
  end if;
  if not s.abierta then raise exception 'sala_cerrada'; end if;
  if (select count(*) from public.sala_miembros where sala_id = p_sala) >= s.cupos then
    raise exception 'sala_llena';
  end if;
  insert into public.sala_miembros (estudiante_id, sala_id) values (p_estudiante, p_sala)
  on conflict (estudiante_id) do update set sala_id = excluded.sala_id, unido_en = now();
end;
$$;

create function public.salir_sala(p_estudiante uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.sala_miembros where estudiante_id = p_estudiante;
$$;

-- Perfil del alumno conectado. Sin filas si no es miembro de ninguna sala
-- (la app lo usa también para detectar que la docente lo desconectó).
create function public.estudiante_en_sala(p_estudiante uuid)
returns table (
  id uuid, curso_id uuid, nombre text, avatar text, color text, activo boolean,
  nivel_habilitado integer, monedas integer, ajustes jsonb, sala_id uuid, sala_nombre text
)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.curso_id, e.nombre, e.avatar, e.color, e.activo,
         e.nivel_habilitado, e.monedas, e.ajustes::jsonb, s.id, s.nombre
  from public.sala_miembros m
  join public.estudiantes e on e.id = m.estudiante_id
  join public.salas s on s.id = m.sala_id
  where m.estudiante_id = p_estudiante and e.activo;
$$;

create function public.registrar_emocion_sala(p_estudiante uuid, p_emocion public.emocion)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.sala_miembros where estudiante_id = p_estudiante) then
    raise exception 'sin_sala';
  end if;
  insert into public.registros_emocion (estudiante_id, emocion) values (p_estudiante, p_emocion);
end;
$$;

-- Misma firma y mismo efecto que guardar_resultado (idempotente por id), pero
-- exige que el alumno esté en una sala. Las monedas del perfil las suma el
-- trigger sumar_monedas al insertar el resultado.
create function public.guardar_resultado_sala(
  p_id uuid, p_estudiante_id uuid, p_actividad_id text, p_fecha timestamptz,
  p_duracion_ms integer, p_estrellas integer, p_monedas integer, p_rondas jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  insertadas integer;
begin
  if not exists (select 1 from public.sala_miembros where estudiante_id = p_estudiante_id) then
    raise exception 'sin_sala';
  end if;
  if p_estrellas not between 0 and 3 or p_monedas not between 0 and 100 or p_duracion_ms < 0 then
    raise exception 'resultado_invalido';
  end if;
  insert into public.resultados_actividad (id, estudiante_id, actividad_id, fecha, duracion_ms, estrellas, monedas)
  values (p_id, p_estudiante_id, p_actividad_id, p_fecha, p_duracion_ms, p_estrellas, p_monedas)
  on conflict (id) do nothing;
  get diagnostics insertadas = row_count;
  if insertadas = 0 then return; end if;
  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada)
  select p_id, (t.ord - 1)::integer, t.r ->> 'item', (t.r ->> 'intentos')::integer, (t.r ->> 'acertada')::boolean
  from jsonb_array_elements(p_rondas) with ordinality as t (r, ord);
end;
$$;

revoke execute on function
  public.salas_abiertas(), public.perfiles_de_sala(uuid), public.unirse_sala(uuid, uuid),
  public.salir_sala(uuid), public.estudiante_en_sala(uuid),
  public.registrar_emocion_sala(uuid, public.emocion),
  public.guardar_resultado_sala(uuid, uuid, text, timestamptz, integer, integer, integer, jsonb)
from public;
grant execute on function
  public.salas_abiertas(), public.perfiles_de_sala(uuid), public.unirse_sala(uuid, uuid),
  public.salir_sala(uuid), public.estudiante_en_sala(uuid),
  public.registrar_emocion_sala(uuid, public.emocion),
  public.guardar_resultado_sala(uuid, uuid, text, timestamptz, integer, integer, integer, jsonb)
to anon, authenticated;
