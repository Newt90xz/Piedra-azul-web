# 03. Anatomía de las Actividades: Atención, Competencia y Reglas Obligatorias

**Proyecto:** Prototipo de plataforma web «Leer para Todos»  
**Propósito:** Definir los elementos obligatorios que debe tener **toda actividad** del software para mantener la atención de niños de 4 a 6 años con NEE, aprovechar su gusto por la competencia y las recompensas, y asegurar la trazabilidad pedagógica.

---

## 1. ¿Qué debe tener cada actividad SÍ O SÍ? (Checklist de Diseño)

Según el levantamiento en terreno en el Liceo Piedra Azul (Sección 4.1 del Informe), los estudiantes tienen entre 4 y 6 años, tienden a olvidar lo aprendido si no se refuerza de forma dinámica, y **responden muy bien a actividades acotadas, llamativas, con recompensas y donde puedan competir** (las educadoras confirmaron que tienen buena tolerancia a la frustración en dinámicas de juego y no lloran si pierden).

Por lo tanto, cada pantalla de actividad debe cumplir obligatoriamente con estas **7 reglas de oro**:

| # | Componente Obligatorio | Especificación en «Leer para Todos» | Requerimiento Asociado |
| :--- | :--- | :--- | :--- |
| **1** | **Cero dependencia de lectura para navegar** | El niño nunca debe leer un botón para saber qué hacer. Todo botón usa ícono claro + audio hablado. | `RF-02`, `RNF-02` |
| **2** | **Instrucción auditiva corta y repetible** | Al abrir la actividad, suena automáticamente una instrucción en voz humana chilena de **máximo 10 segundos**. Siempre hay un botón grande de altavoz para volver a escucharla. | `RF-10`, `RNF-04`, `RNF-05` |
| **3** | **Límite de carga cognitiva (Máximo 4 opciones)** | En pantalla nunca pueden aparecer más de **4 opciones de respuesta** simultáneas. Los botones interactivos deben medir mínimo `64x64 px` (idealmente tarjetas grandes de `120x120 px` o más). | `RNF-02` |
| **4** | **Duración en formato "Micro-Partida"** | Ninguna actividad debe ser extensa. Cada partida se compone de **4 a 5 rondas rápidas** (duración estimada de 1,5 a 3 minutos) para mantener el ritmo alto, evitar el aburrimiento y llegar rápido al conteo de puntos y monedas. | Perfil de Usuario (Sección 4.1) |
| **5** | **Sistema de Estrellas y Rachas (Competencia)** | Cada ronda entrega mayor puntaje o monedas si se logra al **primer intento** (3 estrellas / bono de racha). Si se equivoca, puede seguir intentando para aprender, pero gana menos monedas, incentivando las ganas de revancha y superación. | Sección 4.1, `RF-11`, `RF-25` |
| **6** | **Control sensorial visible en todo momento** | En una esquina fija de cada actividad existe un botón para **silenciar efectos de sonido secundarios** (dejando solo la voz fonética), sin destellos ni parpadeos (> 3 por segundo). | `RF-21`, `RNF-08` |
| **7** | **Combinación de Imagen Real y Pictograma** | Las opciones visuales priorizan fotografías reales para objetos concretos y pictogramas para acciones o conceptos, según lo configurado en el perfil del niño. | `RF-08` |

---

## 2. Flujo de Interacción Paso a Paso (El Ciclo de 1 Partida)

Para combinar la estructura predecible con la emoción del juego, todas las actividades de los Niveles 1, 2 y 3 siguen este flujo de 5 pasos:

### Paso 1: Chequeo Emocional (Al inicio de la sesión diaria)
* Antes de entrar al mapa de niveles, el niño ve la pantalla *"¿Cómo te sientes hoy?"* con caras expresivas asociadas a colores (Alegría, Tristeza, Enojo, Calma).
* Con **1 solo clic** registra su estado emocional y pasa a sus actividades (`RF-14`).

### Paso 2: Presentación del Desafío
* Se carga la actividad ambientada con la temática elegida por el niño (dinosaurios, fútbol, animales, océano, vehículos, etc., sin marcas registradas según `RF-22` y `RNF-11`).
* Se reproduce la instrucción hablada en menos de `300 ms` (`RNF-07`).

