# Video: recorrido por Leer para Todos

Plan para producir el video que muestra cómo funciona la plataforma por dentro.
Está escrito para que lo use quien lo produzca (Fable). Todo lo que se cuenta aquí
salió del código actual (rama `mati`, commit `c2c3fe6`); si algo cambia en la app, se
revisa la sección **7. Datos del producto** antes de grabar.

---

## 1. Objetivo y público

**Objetivo:** que alguien que nunca vio la app entienda en unos 4 minutos:
1. qué vive un niño desde que entra hasta que hace una actividad, va al recreo y vuelve a trabajar,
2. qué hace la educadora antes y durante la clase, y cómo lo que ella hace cambia lo que ve el niño,
3. **por qué** está armada así: salas conectadas, recreo, avisos y métricas.

**Público: las educadoras.** También lo verán quienes evalúan el proyecto, pero el video
le habla a la educadora. Para la evaluación, la tabla del **Anexo A** une cada escena con su
requisito; esa tabla no aparece en el video. Las educadoras conocen el aula, no la tecnología. Por eso:
- se habla de *niños, educadora, sala, recreo*, no de *usuarios, backend, sesión*;
- cada función se muestra **usándola de verdad**, no se describe;
- nada de jerga técnica: no se habla de Supabase, de RLS ni de tiempo real como tecnología.

**Tono:** como un buen manual que da gusto mirar. Cálido, claro y con ritmo. Se
promociona mostrando lo que la app hace, sin frases de venta vacías.

---

## 2. La idea: «Una mañana en Kínder A»

En vez de recorrer pantalla por pantalla como un manual, el video sigue **una sola clase**
de principio a fin, en orden. Así el recorrido del niño y el de la educadora van juntos,
y se ve sola la relación entre lo que hace ella y lo que pasa en la tablet del niño.

Personajes (los datos de ejemplo de la app):
- **Sofía** 🦊: aprende rápido. Es la protagonista del lado del niño.
- **Tomás** 🦖: le cuesta una letra. Con él aparece el aviso «Necesitan tu apoyo».
- **Martina** 🐬 (exigencia *Inicial*) y **Benjamín** 🚒 (exigencia *Avanzado*): muestran que la misma actividad se adapta a cada niño.
- Isidora 🦄 y Lucas ⚽: completan el grupo en el parque.
- **La educadora**: se le dice «la educadora», sin nombre propio y sin actores. Así cualquier
  educadora que vea el video se pone en su lugar. Cuando hace falta mostrarla, aparece como
  una ilustración simple, al estilo de la app.

Los nombres de los niños son los perfiles de prueba de la app. Si en el curso de prueba de
Supabase los perfiles tienen otros nombres, se usan esos y se ajusta la voz en off.

### Tres mensajes que deben quedar
1. **El niño no necesita saber leer.** Todo se escucha, se toca y se ve con imágenes grandes.
2. **La educadora dirige y la app hace el resto.** Ella arma el plan y mueve a los niños, y cada uno avanza a su ritmo.
3. **Nadie se queda atrás.** Quien termina se va solo al recreo, y así la educadora queda libre para quien la necesita.

---

## 3. Formato y lenguaje visual

| | |
|---|---|
| Duración | **4:00 a 4:30** (más una versión corta de 60 a 90 s, ver sección 9) |
| Formato | 16:9, 1920×1080, 30 fps. Exportar también un corte 9:16 si se usará en redes |
| Idioma | Español de Chile neutro, cálido. Subtítulos incrustados (el video se verá con y sin sonido) |
| Material | **Interfaz real de la app, grabada en pantalla.** Encima van gráficos animados (títulos, diagramas, flechas, zooms). No se recrean pantallas en HTML ni se usan maquetas. Lo que no es pantalla (el aula, la educadora) va en ilustración simple, sin tomas reales ni actores |
| Voz en off | Voz de IA natural, femenina y cálida, en español latinoamericano (ver sección 6b) |
| Música | Instrumental suave e infantil, sin letra. Baja bajo la voz y sube en los cambios de acto |
| Sonido de la app | **Se deja audible** en los momentos clave (el «¿Quién eres? Toca tu foto», el fonema de la letra, el «¡Muy bien!»). Esa voz *es* parte del producto |

