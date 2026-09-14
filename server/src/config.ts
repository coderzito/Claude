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

  s3: {
    endpoint: required("S3_ENDPOINT", "http://localhost:9000"),
    region: process.env.S3_REGION ?? "us-east-1",
    bucket: required("S3_BUCKET", "coldcall-audio"),
    accessKey: required("S3_ACCESS_KEY", "coldcall"),
    secretKey: required("S3_SECRET_KEY", "coldcall123"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    generationModel: process.env.GENERATION_MODEL ?? "claude-sonnet-5",
    modelVersion: process.env.MODEL_VERSION ?? "claude-sonnet-5-v1",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    transcriptionModel: process.env.TRANSCRIPTION_MODEL ?? "whisper-1",
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
