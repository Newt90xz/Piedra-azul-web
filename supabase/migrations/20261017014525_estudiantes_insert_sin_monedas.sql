-- RF-25: monedas parte en 0 y solo cambia vía el trigger sumar_monedas.
revoke insert on public.estudiantes from authenticated;
grant insert (curso_id, nombre, avatar, color, foto_url, activo, nivel_habilitado, ajustes)
  on public.estudiantes to authenticated;