### Recursos que se repiten (dan identidad y ritmo)
1. **Pantalla dividida «Niño | Educadora».** A la izquierda la tablet del niño, a la derecha el
   computador de la educadora. Cuando ella hace algo, una **línea animada** sale de su clic y
   llega a la tablet, y recién ahí cambia la pantalla del niño. Es el recurso principal del video:
   hace visible que lo de ella afecta lo que ve el niño.
2. **Tarjeta «¿Por qué?».** Una tarjeta pequeña (amarilla, con borde marino, al estilo de las
   fichas de letras de la portada) que entra 3 a 4 segundos para explicar la decisión de diseño.
   Una por acto como máximo, para que no se sienta como una clase.
3. **Zoom a detalle.** Acercamiento suave a un elemento chico (la barra de avance, la carita de
   la emoción, el 🔒) con un círculo que lo resalta.
4. **Rótulo de acto.** Un número y un título corto («1 · Antes de la clase») sobre el fondo de
   letras que flotan de la portada.

### Estilo
- Paleta de la app: marino `#173a5e`, menta (verde de la app), amarillo `#ffd76a` / `#fff3c4`,
  contorno `#2b4a6b`, fondos pastel `#cfe8fb`, `#d3f2e3`, `#e4dcf7`, `#fde2c8`.
- Tipografía: la «escolar» de la app para lo del niño y la sans de la app para lo de la educadora.
- Referencia de estilo: `docs/presentacion/trailer.html` (el tráiler del 28-oct). **Ojo:** es
  anterior a las salas conectadas, el parque, la actividad de letras configurable, las plantillas
  y los PDF, y dice «Funciona sin conexión», que hoy no es cierto (ver sección 8). Sirve para el
  estilo; el contenido sale de este plan.
- Transiciones: cortes rápidos dentro de un acto y una transición con las fichas de letras entre actos.
  Nada de giros 3D ni efectos llamativos.

---

## 4. Guion escena por escena

Leyenda: **VO** = voz en off · **TXT** = texto en pantalla · **APP** = audio de la propia app.
Los tiempos son una guía; la VO está calculada a unas 2,5 palabras por segundo.

### 0 · Gancho (0:00 – 0:12)
- **Imagen:** ilustración de una sala de Kínder: varios niños con tablets y una sola educadora.
  Luego, la grilla de personajes de `/alumno` aparece de a uno.
- **VO:** «En un Kínder, cada niño aprende a leer a su propio ritmo. ¿Cómo hace una sola educadora para acompañarlos a todos al mismo tiempo?»

### 1 · Presentación (0:12 – 0:25)
- **Imagen:** la portada real (`/`): el título «Leer para Todos» con el trazo amarillo y las fichas que flotan. Entran los chips *Sonidos · Sílabas · Palabras*.
- **VO:** «Leer para Todos es una plataforma para aprender a leer jugando, pensada para Pre-Kínder y Kínder. Acompáñennos en una mañana de clases.»
- **TXT:** «Leer para Todos · Liceo Piedra Azul»

### Acto 1 · Antes de la clase: la educadora prepara (0:25 – 1:10)

**1a. Perfil del niño (0:25 – 0:40)**
- **Imagen:** Estudiantes → ficha de Martina → formulario. Zoom a: personaje, *Nivel de exigencia: Inicial*, y los apoyos (tamaño de letra, alto contraste, reducir animaciones, silenciar efectos, temática favorita).
- **VO:** «Cada niño tiene su perfil. La educadora elige su personaje, su nivel y cuánta ayuda necesita. Martina parte en nivel inicial: menos opciones y más pistas.»
- **¿Por qué?** «La actividad es la misma para todos. Lo que cambia es la ayuda.»

**1b. Crear la sala y armar el plan (0:40 – 1:00)**: aquí va la **actividad de letras configurable**
- **Imagen:** Salas → «Nueva sala» → escribe *Grupo Letras*, tipo *Actividades* → botón **Plan**.
  En el editor: toca **«Escucha y toca la letra»** → aparecen las plantillas (*Todas las letras, Vocales, Consonantes, M, P, L, S, T*) → toca *M, P, L, S, T* → agrega la **B** tocándola en la grilla.
  Momento extra (2 s): deja solo B y V → aparece el aviso **«Esas letras suenan igual: agrega una que suene distinto.»** → vuelve a agregar M.
  Escribe el nombre *Letras de la semana* → **Guardar como plantilla** → **Agregar al plan**. Luego suma el contenido *Sílabas con M* → **Guardar plan**. En la tarjeta de la sala queda el plan como fila de íconos.
