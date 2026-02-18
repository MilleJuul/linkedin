import { z } from "zod";

// ─── Post ─────────────────────────────────────────────────────────────────────

export const PostStatusValues = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export const PostStatusSchema = z.enum(PostStatusValues);

export const CreatePostSchema = z.object({
  title: z.string().min(1, "Titel er påkrævet").max(200, "Titel må maks. være 200 tegn"),
  hook: z.string().max(500).optional().default(""),
  bodyText: z.string().max(3000).optional().default(""),
  cta: z.string().max(300).optional().default(""),
  hashtags: z.array(z.string()).optional().default([]),
  assetIds: z.array(z.string()).optional().default([]),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: PostStatusSchema.optional().default("DRAFT"),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const UpdatePostSchema = CreatePostSchema.partial();
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

// ─── Comment ──────────────────────────────────────────────────────────────────

export const CreateCommentSchema = z.object({
  body: z.string().min(1, "Kommentar må ikke være tom").max(1000),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

// ─── Brand Kit ────────────────────────────────────────────────────────────────

export const BrandKitSchema = z.object({
  toneOfVoice: z.string().max(1000).optional().default(""),
  doWords: z.array(z.string().max(50)).optional().default([]),
  dontWords: z.array(z.string().max(50)).optional().default([]),
  ctaStyle: z.string().max(500).optional().default(""),
  hashtagStyle: z.string().max(500).optional().default(""),
  emojiPolicy: z.string().max(500).optional().default(""),
  examples: z.array(z.string().max(3000)).optional().default([]),
});

export type BrandKitInput = z.infer<typeof BrandKitSchema>;

// ─── Asset ────────────────────────────────────────────────────────────────────

export const AssetTypeValues = ["IMAGE", "VIDEO"] as const;

export const CreateAssetSchema = z.object({
  filename: z.string().min(1).max(255),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  type: z.enum(AssetTypeValues).default("IMAGE"),
  tags: z.array(z.string().max(50)).optional().default([]),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export const UpdateAssetSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;

// ─── Workspace ────────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Navn er påkrævet").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug må kun indeholde små bogstaver, tal og bindestreger"),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

// ─── Weekly Plan ──────────────────────────────────────────────────────────────

export const GenerateWeeklyPlanSchema = z.object({
  cadence: z.coerce
    .number()
    .int()
    .min(1, "Min. 1 post pr. uge")
    .max(7, "Maks. 7 posts pr. uge")
    .default(3),
  themes: z.array(z.string().max(100)).optional().default([]),
  startDate: z.string().datetime().optional(),
});

export type GenerateWeeklyPlanInput = z.infer<typeof GenerateWeeklyPlanSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Ugyldig email"),
  password: z.string().min(6, "Adgangskode skal være mindst 6 tegn"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
