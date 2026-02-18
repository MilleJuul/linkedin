import { PrismaClient, AssetType, PostStatus, Platform, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeder starter...");

  // ── Ryd eksisterende data ─────────────────────────────────────────────────
  await prisma.auditEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.brandKit.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Brugere ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@demo.dk",
      name: "Admin Bruger",
      passwordHash,
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      email: "editor@demo.dk",
      name: "Editor Bruger",
      passwordHash,
    },
  });

  const approverUser = await prisma.user.create({
    data: {
      email: "approver@demo.dk",
      name: "Godkender Bruger",
      passwordHash,
    },
  });

  console.log("✅ Brugere oprettet");

  // ── Workspace ─────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo Virksomhed A/S",
      slug: "demo-virksomhed",
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: adminUser.id, role: Role.ADMIN },
      { workspaceId: workspace.id, userId: editorUser.id, role: Role.EDITOR },
      { workspaceId: workspace.id, userId: approverUser.id, role: Role.APPROVER },
    ],
  });

  console.log("✅ Workspace oprettet");

  // ── Brand Kit ─────────────────────────────────────────────────────────────
  await prisma.brandKit.create({
    data: {
      workspaceId: workspace.id,
      toneOfVoice:
        "Professionel men tilgængelig. Vi taler direkte til beslutningstager med indsigt og autoritet – aldrig arrogant. Vi er modige nok til at have en holdning.",
      doWords: [
        "indsigt",
        "vækst",
        "resultat",
        "transformation",
        "samarbejde",
        "effektivitet",
        "strategi",
        "innovation",
      ],
      dontWords: [
        "billig",
        "hurtig fix",
        "nemt",
        "simpelt",
        "bare",
        "problem",
        "desværre",
      ],
      ctaStyle:
        "Afslut altid med en klar opfordring til handling. Brug spørgsmål der inviterer til kommentar. Fx: 'Hvad er din erfaring med X?' eller 'Skriv til os – vi tager en uforpligtende snak.'",
      hashtagStyle:
        "3-5 hashtags. Mix af niche (#B2BMarketing) og brede (#LinkedIn). Altid lowercase med store bogstaver ved ord (#ContentMarketing).",
      emojiPolicy:
        "Brug emojis sparsomt og strategisk. Maks 2-3 per post. Aldrig i starten af linjer. Foretræk: ✅ 🚀 💡 📊 🎯",
      examples: [
        "De fleste virksomheder måler på aktivitet. De bedste måler på impact.\n\nSådan skaber du LinkedIn-indhold der faktisk konverterer:\n\n✅ Start med et problem din ICP kender\n✅ Giv indsigt der skaber aha-moment\n✅ Afslut med en klar CTA\n\nHvad er din #1 udfordring med LinkedIn-indhold? 👇\n\n#LinkedInMarketing #B2BMarketing #ContentStrategy",
        "Vi hjalp en SaaS-virksomhed med at 3x'e deres LinkedIn engagement på 90 dage.\n\nHer er de 3 ting vi ændrede:\n\n1️⃣ Stoppede med at poste om produktet\n2️⃣ Begyndte at dele kundernes wins\n3️⃣ Postede konsekvent 3x om ugen\n\nResultat: +187% organisk rækkevidde 📊\n\nVil du vide mere? Send os en DM 🎯\n\n#GrowthMarketing #LinkedInStrategy",
      ],
    },
  });

  console.log("✅ Brand Kit oprettet");

  // ── Assets ────────────────────────────────────────────────────────────────
  const assetData = [
    { filename: "team-meeting.jpg", type: AssetType.IMAGE, tags: ["team", "møde", "kontor", "samarbejde"] },
    { filename: "data-dashboard.jpg", type: AssetType.IMAGE, tags: ["data", "analyse", "dashboard", "analytics"] },
    { filename: "growth-chart.jpg", type: AssetType.IMAGE, tags: ["vækst", "graf", "resultater", "KPI"] },
    { filename: "coffee-laptop.jpg", type: AssetType.IMAGE, tags: ["kontor", "arbejde", "laptop", "lifestyle"] },
    { filename: "handshake.jpg", type: AssetType.IMAGE, tags: ["samarbejde", "partner", "aftale", "B2B"] },
    { filename: "presentation.jpg", type: AssetType.IMAGE, tags: ["præsentation", "slides", "møde", "pitch"] },
    { filename: "remote-work.jpg", type: AssetType.IMAGE, tags: ["remote", "hjemmekontor", "fleksibel", "arbejde"] },
    { filename: "strategy-board.jpg", type: AssetType.IMAGE, tags: ["strategi", "planlægning", "whiteboard", "innovation"] },
    { filename: "marketing-team.jpg", type: AssetType.IMAGE, tags: ["marketing", "team", "kreativ", "brainstorm"] },
    { filename: "product-demo.jpg", type: AssetType.IMAGE, tags: ["produkt", "demo", "præsentation", "SaaS"] },
    { filename: "linkedin-post-tips.jpg", type: AssetType.IMAGE, tags: ["LinkedIn", "tips", "content", "social media"] },
    { filename: "b2b-leads.jpg", type: AssetType.IMAGE, tags: ["B2B", "leads", "salg", "pipeline"] },
    { filename: "branding-workshop.jpg", type: AssetType.IMAGE, tags: ["branding", "workshop", "identitet", "kreativ"] },
    { filename: "success-celebration.jpg", type: AssetType.IMAGE, tags: ["succes", "fejring", "milestone", "win"] },
    { filename: "analytics-report.jpg", type: AssetType.IMAGE, tags: ["analytics", "rapport", "data", "indsigt"] },
    { filename: "intro-video.mp4", type: AssetType.VIDEO, tags: ["intro", "virksomhed", "video", "præsentation"] },
    { filename: "case-study.mp4", type: AssetType.VIDEO, tags: ["case study", "kunde", "succes", "testimonial"] },
    { filename: "product-walkthrough.mp4", type: AssetType.VIDEO, tags: ["produkt", "demo", "tutorial", "SaaS"] },
    { filename: "team-culture.mp4", type: AssetType.VIDEO, tags: ["team", "kultur", "employer branding", "people"] },
    { filename: "webinar-highlight.mp4", type: AssetType.VIDEO, tags: ["webinar", "event", "uddannelse", "insights"] },
  ];

  const assets = await Promise.all(
    assetData.map((asset, index) => {
      const seed = index + 1;
      const isVideo = asset.type === AssetType.VIDEO;
      return prisma.asset.create({
        data: {
          workspaceId: workspace.id,
          type: asset.type,
          filename: asset.filename,
          url: isVideo
            ? `https://picsum.photos/seed/${seed}/800/450`
            : `https://picsum.photos/seed/${seed}/800/600`,
          thumbnailUrl: `https://picsum.photos/seed/${seed}/400/300`,
          tags: asset.tags,
        },
      });
    })
  );

  console.log(`✅ ${assets.length} assets oprettet`);

  // ── Posts ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const postData = [
    {
      title: "3 grunde til at B2B-virksomheder fejler på LinkedIn",
      status: PostStatus.PUBLISHED,
      hook: "De fleste B2B-virksomheder poster om sig selv. Det er præcis det forkerte.",
      bodyText:
        "De fleste B2B-virksomheder poster om sig selv. Det er præcis det forkerte.\n\nHer er de 3 klassiske fejl:\n\n1️⃣ For meget produktfokus – ingen gider se reklamer\n2️⃣ Ingen konsistens – 3 posts i januar, nul i februar\n3️⃣ Ingen CTA – hvad skal læseren gøre nu?\n\nLøsningen er enkel: Post om dine kunders udfordringer, ikke om dit produkt.\n\nHvad er din største LinkedIn-udfordring? 👇",
      cta: "Kommentér nedenfor eller send os en DM",
      hashtags: ["#LinkedInMarketing", "#B2BMarketing", "#ContentStrategy", "#SocialSelling"],
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      assetIds: [assets[0].id, assets[1].id],
    },
    {
      title: "Sådan bruger du data til at booste dit LinkedIn-reach",
      status: PostStatus.PUBLISHED,
      hook: "Engagement rate er ikke en vanity metric – det er dit kompas.",
      bodyText:
        "Engagement rate er ikke en vanity metric – det er dit kompas.\n\nVi analyserede 50 LinkedIn-profiler i 6 måneder. Resultatet:\n\n📊 Posts med data fik 2,3x mere rækkevidde\n📊 Spørgsmål i slutningen øgede kommentarer med 67%\n📊 Korte posts (under 1.300 tegn) vandt over lange\n\nMen det vigtigste: Konsistens slår perfektion.\n\nPoste du konsekvent på LinkedIn? Skriv 'JA' i kommentarerne 👇",
      cta: "Skriv JA i kommentarerne hvis du poster konsekvent",
      hashtags: ["#DataDrivenMarketing", "#LinkedInTips", "#ContentMarketing"],
      scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      assetIds: [assets[1].id, assets[2].id],
    },
    {
      title: "Vi hjalp en SaaS-startup med at 3x'e deres leads",
      status: PostStatus.APPROVED,
      hook: "90 dage. 3x leads. Her er præcis hvad vi gjorde.",
      bodyText:
        "90 dage. 3x leads. Her er præcis hvad vi gjorde.\n\nVores kunde: En B2B SaaS-virksomhed med 15 ansatte.\nUdfordringen: Stagnerende pipeline og lav brand awareness.\n\nVores tilgang:\n✅ Definerede 3 kernepersoner\n✅ Oprettede en konsistent posting-plan (3x ugentligt)\n✅ Blandede thought leadership med case studies\n✅ Brugte LinkedIn-analytics til løbende optimering\n\nResultat efter 90 dage:\n🚀 +187% organisk rækkevidde\n🚀 +312% profilbesøg\n🚀 +3x inbound leads\n\nVil du se den fulde case study? Drop en kommentar 👇",
      cta: "Drop en kommentar for at se den fulde case study",
      hashtags: ["#CaseStudy", "#B2BSaaS", "#LeadGeneration", "#LinkedInStrategy", "#GrowthMarketing"],
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      assetIds: [assets[4].id, assets[14].id],
    },
    {
      title: "Den vigtigste LinkedIn-metric du ikke måler",
      status: PostStatus.SCHEDULED,
      hook: "Alle tæller likes. Ingen tæller det der faktisk konverterer.",
      bodyText:
        "Alle tæller likes. Ingen tæller det der faktisk konverterer.\n\nDen mest oversete metric på LinkedIn: SSI (Social Selling Index).\n\nHvad er det?\nLinkedIns eget score (0-100) der måler din evne til at:\n1. Etablere din professionelle brand\n2. Finde de rigtige mennesker\n3. Engagere med indsigt\n4. Opbygge relationer\n\nVirksomheder med høj SSI får:\n💡 45% flere muligheder\n💡 51% mere sandsynlighed for at nå kvoten\n\nTjek din SSI her: linkedin.com/sales/ssi\n\nHvad fik du? Del dit score i kommentarerne 🎯",
      cta: "Del dit SSI-score i kommentarerne",
      hashtags: ["#SocialSelling", "#LinkedInSSI", "#SalesStrategy", "#B2BMarketing"],
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      assetIds: [assets[2].id],
    },
    {
      title: "5 LinkedIn-hooks der åbner op for algoritmen",
      status: PostStatus.SCHEDULED,
      hook: "Du har 1,7 sekunder til at stoppe scrollet. Her er 5 hooks der virker.",
      bodyText:
        "Du har 1,7 sekunder til at stoppe scrollet. Her er 5 hooks der virker:\n\n1. 'De fleste [målgruppe] gør X. Det er en fejl.'\n2. 'Vi hjalp [kunde] med at [specifikt resultat] på [tidsramme]'\n3. '[Kontraintuitiv påstand] – og data beviser det'\n4. 'Jeg var imod [populær opfattelse] – men jeg tog fejl'\n5. 'Her er hvad [industri] ikke fortæller dig om [emne]'\n\nFormlen: Specifik + Nysgerrighedsgab + Løfte om værdi\n\nGem dette opslag og test en hook i din næste post 📌\n\nHvilken hook bruger du oftest? 👇",
      cta: "Gem dette opslag og fortæl os hvilken hook du bruger",
      hashtags: ["#LinkedInTips", "#Copywriting", "#ContentCreation", "#PersonalBranding"],
      scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      assetIds: [assets[10].id],
    },
    {
      title: "Thought leadership vs. salgsindhold – den rigtige balance",
      status: PostStatus.REVIEW,
      hook: "80% thought leadership. 20% salg. Sådan ser den bedste LinkedIn-strategi ud.",
      bodyText:
        "80% thought leadership. 20% salg. Sådan ser den bedste LinkedIn-strategi ud.\n\nMen hvad er thought leadership egentlig?\n\nDet er IKKE:\n❌ At dele branchenyheder\n❌ At fortælle hvad du ved\n❌ At linke til din hjemmeside\n\nDet ER:\n✅ At have en kontroversiel holdning og forsvare den\n✅ At dele fejl og hvad du lærte af dem\n✅ At give din ICP indsigt de ikke kan få andre steder\n\nDin kunde skal tænke: 'Disse mennesker forstår min verden'\n\nFør de tænker: 'Lad os købe fra dem'\n\nHvor god er din thought leadership-balance? 🎯",
      cta: "Hvad er din thought leadership-balance? Del i kommentarerne",
      hashtags: ["#ThoughtLeadership", "#ContentStrategy", "#B2BMarketing", "#PersonalBranding"],
      scheduledAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      assetIds: [assets[7].id, assets[8].id],
    },
    {
      title: "Hvorfor dit LinkedIn-indhold ikke konverterer",
      status: PostStatus.DRAFT,
      hook: "Godt indhold + forkert timing = ingen resultater.",
      bodyText:
        "Godt indhold + forkert timing = ingen resultater.\n\nDe bedste tidspunkter at poste på LinkedIn:\n\n📅 Tirsdag-Torsdag\n⏰ 08:00-09:00 (morgenrutinen)\n⏰ 12:00-13:00 (frokostpausen)\n⏰ 17:00-18:00 (slut på arbejdsdagen)\n\nMen timing er kun én faktor. De 3 vigtigste:\n\n1. Relevans for din ICP (vigtigst)\n2. Konsistens (næstvigtigst)\n3. Timing (tredje vigtigst)\n\nHvor poster du? Del din erfaring 👇",
      cta: "Del din erfaring med LinkedIn-timing i kommentarerne",
      hashtags: ["#LinkedInAlgorithm", "#ContentMarketing", "#SocialMediaStrategy"],
      scheduledAt: null,
      assetIds: [],
    },
    {
      title: "Case study: Hvordan vi øgede engagement med 400%",
      status: PostStatus.DRAFT,
      hook: "400% mere engagement på 60 dage. Ingen annoncer. Ingen tricks.",
      bodyText:
        "400% mere engagement på 60 dage. Ingen annoncer. Ingen tricks.\n\n[KLADDE - skal udfyldes]\n\nVirksomhed: [Navn]\nBranche: [Branche]\nUdfordring: [Beskriv]\n\nStrategi:\n1. [Trin 1]\n2. [Trin 2]\n3. [Trin 3]\n\nResultater:\n📊 [Metric 1]\n📊 [Metric 2]\n📊 [Metric 3]",
      cta: "Kontakt os for at høre mere",
      hashtags: ["#CaseStudy", "#ContentMarketing", "#ROI"],
      scheduledAt: null,
      assetIds: [assets[14].id],
    },
    {
      title: "Den komplette guide til LinkedIn-hashtags i 2025",
      status: PostStatus.DRAFT,
      hook: "Hashtags er ikke døde – du bruger dem bare forkert.",
      bodyText:
        "Hashtags er ikke døde – du bruger dem bare forkert.\n\n[KLADDE - skal udfyldes med data og eksempler]",
      cta: "Gem dette opslag for fremtidig reference",
      hashtags: ["#LinkedIn", "#Hashtags", "#ContentStrategy"],
      scheduledAt: null,
      assetIds: [],
    },
    {
      title: "Medarbejder advocacy: Dit stærkeste LinkedIn-våben",
      status: PostStatus.ARCHIVED,
      hook: "Dine medarbejdere har 10x mere reach end din virksomhedsside.",
      bodyText:
        "Dine medarbejdere har 10x mere reach end din virksomhedsside.\n\nMedarbejder advocacy er ikke nyt – men de fleste gør det forkert.\n\nHer er 4 trin til et succesfuldt program:\n\n1. Start med de entusiastiske (tving ingen)\n2. Giv dem indhold der er nemt at dele\n3. Fejr og anerkend bidrag\n4. Mål og optimer løbende\n\nResultat: Mere organisk reach + stærkere employer brand\n\nHar du prøvet employee advocacy? 👇",
      cta: "Del din erfaring med employee advocacy",
      hashtags: ["#EmployeeAdvocacy", "#EmployerBranding", "#LinkedInMarketing"],
      scheduledAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      assetIds: [assets[3].id, assets[18].id],
    },
  ];

  const posts = await Promise.all(
    postData.map((post) =>
      prisma.post.create({
        data: {
          workspaceId: workspace.id,
          title: post.title,
          status: post.status,
          platform: Platform.LINKEDIN,
          hook: post.hook,
          bodyText: post.bodyText,
          cta: post.cta,
          hashtags: post.hashtags,
          scheduledAt: post.scheduledAt,
          assetIds: post.assetIds,
          createdById: adminUser.id,
          updatedById: editorUser.id,
        },
      })
    )
  );

  // ── Kommentarer ───────────────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        postId: posts[0].id,
        userId: editorUser.id,
        body: "Godt indhold! Punkt 2 om konsistens er super vigtigt.",
      },
      {
        postId: posts[0].id,
        userId: approverUser.id,
        body: "Enig. Skal vi tilføje et konkret eksempel under punkt 3?",
      },
      {
        postId: posts[2].id,
        userId: approverUser.id,
        body: "Godkendt! Dette er stærkt indhold. Klar til at gå live.",
      },
    ],
  });

  // ── Audit Events ──────────────────────────────────────────────────────────
  await prisma.auditEvent.createMany({
    data: [
      {
        entityType: "Post",
        entityId: posts[2].id,
        action: "STATUS_CHANGED",
        userId: approverUser.id,
        diffJson: { from: "REVIEW", to: "APPROVED" },
      },
      {
        entityType: "Post",
        entityId: posts[1].id,
        action: "STATUS_CHANGED",
        userId: adminUser.id,
        diffJson: { from: "APPROVED", to: "PUBLISHED" },
      },
    ],
  });

  console.log(`✅ ${posts.length} posts oprettet`);
  console.log("🎉 Seed færdig!");
  console.log("\n📋 Login-oplysninger:");
  console.log("   Email: admin@demo.dk | Adgangskode: demo1234 (ADMIN)");
  console.log("   Email: editor@demo.dk | Adgangskode: demo1234 (EDITOR)");
  console.log("   Email: approver@demo.dk | Adgangskode: demo1234 (APPROVER)");
  console.log("\n🌐 Workspace slug: demo-virksomhed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