- **VO:** «Luego arma la sala de trabajo. Para la actividad de letras elige exactamente qué letras entran: una plantilla lista o las de esta semana. La app incluso le avisa si eligió letras que de oído no se distinguen. Lo guarda como plantilla para la próxima vez y lo suma al plan.»
- **¿Por qué?** «La educadora decide el contenido. El niño nunca tiene que elegir qué estudiar.»

**1c. Conectar el recreo (1:00 – 1:10)**
- **Imagen:** en la tarjeta *Grupo Letras*, botón **«Crear un recreo y conectarlo»** → se ve el esqueleto → aparece la tarjeta *Recreo* unida por una flecha **→**. En «¿Qué se hace en este recreo?» elige **Parque**.
- **VO:** «Con un clic conecta un recreo. Así, cada niño que termine sus actividades pasará solo al parque.»
- **Gráfico:** las dos tarjetas se simplifican en un diagrama: `📚 Grupo Letras → 🌳 Recreo`. Este diagrama vuelve en el Acto 5.

### Acto 2 · Llega el niño (1:10 – 1:35)
- **Imagen (tablet):** `/alumno` con la grilla de personajes. **APP:** «¿Quién eres? Toca tu foto.»
  Sofía toca su personaje → el avatar viaja al centro y crece → **«¡Hola, SOFÍA!»** (APP).
  → **«¿Cómo te sientes hoy?»** con 4 caras (Feliz, Tranquilo, Triste, Enojado) → toca *Feliz*.
  → Llega a la **espera**: globos para reventar, botón de tienda y música suave.
- **Detalle (zoom, 2 s):** en otra tablet, el personaje de Sofía ahora tiene un 🔒: nadie más puede usar su perfil.
- **Pantalla dividida:** en el computador de la educadora, Sofía aparece en la franja **«🎠 Recreo»** con un punto verde («con dispositivo»).
- **VO:** «Sofía no necesita saber leer para entrar: toca su personaje y la app la saluda por su nombre. Antes de empezar cuenta cómo se siente. Mientras la educadora la asigna, revienta globos.»
- **¿Por qué?** «La emoción con que llega queda registrada para la educadora.»

### Acto 3 · La educadora mueve las piezas (1:35 – 1:50)
- **Pantalla dividida, el momento estrella de causa y efecto:** la educadora **arrastra** la ficha de Sofía desde «Recreo» hasta *Grupo Letras*. Aparece «Conectándolo…». La **línea animada** viaja a la tablet y, segundos después, la pantalla de Sofía cambia sola al **camino** de su plan (globos por actividad, el actual latiendo).
- Repetir rápido con 3 niños más (cortes de 1 s), para que se vea que es un gesto de un segundo.
- **VO:** «La educadora arrastra a cada niño a su sala. No hay códigos ni enlaces: en unos segundos, la tablet del niño cambia sola.»
- **TXT pequeño:** «Si arrastrar no funciona en una pantalla táctil: toca al niño y luego toca la sala.»

### Acto 4 · La actividad de letras, desde el niño (1:50 – 2:30)
- **Imagen (tablet de Sofía):** botón grande **▶ Empezar** → tarjeta «¿Cómo se juega?» → **APP** suena el fonema (por ejemplo «mmm»): «Toca la letra que suena…».
  Cuatro letras grandes. Sofía toca la equivocada: la letra tiembla y **APP** dice «¡Casi! Escucha otra vez». Toca la correcta: **«¡Muy bien!»**, estrellas y **+monedas**. Dos rondas más a ritmo rápido y aparece el **bono de racha**.
  Pantalla de premio con las monedas ganadas → ▶ Seguir → el camino marca ✓.
- **Comparación (pantalla en dos, 5 s):** la misma ronda en la tablet de **Martina (Inicial): 2 letras** y en la de **Benjamín (Avanzado): 4 letras**.
- **Pantalla dividida (3 s):** en la tarjeta de la sala, la fila de Sofía: barra de avance **1/4 · 🔤 act. 2**, su carita 😄 y «Hoy: 1 partida · 2 min».
- **VO:** «La actividad le habla: escucha el sonido y toca la letra. Si se equivoca, recibe una pista, nunca un castigo. Acertar al primer intento da tres estrellas y más monedas. Martina juega lo mismo con dos opciones; Benjamín, con cuatro. Y la educadora ve el avance de cada uno en vivo.»
- **¿Por qué?** «Nunca más de 4 opciones en pantalla y todo se escucha: así puede jugar un niño que todavía no lee.»

