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
| **Indsigter** | Performance-tabel med placeholder analytics |

### AI-funktioner (MVP mock, klar til LLM-integration)
- `generateWeeklyPlan` – genererer postforslag til næste uge
- `generatePostCopy` – genererer hook/body/CTA/hashtags
- `matchAssetsToPost` – rangerer assets baseret på post-indhold

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
```

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
├── components/
│   ├── ui/                     # Button, Badge, Modal, EmptyState
│   ├── Sidebar.tsx
│   ├── PostCard.tsx
│   ├── PostEditor.tsx          # Post-editor med tabs (rediger/assets/kommentarer/historik)
│   ├── KanbanColumn.tsx
│   ├── AssetGrid.tsx
│   ├── DataTable.tsx
│   ├── WeeklyPlanModal.tsx     # AI ugeplan-generator
│   ├── UploadModal.tsx         # Drag & drop upload
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

## Kendte MVP-begrænsninger

- Upload bruger Picsum placeholder URLs – tilslut S3/Cloudinary i produktion
- LinkedIn API ikke tilsluttet – analytics viser demo-data
- AI returnerer mock-data – tilslut LLM som beskrevet ovenfor