# Cold Call

A study app: roll a random subtopic, study an AI-generated chapter for 15 minutes,
then record a 2-5 minute spoken explanation. The app grades the speech against the
chapter it generated, because it holds the chapter's key points as structured data
from the same generation call.

- **Client**: Expo (React Native) — installs to your phone's home screen like a real
  app (via Expo Go while developing, or a standalone build). Uses `expo-av` for
  recording with a live level meter.
- **Server**: Node + Express + Postgres. Audio lives in S3-compatible object storage
  (MinIO locally), never in the database. Transcription and grading always run as
  background jobs, polled from a `jobs` table — never inline in a request.

## Architecture notes (from the build brief)

- **Generation**: one Anthropic call per subtopic returns the chapter markdown *and*
  its `key_points` together (`server/src/services/generation.ts`), cached by
  `(subtopic_id, model_version)` and reused across every user. Key points are never
  generated in a second call, so they can't drift from the text.
- **Grading**: after transcription, one structured Anthropic call
  (`server/src/services/grading.ts`) returns accuracy/structure/delivery plus which
  key points were hit and any contradictions. Coverage is computed server-side from
  key-point hits and weights — never asked of the model as a free number. Weights
  are per-deck config (`deck_configs` table), not hardcoded.
- **Anti-abuse**: study and speech timers are server timestamps
  (`study_started_at`, `speech_started_at`); the client's countdown is cosmetic. A
  session is rejected if speech starts less than 12 minutes after study starts, or
  if the recorded duration falls outside 2-5 minutes. Only one audio upload is
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
cp .env.example .env        # fill in ANTHROPIC_API_KEY and OPENAI_API_KEY at minimum
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

- `ANTHROPIC_API_KEY` — chapter generation and grading (structured tool-call JSON).
- `OPENAI_API_KEY` — transcription (Whisper, `verbose_json` for segment timestamps
  used in the script-reading heuristic). Swappable: the whole integration is one
  `transcribeAudio()` function in `server/src/services/transcription.ts`.

### Known gaps for a v1 demo

- Friending is a single-step mutual add by email (no request/accept flow).
- `npm audit` flags vulnerabilities inside Expo SDK 51's own CLI tooling
  (`node_modules/tar`, `uuid` via `@expo/bunyan`) — these are transitive
  dev-time dependencies of the `expo` CLI, not code shipped to the phone.
  Upgrading past them means moving to a newer Expo SDK, which is a larger,
  separate migration.
- Everything explicitly out of scope in the build brief (hostile Q&A follow-ups,
  leagues, group boards, bilingual mode, instructor dashboard, payments) is not
  built.
