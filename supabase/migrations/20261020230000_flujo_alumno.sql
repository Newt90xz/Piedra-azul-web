-- Nuevo flujo del alumno:
--   1. El dispositivo muestra todos los perfiles; el niño toca el suyo y queda
--      en la sala de espera (minijuego y tienda de avatares).
--   2. La docente lo asigna a una sala. Una sala de trabajo tiene un plan:
--      contenidos MINEDUC en orden (3 actividades cada uno) y los juegos a los
--      que llega al terminarlos. Si no logra el 60 % repite la actividad; tras
--      2 repeticiones la docente recibe un aviso.
--   3. Quien termina puede pasar al playground: un espacio común con mensajes
--      de pictogramas predefinidos (sin texto libre).
--
-- La sesión del dispositivo deja de vivir en sala_miembros (un niño en espera
-- no tiene sala) y pasa a sesiones_alumno. `anon` sigue sin tocar tablas: solo
-- ejecuta las funciones security definer de abajo, que exigen el token.

-- ---------------------------------------------------------------------------
-- Sesión del dispositivo del alumno
-- ---------------------------------------------------------------------------

create table public.sesiones_alumno (
  estudiante_id uuid primary key references public.estudiantes (id) on delete cascade,
  token_hash bytea not null,
  iniciada_en timestamptz not null default now(),
  -- Lo renueva alumno_actual (la app lo consulta cada pocos segundos). Una
  -- sesión sin señales por 10 minutos (tableta apagada) deja tomar el perfil.
  visto_en timestamptz not null default now()
);

alter table public.sesiones_alumno enable row level security;
create policy sesiones_docente on public.sesiones_alumno
  for all to authenticated
  using (privado.es_mi_estudiante(estudiante_id))
  with check (privado.es_mi_estudiante(estudiante_id));
revoke all on public.sesiones_alumno from anon, authenticated;
grant select (estudiante_id, iniciada_en, visto_en) on public.sesiones_alumno to authenticated;
grant delete on public.sesiones_alumno to authenticated;

-- Las funciones de emoción y resultados ya la usan: siguen igual, ahora con la nueva sesión.
create or replace function privado.dispositivo_valido(p_estudiante uuid, p_token uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.sesiones_alumno
    where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token)
  )
$$;
revoke all on function privado.dispositivo_valido(uuid, uuid) from public, anon, authenticated;

-- El alumno ya no elige sala ni se une solo.
drop function public.salas_abiertas();
drop function public.perfiles_de_sala(uuid);
drop function public.unirse_sala(uuid, uuid);
drop function public.salir_sala(uuid, uuid);
drop function public.estudiante_en_sala(uuid, uuid);
alter table public.sala_miembros drop column token_hash;

-- ---------------------------------------------------------------------------
-- Salas: tipo y plan (sin cupos ni apertura: la docente asigna a cada niño)
-- ---------------------------------------------------------------------------

alter table public.salas
  drop column abierta,
  drop column cupos,
  add column tipo text not null default 'trabajo' check (tipo in ('trabajo', 'playground')),
  add column contenidos text[] not null default '{}' check (cardinality(contenidos) <= 12),
  add column juegos text[] not null default '{}' check (cardinality(juegos) <= 4),
  -- Se renueva con cada plan nuevo: el avance guardado con otra asignación no cuenta.
  add column asignacion uuid not null default gen_random_uuid();

create table public.progreso_sala (
  estudiante_id uuid primary key references public.estudiantes (id) on delete cascade,
  sala_id uuid not null references public.salas (id) on delete cascade,
  asignacion uuid not null,
  -- Actividades ya logradas del plan (3 por contenido).
  paso smallint not null default 0 check (paso >= 0),
  repeticiones smallint not null default 0 check (repeticiones >= 0),
  necesita_ayuda boolean not null default false,
  -- Último resultado que se contó: reenviarlo no cuenta dos veces.
  ultimo_resultado uuid,
  actualizado timestamptz not null default now()
);
create index progreso_sala_sala_idx on public.progreso_sala (sala_id);

alter table public.progreso_sala enable row level security;
create policy progreso_docente on public.progreso_sala
  for all to authenticated
  using (privado.es_mi_estudiante(estudiante_id))
  with check (privado.es_mi_estudiante(estudiante_id));
revoke all on public.progreso_sala from anon, authenticated;
grant select on public.progreso_sala to authenticated;
-- La docente solo apaga el aviso; el avance lo mueve registrar_progreso.
grant update (necesita_ayuda) on public.progreso_sala to authenticated;

