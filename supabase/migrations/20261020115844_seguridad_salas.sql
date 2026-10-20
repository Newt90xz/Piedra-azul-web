-- Credencial por dispositivo para las funciones de sala (rol anon).
--
-- Antes bastaba el UUID de un estudiante (perfiles_de_sala lo entrega a
-- cualquiera) para sacarlo de su sala, sumarle resultados y monedas o leer sus
-- ajustes. Ahora unirse_sala entrega un token aleatorio al dispositivo y las
-- demás funciones lo exigen; solo se guarda su hash. Un perfil que ya tiene
-- dispositivo no se puede tomar desde otro: la docente lo desconecta primero.

alter table public.sala_miembros add column token_hash bytea;

create function privado.hash_token(p_token uuid) returns bytea
language sql immutable set search_path = '' as $$
  select sha256(convert_to(p_token::text, 'UTF8'))
$$;

create function privado.dispositivo_valido(p_estudiante uuid, p_token uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.sala_miembros
    where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token)
  )
$$;

revoke all on function privado.hash_token(uuid), privado.dispositivo_valido(uuid, uuid) from public, anon, authenticated;

drop function public.perfiles_de_sala(uuid);
drop function public.unirse_sala(uuid, uuid);
drop function public.salir_sala(uuid);
drop function public.estudiante_en_sala(uuid);
drop function public.registrar_emocion_sala(uuid, public.emocion);
drop function public.guardar_resultado_sala(uuid, uuid, text, timestamptz, integer, integer, integer, jsonb);

-- Perfiles que se muestran tras elegir sala: solo nombre de pila y avatar
-- (sin foto, RNF-09). `ocupado`: ya entró desde otro dispositivo. Una sala
-- cerrada solo se muestra a quienes ya están en ella.
create function public.perfiles_de_sala(p_sala uuid)
returns table (id uuid, nombre text, avatar text, color text, ocupado boolean)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.nombre, e.avatar, e.color, m.token_hash is not null
  from public.salas s
  join public.estudiantes e on e.curso_id = s.curso_id and e.activo
  left join public.sala_miembros m on m.estudiante_id = e.id
  where s.id = p_sala and (s.abierta or m.sala_id = s.id)
  order by e.nombre;
$$;

-- Devuelve el token del dispositivo: se entrega una sola vez.
create function public.unirse_sala(p_sala uuid, p_estudiante uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  s public.salas;
  m public.sala_miembros;
  v_token uuid := gen_random_uuid();
begin
  -- Dos dispositivos que eligen al mismo niño a la vez (aunque sea en salas distintas).
  perform pg_advisory_xact_lock(hashtextextended(p_estudiante::text, 0));
  select * into s from public.salas where id = p_sala for update;
  if not found then raise exception 'sala_inexistente'; end if;
  if not exists (
    select 1 from public.estudiantes e where e.id = p_estudiante and e.curso_id = s.curso_id and e.activo
  ) then raise exception 'perfil_invalido'; end if;
  select * into m from public.sala_miembros where estudiante_id = p_estudiante;
  if found and m.token_hash is not null then raise exception 'perfil_ocupado'; end if;
  -- Si la docente ya lo conectó a esta sala, el dispositivo la toma aunque esté cerrada o llena.
  if not (found and m.sala_id = p_sala) then
    if not s.abierta then raise exception 'sala_cerrada'; end if;
    if (select count(*) from public.sala_miembros where sala_id = p_sala) >= s.cupos then
      raise exception 'sala_llena';
    end if;
  end if;
  insert into public.sala_miembros (estudiante_id, sala_id, token_hash)
  values (p_estudiante, p_sala, privado.hash_token(v_token))
  on conflict (estudiante_id) do update
    set sala_id = excluded.sala_id, token_hash = excluded.token_hash, unido_en = now();
  return v_token;
end;
$$;

create function public.salir_sala(p_estudiante uuid, p_token uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.sala_miembros
  where estudiante_id = p_estudiante and token_hash = privado.hash_token(p_token);
$$;

-- Perfil del alumno conectado. Sin filas si no es miembro de ninguna sala o el
-- token no es el suyo (la app lo usa también para detectar que la docente lo desconectó).
create function public.estudiante_en_sala(p_estudiante uuid, p_token uuid)
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
  where m.estudiante_id = p_estudiante and m.token_hash = privado.hash_token(p_token) and e.activo;
$$;

create function public.registrar_emocion_sala(p_estudiante uuid, p_token uuid, p_emocion public.emocion)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not privado.dispositivo_valido(p_estudiante, p_token) then
    raise exception 'sin_sala';
  end if;
  insert into public.registros_emocion (estudiante_id, emocion) values (p_estudiante, p_emocion);
end;
$$;

-- Mismo efecto que guardar_resultado (idempotente por id), pero exige el token
-- del dispositivo y los límites de una micro-partida real (Partida.tsx): de 1 a
-- 10 rondas y como mucho 12 monedas por ronda (10 al primer intento + 2 de
-- racha). La fecha la pone el dispositivo porque puede llegar tarde desde la
-- cola offline, pero no puede ser futura ni de hace más de 30 días. Las monedas
-- del perfil las suma el trigger sumar_monedas al insertar el resultado.
create function public.guardar_resultado_sala(
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
  insert into public.rondas_resultado (resultado_id, orden, item, intentos, acertada)
  select p_id, (t.ord - 1)::integer, t.r ->> 'item', (t.r ->> 'intentos')::integer, (t.r ->> 'acertada')::boolean
  from jsonb_array_elements(p_rondas) with ordinality as t (r, ord);
end;
$$;

revoke execute on function
  public.perfiles_de_sala(uuid), public.unirse_sala(uuid, uuid), public.salir_sala(uuid, uuid),
  public.estudiante_en_sala(uuid, uuid), public.registrar_emocion_sala(uuid, uuid, public.emocion),
  public.guardar_resultado_sala(uuid, uuid, uuid, text, timestamptz, integer, integer, integer, jsonb)
from public;
grant execute on function
  public.perfiles_de_sala(uuid), public.unirse_sala(uuid, uuid), public.salir_sala(uuid, uuid),
  public.estudiante_en_sala(uuid, uuid), public.registrar_emocion_sala(uuid, uuid, public.emocion),
  public.guardar_resultado_sala(uuid, uuid, uuid, text, timestamptz, integer, integer, integer, jsonb)
to anon, authenticated;

-- Las tablas de salas se crearon con los permisos por defecto de Supabase
-- (todo para anon y authenticated, incluido TRUNCATE, que no pasa por RLS).
-- Igual que el resto del esquema: anon nada; la docente solo lo que usa y
-- nunca el hash del token.
revoke all on public.salas, public.sala_miembros from anon, authenticated;
grant select, insert, update, delete on public.salas to authenticated;
grant select (estudiante_id, sala_id, unido_en), insert (estudiante_id, sala_id, unido_en),
  update (estudiante_id, sala_id, unido_en) on public.sala_miembros to authenticated;
grant delete on public.sala_miembros to authenticated;
