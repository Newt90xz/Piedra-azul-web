# Voz de la app (Pocket-TTS)

La app habla con [Pocket-TTS](https://github.com/kyutai-labs/pocket-tts), de Kyutai (código MIT), en
**tiempo real** y con **clonación zero-shot**: imita la voz de una grabación corta. Si el servidor de
voz no está disponible, usa los audios pregrabados (más abajo) y, si tampoco están, la voz del navegador.

```
PC del niño ──GET /api/voz?texto=…──▶ backend (Express) ──POST /tts──▶ pocket-tts serve
            ◀── audio mientras se genera ──┘  guarda cada frase en .cache-voz/
```

El modelo corre en **un solo computador** (el servidor o el PC de la docente), no en los del colegio:
ellos solo reproducen. Medido en un i5 de escritorio: la frase empieza a sonar en ~1,5 s la primera
vez y al instante desde la segunda (queda guardada en `backend/.cache-voz/`).

## Voz en tiempo real

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
   - `frontend/.env`: `VITE_VOZ_EN_VIVO=si` (y reiniciar `pnpm dev`, Vite lee el `.env` al arrancar).

Al cambiar la voz de referencia, borrar `backend/.cache-voz/` para que las frases se generen de nuevo
con la voz nueva.

## Audios pregrabados (respaldo)

Las frases también se pueden pregrabar **por trozos** (cada oración o palabra suelta, ver
`src/lib/claveVoz.ts`) que la app encadena. Así unas 17.000 frases posibles quedan en unos 2.100
audios cortos. Sirven si el servidor de voz está apagado o no hay red hasta él.

## Generar los audios

Pocket-TTS corre en el procesador, sin tarjeta gráfica. En un i5 de escritorio el modelo normal
genera unas 2,5 veces más rápido que el tiempo real: todo el catálogo toma del orden de 20 minutos
(el de alta calidad, unas 3 veces más).

```bash
# 1. Entorno de Python (fuera del repo o en una carpeta ignorada), Python 3.10 a 3.14
python -m venv venv-voz
venv-voz\Scripts\activate          # Windows  (Linux/Mac: source venv-voz/bin/activate)
pip install pocket-tts soundfile

# 2. Desde la carpeta frontend/: catálogo de trozos y generación
node scripts/frasesVoz.ts           # escribe scripts/voz/trozos.json
python scripts/voz/generar.py       # escribe public/voz/*.mp3 y public/voz/indice.json
```

| Opción | Qué hace |
| --- | --- |
| `--max 20` | Genera solo 20 trozos, para escuchar antes de hacer todo |
| `--calidad alta` | Modelo de 24 capas (`spanish_24l`): voz más natural, unas 3 veces más lento |
| `--voz archivo.wav` | Imita la voz de una grabación limpia de 5 a 10 segundos en vez de Lola |

- Si se corta, se vuelve a correr y sigue donde quedó (no regenera lo que ya existe).
- El modelo se descarga la primera vez. Para guardarlo en otro disco: variable `HF_HOME`.
- **Imitar una voz** (`--voz`) requiere aceptar los términos del modelo en
  [huggingface.co/kyutai/pocket-tts](https://huggingface.co/kyutai/pocket-tts) e iniciar sesión con
  `hf auth login`. Usar solo grabaciones con permiso de la persona.
- Al final lista los trozos **descartados** (el audio salió demasiado largo varias veces); esos quedan
  con la voz del navegador. Se pueden reintentar volviendo a correr el script.

Luego se hace commit de `frontend/public/voz/`.

## Cuándo volver a generar

- **Se agregan o cambian textos** de actividades, palabras del banco o pantallas del niño: correr de
  nuevo los dos comandos; solo se generan los trozos nuevos. Los audios que ya nadie usa se pueden borrar.
- **Nombres de los niños**: no se conocen de antemano. Escribirlos en `scripts/voz/nombres.txt`
  (uno por línea) y volver a correr; así también el «¡Hola, Sofía!» suena con la voz de la app. Sin
  eso, el saludo dice solo «¡Hola!».
- **Cambiar la voz o la calidad**: borrar `public/voz/` y generar todo con las opciones nuevas.

## Audios grabados por una persona

Los sonidos sueltos de las letras («mmm», «sss») son lo más difícil para cualquier voz sintética
(RNF-04 pide grabaciones validadas por la educadora). Para reemplazar un trozo, buscar su clave en
`scripts/voz/trozos.json` y guardar la grabación como `public/voz/<clave>.mp3`: el generador nunca
pisa un archivo que ya existe y la app lo usa en vez del generado.