### Acto 5 · Nadie se queda atrás: las salas conectadas (2:30 – 3:00)
Es el corazón del video: **explica por qué existen dos salas conectadas.**
- **Imagen 1 (tablet de Tomás):** no alcanza el puntaje y aparece «🔁 Intentar otra vez»: repite la actividad con **otras rondas**. Falla de nuevo.
- **Imagen 2 (computador):** arriba de las salas aparece el recuadro naranjo **«🙋 Necesitan tu apoyo (1)»**: *Tomás · Grupo Letras · act. 2 · 2 intentos*.
- **Imagen 3:** ilustración de la educadora sentándose junto a Tomás. Luego toca **✓ Listo** en el aviso.
- **Imagen 4 (tablet de Sofía, en paralelo):** termina el plan → **🏆 «¡Terminaste todo! Mira tus estrellas.»** con sus estrellas por contenido → **«¡Al recreo!»** 🌳 → entra **sola** al parque.
- **Gráfico (el diagrama del Acto 1, ahora vivo):** `📚 Grupo Letras → 🌳 Recreo`, con los avatares saliendo de a uno hacia el recreo mientras Tomás queda en la sala junto a un ícono de la educadora.
- **VO:** «Cuando un niño repite dos veces sin lograrlo, la app avisa a la educadora. ¿Y qué pasa con los que terminan? No esperan aburridos ni la interrumpen: pasan solos al recreo. Así los que van adelante descansan, y la educadora tiene tiempo para quien más la necesita.»
- **TXT grande (3 s):** «Los que terminan descansan. Los que necesitan ayuda, la reciben.»

### Acto 6 · El recreo (3:00 – 3:25)
- **Imagen (parque):** varios personajes caminando por el mapa (columpio, juegos), los de más lejos se ven más chicos. Sofía toca el columpio y su personaje camina hasta él rodeando los obstáculos. Toca un pictograma y aparece una burbuja **«¿Jugamos?»** sobre su cabeza (**APP**); Lucas responde **«¡Hola!»**.
- **Pantalla dividida:** en la tarjeta del recreo, la educadora ve **los últimos saludos** (avatar + pictograma).
- **Causa y efecto (5 s):** la educadora cambia el recreo de *Parque* a **Dibujo** → la línea animada → todas las tablets del recreo cambian a la hoja de dibujo. Un niño usa **«Repasar»** y sigue con el dedo una **M** tenue.
- **Tienda (5 s):** Sofía gasta sus monedas: toca una prenda, se la prueba al instante y su personaje la luce de pie sobre el podio.
- **VO:** «En el recreo se ven en vivo y se saludan solo con pictogramas: no hay nada que leer, escribir ni moderar. La educadora decide qué se hace: parque, dibujo, globos o juegos, y el cambio llega al instante. Las monedas ganadas se gastan en la tienda para vestir a su personaje.»
- **¿Por qué?** «Las monedas se ganan aprendiendo y se gastan en el recreo: el premio motiva sin interrumpir la clase.»

### Acto 7 · De vuelta al trabajo (3:25 – 3:40)
- **Imagen (computador):** la educadora ya tiene una segunda sala, *Grupo Sílabas*, con el plan *Sílabas con P*. Toca/arrastra a los niños del recreo a esa sala, o usa **«Todos al recreo»** al revés para mostrar el movimiento en grupo.
- **Tablet:** el dibujo se cierra y aparece el nuevo camino con otro color e ícono. **APP:** «¡Vamos!…».
- **TXT pequeño:** «Una ruta puede tener varias salas seguidas: Letras → Sílabas → Recreo.»
- **VO:** «Cuando ella decide, los niños vuelven a trabajar. Otra sala, otro plan, y cada uno sigue desde donde lo necesita.»

