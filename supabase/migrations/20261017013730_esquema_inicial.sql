-- Leer para Todos: esquema inicial
-- Todo el acceso pasa por la sesión de la docente (RF-02: en modo aula la
-- docente deja su sesión abierta para el niño). No hay acceso anónimo.

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

create type public.emocion as enum ('alegria', 'calma', 'tristeza', 'enojo');

-- Docentes: una fila por usuario de Supabase Auth (RF-03).
create table public.docentes (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  email text not null,
  creado_en timestamptz not null default now()
);

create function privado.crear_docente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.docentes (id, nombre, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

create trigger crear_docente after insert on auth.users
for each row execute function privado.crear_docente();

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 60),
  docente_id uuid not null default auth.uid() references public.docentes (id) on delete cascade,
  creado_en timestamptz not null default now()
);
create index cursos_docente_idx on public.cursos (docente_id);

-- RNF-09: datos mínimos. Solo nombre de pila y avatar; sin RUT, apellidos
-- ni fecha de nacimiento.
create table public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 40),
  avatar text not null check (char_length(avatar) between 1 and 16),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  foto_url text,
  activo boolean not null default true,
  nivel_habilitado smallint not null default 1 check (nivel_habilitado between 1 and 3),
  monedas integer not null default 0 check (monedas >= 0),
  -- RF-21: ajustes de interfaz que se aplican al entrar.
  ajustes jsonb not null default '{
    "modoImagen": "mixto", "tamanoLetra": "normal", "altoContraste": false,
    "reducirAnimaciones": false, "silenciarEfectos": false, "tematica": "animales"
  }'::jsonb check (jsonb_typeof(ajustes) = 'object'),
  creado_en timestamptz not null default now()
);
create index estudiantes_curso_idx on public.estudiantes (curso_id);

-- RF-14
create table public.registros_emocion (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  emocion public.emocion not null,
  fecha timestamptz not null default now()
);
create index registros_emocion_estudiante_idx on public.registros_emocion (estudiante_id, fecha desc);

-- RF-12: resultado de cada micro-partida.
create table public.resultados_actividad (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  actividad_id text not null check (char_length(actividad_id) between 1 and 60),
  fecha timestamptz not null default now(),
  duracion_ms integer not null check (duracion_ms >= 0),
  estrellas smallint not null check (estrellas between 0 and 3),
  monedas integer not null default 0 check (monedas >= 0)
);
create index resultados_estudiante_idx on public.resultados_actividad (estudiante_id, fecha desc);

-- RF-12 / RF-13: una fila por ronda para saber qué letra o sílaba cuesta.
create table public.rondas_resultado (
  resultado_id uuid not null references public.resultados_actividad (id) on delete cascade,
  orden smallint not null check (orden >= 0),
  item text not null check (char_length(item) between 1 and 20),
  intentos smallint not null check (intentos >= 1),
  acertada boolean not null,
  primary key (resultado_id, orden)
);
create index rondas_item_idx on public.rondas_resultado (item);

create table public.observaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  docente_id uuid not null default auth.uid() references public.docentes (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  fecha timestamptz not null default now()
);
create index observaciones_estudiante_idx on public.observaciones (estudiante_id, fecha desc);
create index observaciones_docente_idx on public.observaciones (docente_id);

-- Funciones de pertenencia (security definer en esquema no expuesto, para no
-- encadenar RLS en cada fila).
create function privado.es_mi_curso(p_curso uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cursos c
    where c.id = p_curso and c.docente_id = (select auth.uid())
  )
$$;

create function privado.es_mi_estudiante(p_estudiante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.estudiantes e
    join public.cursos c on c.id = e.curso_id
    where e.id = p_estudiante and c.docente_id = (select auth.uid())
  )
$$;

revoke all on function privado.crear_docente() from public, anon, authenticated;
revoke all on function privado.es_mi_curso(uuid) from public, anon;
revoke all on function privado.es_mi_estudiante(uuid) from public, anon;
grant execute on function privado.es_mi_curso(uuid) to authenticated;
grant execute on function privado.es_mi_estudiante(uuid) to authenticated;

