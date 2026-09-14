import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "*",
  databaseUrl: required("DATABASE_URL", "postgres://coldcall:coldcall@localhost:5432/coldcall"),

  // Accepts either the local MinIO naming (S3_*) or Fly's Tigris naming
  // (AWS_*/BUCKET_NAME, set automatically by `fly storage create`), so the
  // same code runs against docker-compose locally and Tigris in production.
  s3: {
    endpoint: process.env.AWS_ENDPOINT_URL_S3 ?? required("S3_ENDPOINT", "http://localhost:9000"),
    region: process.env.AWS_REGION ?? process.env.S3_REGION ?? "us-east-1",
    bucket: process.env.BUCKET_NAME ?? required("S3_BUCKET", "coldcall-audio"),
    accessKey: process.env.AWS_ACCESS_KEY_ID ?? required("S3_ACCESS_KEY", "coldcall"),
    secretKey: process.env.AWS_SECRET_ACCESS_KEY ?? required("S3_SECRET_KEY", "coldcall123"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? (process.env.AWS_ENDPOINT_URL_S3 ? "false" : "true")) === "true",
  },

  // Groq's API is OpenAI-compatible, so the same `openai` SDK client is reused
  // for chat (generation/grading) and audio (transcription), just pointed at
  // Groq's base URL. Free tier, no payment method required.
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
    baseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    generationModel: process.env.GROQ_GENERATION_MODEL ?? "llama-3.3-70b-versatile",
    modelVersion: process.env.MODEL_VERSION ?? "groq-llama-3.3-70b-v1",
    transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL ?? "whisper-large-v3",
  },

  jwt: {
    secret: required("JWT_SECRET", "change-me-in-prod"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  },

  app: {
    freeTierDailySessions: Number(process.env.FREE_TIER_DAILY_SESSIONS ?? 3),
    studyMinutes: Number(process.env.STUDY_MINUTES ?? 15),
    minStudyMinutesBeforeSpeech: Number(process.env.MIN_STUDY_MINUTES_BEFORE_SPEECH ?? 12),
    speechMinSeconds: Number(process.env.SPEECH_MIN_SECONDS ?? 120),
    speechMaxSeconds: Number(process.env.SPEECH_MAX_SECONDS ?? 300),
    weeklyQuotaSessions: 4,
    monthlyFreezes: 2,
    privateSessionCount: 3,
  },
};