### Acto 8 · Lo que la educadora sabe al final del día (3:40 – 4:15)
- **Panel docente (5 s):** «X estudiantes · Y jugaron esta semana» y, a la derecha, **«Lo que más le cuesta al curso»** por categoría (por ejemplo, la letra **B** al 40 % al primer intento).
- **Avance del curso (10 s):** la tabla con partidas, minutos, estrellas promedio y última emoción por niño. Toca la **B** en «Lo que más le cuesta» → se abre el detalle: **con qué se confundió** (por ejemplo, la V) y **a qué niños les cuesta**.
- **Ficha de Tomás (10 s):** «¿Cómo llegó a la sesión?» (historial de caritas), **Avance por categoría** con barras y la etiqueta *Le cuesta*, «Esta semana» y las **observaciones** de la educadora.
- **Descargas (8 s):** botón **Informe PDF** de Tomás → se abre el PDF (emociones, avance por categoría, últimas partidas, observaciones). Luego **PDF del curso** desde Avance del curso.
- **VO:** «Al final del día, la educadora no tiene que adivinar. Ve qué le cuesta al curso y con qué se confunde cada niño, cómo llegó emocionalmente y cuánto jugó. Y lo descarga en PDF, del curso completo o de cada niño, para la reunión de apoderados o el equipo de integración.»
- **¿Por qué?** «Se mide el acierto al primer intento: muestra lo que el niño sabe, no cuántas veces probó.»

### Cierre (4:15 – 4:30)
- **Imagen:** montaje rápido de 3 tomas: Sofía con su trofeo, la educadora junto a Tomás, el parque lleno. Después, el logo sobre el fondo de fichas.
- **TXT (uno por toma):** «El niño juega.» · «La educadora guía.» · «Nadie se queda atrás.»
- **VO:** «Leer para Todos. Cada niño a su ritmo, ninguno solo.»
- **TXT final:** «Leer para Todos · Liceo Piedra Azul · Bases Curriculares de Educación Parvularia, Lenguaje Verbal».

---

## 5. Lista de capturas

Grabar cada toma por separado, con margen de 1 a 2 s antes y después. Si una toma va en
pantalla dividida, grabar las dos ventanas **al mismo tiempo** (dos capturas sincronizadas o
una sola captura del escritorio con las dos ventanas lado a lado).

| # | Pantalla / ruta | Estado previo | Acción a grabar |
|---|---|---|---|
| C1 | `/` portada | — | 6 s quieto (las fichas se animan solas) |
| C2 | `/docente/estudiantes/:id` (Martina) | Exigencia *Intermedio* | Cambiar a *Inicial* y recorrer los apoyos |
| C3 | `/docente/salas` | Sin salas | Crear *Grupo Letras* → Plan → configurar letras (incluye el aviso B/V) → guardar plantilla → agregar → sumar *Sílabas con M* → guardar |
| C4 | `/docente/salas` | Grupo Letras sin recreo | «Crear un recreo y conectarlo» → elegir Parque |
| C5 | `/alumno` (tablet 1) | Nadie conectado | Sofía entra: saludo → emoción → espera |
| C6 | `/alumno` (tablet 2) | Sofía ya conectada | Se ve el 🔒 en su personaje |
| C7 | Salas + tablet de Sofía | Sofía en Recreo | Arrastrarla a Grupo Letras; grabar las dos pantallas |
| C8 | Tablet de Sofía | En Grupo Letras | Ronda de letras: error → pista → acierto → racha → premio |
| C9 | Tablets de Martina y Benjamín | Ambos en la sala | La misma ronda: 2 opciones contra 4 |
| C10 | Salas | Sofía con avance | Zoom a su fila: barra, intento, carita, partidas de hoy |
| C11 | Tablet de Tomás + Salas | Tomás en la sala | Fallar 2 veces → aparece «Necesitan tu apoyo» → Listo |
| C12 | Tablet de Sofía | Último paso del plan | Terminar → trofeo → «¡Al recreo!» → entra al parque |
| C13 | Parque (3 o 4 tablets) | 4 niños en el recreo-parque | Caminar, columpio, saludos con pictogramas |
| C14 | Salas + tablets del recreo | Recreo en Parque | Cambiar a Dibujo; «Repasar» una M |
| C15 | Tienda | Sofía con monedas | Probar y comprar una prenda |
| C16 | Salas + tablets | 2.ª sala *Grupo Sílabas* creada | Mover niños del recreo a la sala; aparece el nuevo camino |
| C17 | `/docente` | Con historial (ver 6) | Panel completo |
| C18 | `/docente/avance` | Con historial | Tabla → tocar B → detalle |
| C19 | Ficha de Tomás | Con historial y 2 observaciones | Recorrer y descargar el PDF |
| C20 | Visor de PDF | — | Recorrer el informe de Tomás y el PDF del curso |

---

## 6. Cómo preparar los datos y grabar

