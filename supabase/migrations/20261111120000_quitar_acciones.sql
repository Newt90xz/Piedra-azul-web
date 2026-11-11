-- Las acciones (verbos) eran para las actividades de oraciones, que se sacaron.
-- Se desactivan en vez de borrarse: la app agrega al banco las palabras activas
-- que no conoce, y estas saldrían como sustantivos en sílabas, rimas y sonidos.

update public.palabras
set activa = false
where id in (
  'come', 'bebe', 'duerme', 'salta', 'corre', 'nada', 'canta', 'lee', 'baila',
  'juega', 'pinta', 'lava', 'mira', 'abraza', 'dibuja', 'vuela', 'llora', 'cocina'
);
