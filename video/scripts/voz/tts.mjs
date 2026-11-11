// Texto a voz con ElevenLabs. La clave se lee de ELEVENLABS_API_KEY y nunca se
// escribe ni se imprime. Si falta o el servicio falla, se corta con un error claro:
// no hay voz de respaldo (ni la del navegador ni la del sistema).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const MODELO = 'eleven_multilingual_v2'

// Conversación cálida y pausada, no locutora de radio (PLAN.md, 6b).
export const AJUSTES = { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.96 }

export async function tts({ vozId, texto, salida, antes, despues, ajustes = AJUSTES }) {
  const clave = process.env.ELEVENLABS_API_KEY
  if (!clave) throw new Error('Falta la variable de entorno ELEVENLABS_API_KEY.')
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vozId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': clave, 'content-type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: MODELO, voice_settings: ajustes, previous_text: antes, next_text: despues }),
  })
  if (!r.ok) throw new Error(`ElevenLabs respondió ${r.status}: ${(await r.text()).slice(0, 400)}`)
  await mkdir(dirname(salida), { recursive: true })
  await writeFile(salida, Buffer.from(await r.arrayBuffer()))
  return { salida, caracteres: Number(r.headers.get('character-cost') ?? texto.length) }
}