**Ambiente:** usar la app conectada a Supabase. Hoy todos los datos son de prueba, así que se
graba directo; si más adelante entran datos de niños reales, se crea un curso solo para el video. Varias tablets simultáneas solo funcionan así: en modo demo (`VITE_DEMO=si`)
la credencial del niño se guarda en el `localStorage` del navegador, así que todas las
pestañas de un mismo perfil de navegador son **el mismo niño**. El modo demo sirve solo
para tomas de un niño a la vez y para las pantallas de la educadora.

**Varios niños a la vez:** un perfil de navegador por niño (perfiles de Chrome distintos,
o Chrome + Edge + Firefox), cada uno en su ventana. Para el parque bastan 4.

**Historial para las métricas (C17 a C20):** las métricas necesitan partidas de varios días.
Antes de grabar, jugar varias rondas con cada niño (que Tomás falle seguido la B frente a la V,
para que aparezca en «Lo que más le cuesta»), registrar emociones variadas y escribir 2
observaciones en la ficha de Tomás. Las cifras de la sección 4 (40 %, etc.) son de ejemplo:
**poner en pantalla las que muestre la app**, no inventarlas.

**Ajustes de captura:**
- Ventana de la educadora a 1920×1080 con zoom del navegador al 110–125 % para que se lea.
- Tablets: ventana de 1280×800 o una tablet real con grabación de pantalla.
- Cursor grande y resaltado de clics en las tomas de la educadora. En las del niño, mejor un dedo animado o el toque resaltado.
- Grabar con el audio de la app activo. Si está configurada la voz en vivo (`VITE_VOZ_EN_VIVO=si`) o hay audios pregrabados en `public/voz/`, usarlos: suenan mucho mejor que la voz del navegador.
- Esperar a que termine cada refresco: la vista de la educadora se actualiza cada **5 s** y la del niño en la espera cada pocos segundos. En edición se pueden recortar esas esperas, pero sin dejar entender que el cambio es instantáneo cuando tarda unos segundos (decir «en unos segundos»).

### 6b. Voz en off con IA

Fable escribe y ajusta el texto, pero no genera audio por sí solo: la voz sale de una
herramienta de texto a voz que se ejecuta aparte (Fable puede llamarla si su entorno tiene
acceso a ella). Hay dos caminos:

1. **Servicio de voz de IA comercial** (tipo ElevenLabs): es lo más natural hoy, tiene voces en
   español latinoamericano y control de ritmo y entonación. El plan gratuito suele alcanzar
   para unos 4 minutos, pero revisar si permite uso comercial o público y si exige atribución.
2. **Pocket-TTS, que ya está en el proyecto** (`VITE_VOZ_EN_VIVO`, `scripts/voz/`): es gratis y
   local, y puede imitar una voz de referencia. Conviene hacer una prueba de 30 s: si suena
   natural, se usa. Ojo: si es la misma voz que usa la app, el narrador se confunde con la app.
   En ese caso se elige otra voz de referencia para narrar.

**Recomendación:** probar primero Pocket-TTS con una voz de referencia distinta. Si no convence,
pasar al servicio comercial.

**Cómo pedir la voz:** femenina, cálida, de unos 30 a 40 años, ritmo pausado (≈ 2,5 palabras
por segundo), entonación de conversación, no de locutora de radio. Generar **una pista por
escena** para poder ajustar los tiempos en la edición. Revisar la pronunciación de «Kínder»,
«Pre-Kínder», «PDF» y los fonemas («mmm»). Los fonemas no los dice el narrador: los dice la app
(audio APP).

### 6c. Producción técnica

- **Proyecto propio en `video/`**, con su `package.json`. Se agrega a `pnpm-workspace.yaml`.
  Los videos renderizados, las capturas y los audios **no se versionan**: van en `video/.gitignore`.
- **Capturas con Playwright** (hay que instalarlo; hoy no está en el repo): un script por toma de
  la sección 5, contra la app local (`pnpm dev`) conectada a Supabase. Cada niño usa su propio
  *browser context*, que tiene su propio `localStorage`: así se tienen varios niños a la vez sin
  perfiles de navegador. Grabar con `recordVideo` a 1920×1080 (educadora) y 1280×800 (tablets).
  Lo bueno de los scripts es que cada toma se puede repetir igual si la app cambia.
  Los clics van con pausas humanas, nada instantáneo.