-- RF-25: las monedas del resultado se suman al estudiante en la misma transacción.
-- security definer: authenticated no tiene update sobre estudiantes.monedas.
create function privado.sumar_monedas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.estudiantes set monedas = monedas + new.monedas where id = new.estudiante_id;
  return new;
end $$;

revoke all on function privado.sumar_monedas() from public, anon, authenticated;

create trigger sumar_monedas after insert on public.resultados_actividad
for each row execute function privado.sumar_monedas();

-- Guarda resultado + rondas de forma atómica. El id lo genera el cliente para
-- que reintentos (cola offline, RNF-12) no dupliquen el resultado.
create function public.guardar_resultado(
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

  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada)
  select p_id, (r.ord - 1)::smallint, r.v ->> 'item', (r.v ->> 'intentos')::smallint, (r.v ->> 'acertada')::boolean
  from jsonb_array_elements(p_rondas) with ordinality as r (v, ord);
end $$;

revoke all on function public.guardar_resultado(uuid, uuid, text, timestamptz, integer, smallint, integer, jsonb) from public, anon;
grant execute on function public.guardar_resultado(uuid, uuid, text, timestamptz, integer, smallint, integer, jsonb) to authenticated;

-- Row Level Security (RNF-10): cada docente solo ve los datos de sus cursos.
alter table public.docentes enable row level security;
alter table public.cursos enable row level security;
alter table public.estudiantes enable row level security;
alter table public.registros_emocion enable row level security;
alter table public.resultados_actividad enable row level security;
alter table public.rondas_resultado enable row level security;
alter table public.observaciones enable row level security;

create policy "docente ve su perfil" on public.docentes
  for select to authenticated using (id = (select auth.uid()));
create policy "docente edita su perfil" on public.docentes
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "docente gestiona sus cursos" on public.cursos
  for all to authenticated
  using (docente_id = (select auth.uid()))
  with check (docente_id = (select auth.uid()));

-- RF-01: los perfiles se desactivan (activo = false), no se borran desde la app.
create policy "docente ve sus estudiantes" on public.estudiantes
  for select to authenticated using (privado.es_mi_curso(curso_id));
create policy "docente crea estudiantes en sus cursos" on public.estudiantes
  for insert to authenticated with check (privado.es_mi_curso(curso_id));
create policy "docente edita sus estudiantes" on public.estudiantes
  for update to authenticated
  using (privado.es_mi_curso(curso_id))
  with check (privado.es_mi_curso(curso_id));

create policy "docente ve emociones" on public.registros_emocion
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
create policy "docente registra emociones" on public.registros_emocion
  for insert to authenticated with check (privado.es_mi_estudiante(estudiante_id));

create policy "docente ve resultados" on public.resultados_actividad
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
create policy "docente registra resultados" on public.resultados_actividad
  for insert to authenticated with check (privado.es_mi_estudiante(estudiante_id));

create policy "docente ve rondas" on public.rondas_resultado
  for select to authenticated
  using (exists (select 1 from public.resultados_actividad r where r.id = resultado_id));
create policy "docente registra rondas" on public.rondas_resultado
  for insert to authenticated
  with check (exists (select 1 from public.resultados_actividad r where r.id = resultado_id));

create policy "docente ve observaciones" on public.observaciones
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
create policy "docente agrega observaciones" on public.observaciones
  for insert to authenticated
  with check (privado.es_mi_estudiante(estudiante_id) and docente_id = (select auth.uid()));
create policy "docente borra sus observaciones" on public.observaciones
  for delete to authenticated using (docente_id = (select auth.uid()));

-- Sin acceso anónimo a ninguna tabla; authenticated solo lo que usan las políticas.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select, update (nombre) on public.docentes to authenticated;
grant select, insert, update, delete on public.cursos to authenticated;
-- monedas solo cambia vía el trigger sumar_monedas (RF-25).
grant select, insert on public.estudiantes to authenticated;
grant update (curso_id, nombre, avatar, color, foto_url, activo, nivel_habilitado, ajustes)
  on public.estudiantes to authenticated;
grant select, insert on public.registros_emocion to authenticated;
grant select, insert on public.resultados_actividad to authenticated;
grant select, insert on public.rondas_resultado to authenticated;
grant select, insert, delete on public.observaciones to authenticated;
