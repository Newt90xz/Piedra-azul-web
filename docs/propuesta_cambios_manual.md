# Propuesta de cambios al Manual de usuario

**Manual revisado:** `Manual_de_usuario_Leer_para_Todos_v1.0.docx` (v1.0, 27/10/2026, describe el software 1.1).
**Comparado con:** rama `main` al 20/11/2026: último commit `aee0f21` más los cambios **sin commitear** del 18/11 (se marcan con ⚠).
**Resultado:** el manual quedó desactualizado en casi todo el capítulo 6, en las tablas 3, 4, 6, 7, 8, 13 y 15, y en el Anexo D. Se publica como **manual 2.0, software 2.0**.

> ⚠ **Antes de publicar el manual hay que commitear lo marcado con ⚠.** Son el área Vocabulario, el tema de las palabras, el nuevo orden de actividades, las rimas nuevas, la dificultad por niño y la migración `20261118120000_temas_vocabulario`. El manual 2.0 los describe, así que la app publicada debe tenerlos.

---

## 1. Qué cambió en la app (resumen para el equipo)

| Antes (manual v1.0) | Ahora (rama actual) |
|---|---|
| 3 tipos de sala: trabajo, playground y dibujo | 2 tipos: **Actividades** y **Recreo**. Cada sala de actividades dice a qué sala pasan los niños al terminar (**salas conectadas**, una ruta por fila) |
| Juegos al final del plan | Los juegos son una actividad del **recreo**. El recreo puede ser **Parque**, **Dibujo**, **Globos** o **Juegos**, y la docente lo cambia en vivo |
| Playground: chat con 8 pictogramas | **Parque**: mapa donde cada niño camina con su personaje, ve a los demás en tiempo real y saluda con los mismos 8 pictogramas (4 a la vez) |
| 36 avatares emoji y tienda de 9 avatares (10 a 90 monedas) | **Personaje por capas** (12 bases). Personalización gratis (piel, color de pelo, cara, apoyos como lentes, audífono o silla de ruedas) y **tienda de 102 artículos** (40 a 400 monedas) en 4 pestañas. Se prueba antes de comprar |
| 7 contenidos, todos con 3 actividades | **11 contenidos** en 7 áreas (se suman *Escucho y reconozco*, *Palabras y dibujos*, *Formo palabras* y *Escribo*) y **3 actividades que configura la docente** (*Escucha y toca la letra* y ⚠ *Adivina cuál es* y *Encuentra el que no va*), con **plantillas** |
| Pasa con 60 % de rondas "sin que se revele la respuesta" | ⚠ Pasa cuando resuelve la mayoría de las rondas **al primer intento** |
| Sin dificultad | **Dificultad** por contenido en el plan, y ⚠ también por niño en su perfil |
| Nivel habilitado en el perfil | Ya no está en el formulario (se guarda, pero ningún flujo lo usa) |
| Palabras sin tema | ⚠ **Tema de las palabras** por contenido (frutas, oficios, medios de transporte…), ~170 palabras con pictograma ARASAAC |
| Voz pregrabada Qwen3-TTS (MP3) con respaldo del navegador; parte apagada | Voz **Pocket-TTS en tiempo real** desde el backend, con caché y precarga. **Sin respaldo del navegador.** En la pantalla del niño **parte encendida** |

## 2. Decisiones tomadas (20/11/2026)

| Tema | Decisión | Qué implica en el manual |
|---|---|---|
| Nombre | El producto es **Leer para Todos**. **PICTOMANIA** es el nombre del equipo | Portada: «Leer para Todos — Manual de usuario» y «Elaborado por: Equipo PICTOMANIA». Reemplazar «PICTOMANIA» por «Leer para Todos» en 2.1 (título y texto), 1.1, 3, 4.1 y 5.2. Se mantiene en el control de versiones y en la referencia del Anexo C |
| Versión | **Software 2.0, manual 2.0** | `package.json` (raíz) ya quedó en 2.0.0. `frontend` y `backend` siguen en 0.1.0 |
| Alcance | Se documenta **todo lo de la rama**, incluido lo marcado con ⚠, pero la **dificultad solo en términos generales**: que existe el selector y qué cambia, sin números ni sugerencias | No van la tabla Fácil/Medio/Difícil, la regla «3 de 5», «Bajar a…» ni «Van muy bien» |
| Voz | Pocket-TTS corre en un **servidor del colegio** que mantiene el equipo técnico. La docente no hace nada | La docente solo ve la voz como algo que funciona o no («avisa al equipo técnico»). La instalación y la precarga van en el Anexo D |

