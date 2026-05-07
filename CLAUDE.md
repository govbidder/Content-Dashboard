# Content Dashboard 2.O

Brújula del proyecto — contexto **estable** verificado contra código. No lista pendientes (rotan). Estado real = código.

@docs/ROUTES.md
@docs/BRAND.md

Docs on-demand: [`docs/COMPETIDORES_CONTRACTS.md`](./docs/COMPETIDORES_CONTRACTS.md), [`README.md`](./README.md). Overrides locales: `CLAUDE.local.md` (gitignored).

---

## Producción — este proyecto YA está desplegado

| Sistema | Cómo se aplica un cambio |
|---|---|
| **Código** | `git push origin main` → `.github/workflows/{ci,deploy}.yml` |
| **Deploy** | Vercel (Node 20.x, Next.js). `deploy.yml` corre `vercel deploy --prod` tras push a `main`. PRs = preview URL |
| **DB** | Postgres en Supabase. Schema: `npx prisma migrate deploy`. RLS en Supabase dashboard |
| **Auth** | Supabase Auth. Usuarios/roles en Supabase dashboard |
| **Env vars prod** | Vercel dashboard — **no** en `.env.local` |
| **OAuth apps** | Meta Developer / Google Cloud / TikTok Developers. `redirect_uri` registrado literal |

"Arregla X" puede significar editar código **o** tocar un dashboard externo. Preguntar si no está claro.

---

## Stack (verificado en `package.json`)

Next.js 16.2.3 · React 19.2.4 · Tailwind v4 · `@base-ui/react` + shadcn · TipTap v3 · `@dnd-kit` · Recharts 3 · motion · Zod 4 · Prisma 6 + **Postgres** · Supabase Auth (`@supabase/ssr`) · `@anthropic-ai/sdk` · `groq-sdk` · Apify HTTP · Resend · `@upstash/ratelimit` (opt) · Jest · Playwright.

Path alias `@/*` → raíz del repo. Importar como `@/lib/db`.

---

## Dónde vive cada responsabilidad (verificado leyendo el código)

- **`middleware.ts`** — SOLO refresca la sesión de Supabase y redirige a `/login` si no hay user. Nada más.
- **`app/layout.tsx` + `lib/auth-bootstrap.ts`** — upsert de `Profile` con `globalRole: 'PENDING'`, redirect a `/pending-approval`, auto-set del cookie `activeClientId` al primer cliente accesible.
- **`next.config.ts`** — CSP y headers de seguridad (no están en middleware).
- **`lib/auth-user.ts`** — helpers: `requireUserId()`, `requireProfile()`, `requireSuperAdmin()`, `requireActiveClient()` (devuelve `{ userId, clientId }`). Constante `ACTIVE_CLIENT_COOKIE = 'activeClientId'`.
- **`lib/supabase/{client,server,admin}.ts`** — browser / server-with-cookies / service-role (bypasa RLS, cached con `let` local).
- **`lib/db.ts`** — Prisma singleton vía `globalThis`. Export `{ db }`.
- **`lib/utils/ratelimit.ts`** — wrapper Upstash. `checkRateLimit(ip, key, requests, window)` devuelve `{ success } | null`. Todos los callers usan el patrón `if (rl && !rl.success) return 429`. (Hubo un segundo helper con shape `.allowed` — ya removido.)

---

## Modelos Prisma (29 en `schema.prisma`)

`Profile` · `Client` (con `themeKey`) · `ClientAccess` · `SocialConnection` · `OAuthState` · `Competitor` · `Reel` · `Transcription` · `Analysis` · `ChatMessage` · `ScrapeJob` · `Conversation` · `AIMessage` · `Task` · `ContentPiece` · `ContentTemplate` · `ICPProfile` · `BusinessBase` · `Idea` · `GuionTab` · `GuionItem` · `UserReel` · `Story` · `YouTubeVideo` · `AccountSnapshot` · `IncomeRecord` · `TranscriptHistory` · `ContentResearchHistory` · `VideoFeedAccount`.

**Antes de usar un modelo**: `grep -n "^model " prisma/schema.prisma` para confirmar.

---

## Qué es real vs mock hoy (verificado con grep)

**Backend real**:
- `/api/admin/*` (SUPER_ADMIN CRUD de users/clients, con rate limit)
- `/api/me/*` (profile + active-client)
- `/api/auth/notify-signup` (Resend, rate-limited 3/h por IP)
- `/api/social/[platform]/{connect,callback}` (platforms: `instagram`, `tiktok`, `youtube`)
- `/api/youtube/{sync,videos,channel-summary}` (llama YouTube API real, no mock)
- `/api/analizador/{scrape,analyze}` (Apify + Claude, rate-limited 5 y 20 req/min)
- `/api/competitors/[id]` y `/api/reels/[id]/{analyze,transcribe,chat,refresh-video-url}`
- `/api/ai/{chat, conversations, conversations/[id]}` (Eternity AI — Anthropic SDK streaming, rate-limited 20/min)

**UI que lee mocks** (`grep "lib/mock-data"` da 16+ archivos):
- `/instagram` — los 5 tabs
- `/ads` — KPIs, campaigns, creatives
- `/tiktok` — KPIs, videos, demografía
- `/youtube` UI — demografía + dashboards (aunque `/api/youtube/*` sí es real)
- `components/home/HomeContent`
- `components/layout/TopBar` (stats globales)

**Placeholders (`ComingSoonBanner`)**: — (ninguno actualmente).

**`/competidores` NO usa mocks** — lee de DB real (corrección de versiones anteriores de este archivo).