### Paso 3: Respuesta, Pistas y Puntaje (`< 1 segundo`, `RF-11`)
Para cumplir con el `RF-11` (no usar mensajes punitivos) pero mantener el espíritu competitivo que motiva a los niños del liceo, se utiliza un **sistema de recompensa diferenciada por intento**:

* **¿Qué pasa si ACIERTA AL PRIMER INTENTO? (Puntaje Máximo)**
  1. Respuesta inmediata en menos de 1 segundo (`RF-11`).
  2. La tarjeta correcta se ilumina, suma **+10 monedas** (y activa racha de aciertos seguidos).
  3. Se reproduce el refuerzo auditivo entusiasta (*"¡Excelente, MA de Mamá!"*).

* **¿Qué pasa si SE EQUIVOCA? (Pierde el bono, pero recibe pista para lograrlo)**
  1. **Primer fallo:** No hay sonidos estridentes que saturen sensorialmente (`RNF-08`), pero el niño ve que **pierde una estrella de bono** de esa pregunta, la tarjeta incorrecta se desactiva y el sistema le da una pista (*"¡Casi! Escucha bien: mmmmaaaa... ¡inténtalo otra vez!"*).
  2. **Segundo fallo:** Si vuelve a fallar, gana solo la recompensa base (**+2 monedas** por completar) con ayuda visual de la tarjeta correcta, motivándolo a jugar de nuevo la partida para conseguir las 3 estrellas completas.
  3. **Registro interno (`RF-12`):** El sistema guarda exactamente cuántos intentos e incorrecciones tuvo en esa letra o sílaba para el reporte de la educadora (`RF-13`).

### Paso 4: Pantalla de Podio / Resultado de la Partida (`RF-24`, `RF-25`)
* Al terminar las 4 o 5 rondas, aparece el resumen visual: **Estrellas obtenidas (1, 2 o 3 estrellas)** y el cofre de **monedas ganadas (`RF-25`)**.
* Si no sacó las 3 estrellas, aparece un botón grande muy llamativo de **"¡Jugar otra vez para ganar más!"**, aprovechando su competitividad para que repasen las sílabas sin darse cuenta.

---

## 3. Estrategia de Competencia, Recompensas y Anti-Aburrimiento

Dado que a los estudiantes del Liceo Piedra Azul les motiva competir y ganar premios (Sección 4.1), el software canaliza esa energía en tres mecánicas concretas:

### 3.1 Competencia en Sala: Modo Grupal / Equipos (`RF-26`)
* Es la instancia principal de competencia directa en el aula. La educadora proyecta el juego en la pizarra o pantalla principal en **Modo Anfitrión**.
* Permite dividir al curso en **2 equipos o jugar por turnos** (ej. *Equipo Dinosaurios vs. Equipo Piratas*).
* Cada acierto suma puntos al marcador del equipo en pantalla. Como los niños toleran bien ganar o perder en el juego, esta dinámica transforma el repaso fonético en un concurso de sala sumamente entretenido.

### 3.2 Ranking Positivo de Monedas y Coleccionables (`RF-24`, `RF-25`)
* **Superación personal y entre pares:** Cada niño ve su contador de monedas y cuántas estrellas lleva en su mapa de niveles.
* **Tienda de Avatar (`RF-24`):** Ganar más monedas en las actividades les permite desbloquear antes accesorios visibles para su avatar (camisetas de fútbol, coronas, cascos, mascotas), lo que genera una competencia sana en la sala de computación por ver quién desbloquea nuevos elementos al responder bien las sílabas.

### 3.3 Variación Rápida de Mecánicas y Temáticas (`RF-22`)
* Para evitar que la repetición los aburra, una sesión de 15 minutos combina actividades cortas distintas (*"Caza de sonidos"* $\rightarrow$ *"Choque de sílabas"* $\rightarrow$ *"Aplausos"* $\rightarrow$ *"Constructor de palabras"*) y permite cambiar la temática visual cuando el niño quiera.