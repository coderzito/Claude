import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, ScrollView, Alert, View, Pressable } from "react-native";
import * as Speech from "expo-speech";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { Screen, Button, Card } from "../components/ui";
import { ProgressRing } from "../components/Progress";
import { theme } from "../theme";
import { usePreferences, TEXT_SIZE_SCALE, SPEECH_RATE } from "../context/PreferencesContext";

type Props = NativeStackScreenProps<RootStackParamList, "Chapter">;

interface SessionResponse {
  session: {
    status: string;
    studySecondsRemaining: number;
    canStartRecording: boolean;
  };
  chapter: { bodyMd: string; keyPoints: { id: string; claim: string }[] };
}

const STUDY_MINUTES_DISPLAY_FALLBACK = 4;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Splits the "1: claim\n2: claim" chapter body into short, individually
// spaced chunks instead of one dense wall of text — easier to keep your
// place in, easier to skim, easier to come back to after a distraction.
function chunkBody(bodyMd: string): string[] {
  return bodyMd
    .split("\n")
    .map((line) => line.replace(/^\s*\d+:\s*/, "").trim())
    .filter(Boolean);
}

// Countdown display is cosmetic — it's re-synced against the server's
// studySecondsRemaining on every poll rather than trusted on its own.
export default function ChapterScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { prefs } = usePreferences();
  const textScale = TEXT_SIZE_SCALE[prefs.textSize];
  const [bodyMd, setBodyMd] = useState("");
  const [keyPoints, setKeyPoints] = useState<{ id: string; claim: string }[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(STUDY_MINUTES_DISPLAY_FALLBACK * 60);
  const [canStartRecording, setCanStartRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [keyPointsOpen, setKeyPointsOpen] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstLoad = useRef(true);

  const chunks = useMemo(() => chunkBody(bodyMd), [bodyMd]);

  async function poll() {
    try {
      const res = await api.get<SessionResponse>(`/sessions/${sessionId}`);
      setBodyMd(res.chapter.bodyMd);
      setKeyPoints(res.chapter.keyPoints ?? []);
      setSecondsRemaining(res.session.studySecondsRemaining);
      if (firstLoad.current) {
        setTotalSeconds(Math.max(res.session.studySecondsRemaining, 1));
        firstLoad.current = false;
      }
      setCanStartRecording(res.session.canStartRecording);
    } catch {
      // keep showing last known state; next poll will retry
    }
  }

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 10_000);
    tickRef.current = setInterval(() => {
      setSecondsRemaining((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function toggleListen() {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    const text = chunks.join(". ");
    if (!text) return;
    setSpeaking(true);
    Speech.speak(text, {
      rate: SPEECH_RATE[prefs.speechSpeed],
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function startRecording() {
    Speech.stop();
    setSpeaking(false);
    setStarting(true);
    try {
      await api.post(`/sessions/${sessionId}/speech/start`);
      navigation.replace("Recording", { sessionId });
    } catch (err: any) {
      if (err?.status === 403) {
        Alert.alert("Not quite yet", "Keep studying a little longer before you record.");
        poll();
      } else {
        Alert.alert("Couldn't start recording", "Something went wrong.");
      }
    } finally {
      setStarting(false);
    }
  }

  const progress = secondsRemaining === null ? 0 : 1 - secondsRemaining / totalSeconds;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.space.lg }}>
        <View style={{ alignItems: "center", marginBottom: theme.space.lg }}>
          <ProgressRing size={128} strokeWidth={10} progress={progress}>
            <Text style={{ color: theme.text, fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
              {secondsRemaining === null ? "--:--" : formatClock(secondsRemaining)}
            </Text>
          </ProgressRing>
        </View>

        <Pressable onPress={toggleListen} style={{ alignSelf: "center", marginBottom: theme.space.lg }}>
          <Text style={{ color: theme.accent, fontSize: 15, fontWeight: "600" }}>
            {speaking ? "Stop listening" : "Listen to this chapter"}
          </Text>
        </Pressable>

        {keyPoints.length > 0 && (
          <Card style={{ marginBottom: theme.space.lg }} flat>
            <Pressable
              onPress={() => setKeyPointsOpen((v) => !v)}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
            >
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>Cover these points</Text>
              <Text style={{ color: theme.faint, fontSize: 13 }}>{keyPointsOpen ? "hide" : "show"}</Text>
            </Pressable>
            {keyPointsOpen && (
              <View style={{ marginTop: theme.space.md, gap: theme.space.sm }}>
                {keyPoints.map((kp) => (
                  <View key={kp.id} style={{ flexDirection: "row" }}>
                    <View style={styles.bullet} />
                    <Text style={{ color: theme.subtext, flex: 1, fontSize: 14 * textScale, lineHeight: 20 * textScale }}>
                      {kp.claim}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        <View style={{ gap: theme.space.lg }}>
          {chunks.map((chunk, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              <View style={styles.chunkBar} />
              <Text style={{ color: theme.text, fontSize: 16 * textScale, lineHeight: 24 * textScale, flex: 1 }}>
                {chunk}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Button
        title={canStartRecording ? "I'm ready — start recording" : "Keep studying…"}
        onPress={startRecording}
        loading={starting}
        disabled={!canStartRecording}
      />
    </Screen>
  );
}

const styles = {
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.accent,
    marginTop: 7,
    marginRight: theme.space.sm,
  },
  chunkBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginRight: theme.space.md,
  },
} as const;
