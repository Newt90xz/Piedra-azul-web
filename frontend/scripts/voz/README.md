# Voz de la app (Lola · Pocket-TTS)

La app habla con la voz **Lola** de [Pocket-TTS](https://github.com/kyutai-labs/pocket-tts), de Kyutai
(código MIT; voz española del catálogo de Kyutai). La voz **no se genera en los computadores del
colegio**: se pregraba una sola vez y la app solo reproduce archivos MP3 livianos.

Las frases se graban **por trozos** (cada oración o palabra suelta, ver `src/lib/claveVoz.ts`) y la
app los encadena. Así unas 17.000 frases posibles quedan en unos 2.100 audios cortos. Si falta algún
trozo, la app dice esa frase con la voz del navegador, así que funciona aunque la generación no esté
completa.

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