---

## 3. Cambios por sección

### Portada y control de versiones
- Producto: «Leer para Todos». Versión del software: 2.0. Versión del manual: 2.0. Fecha: la de publicación.
- Agregar una fila a la tabla de control de versiones: `2.0 | <fecha> | Salas conectadas y recreo, parque, personaje y tienda, contenidos nuevos, actividades configurables y vocabulario, dificultad, voz Pocket-TTS | Equipo PICTOMANIA`.

### 1.2 Alcance
- Cambiar «la versión 1.1» por «la versión 2.0».
- Agregar: «La voz la genera un servidor del colegio que instala y mantiene el equipo técnico (Anexo D.7)».

### 2.1 ¿Qué es Leer para Todos?
- Agregar **OA 4** (vocabulario) y **OA 8** (escritura) a los OA que se nombran. Hoy dice solo OA 3 y OA 7.

### 2.2 Funcionalidades principales (reemplazar la lista)
- Perfiles con solo el nombre de pila, un **personaje** personalizable y apoyos de accesibilidad.
- **Salas conectadas**: salas de actividades que, al terminar, llevan solas al niño a la sala siguiente, por ejemplo a un recreo.
- **Recreo**: parque compartido en tiempo real, dibujo, globos o juegos, a elección de la docente.
- **11 contenidos** basados en las Bases Curriculares (OA 3, 4, 7 y 8), más actividades que configura la docente (letras y ⚠ vocabulario por temas) y plantillas reutilizables.
- **Dificultad ajustable** por contenido y ⚠ por niño.
- Actividades sin texto que leer, con pictogramas, voz y botones grandes, y premios en estrellas y monedas que se canjean en la **tienda del personaje**.
- Avisos de apoyo y seguimiento del curso y de cada niño, con emociones, observaciones e informes PDF.

### 2.4 Cómo funciona una sesión: rehacer la Tabla 3

| Paso | El niño | La docente |
|---|---|---|
| 1. Entrada | En **Soy alumno** toca su foto (su nombre aparece en MAYÚSCULAS) | Lo ve en Salas → **Sin sala** como «Esperando sala» |
| 2. Emoción | Elige cómo se siente: Feliz, Tranquilo, Triste o Enojado | La emoción queda en su ficha y junto a su nombre |
| 3. Espera | Revienta globos, va a la tienda y escucha música suave | Lo arrastra a una sala de actividades («Conectándolo…» hasta que se confirma) |
| 4. Actividades | Recorre en orden las actividades del plan; cada una es una partida de 5 rondas | Ve «Actividad 3 de 9», los intentos y los avisos de apoyo |
| 5. Al terminar | Ve sus estrellas por contenido y toca **¡Al recreo!**: pasa solo a la sala conectada | Ve «✓ Terminó · pasando», o «· esperando» si la sala no tiene una conectada |
| 6. Recreo | Parque, dibujo, globos o juegos, según lo que eligió la docente | Puede cambiar la actividad del recreo en vivo, o mover al niño |
| 7. Salida | Toca el botón de salir | O lo hace la docente con **Cerrar dispositivo** |

> Si se mantiene el saludo hablado en el paso 1, primero hay que arreglar el hallazgo 2 de la sección 4.

### 3. Requisitos del sistema (Tabla 4)
- **Navegador:** sacar «Microsoft Edge (incluye voces naturales en español)»: la voz ya no viene del navegador. Basta Chrome o Edge actualizado.
- **Nueva fila «Voz»:** «La genera el servidor del colegio; los equipos del aula solo necesitan parlantes o audífonos».
- **Conexión:** el parque usa tiempo real (Supabase Realtime), así que necesita una conexión estable durante el recreo.
- Nota: el parque se probó con 20 niños simulados en un PC de desarrollo. **Falta probarlo en los equipos del liceo.**
- Los requisitos del servidor de voz (Python 3.10 a 3.14 y Pocket-TTS; en un i5, ~1,5 s por frase nueva) van en el Anexo D, no en esta tabla.

