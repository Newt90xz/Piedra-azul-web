# Voz de la app (Pocket-TTS)

La app usa exclusivamente [Pocket-TTS](https://github.com/kyutai-labs/pocket-tts), de Kyutai (código MIT),
con **clonación zero-shot**: imita la voz de una grabación corta. Si el servidor de voz no está disponible,
no se reproduce ninguna voz alternativa.

```
PC del niño ──GET /api/voz?texto=…──▶ backend (Express) ──POST /tts──▶ pocket-tts serve
            ◀── audio mientras se genera ──┘  guarda cada frase en .cache-voz/
```

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
5. Configurar la app:
   - `backend/.env`: `POCKET_TTS_URL=http://<computador-del-servidor>:8000`

Al cambiar la voz de referencia, borrar `backend/.cache-voz/` para que las frases se generen de nuevo
con la voz nueva.

- **Cambiar la voz o la calidad**: borrar `public/voz/` y generar todo con las opciones nuevas.

## Audios grabados por una persona

Los sonidos sueltos de las letras («mmm», «sss») son lo más difícil para cualquier voz sintética
(RNF-04 pide grabaciones validadas por la educadora). Para reemplazar un trozo, buscar su clave en
`scripts/voz/trozos.json` y guardar la grabación como `public/voz/<clave>.mp3`: el generador nunca
pisa un archivo que ya existe y la app lo usa en vez del generado.
