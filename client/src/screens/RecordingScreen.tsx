import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, AppState } from "react-native";
import { Audio } from "expo-av";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api, API_URL, getToken } from "../api/client";
import { Screen, Button } from "../components/ui";
import LevelMeter from "../components/LevelMeter";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Recording">;

const MIN_SECONDS = 120;
const MAX_SECONDS = 300;

type Phase = "preparing" | "recording" | "uploading" | "processing";

export default function RecordingScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [phase, setPhase] = useState<Phase>("preparing");
  const [elapsed, setElapsed] = useState(0);
  const [metering, setMetering] = useState<number | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function begin() {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone needed", "Cold Call needs mic access to record your explanation.");
        navigation.goBack();
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setElapsed(Math.floor(status.durationMillis / 1000));
          if (typeof status.metering === "number") setMetering(status.metering);
        }
      });
      recording.setProgressUpdateInterval(250);
      await recording.startAsync();
      if (cancelled) {
        await recording.stopAndUnloadAsync();
        return;
      }
      recordingRef.current = recording;
      setPhase("recording");
    }

    begin().catch(() => {
      Alert.alert("Couldn't start recording", "Try again.");
      navigation.goBack();
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single continuous recording: leaving the app mid-recording forfeits it
  // rather than allowing a pause/resume that would produce multiple blobs.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" && phase === "recording" && !stoppedRef.current) {
        Alert.alert("Recording lost", "Leaving mid-recording cancels the take. Start again from the chapter screen.");
        navigation.goBack();
      }
    });
    return () => sub.remove();
  }, [phase, navigation]);

  useEffect(() => {
    if (phase === "recording" && elapsed >= MAX_SECONDS && !stoppedRef.current) {
      stopAndSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase]);

  async function stopAndSubmit() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const recording = recordingRef.current;
    if (!recording) return;

    setPhase("uploading");
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error("no_uri");

      const form = new FormData();
      form.append("file", { uri, name: "explanation.m4a", type: "audio/m4a" } as any);
      const token = await getToken();
      const res = await fetch(`${API_URL}/sessions/${sessionId}/audio`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "too_short" || body.error === "too_long") {
          Alert.alert("Recording rejected", `Your recording was ${body.error === "too_short" ? "too short" : "too long"}.`);
          navigation.navigate("Home");
          return;
        }
        throw new Error(body.error ?? "upload_failed");
      }

      setPhase("processing");
      pollForResult();
    } catch {
      Alert.alert("Upload failed", "Couldn't submit your recording.");
      navigation.navigate("Home");
    }
  }

  function pollForResult() {
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ status: string }>(`/sessions/${sessionId}/result`);
        if (res.status === "scored" || res.status === "rejected") {
          clearInterval(interval);
          navigation.replace("Results", { sessionId });
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }

  const canStop = elapsed >= MIN_SECONDS;
  const remainingToMin = Math.max(0, MIN_SECONDS - elapsed);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {phase === "preparing" && <Text style={{ color: theme.subtext }}>Getting the mic ready…</Text>}

        {phase === "recording" && (
          <>
            <Text style={{ color: theme.text, fontSize: 48, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
              {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
            </Text>
            <Text style={{ color: theme.subtext, marginTop: 8, marginBottom: 24 }}>
              {canStop ? "You can stop anytime" : `${remainingToMin}s until you can stop`}
            </Text>
            <LevelMeter meteringDb={metering} />
          </>
        )}

        {(phase === "uploading" || phase === "processing") && (
          <Text style={{ color: theme.subtext }}>
            {phase === "uploading" ? "Uploading your recording…" : "Transcribing and grading…"}
          </Text>
        )}
      </View>

      {phase === "recording" && (
        <Button title="Stop & submit" onPress={stopAndSubmit} disabled={!canStop} />
      )}
    </Screen>
  );
}
