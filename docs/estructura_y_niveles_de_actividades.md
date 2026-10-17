# 02. Estructura de los Niveles y Catálogo de Actividades
**Proyecto:** Prototipo de plataforma web «Leer para Todos»  
**Alcance Pedagógico:** Desde el reconocimiento de vocales/consonantes hasta la unión de sílabas en palabras simples (`RF-04` a `RF-09`).

---

## 1. Visión General de la Progresión (`RF-09`)

Dado que en Pre-Kínder y Kínder la meta máxima esperada es la manipulación silábica y la decodificación de palabras simples (siendo excepcionales los casos de lectura fluida), el software estructura su ruta de aprendizaje en **3 Niveles Secuenciales** más **1 Módulo Transversal de Comprensión y Motivación**.

```
[ NIVEL 1: SONIDOS ]  --->  [ NIVEL 2: SÍLABAS ]  --->  [ NIVEL 3: PALABRAS SIMPLES ]
 (Vocales y Fonemas)         (Unión C+V y Palmadas)       (Juntar Sílabas + Imagen)
         ^                            ^                              ^
         |____________________________|______________________________|
                                      |
               [ MÓDULO TRANSVERSAL: CUENTOS Y CANCIONES ]
                 (Escucha activa, rimas y pictogramas)
```

* **Regla de desbloqueo (`RF-09`, `RF-15`):** El estudiante avanza de forma secuencial al completar las micro-actividades de cada etapa, pero la educadora diferencial tiene control total desde su panel para desbloquear o asignar libremente cualquier nivel o letra según la necesidad del niño.

---

## 2. Desglose de los 3 Niveles de Aprendizaje

### NIVEL 1: Descubriendo los Sonidos (Conciencia Fonémica)
* **Objetivo Pedagógico:** Que el estudiante reconozca las vocales y las primeras consonantes por su **sonido puro (fonema)**, observe cómo se articulan con la boca e identifique ese sonido al inicio de palabras familiares.
* **Secuencia interna de contenidos:**
  * **Etapa 1.1 - Vocales:** `A`, `E`, `I`, `O`, `U`.
  * **Etapa 1.2 - Consonantes Iniciales (por facilidad articulatoria):** Se inicia con fonemas bilabiales y continuos fáciles de visualizar e imitar: `M`, `P`, `L`, `S`, `T` (escalable a más consonantes mediante base de datos según `RNF-14`).

#### Mecánicas de Actividad del Nivel 1:
1. **Explorar el Sonido y la Boca (`RF-04`, `RF-19`):**
   * **En pantalla:** Aparece la letra grande en imprenta (ej. `M`), un botón de altavoz y la ilustración/foto de apoyo articulatorio (labios juntos).
   * **Acción:** Al tocar la letra, suena con voz humana `"mmmm"` y se destaca un ejemplo con foto real (ej. *Mano*).
2. **¿Qué empieza con este sonido? (Sonido Inicial - `OA 3`):**
   * **Instrucción narrada:** *"Escucha el sonido 'aaaa'... Toca el dibujo que empieza con 'aaaa'"*.
   * **En pantalla:** Letra `A` al centro y hasta 3 o 4 tarjetas grandes abajo con fotografías reales o pictogramas (ej. *Auto*, *Perro*, *Sol*).
   * **Acción:** El niño hace clic en *Auto*.
3. **Caza de Letras (Asociación Fonema-Grafema - `OA 7`):**
   * **Instrucción narrada:** *"Toca la letra que suena 'ssss'"*.
   * **En pantalla:** 3 o 4 burbujas o tarjetas con letras distintas (`S`, `M`, `A`).

---

### NIVEL 2: Juntando y Contando Sílabas (Síntesis y Conciencia Silábica)
* **Objetivo Pedagógico:** Que el estudiante comprenda cómo se une el sonido de una consonante con una vocal para formar una **sílaba directa (`CV`)** sin deletrear, y logre segmentar palabras conocidas en sílabas.
* **Secuencia interna de contenidos:**
  * Sílabas directas con las consonantes vistas en el Nivel 1 (`MA, ME, MI, MO, MU`, `PA, PE, PI, PO, PU`, `LA, LE, LI, LO, LU`, `SA, SE, SI, SO, SU`).

#### Mecánicas de Actividad del Nivel 2:
1. **El Choque de Sonidos (Síntesis Fonética - `RF-05`):**
   * **Instrucción narrada:** *"Mira y escucha cómo se juntan los sonidos"*.
   * **En pantalla:** A la izquierda está la `M` y a la derecha la `A`.
   * **Acción:** El estudiante toca el botón central (o arrastra la letra). Ambas letras se deslizan hasta juntarse mientras el audio reproduce de forma continua `"mmmm... aaaa... ¡MA!"`, mostrando el bloque final `MA`.