### 4.3 Configuración inicial
- Cambiar «Prueba la voz: … toca el altavoz» por: «Prueba la voz: entra como un niño de prueba; la voz se enciende sola en su pantalla. Si no suena nada, avisa al equipo técnico (9.2)».

### 5.4 Preparar el curso por primera vez
- Paso 3: «elige un avatar y un color» pasa a ser «elige un **personaje** y un **color de fondo**».
- Al final: «Después crea una **sala de actividades** y conéctale un recreo (ver 6.3)».

### 5.5 Descripción de la interfaz (Tabla 5) y 5.6 Navegación
- El orden del menú lateral ahora es **Inicio, Salas, Estudiantes, Avance del curso**.
- Describir **Inicio**: saludo, tarjetas **En clase ahora** (en salas y con dispositivo), **Necesitan tu apoyo** y **Esta semana** (cuántos jugaron y cuántas partidas), y el recuadro **Lo que más le cuesta esta semana**. Se actualiza solo cada 15 s.
- Escape: agregar que en las ventanas la tecla Tab no se sale del cuadro, y que al cerrarlo el foco vuelve a donde estaba (accesibilidad).

### 6.2 Estudiantes: rehacer la Tabla 6
| Campo | Opciones | Para qué sirve |
|---|---|---|
| Nombre de pila | Texto (2 a 30 letras) | Igual que antes |
| **Personaje** | 12 personajes base | El que el niño toca para entrar. Al cambiarlo se conserva lo que el niño ya compró |
| **Color de fondo** | 6 colores | Fondo del personaje y color de su polera |
| Perfil activo | Sí / No | Igual |
| Imágenes | Fotografía real · Pictograma · Mixto | Ver la nota de abajo |
| Tamaño de letra | Normal 28 px · Grande 32 px · Muy grande 38 px | Igual |
| Temática favorita | Animales, dinosaurios, fútbol, océano, vehículos, piratas | Igual |
| ⚠ **Dificultad de las actividades** | La del plan de su sala · Fácil · Medio · Difícil | Solo para este niño: manda sobre la del plan |
| Alto contraste / Reducir animaciones / Silenciar efectos | Sí / No | Igual |

- **Quitar** la fila «Nivel habilitado».
- Nota sobre «Imágenes»: hoy todas las palabras usan pictogramas ARASAAC, porque no hay fotografías cargadas. Mientras no se carguen, el ajuste no cambia nada. Conviene decirlo, u ocultar la opción.
- La ficha del estudiante ya no muestra «Nivel N habilitado», y dice «En la sala «X»» en vez de «Conectado a «X»». Tampoco el informe PDF muestra el nivel.

### 6.3 Salas (reescribir casi completa)
- **Tabla 7. Tipos de sala:**

| Tipo | Qué hace el niño ahí | Se configura con |
|---|---|---|
| **Actividades** | Recorre en orden las actividades del plan; al terminar pasa solo a la sala conectada | **Plan** y **Al terminar pasan a** |
| **Recreo** | Lo que elija la docente: **Parque** (camina con su personaje, ve a los demás y saluda con pictogramas), **Dibujo** (dibujo libre, sellos y letras para repasar), **Globos** (revienta globos y va a la tienda) o **Juegos** (los que marque la docente: El choque de sonidos, Aplausos silábicos y Globos de palabras) | **¿Qué se hace en este recreo?** Al cambiarlo, quienes están dentro cambian al instante |