---

## Paths clave (verificado con `ls`)

```
app/
  api/
    admin/{users,clients}/[id]/               # SUPER_ADMIN + requireSuperAdmin
    ai/{chat,conversations,conversations/[id]}/ # Eternity AI streaming chat
    analizador/{scrape,analyze}/              # Apify + Claude
    auth/notify-signup/                       # Resend
    bases/  content/  copy/generate/
    competitors/[id]/
    reels/[id]/{analyze,transcribe,chat,refresh-video-url}/
    guiones/  ideas/  instagram/  tasks/  jobs/[id]/
    me/{route,active-client,clients}/
    social/[platform]/{connect,callback}/     # instagram | tiktok | youtube
    youtube/{sync,videos,channel-summary}/
  {instagram,contenido,bases,analizador,competidores,tareas,ads,tiktok,youtube}/page.tsx
  ai/page.tsx                                  # ComingSoonBanner
  admin/{page,users,clients}/page.tsx
  pending-approval/  ·  login/

components/layout/{Sidebar,TopBar,ConditionalShell,ClientSwitcher,UserMenu,SettingsModal}.tsx
hooks/{usePeriod,useTab,useSocialConnection,useInstagramData,useYouTubeData}.ts
lib/
  supabase/{client,server,admin}.ts  ·  auth-user.ts  ·  auth-bootstrap.ts  ·  db.ts
  utils/ratelimit.ts  ·  useLocalStorage.ts  ·  schemas/{analizador,copy,competidores}/
  mock-data/                                  # Instagram/Ads/TikTok/YouTube UI (a eliminar)
  competidores/{active-jobs,resolve-competitor}.ts
middleware.ts  ·  next.config.ts  ·  prisma/{schema.prisma,migrations/}
scripts/{check-brand-consistency.mjs,seed-initial-clients.ts}
__tests__/  ·  e2e/                           # 3 unit + 3 e2e
```

---

## Comandos

```bash
# Dev
npm run dev
npm run seed                                  # seed-initial-clients.ts

# Validación pre-push
npm run lint  ·  npm run typecheck            # ✓ pasa hoy
npm run check:brand                           # ✓ pasa hoy
npm run test                                  # Jest — coverage threshold 40%
npm run test:e2e                              # Playwright (baseURL http://localhost:3000)
npm run build                                 # postinstall: prisma generate

# Prisma (Postgres en Supabase)
npx prisma studio
npx prisma migrate dev --name <nombre>
npx prisma migrate deploy                     # prod (CI)

# Búsquedas útiles
grep -rn "TODO\|FIXME" app lib components
grep -rn "lib/mock-data" app components       # UIs con datos falsos
grep -n "^model " prisma/schema.prisma        # modelos disponibles
```

---

## Reglas (no negociables)

- **Brand**: solo CSS vars (`var(--accent)`, `var(--foreground)`, etc.). Prohibido `#hex`, `rgb()`, `hsl()`, `bg-[#...]`. Ver `docs/BRAND.md`.
- **Rutas**: añadir/renombrar → actualizar `docs/ROUTES.md` + `components/layout/Sidebar.tsx` en el mismo commit.
- **Prisma**: siempre `import { db } from '@/lib/db'`. Nunca `new PrismaClient()`.
- **Tenant**: queries de negocio pasan por `requireActiveClient()`. Nunca leer `clientId` de body/query.
- **Zod**: todo input de API route se valida con schema en `lib/schemas/`. Nada de `as any`.
- **Rate limit**: `checkRateLimit()` en rutas que llaman LLMs o APIs externas. Confirmar el shape (`.success` vs `.allowed`) antes de copiar código.
- **Secrets**: variable nueva → primero a `.env.example`, luego valor a Vercel dashboard.

---

## Errores reales verificados

- **OAuth `redirect_uri`**: Meta / Google / TikTok registran la URL literal. Cambiar `app/api/social/[platform]/callback/` o `/api/auth/*` **requiere** actualizar el panel del proveedor antes del deploy.
- **App Router 100%**: `grep` confirma 0 usos de `getServerSideProps`, `getStaticProps`, `next/router`, `pages/api`. `useRouter` viene de `next/navigation`.
- **Next 15+ async APIs** (verificado en ≥5 handlers): `params` es `Promise<...>` → `await params`. `cookies()`, `headers()`, `draftMode()` también son async.
- **Migration drift**: Supabase aplicó migraciones que se quedaron untracked en disco más de una vez. CI corre `npm run check:prisma-drift` (compara DB ↔ `prisma/migrations`) — si ves errores ahí, copiar las migraciones desde donde se aplicaron y commitearlas.

---

## Zonas protegidas (confirmar antes de editar)

`middleware.ts` · `app/layout.tsx` (tiene la lógica real de bootstrap) · `lib/auth-bootstrap.ts` · `next.config.ts` · `prisma/schema.prisma` + `migrations/` · `lib/supabase/admin.ts` · `.github/workflows/*.yml` · `.env.example`.

---

## Verificación antes de "listo"

- **UI**: `preview_start` + `preview_screenshot`/`preview_snapshot` en browser. `tsc` limpio ≠ UX correcta.
- **API route**: `typecheck` + test del schema Zod + curl/UI real.
- **Auth / bootstrap**: probar signup PENDING, login MEMBER, login SUPER_ADMIN en preview de Vercel antes de merge.
- **Cambios de brand**: `check:brand` debe pasar tras cualquier edición de estilos.
- **Post-push**: confirmar build OK y preview funcional en Vercel dashboard antes de cerrar la tarea.
