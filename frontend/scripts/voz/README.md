# Voz de la app (Pocket-TTS)

La app usa exclusivamente [Pocket-TTS](https://github.com/kyutai-labs/pocket-tts), de Kyutai (código MIT),
con **clonación zero-shot**: imita la voz de una grabación corta. Si el servidor de voz no está disponible,
no se reproduce ninguna voz alternativa.

```
PC del niño ──GET /api/voz?texto=…──▶ backend (Express) ──POST /tts──▶ pocket-tts serve
            ◀──────── audio WAV ───────────┘  guarda cada frase en backend/.cache-voz/
```

- `pnpm dev` (backend) levanta Pocket-TTS solo (comando `POCKET_TTS_COMANDO`, por defecto
  `pocket-tts serve --language spanish --host 127.0.0.1 --port 8000`). Las primeras frases esperan a que
  cargue el modelo (unos segundos) en vez de fallar.
- El modelo genera una frase a la vez: lo que el niño está esperando pasa antes que la precarga.
- Durante una actividad la app precarga el refuerzo y el enunciado de la ronda siguiente.
- Solo se dice el enunciado: las opciones, teclas, fichas y globos no hablan. Los sonidos de las letras
  se dicen por su nombre («la eme»), porque la voz sintética alarga mal los sonidos sueltos («mmmm»).

El modelo corre en **un solo computador** (el servidor o el PC de la docente), no en los del colegio:
ellos solo reproducen. Medido en un i5 de escritorio: una frase nueva tarda ~1,5 s en empezar a sonar;
una que ya está en la caché suena al instante.

## Dejar generado lo que se repite

Las frases que la app dice una y otra vez se generan de antemano, para que suenen al instante desde la
primera vez:

```bash
cd backend
pnpm voz:precargar                 # todo lo que falte (se puede cortar con Ctrl+C y retomar)
pnpm voz:precargar -- --listar     # solo cuenta lo que hay y lo que falta
pnpm voz:precargar -- --nombres "Sofía,Tomás"
```

Levanta Pocket-TTS si no está corriendo y lo cierra al terminar. Conviene correrlo después de cambiar
textos o actividades, y fuera del horario de clases (la primera vez son ~3.500 frases, ~1 hora).

Qué frases entran (`frontend/src/lib/catalogoVoz.ts`):

- **Pantallas:** las frases fijas escritas en el código (`hablar('…')`, `voz="…"`, `voz: '…'`), leídas
  directo de los archivos. Las que se arman con datos (un nombre, un precio) van en
  `frontend/src/contenido/frases.ts`; una prueba falla si una pantalla arma una frase con `${…}` fuera de ahí.
- **Datos:** títulos e instrucciones de los contenidos, emociones, tienda, dibujo, parque y premios.
- **Actividades:** se juegan muchas partidas de cada una y se quedan las frases que aparecen al menos en
  1 de cada 100. Las que combinan palabras al azar («Escucha: sol… mariposa… pato. ¿Cuál es la más
  larga?») casi nunca se repiten: se generan en vivo, con la precarga de la ronda siguiente.
- **Nombres de los niños** (saludo y perfil): se leen de la base con la clave `service_role` de
  `backend/.env`; sin ella, se pasan con `--nombres`.

## Configurar Pocket-TTS

1. Instalar Pocket-TTS (Python 3.10 a 3.14): `pip install pocket-tts`.
2. **Habilitar la clonación** (una vez): aceptar los términos del modelo en
   [huggingface.co/kyutai/pocket-tts](https://huggingface.co/kyutai/pocket-tts) e iniciar sesión con
   `hf auth login`. Sin esto solo se pueden usar las voces del catálogo (`lola` en español).
3. **Grabación de referencia:** 5 a 10 segundos de la voz a imitar, hablando claro, sin ruido ni
   música (el modelo copia también el ambiente de la grabación). Solo con permiso de la persona.
   Conviene convertirla una vez a `.safetensors` para que el servidor arranque más rápido:
   ```bash
   pocket-tts export-voice referencia.wav voz.safetensors --language spanish
   ```
4. **Levantar el servidor de voz** a mano (si no lo levanta el backend):
   ```bash
   pocket-tts serve --language spanish --default-voice voz.safetensors --host 0.0.0.0 --port 8000
   ```
   Sin `--default-voice` usa a Lola. `--language spanish_24l` suena más natural pero es ~3 veces más lento.
5. Configurar la app (`backend/.env`):
   - `POCKET_TTS_URL=http://127.0.0.1:8000` (usar `127.0.0.1`, no `localhost`: con `localhost` Node puede
     intentar por IPv6 y el fetch falla con «TypeError: fetch failed»).
   - Si `pocket-tts` no está en el PATH (p. ej. está en un venv), poner la ruta completa, sin comillas:
     `POCKET_TTS_COMANDO=C:\ruta\venv\Scripts\pocket-tts.exe serve --language spanish --host 127.0.0.1 --port 8000`.
     Con `POCKET_TTS_COMANDO=no` el backend no lo levanta (se levanta aparte).

Al cambiar la voz de referencia, borrar `backend/.cache-voz/` y volver a correr `pnpm voz:precargar`
para que las frases se generen con la voz nueva.
