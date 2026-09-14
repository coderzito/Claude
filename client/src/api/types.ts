export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  source_type: "seeded" | "syllabus";
  visibility: "private" | "public";
}

export interface Subtopic {
  id: string;
  title: string;
  difficulty_tier: "intro" | "core" | "advanced";
  times_rolled: number;
}

export interface SessionSummary {
  id: string;
  status: string;
  created_at: string;
  duration_s: number | null;
  subtopic_title: string;
  total: number | null;
  accuracy: number | null;
  coverage: number | null;
  structure: number | null;
  delivery: number | null;
}

export interface SessionDetail {
  id: string;
  status: "studying" | "recording" | "transcribing" | "grading" | "scored" | "rejected";
  rejectReason: string | null;
  studyStartedAt: string;
  studySecondsRemaining: number;
  canStartRecording: boolean;
  speechStartedAt: string | null;
  durationS: number | null;
}

export interface KeyPointResult {
  id: string;
  hit: boolean;
  evidence: string;
}

export interface MissedPoint {
  id: string;
  claim: string;
  source_line: number;
}

export interface Contradiction {
  claim: string;
  source_line: number;
}

export interface ScoreResult {
  accuracy: number;
  coverage: number;
  structure: number;
  delivery: number;
  total: number;
  missed_points: MissedPoint[];
  contradictions: Contradiction[];
  flags: { likelyScriptReading: boolean };
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  recentAvgTotal: number | null;
  percentile: number;
  improvementVs30Day: number | null;
  isSelf: boolean;
}

export interface StreakStatus {
  weekStart: string;
  sessionsCompleted: number;
  weeklyQuota: number;
  freezesRemaining: number;
  currentStreakWeeks: number;
}

export interface WeekStat {
  weekStart: string;
  sessionsCompleted: number;
}

export interface MonthStat {
  month: string;
  sessionsCompleted: number;
  avgScore: number | null;
}

export interface StreakHistory {
  weeklyQuota: number;
  weeks: WeekStat[];
  months: MonthStat[];
}
