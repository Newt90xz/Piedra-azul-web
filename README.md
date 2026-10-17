# Piedra Azul Web

Aplicacion web Leer para Todos del Liceo Piedra Azul.

## Dependencias

Se utiliza Node.js 24 y pnpm 10.33.2 (`corepack enable` lo deja disponible).
Para instalar las dependencias despues de clonar el repositorio:

```sh
pnpm install --frozen-lockfile
pnpm dev            # frontend (Vite) y backend (Express) en paralelo
pnpm dev:frontend   # solo frontend, http://localhost:5173
```

## Estructura

Monorepo con workspaces de pnpm:

```
docs/       Informe de requerimientos, marco curricular y anatomia de actividades
frontend/   React + Vite + TypeScript + Tailwind
  src/dominio/      Tipos del modelo (equivalen a las tablas de Supabase)
  src/contenido/    Banco de palabras/letras y catalogo de actividades por nivel
  src/datos/        Interfaz Repositorio + implementacion de demostracion
  src/actividades/  Motor de micro-partidas (rondas, estrellas, monedas, podio)
  src/paginas/      Inicio, panel docente (/docente) y modo aula (/aula)
backend/    API Express (por ahora solo /api/health)
```

El frontend hoy funciona con datos de demostracion guardados en
`localStorage` (`src/datos/repositorioDemo.ts`). Al conectar Supabase se
agrega otra implementacion de `Repositorio` y se cambia en
`src/datos/index.ts`, sin tocar las pantallas.

Mientras no existan los audios grabados, la voz se simula con la sintesis del
navegador solo como marcador de desarrollo; no es apta para el piloto
(RF-04, RNF-04). Las imagenes son emoji provisionales hasta tener fotos
reales y pictogramas ARASAAC.

Versionar `package.json` y `pnpm-lock.yaml`, no `node_modules`.

## Stack

- Frontend: React, Vite y TypeScript, React Router y Tailwind CSS.
- Formularios: React Hook Form, Zod y resolvers.
- Backend: Node.js y Express con CORS y variables de entorno.
- Supabase: autenticacion, PostgreSQL y almacenamiento de archivos.
- Offline: plugin PWA de Vite, Workbox e IndexedDB mediante idb.
- Calidad: Vitest, Testing Library, Playwright, axe, ESLint y Prettier.

Pendiente: PWA y cola offline (RNF-12, RNF-17), pruebas (Vitest, Playwright,
axe) y Prettier.

Los fonemas y las silabas utilizaran audios grabados y validados por las
educadoras, reproducidos con las APIs nativas del navegador.

## Variables de entorno

No versionar archivos `.env` ni credenciales. Se puede versionar un
`.env.example` con nombres de variables y valores de ejemplo sin secretos.
Las claves secretas de Supabase deben permanecer exclusivamente en el
backend; ninguna variable `VITE_*` debe contener secretos porque se
incluye en el frontend.