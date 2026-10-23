"""Genera los audios de la voz de la app con Qwen3-TTS (voz «Serena»).

Lee scripts/voz/trozos.json (lo escribe scripts/frasesVoz.ts) y deja un MP3 por
trozo en public/voz/<clave>.mp3, más public/voz/indice.json con las claves
disponibles. Retoma donde quedó: lo que ya existe no se vuelve a generar. Un
audio grabado por una persona con el mismo nombre de archivo nunca se pisa.

    python scripts/voz/generar.py            # todo lo que falte
    python scripts/voz/generar.py --max 20   # solo unos pocos, para probar

Ver scripts/voz/README.md para instalar el entorno.
"""

import argparse
import json
import os
import re
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI.parent.parent / "public" / "voz"

MODELO = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
VOZ = "Serena"
ESTILO = (
    "Habla en español latinoamericano como una educadora de párvulos: cálida, alegre y cariñosa, "
    "despacio y muy clara, para niños de cinco años."
)
# Silencio que se deja al inicio y al final de cada trozo (la app los encadena).
MARGEN_S = 0.04
UMBRAL_SILENCIO = 0.01
PICO = 0.89  # ≈ -1 dBFS: todos los trozos suenan igual de fuerte
# Con textos muy cortos el modelo a veces divaga: si el audio dura más que esto
# para su texto, se reintenta; si sigue mal, se descarta (la app usa la voz del navegador).
SEGUNDOS_POR_LETRA = 0.18
SEGUNDOS_BASE = 1.2
INTENTOS = 3

UNIDADES = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte veintiuno veintidós veintitrés veinticuatro veinticinco veintiséis veintisiete veintiocho veintinueve".split()
DECENAS = {30: "treinta", 40: "cuarenta", 50: "cincuenta", 60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa"}
CENTENAS = {100: "ciento", 200: "doscientos", 300: "trescientos"}


def numero_en_palabras(n: int) -> str:
    if n < 30:
        return UNIDADES[n]
    if n < 100:
        d, u = divmod(n, 10)
        return DECENAS[d * 10] + (f" y {UNIDADES[u]}" if u else "")
    if n == 100:
        return "cien"
    c, r = divmod(n, 100)
    return CENTENAS[c * 100] + (f" {numero_en_palabras(r)}" if r else "")


def para_leer(texto: str) -> str:
    # «Ganaste 50 monedas» → «Ganaste cincuenta monedas»; la clave del archivo no cambia.
    texto = re.sub(r"\d+", lambda m: numero_en_palabras(int(m.group())), texto)
    # Concordancia: «un globo», «veintiún monedas», «una sílaba».
    texto = re.sub(r"\buno(?= sílaba)", "una", texto)
    return re.sub(r"\b(veinti)?uno(?= (monedas|globos))", lambda m: "veintiún" if m.group(1) else "un", texto)


def recortar(audio: np.ndarray, sr: int) -> np.ndarray:
    sonoro = np.flatnonzero(np.abs(audio) > UMBRAL_SILENCIO)
    if sonoro.size == 0:
        return audio
    margen = int(MARGEN_S * sr)
    return audio[max(0, sonoro[0] - margen) : sonoro[-1] + margen]


def normalizar(audio: np.ndarray) -> np.ndarray:
    pico = np.max(np.abs(audio))
    return audio if pico == 0 else audio * (PICO / pico)


def escribir_indice() -> int:
    claves = sorted(p.stem for p in SALIDA.glob("*.mp3"))
    (SALIDA / "indice.json").write_text(json.dumps(claves), encoding="utf-8")
    return len(claves)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=0, help="generar como mucho N trozos")
    args = parser.parse_args()

    trozos = json.loads((AQUI / "trozos.json").read_text(encoding="utf-8"))
    SALIDA.mkdir(parents=True, exist_ok=True)
    pendientes = [t for t in trozos if not (SALIDA / f"{t['clave']}.mp3").exists()]
    if args.max:
        pendientes = pendientes[: args.max]
    print(f"{len(trozos)} trozos, faltan {len(pendientes)}", flush=True)
    if not pendientes:
        print(f"índice: {escribir_indice()} audios")
        return

    torch.set_num_threads(os.cpu_count() or 4)
    usar_gpu = torch.cuda.is_available()
    modelo = Qwen3TTSModel.from_pretrained(
        MODELO,
        device_map="cuda:0" if usar_gpu else "cpu",
        dtype=torch.bfloat16 if usar_gpu else torch.float32,
    )

    inicio = time.time()
    descartados = []
    for i, t in enumerate(pendientes, 1):
        texto = para_leer(t["texto"])
        maximo = SEGUNDOS_BASE + SEGUNDOS_POR_LETRA * len(texto)
        audio = None
        for _ in range(INTENTOS):
            wavs, sr = modelo.generate_custom_voice(text=texto, language="Spanish", speaker=VOZ, instruct=ESTILO)
            candidato = recortar(np.asarray(wavs[0], dtype=np.float32), sr)
            if len(candidato) / sr <= maximo:
                audio = normalizar(candidato)
                break
        if audio is None:
            descartados.append(t["texto"])
            print(f"[{i}/{len(pendientes)}] DESCARTADO (dura demasiado): {t['texto']}", flush=True)
            continue
        destino = SALIDA / f"{t['clave']}.mp3"
        # Se escribe aparte y se renombra: un corte a medias no deja un MP3 roto.
        temporal = destino.with_suffix(".tmp.mp3")
        sf.write(temporal, audio, sr, format="MP3")
        temporal.replace(destino)
        transcurrido = time.time() - inicio
        restante = transcurrido / i * (len(pendientes) - i)
        print(f"[{i}/{len(pendientes)}] {t['texto'][:50]:50}  quedan ~{restante / 60:.0f} min", flush=True)
        if i % 25 == 0:
            escribir_indice()

    print(f"índice: {escribir_indice()} audios")
    if descartados:
        print(f"{len(descartados)} descartados (quedan con la voz del navegador):", *descartados, sep="\n  ")


if __name__ == "__main__":
    main()