- **Rutas:** cada fila de la pantalla es una ruta (sala → flecha → sala siguiente). Un recreo al que llegan varias rutas aparece como «Compartida con otra ruta». Los recreos sin conectar van en **Recreos sin conectar**.
- **Al terminar pasan a:** es un selector en cada sala de actividades. «Nadie: esperan a la docente» deja al niño esperando. El botón **Crear un recreo y conectarlo** crea un recreo llamado «Parque» y lo conecta. No se puede conectar en círculo.
- **Crear sala:** en **Nueva sala**, escribe el nombre (hasta 40 caracteres), elige **Actividades** o **Recreo** y toca **Crear sala**.
- **Eliminar sala:** toca ✕ en la tarjeta y luego **Sí, eliminar**. Los niños quedan sin sala. Esto no estaba en el manual.
- **Mover niños:** el texto de la tablet cambia a «toca la **manilla ⠿** de la ficha y luego **Mover aquí a NOMBRE** en la sala de destino». Sacar a un niño muestra «Sacándolo de la sala…».
- **Sacar a todos** pasa a llamarse **Sacar a todos de la sala** y ahora pide confirmación («¿Sacar a los N niños…? Quedan sin sala»).
- **Encabezado:** «N con dispositivo · N en salas · N sin sala».
- **Lo que muestra cada niño:** punto verde (con dispositivo) o «· sin dispositivo»; la actividad actual con «Actividad 3 de 9» y una barra; «intento N»; «Hoy: N partidas · M min» (ya no es al pasar el mouse); y la emoción.
- **Plan de una sala de actividades** (ventana **Plan**):
  - Los contenidos se agregan por área: Escuchar, Conciencia léxica, ⚠ Vocabulario, Vocales y letras, Sílabas, Palabras y Escritura.
  - En cada contenido se tocan sus actividades para quitarlas o volver a ponerlas (siempre queda al menos una). ⚠ Vienen ordenadas **de más apoyo a menos**.
  - Cada bloque tiene **Dificultad** (Medio si no se elige otra) y ⚠ **Tema de las palabras** (Todas, o un tema con su número de palabras).
  - Las flechas ↑ ↓ cambian el orden y ✕ quita el bloque.
  - Sección **Actividades que configuras tú** (ver 6.4).
  - Se mantiene la advertencia «Al guardar, N niños vuelven a empezar».
- **Necesitan tu apoyo:** se mantiene la regla de 2 repeticiones sin lograr la actividad, pero ya no dice «60 %». Se mantiene **Listo**.
- **Recreo en Parque:** la tarjeta muestra los últimos saludos.
- Nota: si falla una actualización aparece «No se pudo actualizar: se muestran los últimos datos. Se reintenta solo».

### 6.4 Contenidos y actividades (rehacer la Tabla 8 y la regla de paso)
- **Primer párrafo:** «Cada contenido trae hasta 3 actividades, ⚠ de más apoyo a menos: **con apoyo** (ve el dibujo y escucha), **decide solo** y **sin apoyo** (solo de oído, armando o escribiendo). Cada actividad es una partida de 5 rondas. ⚠ El niño pasa a la siguiente cuando resuelve la mayoría de las rondas **al primer intento**. Si no lo logra, la repite con otras rondas, que nunca son iguales a las anteriores».
- **Tabla 8** (en el orden en que entran al plan):

| Área | Contenido | OA | Actividades, en orden |
|---|---|---|---|
| Escuchar | Escucho y reconozco | OA 3 | ¿Qué palabra escuchaste? → Busca el dibujo que empieza igual → ¿Empiezan con el mismo sonido? |
| Escuchar | Rimas: ¿cuál termina igual? | OA 3 | ⚠ Encuentra la que termina igual → ¿Cuál no termina igual? → ¿Terminan igual? |
| Conciencia léxica | Palabras y dibujos | OA 3 | Marca las palabras del dibujo (una sola actividad) |
| Vocales y letras | Las vocales | OA 7, OA 3 | ¿Con qué vocal empieza? → Busca el dibujo de la vocal → Escucha y toca la vocal |
| Sílabas | Sílabas con M, P, L y S (4 contenidos) | OA 7, OA 3 | ¿Con qué sílaba empieza? → Busca la imagen de la sílaba → Escucha y toca la sílaba |
| Sílabas | Palabras largas y cortas | OA 3 | ¿Cuál es más larga? → ¿Cuál es más corta? → Encuentra la palabra más larga |
| Palabras | Formo palabras | OA 7, OA 3 | Completa la sílaba que falta → Arma la palabra con sílabas → Revienta los globos y forma la palabra |
| Escritura | Escribo | OA 8, OA 7 | Escribe la vocal con que empieza → Escribe la sílaba con que empieza → Escribe la palabra (teclado en pantalla, en mayúsculas) |

  ⚠ El orden de Escucho, Vocales y Formo palabras y los títulos de Rimas y «Encuentra la palabra más larga» son los de la rama sin commitear.