-- ---------------------------------------------------------------------------
-- Tienda de avatares (RF-24)
-- ---------------------------------------------------------------------------

-- Mismo catálogo que frontend/src/contenido/tienda.ts. null: no existe.
create function privado.precio_avatar(p_avatar text) returns integer
language sql immutable set search_path = '' as $$
  select case p_avatar when 'dragon' then 30 when 'robot' then 60 when 'astronauta' then 90 end
$$;
revoke all on function privado.precio_avatar(text) from public, anon, authenticated;

-- El que lleva puesto; null: el que eligió la docente (columna avatar).
alter table public.estudiantes add column avatar_tienda text check (avatar_tienda ~ '^[a-z]{1,20}$');

create table public.avatares_comprados (
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  avatar_id text not null check (avatar_id ~ '^[a-z]{1,20}$'),
  comprado_en timestamptz not null default now(),
  primary key (estudiante_id, avatar_id)
);

alter table public.avatares_comprados enable row level security;
create policy compras_docente on public.avatares_comprados
  for select to authenticated using (privado.es_mi_estudiante(estudiante_id));
revoke all on public.avatares_comprados from anon, authenticated;
grant select on public.avatares_comprados to authenticated;

-- ---------------------------------------------------------------------------
-- Playground: mensajes de pictogramas
-- ---------------------------------------------------------------------------

create table public.mensajes_sala (
  id bigint generated always as identity primary key,
  sala_id uuid not null references public.salas (id) on delete cascade,
  estudiante_id uuid not null references public.estudiantes (id) on delete cascade,
  -- Mismo set que frontend/src/contenido/mensajes.ts.
  picto text not null check (picto in ('hola', 'bien', 'jaja', 'wow', 'amor', 'jugar', 'gracias', 'chao')),
  enviado_en timestamptz not null default now()
);
create index mensajes_sala_sala_idx on public.mensajes_sala (sala_id, id desc);
create index mensajes_sala_estudiante_idx on public.mensajes_sala (estudiante_id, enviado_en desc);

alter table public.mensajes_sala enable row level security;
create policy mensajes_docente on public.mensajes_sala
  for all to authenticated
  using (exists (select 1 from public.salas s where s.id = mensajes_sala.sala_id and privado.es_mi_curso(s.curso_id)))
  with check (exists (select 1 from public.salas s where s.id = mensajes_sala.sala_id and privado.es_mi_curso(s.curso_id)));
revoke all on public.mensajes_sala from anon, authenticated;
grant select, delete on public.mensajes_sala to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones del dispositivo del alumno (rol anon)
-- ---------------------------------------------------------------------------

-- Primera pantalla del alumno: todos los perfiles activos. Solo nombre de pila
-- y avatar (sin foto, RNF-09).
create function public.perfiles_alumnos()
returns table (id uuid, nombre text, avatar text, avatar_tienda text, color text, ocupado boolean)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.nombre, e.avatar, e.avatar_tienda, e.color,
         coalesce(s.visto_en > now() - interval '10 minutes', false)
  from public.estudiantes e
  left join public.sesiones_alumno s on s.estudiante_id = e.id
  where e.activo
  order by e.nombre, e.id;
$$;

-- Devuelve el token del dispositivo: se entrega una sola vez.
create function public.entrar_alumno(p_estudiante uuid)
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
  return v_token;
end;
$$;

-- Cierra la sesión del dispositivo. La sala y el avance se conservan: al volver sigue donde iba.
create function public.salir_alumno(p_estudiante uuid, p_token uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.sesiones_alumno
  where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token);
$$;

