# Monedas, personaje, tienda y parque

Encargado: Mati. Estado: **implementado en la rama `mati`; la migración de salas conectadas falta por aplicar y falta probar en el liceo** (ver sección 5).

| Archivo | Qué contiene |
|---|---|
| `README.md` | Qué se hizo, decisiones, cómo probarlo y pendientes |
| [`catalogo.md`](catalogo.md) | Personajes, artículos y precios |
| [`imagenes.md`](imagenes.md) | Parámetros que debe cumplir cada dibujo |
| [`tecnico.md`](tecnico.md) | Datos, seguridad, tiempo real y archivos |

## 1. Qué hay ahora

- **Personaje en vez de emoji.** Se arma por capas, en la línea de un Mii con diseño propio. La docente elige uno de los 12 base.
- **Personalización gratis.** Piel, color de pelo, expresiones, levantar la mano y apoyos (lentes, audífono, silla de ruedas). Los apoyos son gratis para que nadie tenga que pagar por verse reflejado.
- **Tienda.** 102 artículos con precio: pelos, ojos, gorros, lentes, ropa, trajes, zapatos, capas, objetos, mascotas y vehículos. Se entra desde la sala de espera y desde el kiosko del parque.
- **Probar antes de comprar.** Tocar un artículo lo muestra puesto al instante, gratis; solo se cobra al confirmar.
- **Salas conectadas.** Hay dos tipos: **Actividades** (por fases) y **Recreo**. Cada sala de actividades indica a qué sala pasa el niño al terminar, y él pasa solo. El panel de la docente muestra cada ruta en una fila.
- **Recreo.** La docente elige qué se hace: Parque (por defecto), Dibujo, Globos o Juegos. Quienes están dentro cambian al instante. Los juegos ya no van al final del plan: son una actividad del recreo.
- **Parque.** Un mapa amplio para unos 20 niños, con profundidad: lo lejano se ve más chico, los objetos tapan a quien pasa detrás y hay un primer plano. Cada niño camina moviendo las piernas y rodea los objetos, ve a sus compañeros en tiempo real y los saluda con pictogramas. Los íconos flotantes llevan a columpio, resbalín, balancín, cama elástica, arenero y tienda; quien llega juega ahí, y todos lo ven.

## 2. Fuera de alcance por ahora

Decisión de Mati: **el juego de agua con lanzadores y el gachapón quedan fuera**. El parque es solo para moverse y verse. Si se retoman, su diseño y sus reglas de cuidado están en el historial de git de este archivo. Antes de construirlos conviene validarlos con las educadoras.

## 3. Decisiones

### Parecido a personajes conocidos
Decisión de Mati: **no copiar el personaje, pero que un niño vea en la tienda algo muy parecido** (por ejemplo, el pelo de Goku).

- **Cómo se aplica:** rasgos que evocan, en nuestro propio estilo de dibujo. Sin nombres de personajes ni películas, sin logos y sin combinar rasgos hasta armar al personaje completo. Por ejemplo, `pelo_guerrero` existe, pero el kimono es azul y no naranja.
- **Riesgo aceptado:** RNF-11 (*Must*) exige "ningún personaje o marca registrada" y el informe (§4.3) pide temáticas genéricas. Mientras más se parezca, más cerca se está de incumplirlo. Si el proyecto o el liceo lo objetan, basta con redibujar esos SVG; el resto no cambia.

### Otras
- **Sin separación por género:** todo el catálogo es para todos; no se guarda ese dato (RNF-09).
- **"Monedas" en la app:** el código, RF-25 y las voces ya usan esa palabra, y se ven doradas.
- **Compras anteriores:** los 9 avatares de emoji salen de la tienda y **se devuelven sus monedas**.
- **Pictogramas:** siguen guardándose para que la docente vea los últimos en su panel. Se muestran 4 a la vez (RNF-02) con un botón para ver los otros.
- **Opciones por pantalla:** la tienda muestra 4 artículos por página (RNF-02). Con las pestañas y las secciones se llega a lo que se busca en 3 toques (RF-24), más las flechas de página si hace falta avanzar.

## 4. Requisitos propuestos para el informe

El parque hoy no tiene requisito. Conviene agregarlo y ajustar RF-24.

| ID | Nombre | Descripción | Prioridad |
|---|---|---|---|
| RF-24 (ajuste) | Personaje personalizable | Personaje por capas con expresiones y artículos canjeables con monedas | Could |
| RF-33 | Parque virtual | Espacio 2D común donde los estudiantes mueven su personaje, ven a sus compañeros en tiempo real y se saludan con pictogramas | Could |
| RF-34 | Salas conectadas y recreo | Cada sala de actividades indica a qué sala pasa el estudiante al terminar. En una sala de recreo, el docente elige la actividad | Should |

## 5. Para dejarlo funcionando

1. **Aplicar las migraciones**, en orden, **al mismo tiempo** que se publica este código: la versión anterior de la app no funciona con la base nueva, y la nueva no funciona con la base anterior.
   - `20261102120000_personaje_y_parque.sql`: ya aplicada. Es de un solo sentido: devolvió las monedas y borró los avatares comprados.
   - `20261103120000_salas_conectadas_recreo.sql`: **pendiente**. Convierte playground y dibujo en recreos, y crea un recreo con los juegos de cada sala que tenía juegos al final, conectado a ella.
   - Avisar a quienes trabajan en otras ramas, que deben traer estos cambios.
2. **Regenerar los tipos** de `frontend/src/datos/baseDatos.ts` (hoy están ajustados a mano).
3. **Generar las voces nuevas** (ver `frontend/scripts/voz/README.md`). Mientras tanto, esas frases usan la voz del navegador.
4. **Probar en un PC de la sala de computación** con el curso completo. Se simularon 20 niños en un PC de desarrollo; falta confirmar la fluidez en los equipos reales.
5. **Actualizar el manual** (`docs/Manual_de_usuario_Leer_para_Todos.docx`), que aún describe los emojis, la tienda antigua y el chat.
6. **Ajustar precios** con datos reales del piloto (`resultados_actividad`). Hoy se basan en una estimación de 30 a 60 monedas por partida.

### Probarlo sin tocar la base

Crear `frontend/.env.local` con `VITE_DEMO=si` y correr `pnpm dev`. En ese modo los datos quedan en el navegador. Hay que borrar ese archivo para volver a la base real.

## 6. Qué se verificó

| Prueba | Resultado |
|---|---|
| Las 10 migraciones en un Postgres de prueba, con compras y devolución de monedas | Pasa |
| Compras, cobro doble, sin saldo, artículos no comprados, permisos | Pasa |
| Tienda, compra y parque en navegador, modo demo, a 1366 × 768, sin scroll | Pasa |
| 3 niños en el parque: se ven, se mueven, se saludan, y quien sale desaparece | Pasa (modo demo) |
| Canal real de Supabase Realtime entre 2 navegadores (canal desechable) | Pasa; 137 ms en una prueba |
| Tipos, build de producción y pruebas unitarias | Pasa |

| Migración de salas conectadas en un Postgres de prueba: conversión de salas, pasar de sala, permisos | Pasa |
| Terminar el plan y pasar solo al recreo; la docente cambia la actividad y el niño cambia solo (modo demo) | Pasa |
| Parque con 20 niños simulados (modo demo): caminar rodeando objetos, usar juegos, abrir la tienda | Pasa |

**No verificado:** la migración de salas conectadas sobre la base real, el flujo completo de la app contra Supabase real, 20 dispositivos reales a la vez, el rendimiento en los PC del liceo, y una revisión con axe (RNF-01).
