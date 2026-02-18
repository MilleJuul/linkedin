# LinkedIn Content Planner – MVP

En content-planlægnings webapp med fokus på LinkedIn. Bygget med Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma og PostgreSQL.

---

## Funktioner

| Sektion | Beskrivelse |
|---|---|
| **Overblik** | Dashboard med ugekalender, AI-assistance og hurtig navigation |
| **Klargjorte posts** | Kanban-board + listevisning med statuskolonner (Kladde → Publiceret) |
| **Bibliotek** | Asset-grid med upload (drag & drop), tagning og filtrering |
| **Indstillinger** | Brand Kit formular (tone of voice, ord, CTA, hashtags, eksempler) |
| **Indsigter** | Performance-tabel med rigtige DB-data, delta, winning patterns |
| **Data / Import** | Upload Hootsuite Analytics CSV → auto-mapping → import pipeline |

### AI-funktioner (MVP mock, klar til LLM-integration)
- `generateWeeklyPlan` – genererer postforslag til næste uge (bruger winning patterns)
- `generatePostCopy` – genererer hook/body/CTA/hashtags (farvet af top-performende eksempler)
- `matchAssetsToPost` – rangerer assets baseret på post-indhold
- `recomputeWinningPatterns` – opdateres automatisk ved hvert CSV-import

### CSV Import (Hootsuite Analytics – Posts report)
- Ingen LinkedIn API-integration – performance-data uploades manuelt som CSV
- Robust auto-mapping af kolonnenavne (fuzzy match)
- Dedup via content hash (tekst + dato) – re-import opdaterer metrics
- Beregner engagement rate, CTR, og winning patterns efter import

---

## Tech stack

- **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
- **Sprog**: TypeScript
- **Styling**: Tailwind CSS + CSS-variabler
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth v5 (credentials provider)
- **Validation**: Zod
- **Ikoner**: Lucide React

---

## Opsætning

### Krav

- Node.js ≥ 18
- PostgreSQL database (lokal eller cloud, fx Supabase / Neon)
- npm, pnpm eller yarn

### 1. Installer afhængigheder

```bash
npm install
```

### 2. Miljøvariabler

```bash
cp .env.example .env
```

Udfyld `.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/linkedin_planner"

# NextAuth – generér med: openssl rand -base64 32
NEXTAUTH_SECRET="din-hemmelige-nøgle-her"
NEXTAUTH_URL="http://localhost:3000"

# AI (valgfrit – til produktion)
# OPENAI_API_KEY="sk-..."
```

> **Bemærk:** LinkedIn API-integration er IKKE påkrævet. Der er ingen `LINKEDIN_CLIENT_ID` eller `LINKEDIN_CLIENT_SECRET` env vars. Performance-data importeres via Hootsuite CSV.

### 3. Database

```bash
# Generér Prisma klient
npm run db:generate

# Kør migrations (opretter alle tabeller)
npm run db:migrate

# Alternativt (push schema direkte):
npm run db:push
```

### 4. Seed demo-data

```bash
npm run db:seed
```

Opretter:
- **Demo workspace**: slug `demo-virksomhed`
- **3 brugere**:
  - `admin@demo.dk` / `demo1234` (ADMIN)
  - `editor@demo.dk` / `demo1234` (EDITOR)
  - `approver@demo.dk` / `demo1234` (APPROVER)
- **Brand Kit** med tone of voice, ord og eksempler
- **20 assets** (15 billeder, 5 videoer) med tags
- **10 posts** i alle statusser

### 5. Start dev-server

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) og log ind med `admin@demo.dk` / `demo1234`.

---

## Projektstruktur

