import cors from 'cors'
import express from 'express'
import { config } from './config.ts'
import { levantarServidorVoz } from './servidorVoz.ts'
import { voz } from './voz.ts'

const app = express()

app.use(cors({ origin: config.frontendOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'leer-para-todos-api' })
})

app.get('/api/voz', (req, res) => void voz(req, res))

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`)
  levantarServidorVoz()
})
