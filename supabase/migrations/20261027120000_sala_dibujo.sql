-- Sala de dibujo: tercer tipo de sala, junto a la de trabajo y el playground.
-- El niño dibuja libre o repasa letras en su dispositivo; no se guarda nada en la base.
alter table public.salas drop constraint if exists salas_tipo_check;
alter table public.salas add constraint salas_tipo_check check (tipo in ('trabajo', 'playground', 'dibujo'));
