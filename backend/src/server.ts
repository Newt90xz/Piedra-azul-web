import cors from 'cors'
import express from 'express'
import { config } from './config.ts'

const app = express()

app.use(cors({ origin: config.frontendOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, servicio: 'leer-para-todos-api' })
})

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`)
})
