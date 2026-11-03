// Primero: las actividades arman sus listas al cargarse, con el banco ya aplicado.
import { guardarBanco } from './datos/bancoGuardado.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import '@fontsource/andika/latin-400.css'
import '@fontsource/andika/latin-700.css'
import './index.css'
import App from './App.tsx'
import { repo } from './datos/index.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Para la próxima carga: no se hace esperar al niño por el banco.
void repo.cargarBanco().then(guardarBanco, () => {})
