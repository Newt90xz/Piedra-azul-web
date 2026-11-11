"""Generate one Lola-voice WAV for every built-in pictogram word."""

from __future__ import annotations

import argparse
import re
import unicodedata
import wave
from pathlib import Path
from typing import TYPE_CHECKING

ROOT = Path(__file__).resolve().parent
BANK_FILE = ROOT / "frontend" / "src" / "contenido" / "banco.ts"
OUTPUT_DIR = ROOT / "audios"
LOLA_VOICE = "lola"

if TYPE_CHECKING:
    from torch import Tensor


def load_words() -> list[str]:
    """Read the words passed to the pictogram factory in banco.ts."""
    source = BANK_FILE.read_text(encoding="utf-8")
    words = re.findall(r"""\bp\(\s*(['"])(.*?)\1\s*,""", source)
    unique_words = list(dict.fromkeys(word for _, word in words))
    if not unique_words:
        raise RuntimeError(f"No pictogram words found in {BANK_FILE}")
    return unique_words


def filename_for(word: str) -> str:
    normalized = unicodedata.normalize("NFKD", word)
    ascii_word = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_word).strip("-")
    if not slug:
        raise ValueError(f"Cannot create a filename for {word!r}")
    return f"{slug}.wav"


def save_wav(path: Path, sample_rate: int, audio: Tensor) -> None:
    import numpy as np

    samples = np.asarray(audio.detach().cpu().numpy()).squeeze()
    if samples.ndim != 1:
        raise ValueError(f"Expected mono audio for {path.name}, got shape {samples.shape}")
    pcm16 = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm16.tobytes())


def generate(words: list[str], overwrite: bool) -> None:
    try:
        from pocket_tts import TTSModel
    except ImportError as error:
        raise SystemExit(
            "Pocket-TTS no está instalado en este Python. Instálalo con: "
            "py -3.11 -m pip install pocket-tts"
        ) from error

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model = TTSModel.load_model(language="spanish")
    voice_state = model.get_state_for_audio_prompt(LOLA_VOICE)

    for index, word in enumerate(words, start=1):
        output_file = OUTPUT_DIR / filename_for(word)
        if output_file.exists() and not overwrite:
            print(f"[{index}/{len(words)}] Ya existe, se omite: {output_file.name}")
            continue
        print(f"[{index}/{len(words)}] Generando: {word}")
        audio = model.generate_audio(voice_state, word)
        save_wav(output_file, model.sample_rate, audio)

    print(f"Audios guardados en: {OUTPUT_DIR}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace WAV files that already exist.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List the words without loading the TTS model.",
    )
    args = parser.parse_args()
    words = load_words()

    if args.list:
        print(f"{len(words)} palabras:")
        print("\n".join(words))
        return

    generate(words, overwrite=args.overwrite)


if __name__ == "__main__":
    main()
