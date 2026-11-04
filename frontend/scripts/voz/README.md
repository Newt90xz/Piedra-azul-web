# Voz de la app (Pocket-TTS)

La app usa exclusivamente [Pocket-TTS](https://github.com/kyutai-labs/pocket-tts), de Kyutai (código MIT),
con **clonación zero-shot**: imita la voz de una grabación corta. Si el servidor de voz no está disponible,
no se reproduce ninguna voz alternativa.

```
PC del niño ──GET /api/voz?texto=…──▶ backend (Express) ──POST /tts──▶ pocket-tts serve
            ◀──────── audio WAV ───────────┘  guarda cada frase en .cache-voz/
```

- `pnpm dev` levanta Pocket-TTS solo (comando `POCKET_TTS_COMANDO`, por defecto
  `pocket-tts serve --language spanish --host 127.0.0.1 --port 8000`). Las primeras frases esperan a que
  cargue el modelo (unos segundos) en vez de fallar.
- El modelo genera una frase a la vez: lo que el niño está esperando pasa antes que la precarga.
- Durante una actividad la app precarga el refuerzo y el enunciado de la ronda siguiente.
- Solo se dice el enunciado: las opciones, teclas, fichas y globos no hablan. Los sonidos de las letras
  se dicen por su nombre («la eme»), porque la voz sintética alarga mal los sonidos sueltos («mmmm»).

El modelo corre en **un solo computador** (el servidor o el PC de la docente), no en los del colegio:
ellos solo reproducen. Medido en un i5 de escritorio: la frase empieza a sonar en ~1,5 s la primera
vez y al instante desde la segunda (queda guardada en `backend/.cache-voz/`).

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
4. **Levantar el servidor de voz** (dejarlo corriendo durante la clase):
   ```bash
   pocket-tts serve --language spanish --default-voice voz.safetensors --host 0.0.0.0 --port 8000
   ```
   Sin `--default-voice` usa a Lola. `--language spanish_24l` suena más natural pero es ~3 veces más lento.
5. Configurar la app (`backend/.env`):
   - `POCKET_TTS_URL=http://127.0.0.1:8000` (usar `127.0.0.1`, no `localhost`: con `localhost` Node puede
     intentar por IPv6 y el fetch falla con «TypeError: fetch failed»).
   - Si `pocket-tts` no está en el PATH (p. ej. está en un venv), poner la ruta completa, sin comillas:
     `POCKET_TTS_COMANDO=C:\ruta\venv\Scripts\pocket-tts.exe serve --language spanish --host 127.0.0.1 --port 8000`.
utaenv\Scripts\pocket-tts.exe serve --language spanish --host 127.0.0.1 --port 8000`.
     Con `POCKET_TTS_COMANDO=no` el backend no lo levanta (se levanta aparte).

Al cambiar la voz de referencia, borrar `backend/.cache-voz/` para que las frases se generen de nuevo
con la voz nueva.

## Audios grabados por una persona

Los sonidos sueltos de las letras («mmm», «sss») son lo más difícil para cualquier voz sintética
(RNF-04 pide grabaciones validadas por la educadora). Para reemplazar un trozo, buscar su clave en
`scripts/voz/trozos.json` y guardar la grabación como `public/voz/<clave>.mp3`: el generador nunca
pisa un archivo que ya existe y la app lo usa en vez del generado.