- **Actividades que configuras tú** (nuevo):

| Actividad | OA | Qué elige la docente | Plantillas que trae la app |
|---|---|---|---|
| Escucha y toca la letra | OA 7 | Letras del alfabeto (27). B/V, C/K/Q y S/Z nunca salen juntas | Todas las letras · Vocales · Consonantes · M, P, L, S, T |
| ⚠ Adivina cuál es | OA 4 | Temas («¿Cuál es una fruta?») | Una por tema |
| ⚠ Encuentra el que no va | OA 4 | Temas («¿Cuál no es una fruta?») | Una por tema |

  Cada docente puede **guardar sus propias plantillas** con nombre (**Guardar como plantilla**) y borrarlas con ✕. Al agregar una plantilla a un plan se copian sus letras o temas, así que editarla después no cambia los planes que ya la usan.
- ⚠ **Temas de palabras:** Animales, Frutas, Verduras, Alimentos, El cuerpo, Familia, Profesiones, Oficios, Medios de transporte, Ropa, Casa y objetos, Juguetes y útiles, Naturaleza y lugares, Personajes, Meses del año y Estaciones del año. Las palabras están en español de Chile (frutilla, micro, polera…). Meses y estaciones solo se usan en las actividades de vocabulario.
- **Nueva subsección «Dificultad»** (solo en términos generales): «Cada contenido del plan tiene una dificultad: **Fácil**, **Medio** (si no se elige otra) o **Difícil**. Cambia cuántas opciones hay, cuánto se parecen a la correcta y qué tan largas son las palabras; la actividad es la misma. ⚠ También se puede fijar para un niño en su perfil, y entonces manda sobre la del plan».
- **Juegos al terminar el plan:** sacar esta parte de aquí. Ahora son la actividad **Juegos** del recreo (6.3), y se suma **Globos de palabras**.
- **Tabla 9:** sin cambios en estrellas y monedas.
- **«¿Cómo se juega?»** (nuevo): antes de la primera ronda aparece una tarjeta con las instrucciones, y el botón **?** la vuelve a abrir.

### 6.5 Lo que vive el niño
- **Entrada:** el nombre se ve en MAYÚSCULAS.
- **Barra superior:** su personaje y nombre (vuelve a su inicio), sus monedas, el altavoz, el botón de salir y, en el recreo, el título **RECREO** al centro.
- **Voz:** «parte apagada» pasa a ser: «Se enciende sola al entrar. El altavoz la apaga o la vuelve a encender. Dentro de una actividad solo se dice el enunciado; las opciones no hablan al apuntarlas. Las letras se nombran («la eme»)».
- **Sala de espera:** pestañas **Globos** y **Tienda**, más la música.
- **Tienda** (reescribir): 4 pestañas.
  - **Yo**, gratis: piel, color de pelo, cara (4 expresiones y levantar la mano) y lo que uso (lentes, audífono, silla de ruedas).
  - **Cabeza**: pelo, ojos, gorros y coronas, lentes y antifaces.
  - **Ropa**: poleras, trajes, zapatos, capas y alas.
  - **Amigos y juguetes**: en la mano, mascotas y vehículos.

  Se ven 4 artículos por página. Tocar un artículo lo prueba puesto, gratis, y solo se cobra al confirmar. Lo más caro tiene un fondo de otro color. Se entra desde la espera, desde el recreo de Globos y desde el kiosko del parque.
