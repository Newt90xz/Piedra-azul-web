# Diseño técnico

## 1. Personaje

- **Dibujo:** `frontend/src/ui/Personaje.tsx` arma el personaje con los SVG de `src/assets/personaje/`. Los incrusta en la página porque un `<img>` no recibe variables CSS (`--piel`, `--pelo`, `--ropa`).
- **Punto único de cambio:** `Avatar` (`frontend/src/ui/Avatar.tsx`) mantuvo su interfaz, así que sus 13 usos (entrada, encabezado del niño y vistas de la docente) cambiaron sin tocarlos. Prioridad: `fotoUrl` → personaje guardado → personaje por defecto según el nombre.
- **Datos del catálogo:** `frontend/src/contenido/tienda.ts` (artículos y precios) y `contenido/personaje.ts` (partes gratis y personajes base).

## 2. Base de datos

Migración: `supabase/migrations/20261102120000_personaje_y_parque.sql`.

| Cambio | Detalle |
|---|---|
| `estudiantes.personaje` (jsonb) | Solo ids de artículos. Se asigna uno de los 12 base a quienes ya existen, repartidos dentro de cada curso |
| `privado.articulos` | Catálogo con los precios que valen. `anon` no tiene acceso |
| `articulos_comprados` | Lo que tiene cada niño. La docente puede leerlo |
| `salas.canal_parque` | Nombre secreto del canal de cada sala |
| Se elimina | `avatares_comprados`, `avatar_tienda`, `precio_avatar`, `comprar_avatar`, `usar_avatar`, `mensajes_playground`. Antes se devuelven las monedas gastadas |

`estudiantes.avatar` se mantiene porque la columna es obligatoria, pero ya no se muestra.

### Funciones del alumno (con `p_estudiante` y `p_token`)

| Función | Qué hace |
|---|---|
| `comprar_articulo` | Valida el precio en el servidor. Registra primero la compra, para que dos toques simultáneos no cobren doble |
| `guardar_personaje` | Valida cada campo, que todo sea gratis o comprado y del espacio correcto. Guarda un objeto armado de nuevo, así que descarta lo que no reconoce |
| `parque_alumno` | Devuelve el canal y los compañeros de su playground, cada uno con una `ficha` en vez de su id |

**La docente** puede escribir `personaje` directamente al elegir el personaje base; `monedas` sigue sin poder editarse.

### Agregar un artículo

1. Dibujarlo (ver [`imagenes.md`](imagenes.md)).
2. Sumarlo a `ARTICULOS` en `contenido/tienda.ts`.
3. Crear una migración con `insert into privado.articulos (id, espacio, precio) values ('id', 'espacio', precio);`, con ese formato exacto.
4. `contenido/tienda.test.ts` falla si falta el dibujo o si el precio no coincide con las migraciones.
5. Regenerar las voces.

## 3. Salas conectadas y recreo

Migración: `supabase/migrations/20261103120000_salas_conectadas_recreo.sql`.

| Campo | Detalle |
|---|---|
| `salas.tipo` | `trabajo` o `recreo` |
| `salas.siguiente_sala` | Solo en `trabajo`. Si se borra el destino, queda sin conexión |
| `salas.actividad` | Solo importa en `recreo`: `parque`, `dibujo`, `globos` o `juegos` |

- **Pasar de sala:** al terminar el plan, la app llama a `pasar_sala_conectada`. El servidor comprueba que el plan esté terminado, que el destino sea del mismo curso, y mueve al niño. La app reintenta, porque su último avance puede venir aún en camino.
- **Sin sala conectada:** el niño se queda con los globos hasta que la docente lo mueva.
- **Círculos:** el panel de la docente no ofrece destinos que cerrarían un círculo.
- **Rutas compartidas:** varias salas pueden llevar al mismo recreo. Se muestra entero en la primera ruta y como referencia en las demás.

## 4. Parque

**Sin motor de juegos.** Son unos 20 personajes y unos pocos objetos: React y `transform` de CSS bastan, y no se suma peso a la carga (RNF-07).

