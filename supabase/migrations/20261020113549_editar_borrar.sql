-- La docente puede editar observaciones y eliminar perfiles de sus cursos.
-- Borrar observaciones ya lo cubre el esquema inicial. Las claves foráneas ya
-- están en cascada, así que borrar un perfil elimina todo su historial
-- (derecho de supresión, Ley 21.719). Una política sin el grant no basta.

create policy "docente edita observaciones" on public.observaciones
  for update to authenticated
  using (privado.es_mi_estudiante(estudiante_id))
  with check (privado.es_mi_estudiante(estudiante_id));
grant update (texto) on public.observaciones to authenticated;

create policy "docente borra sus estudiantes" on public.estudiantes
  for delete to authenticated using (privado.es_mi_curso(curso_id));
grant delete on public.estudiantes to authenticated;