- **Sala de actividades:** el final cambia a: «Al completar el plan ve sus estrellas por contenido y toca **¡Al recreo!** (o **Seguir**) para pasar a la sala conectada».
- **Parque** (reemplaza a Playground): toca el pasto para caminar (o usa las flechas del teclado). Tocar un juego (columpio, resbalín, balancín, cama elástica, arenero o tienda) lo lleva hasta él y juega ahí, a la vista de todos. Saluda con 8 pictogramas, 4 a la vez, con el botón **Otros dibujos** para ver el resto. Al tocar a un compañero se escucha su nombre. Hay una pelota que rueda si la patean.
- **Dibujo:** sin cambios, pero ahora es una actividad del recreo.
- **Juegos del recreo:** se juegan las veces que quiera, con **¡Jugar otra vez!** y **Volver a los juegos**.

### 6.6 Seguimiento y reportes
- Agregar: las rondas de «Palabras largas y cortas» cuentan para pasar de actividad, pero no aparecen en «Lo que más le cuesta», porque no miden una letra ni una sílaba.
- El informe del estudiante ya no muestra el nivel habilitado.
- Borrar las dos viñetas vacías que quedaron antes de la Tabla 10. En el .docx hay dos elementos de lista sin texto.

### 7. Tareas frecuentes
- **7.1 Preparar una clase:**
  1. Crear una sala de **Actividades**.
  2. Tocar **Plan**, agregar los contenidos y, si quieres, elegir la dificultad y ⚠ el tema.
  3. En **Al terminar pasan a**, tocar **Crear un recreo y conectarlo** y elegir qué se hace en el recreo.
  4. Pedir a los niños que entren.
  5. Arrastrarlos a la sala.

  El resultado esperado pasa a ser «Actividad 1 de N».
- **7.2 Atender a un niño que necesita apoyo:** sin cambios de fondo. Si se quiere, agregar ⚠ «Si le cuesta en general, puedes bajarle la dificultad en su perfil».
- **Nueva 7.x: Reutilizar una configuración de letras o temas.** En el Plan, ir a una actividad configurable, elegir las letras o temas, ponerle un nombre y tocar **Guardar como plantilla**. Después se agrega desde **Plantillas**.
- **7.4 Cerrar la clase:** cambiar «muévelos al playground» por «cámbiales el recreo» o «Sacar a todos de la sala».

### 8. Administración
- Cambiar «La versión 1.1» por «La versión 2.0».
- **8.3 Configuración avanzada:**
  - El banco de palabras y letras ahora también está en la base (tablas `palabras` y `letras`). Se edita solo desde el panel de Supabase y agrega o actualiza palabras, nunca las quita.
  - Los precios de la tienda los valida la base (`privado.articulos`).
  - Las plantillas de cada docente quedan en `plantillas_actividad`.
  - La lista de `frontend/src/contenido` debe agregar temas, tienda del personaje y parque.
- **8.4 Respaldos:**
  - Agregar que la caché de voz del servidor (`backend/.cache-voz/`) no necesita respaldo, porque se regenera.
  - La grabación de referencia de la voz clonada sí se respalda, y en un lugar privado.
  - Las posiciones del parque no se guardan.
- **Nueva 8.5 Servidor de voz:** lo mantiene el equipo técnico. Debe estar encendido durante las clases. Después de cambiar textos o actividades, o de agregar niños, se corre la precarga fuera del horario de clases (Anexo D.7).

### 9. Solución de problemas
- **Tabla 12, mensajes nuevos:**

| Mensaje | Causa | Solución |
|---|---|---|
| «Elige al menos 2 letras.» / «Esas letras suenan igual: agrega una que suene distinto.» | Selección de letras no válida | Agrega letras distintas |
| ⚠ «Elige al menos un tema.» / «"X" no se puede preguntar: necesita al menos 3 palabras claras.» | Tema sin palabras suficientes | Elige otro tema |
| «Ya tienes una plantilla con ese nombre.» | Nombre repetido | Usa otro nombre |
| «No se pudo guardar la plantilla.» / «No se pudo borrar la plantilla.» | Falla de conexión o falta la migración | Reintenta o avisa al equipo técnico |
| «No se pudo actualizar: se muestran los últimos datos. Se reintenta solo.» | Corte breve de conexión en Salas | Esperar |
| «Para usar actividades configurables falta aplicar la migración 20261103180000…» | Base sin migrar | Equipo técnico (D.6) |