```
linkedin/
├── app/
│   ├── (auth)/login/           # Login-side
│   ├── api/auth/[...nextauth]/ # NextAuth handler
│   ├── app/[workspace]/        # Workspace-layout med sidebar
│   │   ├── overview/           # Overblik (dashboard)
│   │   ├── prepared/           # Klargjorte posts (kanban + liste)
│   │   ├── library/            # Asset-bibliotek
│   │   ├── settings/           # Brand Kit indstillinger
│   │   └── insights/           # Analytics-tabel
│   └── onboarding/             # Opret nyt workspace
├── actions/                    # Server Actions (CRUD)
│   ├── posts.ts
│   ├── assets.ts
│   ├── brand-kit.ts
│   └── workspace.ts
├── app/app/[workspace]/import/ # Data / Import side (CSV upload)
├── components/
│   ├── ui/                     # Button, Badge, Modal, EmptyState
│   ├── Sidebar.tsx             # + Data/Import nav-punkt
│   ├── PostCard.tsx
│   ├── PostEditor.tsx          # Post-editor med tabs (rediger/assets/kommentarer/historik)
│   ├── KanbanColumn.tsx
│   ├── AssetGrid.tsx
│   ├── DataTable.tsx
│   ├── WeeklyPlanModal.tsx     # AI ugeplan-generator (bruger winning patterns)
│   ├── UploadModal.tsx         # Drag & drop upload (asset-billeder)
│   └── CreatePostModal.tsx
├── lib/
│   ├── ai.ts                   # AI service layer (mock → LLM-klar)
│   ├── auth.ts                 # NextAuth config
│   ├── db.ts                   # Prisma singleton
│   ├── utils.ts                # Hjælpefunktioner
│   └── validations.ts          # Zod-skemaer
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── types/index.ts
└── middleware.ts               # Auth-guard
```

---

## Post-workflow

```
DRAFT → REVIEW → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED
```

## Brugerroller

| Rolle | Rettigheder |
|---|---|
| ADMIN | Fuld adgang |
| EDITOR | Opret og rediger posts + assets |
| APPROVER | Godkend posts |

---

## AI til produktion

Alle AI-funktioner er i `lib/ai.ts`. For at tilslutte OpenAI:

```typescript
// lib/ai.ts
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePostCopy(input: PostCopyInput): Promise<PostCopy> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: `Brand tone: ${input.brandKit.toneOfVoice}` },
      { role: "user", content: `Genér LinkedIn-post om: ${input.postIdea}` },
    ],
  });
  // Parse og return { hook, bodyText, cta, hashtags }
}
```

---

## Database-kommandoer

```bash
npm run db:generate   # Generer Prisma klient
npm run db:migrate    # Kør migrations
npm run db:seed       # Seed demo-data
npm run db:studio     # Åbn Prisma Studio
```

---

---

## CSV Import – Hootsuite Analytics

Gå til **Data / Import** i appen og upload din Hootsuite Posts-rapport som CSV.

### Eksporter fra Hootsuite
1. Hootsuite Analytics → Posts rapport
2. Vælg dato-range
3. Eksporter som CSV

### Forventede kolonner (systemet auto-detecter)

| Kolonne | Aliaser der genkendes |
|---|---|
| Post Text | `Post Text`, `Message`, `Caption`, `Content` |
| Published Date | `Date`, `Published`, `Sent At`, `Timestamp` |
| Impressions | `Impressions`, `Views`, `Total Views` |
| Likes | `Likes`, `Reactions`, `Like Count` |
| Comments | `Comments` |
| Shares | `Shares` |
| Link Clicks | `Link Clicks`, `Clicks` |
| Reach | `Reach` (valgfrit) |

Et sample-CSV med 10 testposts finder du i `/docs/sample-hootsuite.csv`.

### Hvad sker der efter import?
1. CSV parses og normaliseres (tal, datoer, whitespace)
2. Dedup: samme post (tekst + dato) opdaterer eksisterende snapshot
3. Metrics beregnes: `engagementRate = (likes + comments + shares) / impressions`
4. **Winning patterns** reberegnes: top 20% posts analyseres for hook-type, længde, struktur, CTA-type
5. AI-generatoren bruger automatisk de nyeste patterns næste gang du genererer en ugeplan

---

## Kendte MVP-begrænsninger

- Asset-upload bruger Picsum placeholder URLs – tilslut S3/Cloudinary i produktion
- LinkedIn API er IKKE tilsluttet – brug CSV-import (ingen API-keys påkrævet)
- AI returnerer mock-data – tilslut OpenAI/Anthropic som beskrevet i `lib/ai.ts`
- CSV-upload har ingen filstørrelsesbegrænsning sat – tilføj i produktion via Next.js config