- **Remotion solo compone y edita**: monta las capturas (`<OffthreadVideo>`) y les pone encima los
  gráficos (rótulos de acto, tarjetas «¿Por qué?», línea causa → efecto, zooms, diagrama de salas,
  subtítulos). **No** se renderizan componentes de la app dentro de Remotion. Dependen de la
  sesión, de la consulta periódica al servidor, del audio y de Supabase; simularlos sería
  frágil y ya no sería la interfaz real.
- **El tema sí se toma de la app**: los colores y las fuentes salen de `frontend/src/index.css`
  (`@theme`: DM Sans y Andika). Los gráficos usan esos tokens, sin copiar valores a mano.
- **Audio:** una pista de voz por escena (6b), el audio de la app grabado en las capturas y una
  música libre de derechos (la elige Mati, o se toma de una biblioteca gratuita con licencia clara).
  La duración de cada escena se ajusta al largo de su pista de voz.
- **Puntos de control** (parar y mostrar antes de seguir):
  1. después de las capturas (revisar que las tomas se vean bien);
  2. después de la prueba de voz de 30 s;
  3. con un render en baja resolución del corte completo;
  4. recién entonces, el render final.

---

## 7. Datos del producto (fuente de verdad)

No afirmar nada que no esté aquí o en la app.

**Niño**
- Entra tocando su personaje; la app dice su nombre. Un perfil abierto en otra tablet queda con 🔒.
- Primera pantalla: «¿Cómo te sientes hoy?» con 4 opciones: Feliz, Tranquilo, Triste, Enojado (RF-14).
- **El niño no elige sala ni actividad**: ve lo que le asignó la educadora.
- Sin sala: espera con globos, tienda y música (apagable).
- Plan: un camino de globos por actividad, agrupados por contenido. Cada contenido trae 3 actividades.
- Puntaje por ronda: al 1.er intento ⭐⭐⭐ y +10 monedas; tras una pista ⭐⭐ y +5; con la respuesta revelada ⭐ y +2. Tres aciertos seguidos dan bono de racha (+2).
- Para pasar a la siguiente actividad: según la exigencia, **Inicial 50 % · Intermedio 60 % · Avanzado 80 %**. Si no lo logra, repite la misma actividad con otras rondas.
- Exigencia: Inicial = 2 opciones, 4 rondas, la respuesta se ilumina tras 1 error · Intermedio = hasta 4 opciones, 5 rondas, tras 2 errores · Avanzado = hasta 4 opciones, 6 rondas, tras 3 errores.
- Al terminar el plan: trofeo con estrellas por contenido y paso automático a la sala conectada.
- Recreo: **Parque** (caminan, se ven en vivo, se saludan con 8 pictogramas: ¡Hola!, ¡Bien!, ¡Ja, ja, ja!, ¡Guau!, ¡Te quiero!, ¿Jugamos?, ¡Gracias!, ¡Chao!), **Dibujo** (libre, sellos y «Repasar» letras), **Globos** (con tienda) y **Juegos** (los que elija la educadora, todas las veces que quieran).
- Tienda y vestidor: probar al instante, comprar con monedas y lucir el personaje sobre el podio. Máximo 4 opciones por pantalla.

**Educadora**
- Perfil por niño: personaje, color, nivel habilitado (1 Sonidos, 2 Sílabas, 3 Palabras), exigencia, imágenes (foto, pictograma o mixto), tamaño de letra (28/32/38 px), temática (animales, dinosaurios, fútbol, océano, vehículos, piratas), alto contraste, reducir animaciones, silenciar efectos (la voz sigue).
- Salas de dos tipos: **Actividades** y **Recreo**. Cada fila es una **ruta**: al terminar, el niño pasa solo a la sala siguiente. Se pueden encadenar varias salas de actividades y no se permite cerrar un círculo.
- Mover niños: arrastrar, o tocar y luego tocar la sala. «Todos al recreo» manda a toda una sala de una vez. «Cerrar dispositivo» hace que el niño vuelva a elegir su perfil.
- Vista en vivo por niño: conectado o no, avance (paso/total, contenido y actividad), intento N, emoción, partidas y minutos de hoy. Arriba: «N con dispositivo · N en recreo · N en salas».
- Aviso **«Necesitan tu apoyo»** cuando un niño repite 2 veces la misma actividad sin lograrla, con el botón «Listo».
- Guardar un plan nuevo **reinicia el avance** de los niños de esa sala (la app lo advierte antes).
- Plan = contenidos del banco (por área: Escuchar, Vocales y letras, Sílabas, Palabras, Escritura) + **actividades configurables**.
- Actividad configurable actual: **«Escucha y toca la letra»**: suena la letra y el niño toca cuál es, entre las letras que eligió la educadora. Plantillas de sistema: Todas las letras, Vocales, Consonantes y «M, P, L, S, T». Pueden guardarse plantillas propias. Validación: mínimo 2 letras y no solo letras que suenan igual (B/V, C/K/Q). El plan guarda una copia, así que editar la plantilla no cambia lo ya asignado.
- Métricas: Panel (estudiantes, quiénes jugaron esta semana, lo que más le cuesta al curso por categoría) · Avance del curso (partidas, minutos, estrellas promedio y última emoción de la semana; detalle por ítem: con qué se confunde y a qué niños les cuesta) · Ficha del niño (historial de emociones, % al primer intento por ítem con la etiqueta «Le cuesta» bajo 60 %, partidas de la semana y observaciones).
- Descargas: **PDF del curso** (semana) y **Informe PDF por niño** (todo su historial: emociones, avance por categoría, últimas partidas, observaciones).

