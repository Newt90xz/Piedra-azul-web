# Voz de la app (Serena · Qwen3-TTS)

La app habla con la voz **Serena** del modelo [Qwen3-TTS 0.6B CustomVoice](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice)
(Apache-2.0). La voz **no se genera en los computadores del colegio**: se pregraba una sola vez
y la app solo reproduce archivos MP3 livianos.

Las frases se graban **por trozos** (cada oración o palabra suelta, ver `src/lib/claveVoz.ts`) y la
app los encadena. Así ~10.000 frases posibles quedan en ~1.550 audios cortos. Si falta algún trozo,
la app dice esa frase con la voz del navegador, así que funciona aunque la generación no esté completa.

## Generar los audios (con GPU)

Requisitos: Python 3.12, Node 24 y una GPU NVIDIA con CUDA (~2 GB de VRAM bastan). En CPU también
funciona, pero tarda unas 4 horas; con GPU, del orden de minutos.

```bash
# 1. Entorno de Python (fuera del repo o en una carpeta ignorada)
python -m venv venv-voz
venv-voz\Scripts\activate          # Windows  (Linux/Mac: source venv-voz/bin/activate)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu128   # según tu versión de CUDA
pip install qwen-tts soundfile

# 2. Desde la carpeta frontend/: catálogo de trozos y generación
node scripts/frasesVoz.ts           # escribe scripts/voz/trozos.json
python scripts/voz/generar.py       # escribe public/voz/*.mp3 y public/voz/indice.json
```

- `python scripts/voz/generar.py --max 20` genera solo 20, para escuchar antes de hacer todo.
- Si se corta, se vuelve a correr y sigue donde quedó (no regenera lo que ya existe).
- El modelo (~2,4 GB) se descarga la primera vez. Para guardarlo en otro disco: variable `HF_HOME`.
- Al final lista los trozos **descartados** (el modelo divagó varias veces); esos quedan con la voz
  del navegador. Se pueden reintentar volviendo a correr el script.

Luego se hace commit de `frontend/public/voz/` (son ~10–15 MB).

## Cuándo volver a generar

- **Se agregan o cambian textos** de actividades, palabras del banco o pantallas del niño: correr de
  nuevo los dos comandos; solo se generan los trozos nuevos. Los audios que ya nadie usa se pueden borrar.
- **Nombres de los niños**: no se conocen de antemano. Escribirlos en `scripts/voz/nombres.txt`
  (uno por línea) y volver a correr; así también el «¡Hola, Sofía!» suena con Serena. Sin eso, el
  saludo dice solo «¡Hola!».
- **Cambiar la voz o el estilo**: editar `VOZ` / `ESTILO` en `generar.py`, borrar `public/voz/` y generar todo.

## Audios grabados por una persona

Los sonidos sueltos de las letras («mmm», «sss») son lo más difícil para cualquier voz sintética
(RNF-04 pide grabaciones validadas por la educadora). Para reemplazar un trozo, buscar su clave en
`scripts/voz/trozos.json` y guardar la grabación como `public/voz/<clave>.mp3`: el generador nunca
pisa un archivo que ya existe y la app lo usa en vez del generado.