- **Mapa:** `frontend/src/contenido/parque.ts`, en porcentaje del mapa, con unidades de contenedor (`cqw`, `cqh`). Se ve igual en toda pantalla, sin scroll.
- **Profundidad:** `escalaEn(y)` achica a quien está lejos; el orden de dibujo sigue a `y`, así que los objetos tapan a quien pasa detrás.
- **Movimiento:** clic en el pasto o flechas del teclado. `rutaEntre` busca el camino rodeando las huellas de los objetos (A* sobre una grilla). Un `requestAnimationFrame` mueve al personaje sin pasar por React, y lo lejano camina más lento.
- **Piernas:** mientras camina, el dibujo se muestra tres veces, recortado a la altura de la cadera, y cada pierna gira por su lado. Con vestido, cola, vehículo o silla de ruedas se balancea entero.
- **Juegos:** tocar un ícono lleva al niño a un puesto libre. El juego que está usando se deduce de dónde está parado (`juegoEn`), así que no agrega datos al canal y todos ven lo mismo.
- **Reducir animaciones:** el personaje aparece en su destino, sin recorrido ni juegos animados.
- **Tienda:** el kiosko la abre al llegar, sin desconectar al niño del canal.

### Tiempo real

Usa **Supabase Realtime**, sin pasar por la base:

- **Presence** comparte la posición de destino de cada niño, también con quien llega tarde, y avisa cuando alguien se va.
- **Broadcast** lleva los pictogramas. Además, `enviar_mensaje` los guarda para el panel de la docente.
- **Las posiciones no se guardan** (RNF-09).
- **Si se corta la conexión:** el niño sigue caminando solo, sin mensajes de error. Al reconectar, vuelve a anunciar su posición.
- **Compañeros:** la lista se refresca cada 5 segundos, así se ve lo que otro acaba de comprar.

`Repositorio.conectarParque` tiene dos implementaciones: Supabase y demo (`BroadcastChannel` entre pestañas).

### Seguridad

Los niños no inician sesión: usan la clave anónima y un token de dispositivo. Los canales privados de Realtime se autorizan con los datos de la sesión, y no pueden revisar `p_token`.

Por eso se usa un **canal público con nombre secreto** (`salas.canal_parque`), que solo entrega `parque_alumno` tras validar el token. Los mensajes llevan **solo la ficha y coordenadas o un id de pictograma**, sin nombres ni ids. Los nombres llegan únicamente por la función validada.

**Límite conocido:** quien obtenga el nombre del canal podría entrar a él y enviar posiciones o pictogramas falsos, pero no vería nombres. Requiere que siga activado "Allow public access" en la configuración de Realtime de Supabase; hoy lo está.

## 5. Voz

`frontend/src/lib/catalogoVoz.ts` ya recorre el catálogo nuevo. Para dejar las frases generadas de antemano: `pnpm voz:precargar` en `backend/` (ver `frontend/scripts/voz/README.md`); mientras falte una, se genera en vivo la primera vez que suena.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `frontend/src/assets/personaje/**`, `frontend/public/parque/*` | **Nuevos:** dibujos |
| `frontend/src/ui/Personaje.tsx` | **Nuevo:** armado por capas |
| `frontend/src/contenido/personaje.ts` | **Nuevo:** partes gratis y personajes base |
| `frontend/src/contenido/tienda.ts`, `tienda.test.ts` | Catálogo nuevo y pruebas |
| `frontend/src/paginas/aula/Tienda.tsx` | **Nuevo:** tienda y vestidor |
| `frontend/src/paginas/aula/Playground.tsx`, `contenido/parque.ts` | Parque 2D y su mapa |
| `frontend/src/paginas/aula/MiInicio.tsx`, `Secuencia.tsx` | Recreo y paso a la sala conectada |
| `frontend/src/paginas/docente/Salas.tsx` | Rutas, conexión de salas y actividad del recreo |
| `frontend/src/paginas/aula/Espera.tsx` | Usa la tienda nueva |
| `frontend/src/paginas/docente/FormEstudiante.tsx` | Elegir personaje en vez de emoji |
| `frontend/src/ui/Avatar.tsx` | Dibuja el personaje |
| `frontend/src/dominio/tipos.ts`, `datos/repositorio*.ts`, `datos/baseDatos.ts` | Tipos y métodos nuevos |
| `frontend/src/datos/index.ts` | Modo demo con `VITE_DEMO=si` |
| `frontend/src/lib/catalogoVoz.ts` | Frases que se pregeneran |