-- Perfil, sala, plan y avance del alumno conectado. Sin filas si el token no
-- vale (la app lo usa para detectar que la docente cerró el dispositivo).
create function public.alumno_actual(p_estudiante uuid, p_token uuid)
returns table (
  id uuid, curso_id uuid, nombre text, avatar text, avatar_tienda text, color text, activo boolean,
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
  select e.id, e.curso_id, e.nombre, e.avatar, e.avatar_tienda, e.color, e.activo,
         e.nivel_habilitado::integer, e.monedas, e.ajustes,
         coalesce((select array_agg(c.avatar_id order by c.comprado_en) from public.avatares_comprados c where c.estudiante_id = e.id), '{}'),
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

-- Termina la actividad `p_paso` del plan. Logrado (60 %): pasa a la siguiente.
-- No logrado: la repite; desde la 2.ª repetición la docente ve un aviso.
create function public.registrar_progreso(
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
  v_total := cardinality(s.contenidos) * 3;

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

-- Compra (si no lo tenía) y se pone el avatar. Las monedas solo bajan aquí.
create function public.comprar_avatar(p_estudiante uuid, p_token uuid, p_avatar text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_precio integer := privado.precio_avatar(p_avatar);
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  if v_precio is null then
    raise exception 'avatar_invalido';
  end if;
  if not exists (select 1 from public.avatares_comprados where estudiante_id = p_estudiante and avatar_id = p_avatar) then
    update public.estudiantes set monedas = monedas - v_precio
    where id = p_estudiante and monedas >= v_precio;
    if not found then
      raise exception 'monedas_insuficientes';
    end if;
    -- Dos compras simultáneas: la clave primaria rechaza la segunda y se revierte su cobro.
    insert into public.avatares_comprados (estudiante_id, avatar_id) values (p_estudiante, p_avatar);
  end if;
  update public.estudiantes set avatar_tienda = p_avatar where id = p_estudiante;
end;
$$;

-- Se pone uno ya comprado; null vuelve al avatar que eligió la docente.
create function public.usar_avatar(p_estudiante uuid, p_token uuid, p_avatar text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  if p_avatar is not null and not exists (
    select 1 from public.avatares_comprados where estudiante_id = p_estudiante and avatar_id = p_avatar
  ) then
    raise exception 'avatar_invalido';
  end if;
  update public.estudiantes set avatar_tienda = p_avatar where id = p_estudiante;
end;
$$;

-- Últimos mensajes del playground donde está el alumno (del último día).
create function public.mensajes_playground(p_estudiante uuid, p_token uuid)
returns table (
  id bigint, estudiante_id uuid, nombre text, avatar text, avatar_tienda text, color text, picto text, enviado_en timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select x.id, x.estudiante_id, e.nombre, e.avatar, e.avatar_tienda, e.color, x.picto, x.enviado_en
  from public.sala_miembros m
  join public.salas s on s.id = m.sala_id and s.tipo = 'playground'
  join public.mensajes_sala x on x.sala_id = s.id
  join public.estudiantes e on e.id = x.estudiante_id
  where m.estudiante_id = p_estudiante
    and privado.dispositivo_valido(p_estudiante, p_token)
    and x.enviado_en > now() - interval '1 day'
  order by x.id desc
  limit 40;
$$;

create function public.enviar_mensaje(p_estudiante uuid, p_token uuid, p_picto text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sala uuid;
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sesion';
  end if;
  select s.id into v_sala
  from public.sala_miembros m join public.salas s on s.id = m.sala_id and s.tipo = 'playground'
  where m.estudiante_id = p_estudiante;
  if not found then
    raise exception 'sin_playground';
  end if;
  -- Uno cada 2 segundos por niño: tocar muchas veces seguidas no inunda la sala.
  if exists (
    select 1 from public.mensajes_sala where estudiante_id = p_estudiante and enviado_en > now() - interval '2 seconds'
  ) then
    return;
  end if;
  insert into public.mensajes_sala (sala_id, estudiante_id, picto) values (v_sala, p_estudiante, p_picto);
  delete from public.mensajes_sala where sala_id = v_sala and enviado_en < now() - interval '1 day';
end;
$$;

revoke execute on function
  public.perfiles_alumnos(), public.entrar_alumno(uuid), public.salir_alumno(uuid, uuid),
  public.alumno_actual(uuid, uuid), public.registrar_progreso(uuid, uuid, uuid, integer, boolean, uuid),
  public.comprar_avatar(uuid, uuid, text), public.usar_avatar(uuid, uuid, text),
  public.mensajes_playground(uuid, uuid), public.enviar_mensaje(uuid, uuid, text)
from public;
grant execute on function
  public.perfiles_alumnos(), public.entrar_alumno(uuid), public.salir_alumno(uuid, uuid),
  public.alumno_actual(uuid, uuid), public.registrar_progreso(uuid, uuid, uuid, integer, boolean, uuid),
  public.comprar_avatar(uuid, uuid, text), public.usar_avatar(uuid, uuid, text),
  public.mensajes_playground(uuid, uuid), public.enviar_mensaje(uuid, uuid, text)
to anon, authenticated;
