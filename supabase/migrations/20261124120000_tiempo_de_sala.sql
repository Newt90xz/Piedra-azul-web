-- Tiempo de sala: la docente elige cuánto dura abierta una sala. Al vencer, todos
-- sus niños vuelven a la espera (sin sala) y la sala queda sin límite de nuevo.
--
-- No hace falta un cron: las salas vencidas se cierran cuando alguien mira.
-- El dispositivo del niño lo hace al pedir su estado (alumno_actual, cada pocos
-- segundos) y el panel de la docente al refrescarse (cerrar_salas_vencidas).

alter table public.salas add column cierra_en timestamptz;

create function privado.cerrar_salas_vencidas()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.sala_miembros m
  using public.salas s
  where s.id = m.sala_id and s.cierra_en <= now();
  update public.salas set cierra_en = null where cierra_en <= now();
end;
$$;

revoke all on function privado.cerrar_salas_vencidas() from public, anon, authenticated;

-- Para el panel de la docente. Solo cierra lo que ya venció: llamarla de más no hace daño.
create function public.cerrar_salas_vencidas()
returns void
language sql security definer set search_path = ''
as $$
  select privado.cerrar_salas_vencidas();
$$;

revoke execute on function public.cerrar_salas_vencidas() from public;
grant execute on function public.cerrar_salas_vencidas() to authenticated;

-- La hora de cierre la pone el servidor (now()), no el reloj de la tablet.
-- p_minutos null quita el límite. Corre con los permisos de la docente: el RLS
-- de salas deja tocar solo las de sus cursos.
create function public.programar_cierre_sala(p_sala uuid, p_minutos integer)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if p_minutos is not null and (p_minutos < 1 or p_minutos > 480) then
    raise exception 'minutos_invalidos';
  end if;
  update public.salas
  set cierra_en = case when p_minutos is null then null else now() + make_interval(mins => p_minutos) end
  where id = p_sala;
end;
$$;

revoke execute on function public.programar_cierre_sala(uuid, integer) from public;
grant execute on function public.programar_cierre_sala(uuid, integer) to authenticated;

-- Igual que en 20261103180000, pero antes de leer cierra las salas vencidas, así
-- el niño sale de la suya apenas se cumple el tiempo.
create or replace function public.alumno_actual(p_estudiante uuid, p_token uuid)
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
  perform privado.cerrar_salas_vencidas();
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
