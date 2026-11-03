-- Salas conectadas y recreo.
--   1. Quedan dos tipos: trabajo (actividades por fases) y recreo. Playground y
--      dibujo pasan a ser actividades del recreo, que elige la docente.
--   2. Cada sala de trabajo indica a qué sala se pasa al terminar (siguiente_sala).
--      Los juegos dejan de estar al final del plan: son otra actividad del recreo.

alter table public.salas drop constraint salas_tipo_check;

alter table public.salas
  add column actividad text not null default 'parque' check (actividad in ('parque', 'dibujo', 'globos', 'juegos')),
  add column siguiente_sala uuid references public.salas (id) on delete set null;

update public.salas set actividad = 'dibujo', tipo = 'recreo' where tipo = 'dibujo';
update public.salas set tipo = 'recreo' where tipo = 'playground';

alter table public.salas
  add constraint salas_tipo_check check (tipo in ('trabajo', 'recreo')),
  add constraint salas_siguiente_distinta check (siguiente_sala is distinct from id),
  -- El recreo es el final de la ruta: de ahí los mueve la docente.
  add constraint salas_siguiente_solo_trabajo check (tipo = 'trabajo' or siguiente_sala is null);

create index salas_siguiente_idx on public.salas (siguiente_sala);

-- Las salas que tenían juegos al terminar conservan lo que tenían: un recreo con esos juegos.
insert into public.salas (curso_id, nombre, tipo, actividad, juegos)
select curso_id, 'Recreo de ' || left(nombre, 30), 'recreo', 'juegos', juegos
from public.salas
where tipo = 'trabajo' and cardinality(juegos) > 0
on conflict (curso_id, nombre) do nothing;

update public.salas t
set siguiente_sala = r.id, juegos = '{}'
from public.salas r
where t.tipo = 'trabajo' and cardinality(t.juegos) > 0
  and r.curso_id = t.curso_id and r.nombre = 'Recreo de ' || left(t.nombre, 30);

-- ---------------------------------------------------------------------------
-- Funciones del dispositivo del alumno (rol anon)
-- ---------------------------------------------------------------------------

drop function public.alumno_actual(uuid, uuid);

create function public.alumno_actual(p_estudiante uuid, p_token uuid)
returns table (
  id uuid, curso_id uuid, nombre text, avatar text, personaje jsonb, color text, activo boolean,
  nivel_habilitado integer, monedas integer, ajustes jsonb, comprados text[],
  sala_id uuid, sala_nombre text, sala_tipo text, sala_actividad text, siguiente_sala uuid, siguiente_tipo text,
  contenidos text[], juegos text[], asignacion uuid,
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
         s.id, s.nombre, s.tipo, s.actividad, sig.id, sig.tipo,
         s.contenidos, s.juegos, s.asignacion,
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

-- El niño terminó su plan y pasa a la sala conectada. El servidor comprueba que
-- de verdad terminó: la app solo lo pide.
create function public.pasar_sala_conectada(p_estudiante uuid, p_token uuid)
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
  if cardinality(s.contenidos) = 0 or not exists (
    select 1 from public.progreso_sala p
    where p.estudiante_id = p_estudiante and p.sala_id = s.id and p.asignacion = s.asignacion
      and p.paso >= cardinality(s.contenidos) * 3
  ) then
    raise exception 'sin_terminar';
  end if;
  update public.sala_miembros set sala_id = v_destino, unido_en = now() where estudiante_id = p_estudiante;
end;
$$;

-- El parque es solo del recreo con esa actividad.
create or replace function public.parque_alumno(p_estudiante uuid, p_token uuid)
returns table (canal uuid, ficha text, mia boolean, nombre text, color text, personaje jsonb)
language sql stable security definer set search_path = ''
as $$
  select s.canal_parque,
         left(md5(s.canal_parque::text || x.estudiante_id::text), 12),
         x.estudiante_id = p_estudiante,
         e.nombre, e.color, e.personaje
  from public.sala_miembros m
  join public.salas s on s.id = m.sala_id and s.tipo = 'recreo' and s.actividad = 'parque'
  join public.sala_miembros x on x.sala_id = s.id
  join public.estudiantes e on e.id = x.estudiante_id and e.activo
  where m.estudiante_id = p_estudiante
    and privado.dispositivo_valido(p_estudiante, p_token);
$$;

create or replace function public.enviar_mensaje(p_estudiante uuid, p_token uuid, p_picto text)
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
  from public.sala_miembros m join public.salas s on s.id = m.sala_id and s.tipo = 'recreo' and s.actividad = 'parque'
  where m.estudiante_id = p_estudiante;
  if not found then
    raise exception 'sin_parque';
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

revoke execute on function public.alumno_actual(uuid, uuid), public.pasar_sala_conectada(uuid, uuid) from public;
grant execute on function public.alumno_actual(uuid, uuid), public.pasar_sala_conectada(uuid, uuid) to anon, authenticated;
