# Votaciones — Liga Biwenger

Sitio para que el grupo vote configuraciones de la liga (balance inicial, modo de juego, etc.). Hecho con [Astro](https://astro.build) + [Supabase](https://supabase.com), hosteado gratis en GitHub Pages.

## Cómo funciona

1. **Bienvenida** (`/`): pantalla de entrada.
2. **Identidad** (`/identidad`): elegís tu nombre de una lista fija (sin contraseña). Se guarda en el `localStorage` del navegador.
3. **Votaciones** (`/votaciones`): lista de encuestas abiertas y cerradas. Podés votar en las abiertas (y cambiar tu voto) y ver resultados en tiempo real.

No hay panel de administración: las encuestas se crean, abren y cierran directamente desde el **Table Editor de Supabase**, cambiando la columna `status` de `polls` (`draft` → `open` → `closed`) y cargando filas en `poll_options`.

⚠️ **Nota de seguridad**: no hay autenticación real, cualquiera con el link puede elegir cualquier nombre. Está pensado para un grupo cerrado de ~8 amigos de confianza, no para un contexto público.

## Setup

### 1. Supabase

1. Creá un proyecto nuevo en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** y corré, en orden, los archivos de `supabase/migrations/`:
   - `0001_init.sql` — tablas y políticas de RLS.
   - `0002_seed_players.sql` — **antes de correrlo, reemplazá `Jugador 1..8` por los nombres reales** de tu grupo (podés editarlos después también desde Table Editor).
   - `0003_seed_example_poll.sql` — opcional, carga una encuesta de ejemplo para probar el flujo. Podés borrarla después desde el Table Editor.
3. En **Project Settings → API**, copiá la `Project URL` y la `anon public` key.

### 2. Variables de entorno (local)

```bash
cp .env.example .env
# completá PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY
```

### 3. Desarrollo local

```bash
npm install
npm run dev
```

### 4. Deploy a GitHub Pages

1. Creá el repo en GitHub (si todavía no existe) y pusheá este código a `main`.
2. En **Settings → Pages**, elegí **Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions**, cargá dos *repository secrets*:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
4. Cada push a `main` dispara `.github/workflows/deploy.yml`, que buildea el sitio y lo publica en `https://<tu-usuario>.github.io/biwenger/`.

Si tu usuario/organización de GitHub no es `alexmarioni` o el repo no se llama `biwenger`, ajustá `site` y `base` en [astro.config.mjs](astro.config.mjs) para que coincidan.

## Crear una encuesta nueva

Desde Supabase Table Editor:

1. Insertá una fila en `polls` (`title`, `description` opcional, `status: 'open'`).
2. Insertá 2+ filas en `poll_options` con ese `poll_id` (`label`, `sort_order`).
3. Cuando quieras cerrarla, cambiá `status` a `'closed'` (los resultados quedan visibles, ya no se puede votar).
