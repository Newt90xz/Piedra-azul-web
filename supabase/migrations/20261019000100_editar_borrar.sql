-- La docente puede editar/borrar observaciones y eliminar perfiles de sus
-- cursos. Las políticas son adicionales (permisivas): si las del esquema
-- inicial ya cubrían estas operaciones, no cambian nada.

create policy observaciones_editar_docente on public.observaciones
  for update to authenticated
  using (exists (
    select 1 from public.estudiantes e join public.cursos c on c.id = e.curso_id
    where e.id = observaciones.estudiante_id and c.docente_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.estudiantes e join public.cursos c on c.id = e.curso_id
    where e.id = observaciones.estudiante_id and c.docente_id = (select auth.uid())
  ));

create policy observaciones_borrar_docente on public.observaciones
  for delete to authenticated
  using (exists (
    select 1 from public.estudiantes e join public.cursos c on c.id = e.curso_id
    where e.id = observaciones.estudiante_id and c.docente_id = (select auth.uid())
  ));

create policy estudiantes_borrar_docente on public.estudiantes
  for delete to authenticated
  using (exists (select 1 from public.cursos c where c.id = estudiantes.curso_id and c.docente_id = (select auth.uid())));

-- Borrar un perfil elimina todo su historial (derecho de supresión, Ley 21.719).
alter table public.resultados_actividad
  drop constraint resultados_actividad_estudiante_id_fkey,
  add constraint resultados_actividad_estudiante_id_fkey
    foreign key (estudiante_id) references public.estudiantes (id) on delete cascade;

alter table public.rondas_resultado
  drop constraint rondas_resultado_resultado_id_fkey,
  add constraint rondas_resultado_resultado_id_fkey
    foreign key (resultado_id) references public.resultados_actividad (id) on delete cascade;

alter table public.registros_emocion
  drop constraint registros_emocion_estudiante_id_fkey,
  add constraint registros_emocion_estudiante_id_fkey
    foreign key (estudiante_id) references public.estudiantes (id) on delete cascade;

alter table public.observaciones
  drop constraint observaciones_estudiante_id_fkey,
  add constraint observaciones_estudiante_id_fkey
    foreign key (estudiante_id) references public.estudiantes (id) on delete cascade;