---

## 8. Qué NO decir ni mostrar

- **«Funciona sin conexión»**: no. La app sin conexión (PWA) está pendiente; hoy solo hay un respaldo mínimo de resultados.
- **Fotos reales o pictogramas ARASAAC**: no. Hoy las imágenes son emoji provisionales. Si se muestran, no destacarlas como definitivas.
- **«Voz grabada por las educadoras»**: solo si ya existen esos audios. Si no, no hablar del origen de la voz.
- No mostrar nombres, caras ni datos de niños reales. Usar solo el curso de prueba.
- No mostrar URLs con claves, la consola del navegador ni la pantalla de Supabase.
- No prometer funciones que no existen (otros juegos configurables, comunicación con apoderados, etc.).

---

## 9. Versión corta (60 a 90 s)

Mismo material, solo los momentos que más se lucen:
1. Gancho + logo (8 s)
2. Sofía entra: saludo + emoción (10 s)
3. La educadora arrastra y la tablet cambia sola, en pantalla dividida (8 s)
4. Ronda de letras: fonema → pista → ¡Muy bien! (12 s)
5. «Necesitan tu apoyo» + Sofía se va sola al recreo, con el diagrama de salas conectadas (15 s)
6. Parque con saludos (8 s)
7. Métricas + PDF (10 s)
8. «El niño juega. La educadora guía. Nadie se queda atrás.» (6 s)

---

## 10. Decisiones tomadas (10-nov-2026)

1. **Público:** le habla a las educadoras. Los evaluadores también lo ven, y para ellos está el Anexo A, fuera del video.
2. **Material:** la interfaz real de la app, grabada en pantalla, con gráficos encima. No se recrean pantallas.
3. **Voz:** de IA, natural (sección 6b).
4. **Educadora:** «la educadora», sin nombre y sin actores. Se muestra en ilustraciones.
5. **Aula y niños:** sin tomas reales, todo con ilustraciones. Los datos de la app son de prueba.

Pendiente: elegir la herramienta de voz después de la prueba de 30 s con Pocket-TTS.

---

## 11. Entregables

- [ ] `video/final_4min.mp4` (1080p, con subtítulos incrustados)
- [ ] `video/corto_90s.mp4` (y su versión 9:16 si se usará en redes)
- [ ] `video/subtitulos.srt`
- [ ] `video/capturas/`: tomas en bruto C1 a C20 (no versionarlas en git si pesan mucho)
- [ ] Revisión final contra las secciones 7 y 8: todo lo que se dice existe y nada de lo prohibido aparece.

---

## Anexo A. Escenas y requisitos (para la evaluación, no va en el video)

Solo están los requisitos que el código cita. Antes de entregarla, completar esta tabla con el
informe de requerimientos (`docs/Informe_Requerimientos_LeerParaTodos.docx`).

| Escena | Requisito |
|---|---|
| Acto 1a · perfil y apoyos | RF-08 (foto, pictograma o mixto), RF-09 / RF-15 (nivel habilitado), RF-22 (temática) |
| Acto 1b · actividad de letras configurable | RF-15 |
| Acto 2 · «¿Cómo te sientes hoy?» | RF-14 |
| Acto 4 · como máximo 4 opciones, todo hablado | RNF-02, RF-04 / RNF-04 (audio) |
| Acto 6 · tienda y vestidor | RF-24 |
| Acto 8 · avance del curso | RF-17 |