- **Tabla 13:**
  - «El niño no escucha nada»: la causa ya no es «la voz parte apagada». Ahora puede ser que el niño la apagó con el altavoz, o que el servidor de voz no responde. Solución: tocar el altavoz y, si sigue sin sonar, avisar al equipo técnico.
  - «La voz suena robótica»: reemplazar por «Una frase tarda en sonar la primera vez», porque no estaba precargada. Solución: avisar al equipo técnico para que corra la precarga.
  - Agregar «Un niño no pasa solo al recreo»: la sala no tiene nada en **Al terminar pasan a**.
  - Agregar «El parque se ve lento con todo el curso»: pendiente de validar en los equipos del liceo.
  - «Necesitan tu apoyo»: sacar «sin lograr el 60 %».

### 10. Preguntas frecuentes
- «¿Se pierde el avance si cambio el plan?»: sigue vigente.
- Agregar: «¿Qué pasa cuando el niño termina el plan?», «¿Puedo cambiarle la dificultad a un solo niño?» (⚠ sí, en su perfil) y «¿Las compras de la tienda cuestan dinero real?» (no, solo monedas del juego).
- «¿Qué datos del niño se guardan?»: agregar su personaje y lo que compró en la tienda. Tampoco se guarda el género.

### 11. Soporte y contacto
- Cambiar la versión que se pide al reportar («1.1» pasa a «2.0»).

### 12. Glosario (Tabla 15)
- **Cambiar:**
  - *Avatar* pasa a ser **Personaje**.
  - *Juego*: ahora es una actividad del recreo.
  - *Playground* pasa a ser **Parque**.
  - *Plan*: sin «juegos».
  - *Sala*: tipos Actividades y Recreo.
  - *Sala de espera*: globos, tienda y música.
  - ⚠ *Umbral de aprobación*: «Lo que debe lograr el niño para pasar a la actividad siguiente: la mayoría de las rondas al primer intento».
  - *Actividad*: hasta 3 por contenido, ⚠ de más apoyo a menos.
- **Agregar:** Recreo, Ruta / Salas conectadas, Dificultad (en términos generales), Actividad configurable, Plantilla, ⚠ Tema de palabras, Tienda, Pocket-TTS, ARASAAC, Realtime y Servidor de voz. *Monedas* ya está: solo cambia «tienda de avatares» por «tienda del personaje».

### Anexos
- **A. Atajos:** agregar las flechas del teclado para caminar en el parque.
- **B. Formatos de archivo:**
  - Sacar MP3 (`frontend/public/voz` ya no existe).
  - Agregar **WAV** (frases de voz en `backend/.cache-voz/`), **PNG** (pictogramas en `frontend/public/imagenes`), **SVG** (partes del personaje y del parque) y **.safetensors** (voz de referencia).
- **C. Referencias:** agregar Pocket-TTS (Kyutai, licencia MIT). En ARASAAC, agregar la licencia **CC BY-NC-SA**, autor Sergio Palao, Gobierno de Aragón (ya va en el pie de la portada).
- **D.1 Arquitectura:**
  - Fila Voz: «Pocket-TTS en un servidor del colegio, voz Lola o una voz clonada. El backend la sirve en `GET /api/voz` y guarda cada frase. Sin voz de respaldo».
  - Fila Backend: «`/api/health` y `/api/voz`; levanta Pocket-TTS al iniciar».
  - Nueva fila: «Tiempo real: Supabase Realtime (parque)».
- **D.2 Estructura:**
  - Agregar `backend/src/voz.ts` y `servidorVoz.ts`, `backend/scripts/precargarVoz.ts`, `frontend/src/assets/personaje` y `frontend/scripts/pictogramas` (⚠).
  - Agregar `docs/avatares-tienda-playground` y `docs/migracion-metricas-banco`.
  - Sacar `frontend/scripts/frasesVoz.ts` y `generar.py`, que ya no existen.
- **D.3 Instalación:** agregar «En el servidor de voz: instalar Pocket-TTS (`pip install pocket-tts`, Python 3.10–3.14) y, si se usa voz clonada, aceptar los términos en Hugging Face y hacer `hf auth login`. Requisito de referencia: en un i5, ~1,5 s por frase nueva».
- **D.4 Configuración:**
  - Agregar `POCKET_TTS_URL` (usar `127.0.0.1`, no `localhost`), `VOZ_CACHE` y `POCKET_TTS_COMANDO` (o `no`) en `backend/.env`.
  - Agregar `VITE_DEMO=si` en `frontend/.env.local`.
