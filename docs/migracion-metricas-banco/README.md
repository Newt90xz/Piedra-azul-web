# Métricas, banco de contenidos y actividades configurables

Estado: **código y migración listos; la migración aún no se aplica en la base real.** La app funciona con o sin ella (sección 4).

Migración: `supabase/migrations/20261103180000_metricas_banco_plan.sql`.

## 1. Qué cambia

### Actividad configurable: "Escucha y toca la letra"

Suena una letra y el niño toca cuál es. La docente elige qué letras aparecen, entre las 27 del alfabeto, y puede guardar esa selección como plantilla.

- **Dónde:** Salas → Plan → Actividades que configuras tú.
- **Plantillas:** cuatro vienen con la app (todas, vocales, consonantes, y M, P, L, S, T). Cada docente puede guardar las suyas.
- **Copia, no referencia:** al agregar una plantilla a un plan se copian sus letras. Editarla después no le cambia la actividad a quien ya la está jugando.
- **Letras que suenan igual:** B/V, C/K/Q y S/Z nunca aparecen juntas como opciones, porque de oído no se distinguen. No se puede guardar una selección que solo tenga letras que suenan igual.
- **Para agregar otra actividad configurable:** sumarla a `JUEGOS_CONFIGURABLES` en `frontend/src/contenido/plantillas.ts`.

**A validar con la educadora (RNF-04):** cómo suena cada letra está en `ALFABETO`, en `frontend/src/contenido/banco.ts`. La H y la W dicen su nombre, porque no tienen un sonido propio que enseñar. Conviene escuchar todas con la voz Pocket-TTS: un texto como `k` o `b` puede leerse como el nombre de la letra.

### A. Métricas

- **Por partida:** foto al jugarla (mecánica, contenido, paso, nivel, OA, sala, plan, si es práctica, parámetros). Si una actividad cambia de id o se borra, sus partidas no desaparecen del avance.
- **Por ronda:** categoría, tiempo y si se reveló la respuesta. La categoría es por ronda, y `lib/avance.ts` la lee primero de ahí.
- **Historial de sesiones (RF-17):** tabla `sesiones_registro`.
- **Lo ya jugado se rellena:** el mapeo está en la migración y sale del catálogo actual. Las partidas de actividades que ya no existen quedan sin foto, y se comportan igual que hoy.
- **Contrato de cada ronda:** `{ item, categoria, intentos, acertada, revelada, error?, tiempo_ms, detalle? }`.

### B. Banco de contenidos (RNF-14)

Tablas `palabras` y `letras`, sembradas con exactamente lo que hay en `banco.ts`. Agregar una palabra ya no requiere tocar código.

- **Carga:** las actividades arman sus listas al cargarse. Por eso `datos/bancoGuardado.ts` se importa primero en `main.tsx` y aplica la última copia guardada, sin esperar la red. Lo que llega de la base se usa en la **próxima carga**.
- **Sin red:** quedan las palabras incluidas en el código (RNF-12).
- **Agrega y actualiza, nunca quita:** las actividades piden palabras por id y fallarían si una desaparece.
- **Imágenes:** `foto_url` y `picto_url` ya se aplican a cada palabra (RF-08). Falta subir las imágenes.

### C. Plan de sala por pasos (RF-15)

`salas.plan` es una lista de pasos `{ juego, parametros?, titulo? }`, y el total de pasos es su largo.

## 2. Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| Contenidos actuales | Siguen siendo contenidos del sistema, y cada uno se despliega en 3 pasos | Es la recomendación del prompt, y no toca las actividades de los compañeros |
| `salas.contenidos` | Se mantiene y se sincroniza | La base es compartida: `main` sigue escribiendo ahí, y un trigger arma el plan desde esa columna |
| Mecánicas y generadores | Siguen en código | Un juego es un componente React, no un dato |
| `juego_id` del prompt | Se reemplazó por `mecanica` (tipo de ronda) | `actividad_id` ya identifica la actividad; repetirla no aporta |
| Clave foránea en `resultados.sala_id` | No lleva | Es una foto: debe sobrevivir a que se borre la sala, y un resultado en cola no debe fallar por eso |
| Datos raros del dispositivo | Se limpian, no se rechazan | Perder la partida de un niño es peor que perder una métrica |
| Escribir el banco | Solo desde el panel de Supabase | No hay rol de administrador, y una docente no debería cambiarle el banco a las demás |
| Plantillas | Por docente, en `plantillas_actividad` | Las usa en todos sus cursos; el niño nunca las lee, porque los parámetros van en el plan |

## 3. Qué falta

- **Configuraciones de plan completo:** hoy se guardan plantillas de una actividad, no un plan entero.
- **Metadatos de contenidos, cuentos y canciones en la base:** siguen en código. Moverlos implica tocar las actividades de los compañeros mientras las siguen cambiando.
- **`estudiantes.nivel_habilitado`:** se guarda, pero ningún flujo del alumno lo usa.
- **Pantalla de administración del banco e imágenes reales en Storage.**
- **Pantallas de la docente** (sección 5).
- **`precio_avatar`:** ya no aplica, porque los precios están en `privado.articulos`. Los pictos del chat no pasan a tabla: son 8 fijos y no vale la pena.

## 4. Cómo aplicarla

1. Ejecutar la migración en el SQL Editor de Supabase. Solo agrega: ninguna columna ni función deja de existir.
2. Regenerar `frontend/src/datos/baseDatos.ts`.

**Antes de aplicarla**, la app sigue funcionando:

| Función | Sin la migración |
|---|---|
| Actividades y salas existentes | Normal |
| Partidas | Se guardan sin la foto ni las métricas nuevas |
| Plantillas propias | La lista queda vacía; guardar muestra un aviso. Las del sistema se ven igual |
| Agregar "Escucha y toca la letra" a un plan | Al guardar muestra un aviso: requiere la columna `plan` |
| Banco | Usa las palabras del código |

**Después de aplicarla**, las versiones anteriores de la app (`main`) siguen funcionando: el trigger arma el plan desde `contenidos`, y `p_contexto` es opcional. Eso sí, si una sala tiene una actividad configurable, una versión anterior no sabe jugarla: quienes usen salas con esas actividades necesitan esta versión.

## 5. Datos para lo que promete el tráiler

Las pantallas quedan para después; los datos ya estarán.

| Lo prometido | Consulta |
|---|---|
| KPI: partidas y % al primer intento | `rondas_resultado` con `resultados_actividad`, por curso: `count(*) filter (where intentos = 1) / count(*)`, sin `practica` |
| Participación de lunes a viernes | `resultados_actividad`, agrupado por `extract(isodow from fecha)` |
| Emociones de la semana y de hoy | `registros_emocion` por día |
| "Avanza rápido · Sílabas" | Tasa por `categoria` y estudiante, comparando semanas, con `tiempo_ms` |
| "Le cuesta: sílabas con M" | `contenido_id` más `rondas_resultado.item`, con tasa bajo el 60 % |
| "Constante · Vocales" | Días distintos con partidas por `categoria` |
| Ficha por nivel | `resultados_actividad.nivel`. Los cuentos todavía no tienen nivel propio |
| Sesiones (RF-17) | `sesiones_registro`, con `inicio`, `visto_en` y `fin` |