2. **Aplausos Silábicos (Segmentación y Conteo - `RF-06`, `OA 3`):**
   * **Instrucción narrada:** *"¿Cuántas sílabas tiene PELOTA? Toca las palmas para contar"*.
   * **En pantalla:** Fotografía real de una *Pelota* y debajo círculos o íconos de manos/aplausos.
   * **Acción:** El niño toca cada palma; con cada clic suena una sílaba (`"PE"` - `"LO"` - `"TA"`) y se ilumina la palma, reforzando visual y auditivamente que tiene 3 sílabas. Luego selecciona el número o cantidad de aplausos correspondiente.
3. **¿Con qué sílaba empieza? (Identificación de Sílaba Inicial - `RF-06`):**
   * **Instrucción narrada:** *"Toca la imagen que empieza con 'MA'"*.
   * **En pantalla:** Tarjeta superior con `MA` y abajo 3 fotografías reales/pictogramas (*Manzana*, *Luna*, *Pato*).

---

### NIVEL 3: Armando mis Primeras Palabras (Decodificación Inicial)
* **Objetivo Pedagógico:** Representa el nivel máximo esperado para la etapa de transición en el prototipo. El estudiante une **dos sílabas directas conocidas** para formar una palabra simple (principalmente bisílabas de estructura `CV + CV`) y la asocia con su significado real (`RF-07`, `RF-08`, `OA 7`).
* **Palabras objetivo del MVP:** Palabras concretas y familiares formadas con los fonemas `M, P, L, S`: *Mamá, Papá, Mesa, Mano, Mapa, Pelo, Pala, Puma, Sapo, Sopa, Sala, Luna, Lupa*.

#### Mecánicas de Actividad del Nivel 3:
1. **Constructor de Palabras (Unión de Sílabas - `RF-07`):**
   * **Instrucción narrada:** *"Junta las sílabas para formar la palabra SAPO"*.
   * **En pantalla:** Fotografía real de un *Sapo* en la parte superior, dos casillas vacías `[ __ ] + [ __ ]` y abajo 3 fichas con sílabas (`SA`, `PO`, `ME`).
   * **Acción:** Al tocar `SA` suena `"sa"` y sube a la primera casilla; al tocar `PO` suena `"po"` y sube a la segunda. Al completarse, las casillas se unen, se reproduce `"¡SAPO!"` y se anima la fotografía.
2. **¿Qué dice aquí? (Asociación Palabra a Imagen Real/Pictograma - `RF-07`, `RF-08`):**
   * **Instrucción narrada:** *"Une las sílabas y toca la foto correcta"*.
   * **En pantalla:** La palabra `ME - SA` (el niño puede tocar cada sílaba para escuchar su sonido de apoyo) y debajo 3 fotografías reales (*Mesa*, *Mano*, *Sopa*).
3. **Completa la Sílaba que Falta (`RF-06`, `RF-07`):**
   * **Instrucción narrada:** *"¿Qué sílaba falta para completar LU - NA?"*.
   * **En pantalla:** Foto real de la *Luna*, el texto `[ LU ] [ __ ]` y 3 opciones de sílabas abajo (`NA`, `PA`, `SO`).

---

## 3. Módulo Transversal: Cuentos Interactivos y Canciones (`RF-18`, `RF-23`)

Para cumplir con los requerimientos `RF-18` (Must) y `RF-23` (Should) sin exigir lectura autónoma de textos largos a niños de Pre-Kínder y Kínder:

### 3.1 Cuentos Narrados con Formato Dual (`RF-18`, `OA 6`)
* **Estructura:** Historias breves (mínimo 50 palabras de trama total divididas en 3 o 4 escenas cortas) ambientadas en las temáticas de interés de los niños (dinosaurios, animales, océano, deportes).
* **Experiencia en pantalla:** 
  * Reproducción automática o por botón de la narración con voz humana.
  * **Texto con apoyo pictográfico/fotográfico:** Las palabras clave del cuento muestran arriba o al lado su fotografía real o pictograma ARASAAC, destacando visualmente las letras o sílabas que el niño está aprendiendo en esa unidad.
  * **Cierre comprensivo:** Al final de la escena, se hace una pregunta oral simple (*"¿Dónde estaba el dinosaurio?"*) y el niño responde tocando una de las 3 imágenes en pantalla.

### 3.2 Canciones y Rimas Fonéticas (`RF-23`)
* **Estructura:** Al menos 1 canción o rima corta por cada vocal y consonante inicial.
* **Experiencia en pantalla:** Reproductor visual simple donde el niño escucha la rima y puede tocar objetos en pantalla que suenan al ritmo de la sílaba o vocal trabajada.