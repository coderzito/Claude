# Cold Call

A study app: roll a random subtopic, study an AI-generated chapter for 4 minutes,
then record a 1-2 minute spoken explanation. The app grades the speech against the
chapter it generated, because it holds the chapter's key points as structured data
from the same generation call. Timing is config (`STUDY_MINUTES`,
`SPEECH_MIN_SECONDS`/`SPEECH_MAX_SECONDS` in `server/src/config.ts` / `fly.toml`),
not hardcoded to the build brief's original 15 min / 2-5 min.

- **Client**: Expo (React Native), SDK 57 — installs to your phone's home screen like
  a real app (via Expo Go while developing, or a standalone build). Uses `expo-audio`
  for recording with a live level meter. Published via EAS Update, so it's openable
  from the Expo Go app's Projects tab without a dev machine running.
- **Server**: Node + Express + Postgres. Audio lives in S3-compatible object storage
  (MinIO locally), never in the database. Transcription and grading always run as
  background jobs, polled from a `jobs` table — never inline in a request.

## Architecture notes (from the build brief)

- **Generation**: one Groq call per subtopic returns the chapter markdown *and*
  its `key_points` together (`server/src/services/generation.ts`), cached by
  `(subtopic_id, model_version)` and reused across every user. Key points are never
  generated in a second call, so they can't drift from the text.
- **Grading**: after transcription, one structured Groq call
  (`server/src/services/grading.ts`) returns accuracy/structure/delivery plus which
  key points were hit and any contradictions. Coverage is computed server-side from
  key-point hits and weights — never asked of the model as a free number. Weights
  are per-deck config (`deck_configs` table), not hardcoded.
- **Anti-abuse**: study and speech timers are server timestamps
  (`study_started_at`, `speech_started_at`); the client's countdown is cosmetic.
  `MIN_STUDY_MINUTES_BEFORE_SPEECH` defaults to 0 — the study timer is a
  suggestion, not a gate, so you can jump straight to recording; set it above 0
  to require studying for at least that long first. A session is still rejected
  if the recorded duration falls outside the configured min/max. Only one audio upload is
  accepted per session (the status flip to `transcribing` makes a second upload
  attempt fail), and the RN client foreground-only recording flow rules out
  pause/resume multi-blob uploads at the source. Likely script-reading (low pause
  variance + low filler rate) is flagged, never auto-penalized, per v1 scope.
- **Product rules**: a user's first three sessions are private by default (no
  leaderboard, no share prompts); every session is kept and listed chronologically
  as the retention hook; leaderboard ranking is by percentile within your friends,
  never raw score; free-tier sessions are capped per day since each one costs a
  generation + transcription + grading call.
- **North star metric**: `GET /metrics/second-session-rate` — the fraction of users
  who started a session who went on to start a second one. Every `session_started`
  event is logged to `analytics_events` for this.

## Running it locally

```bash
cp .env.example .env        # fill in GROQ_API_KEY at minimum (free, no card — console.groq.com)
docker compose up -d        # postgres + minio
npm install --prefix server
npm run db:migrate          # applies db/schema.sql
npm run db:seed             # loads the 3 seeded decks (db/seed.sql)
npm run dev:server          # API on :8080
npm run worker              # background transcription/grading worker, separate terminal
```

Then for the phone client:

```bash
npm install --prefix client
```

Edit `client/app.json`'s `expo.extra.apiUrl` to point at your machine's LAN IP
(not `localhost` — your phone needs to reach it over the network), e.g.
`http://192.168.1.23:8080`. Then:

```bash
npm run dev:client
```

Scan the QR code with the **Expo Go** app on your phone (App Store / Play Store) to
run Cold Call as an installed app — no browser, no app-store review needed for
local dev. For a real standalone install (own icon, no Expo Go wrapper), build with
[EAS Build](https://docs.expo.dev/build/introduction/) once you're ready to ship.

### Required API keys

- `GROQ_API_KEY` — the only key needed. Free tier, no card required
  (console.groq.com/keys). Powers chapter generation, grading (both structured
  tool-call JSON), and transcription (Whisper `verbose_json`, for the
  segment timestamps the script-reading heuristic needs) via Groq's
  OpenAI-compatible API. Swappable: generation/grading live in
  `server/src/services/generation.ts` + `grading.ts`, transcription in a single
  `transcribeAudio()` function in `server/src/services/transcription.ts`.

### Known gaps for a v1 demo

- Friending is a single-step mutual add by email (no request/accept flow).
- Chapter writing and grading run on Groq's free-tier `openai/gpt-oss-120b`
  rather than a frontier model, since the goal here was $0 to run. Quality is
  decent but noticeably rougher than Claude/GPT-4-class output; swap
  `GROQ_GENERATION_MODEL` for a larger Groq-hosted model, or repoint
  `generation.ts`/`grading.ts` at a different provider, if that matters more
  than cost later.
- `npm audit` flags moderate vulnerabilities in `decode-uri-component` (pulled in
  transitively by `@react-navigation/core`'s `query-string` dependency, with no
  fix available upstream as of SDK 57) and in the `expo` CLI's own dev-time
  tooling (`xcode`/`@expo/config-plugins`). The react-navigation one is a ReDoS
  in deep-link query parsing; this app never wires up a `linking` config, so
  that code path isn't exercised. The CLI-tooling ones don't ship to the phone.
- Everything explicitly out of scope in the build brief (hostile Q&A follow-ups,
  leagues, group boards, bilingual mode, instructor dashboard, payments) is not
  built.
