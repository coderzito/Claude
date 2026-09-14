import React, { useEffect, useRef, useState } from "react";
import { Text, ScrollView, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { Screen, Button } from "../components/ui";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Chapter">;

interface SessionResponse {
  session: {
    status: string;
    studySecondsRemaining: number;
    canStartRecording: boolean;
  };
  chapter: { bodyMd: string };
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Countdown display is cosmetic — it's re-synced against the server's
// studySecondsRemaining on every poll rather than trusted on its own.
export default function ChapterScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [bodyMd, setBodyMd] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [canStartRecording, setCanStartRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function poll() {
    try {
      const res = await api.get<SessionResponse>(`/sessions/${sessionId}`);
      setBodyMd(res.chapter.bodyMd);
      setSecondsRemaining(res.session.studySecondsRemaining);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function startRecording() {
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

  return (
    <Screen>
      <Text style={{ color: theme.accent, fontSize: 32, fontWeight: "700", textAlign: "center", marginBottom: 16 }}>
        {secondsRemaining === null ? "--:--" : formatClock(secondsRemaining)}
      </Text>
      <ScrollView style={{ flex: 1, marginBottom: 16 }}>
        <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{bodyMd}</Text>
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