- **D.5 Comandos:**
  - Reemplazar las dos filas de voz por `pnpm voz:precargar`, `pnpm voz:precargar -- --listar` y `pnpm voz:precargar -- --nombres "Sofía,Tomás"` (en `backend/`).
  - Agregar ⚠ `node scripts/pictogramas/descargar.ts` (en `frontend/`).
- **D.6 Migraciones:** agregar a la Tabla 22:
  - `20261102120000_personaje_y_parque`: personaje, tienda de artículos y canal del parque. **No se puede deshacer:** devuelve las monedas de los avatares emoji.
  - `20261103120000_salas_conectadas_recreo`: tipos Actividades y Recreo, sala siguiente, y conversión de playground y dibujo en recreos.
  - `20261103180000_metricas_banco_plan`: métricas por partida y ronda, historial de sesiones, banco de palabras y letras, plan por pasos y plantillas.
  - `20261107120000_conciencia_lexica`.
  - `20261110120000_mas_pictogramas`.
  - `20261111120000_quitar_acciones`.
  - ⚠ `20261118120000_temas_vocabulario`: temas, 56 palabras nuevas y «fresa» pasa a «frutilla».

  Además, cambiar el Consejo: el modo demo ahora se activa con `VITE_DEMO=si`, sin editar `datos/index.ts`.
- **D.7 Voz:** reescribir con el resumen de `frontend/scripts/voz/README.md`:
  - Pocket-TTS en el servidor del colegio, con clonación a partir de 5 a 10 s de grabación, y solo con permiso de la persona.
  - Caché de frases.
  - Precarga de unas 3.500 frases, alrededor de 1 hora la primera vez.
  - Sin respaldo del navegador.
  - Al cambiar la voz, borrar la caché y volver a precargar.
- **D.8 Privacidad:** agregar:
  - La grabación de referencia necesita consentimiento.
  - Las posiciones del parque no pasan por la base.
  - No se guarda el género.
  - Los pictogramas son de uso no comercial (CC BY-NC-SA).
- **D.9 Problemas de instalación:**
  - Reemplazar «Error al crear una sala de dibujo», porque dibujo ya no es un tipo de sala.
  - Agregar «No suena ninguna voz / `TypeError: fetch failed`» (`POCKET_TTS_URL` con `localhost`, o Pocket-TTS no está en el PATH).
  - Agregar «Las actividades configurables no se guardan» (falta la migración `20261103180000`).

---

## 4. Hallazgos en el repositorio (fuera del manual)

1. **`backend/.env.example`, última línea:** quedó una línea corrupta sin `#` (`uta<tab vertical>env\Scripts\pocket-tts.exe serve …`). Es un `\r` y un `\v` de la ruta `C:\ruta\venv` que se interpretaron al escribir el archivo. Hay que borrarla.
2. **La pantalla de entrada del niño no suena** (según el código, sin probar en la app). La voz solo se enciende dentro de la pantalla del niño (`ui/nino.tsx` → `fijarMudo`), y la entrada está fuera de ella. Por eso «¿Quién eres? Toca tu foto» y «¡Hola, NOMBRE!» nunca suenan.
3. **«Imágenes: Fotografía real»** no tiene efecto, porque no hay fotos cargadas.
4. **`nivel_habilitado`** se guarda, pero nada lo usa ni lo muestra.
5. **«Bajar a…» y «Van muy bien»** aparecen en Salas, pero por decisión quedan fuera del manual 2.0. La docente los verá sin explicación. Conviene ocultarlos hasta validarlos o agregarlos en la próxima versión del manual.
6. `docs/avatares-tienda-playground/README.md` todavía dice que la migración de salas conectadas está «pendiente» y pide «Actualizar el manual». Hay que revisarlo después de aplicar esta propuesta.
7. `frontend/README.md` es la plantilla de Vite en inglés: no sirve como documentación del proyecto.
