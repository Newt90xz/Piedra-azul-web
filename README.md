# Piedra Azul Web

Aplicacion web Leer para Todos del Liceo Piedra Azul.

## Dependencias

Se utiliza Node.js 24 y pnpm 10.33.2 (`corepack enable` lo deja disponible).
Para instalar las dependencias despues de clonar el repositorio:

```sh
corepack enable
pnpm install --frozen-lockfile
cp frontend/.env.example frontend/.env   # y completar (ver Variables de entorno)
pnpm dev            # frontend (Vite) y backend (Express) en paralelo
pnpm dev:frontend   # solo frontend, http://localhost:5173
pnpm test           # pruebas (Vitest)
```

## Estructura

Monorepo con workspaces de pnpm:

```
docs/       Informe de requerimientos, marco curricular y anatomia de actividades
frontend/   React + Vite + TypeScript + Tailwind
  src/dominio/      Tipos del modelo (equivalen a las tablas de Supabase)
  src/contenido/    Banco de palabras/letras y catalogo de actividades por nivel
  src/datos/        Interfaz Repositorio: Supabase y demostracion (localStorage)
  src/actividades/  Motor de micro-partidas (rondas, estrellas, monedas, podio)
  src/paginas/      Inicio, panel docente (/docente), alumno (/alumno) y aula (/aula)
backend/    API Express (por ahora solo /api/health)
supabase/   Migraciones SQL: esquema, RLS y funciones de las salas
```

El frontend usa Supabase (`src/datos/repositorioSupabase.ts`) y necesita
`frontend/.env`. Para probar pantallas sin conexion se puede cambiar
`src/datos/index.ts` a `repositorioDemo`, que guarda datos de ejemplo en
`localStorage`; las pantallas no cambian.

Cada cambio de base de datos va en `supabase/migrations/` con el mismo
nombre y version con que quedo registrado en el proyecto. Despues de una
migracion se regenera `frontend/src/datos/baseDatos.ts`.
Una migracion aplicada a mano (SQL Editor) no queda en el historial remoto y
hay que registrarla con `supabase migration repair --status applied <version>`;
si no, `supabase db push` intentara aplicarla de nuevo. Es el caso de
`20261019000000_salas.sql`.

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

Pendiente: PWA y cola offline completa (RNF-12, RNF-17; hoy hay un respaldo
minimo en `src/datos/pendientes.ts`), pruebas de interfaz (Testing Library,
Playwright, axe) y Prettier. Las pruebas unitarias usan Vitest
(`*.test.ts` junto al codigo).

Los fonemas y las silabas utilizaran audios grabados y validados por las
educadoras, reproducidos con las APIs nativas del navegador.

## Variables de entorno

`frontend/.env` necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
(en Supabase: Project Settings > API Keys; sirve la clave publicable
`sb_publishable_...` o la anon legacy). Sin ellas la app no carga.

No versionar archivos `.env` ni credenciales. Se puede versionar un
`.env.example` con nombres de variables y valores de ejemplo sin secretos.
Las claves secretas de Supabase deben permanecer exclusivamente en el
backend; ninguna variable `VITE_*` debe contener secretos porque se
incluye en el frontend.