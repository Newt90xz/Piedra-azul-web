# Piedra Azul Web

Aplicacion web Leer para Todos del Liceo Piedra Azul.

## Dependencias

Se utiliza Node.js 24 y pnpm 10.33.2. Para instalar las dependencias
despues de clonar el repositorio:

```sh
pnpm install --frozen-lockfile
```

Versionar `package.json` y `pnpm-lock.yaml`, no `node_modules`.

## Stack

- Frontend: React, Vite y TypeScript, React Router y Tailwind CSS.
- Formularios: React Hook Form, Zod y resolvers.
- Backend: Node.js y Express con CORS y variables de entorno.
- Supabase: autenticacion, PostgreSQL y almacenamiento de archivos.
- Offline: plugin PWA de Vite, Workbox e IndexedDB mediante idb.
- Calidad: Vitest, Testing Library, Playwright, axe, ESLint y Prettier.

Las dependencias estan instaladas; la aplicacion, los scripts de ejecucion
y las configuraciones de estilos, PWA, lint y pruebas aun deben implementarse.

Los fonemas y las silabas utilizaran audios grabados y validados por las
educadoras, reproducidos con las APIs nativas del navegador.

## Variables de entorno

No versionar archivos `.env` ni credenciales. Se puede versionar un
`.env.example` con nombres de variables y valores de ejemplo sin secretos.
Las claves secretas de Supabase deben permanecer exclusivamente en el
backend; ninguna variable `VITE_*` debe contener secretos porque se
incluye en el frontend.