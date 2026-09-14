import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, AppState } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api, API_URL, getToken } from "../api/client";
import { Screen, Button } from "../components/ui";
import { ProgressRing } from "../components/Progress";
import LevelMeter from "../components/LevelMeter";
import { useTheme } from "../context/ThemeContext";
import { usePreferences } from "../context/PreferencesContext";

type Props = NativeStackScreenProps<RootStackParamList, "Recording">;

const MIN_SECONDS = 60;
const MAX_SECONDS = 120;

type Phase = "preparing" | "recording" | "uploading" | "processing";

const recordingOptions = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export default function RecordingScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const theme = useTheme();
  const { prefs } = usePreferences();
  const [phase, setPhase] = useState<Phase>("preparing");
  const stoppedRef = useRef(false);
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 250);
  const elapsed = Math.floor(recorderState.durationMillis / 1000);

  useEffect(() => {
    let cancelled = false;

    async function begin() {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Microphone needed", "Passion Study needs mic access to record your explanation.");
        navigation.goBack();
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled) return;
      recorder.record();
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

  // A tactile cue the instant it's OK to stop, so you don't have to keep
  // reading the screen to know when you've crossed the line.
  const wasStoppable = useRef(false);
  useEffect(() => {
    const stoppable = elapsed >= MIN_SECONDS;
    if (stoppable && !wasStoppable.current && prefs.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    wasStoppable.current = stoppable;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  async function stopAndSubmit() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;

    setPhase("uploading");
    try {
      await recorder.stop();

      // recorder.uri can lag slightly behind stop() resolving on some
      // platforms; give the native side a beat, then fall back to the
      // status object before giving up.
      let uri = recorder.uri;
      if (!uri) {
        await new Promise((r) => setTimeout(r, 300));
        uri = recorder.uri ?? recorder.getStatus().url;
      }
      if (!uri) throw new Error("Recording finished but no file was produced");

      // RN's newer networking stack dropped support for the classic
      // `{ uri, name, type }` FormData shorthand ("Unsupported FormDataPart
      // implementation") — read the local file into a real Blob instead.
      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();

      const form = new FormData();
      form.append("file", blob, "explanation.m4a");
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
        throw new Error(body.error ?? `upload_failed (HTTP ${res.status})`);
      }

      setPhase("processing");
      pollForResult();
    } catch (err) {
      console.error("stopAndSubmit failed:", err);
      const detail = err instanceof Error ? err.message : String(err);
      Alert.alert("Upload failed", `Couldn't submit your recording. (${detail})`);
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
            <ProgressRing
              size={160}
              strokeWidth={12}
              progress={Math.min(1, elapsed / MAX_SECONDS)}
              color={canStop ? theme.good : theme.accent}
            >
              <Text style={{ color: theme.text, fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
              </Text>
            </ProgressRing>
            <Text style={{ color: canStop ? theme.good : theme.subtext, marginTop: theme.space.lg, marginBottom: theme.space.xl, fontWeight: canStop ? "600" : "400" }}>
              {canStop ? "You can stop anytime" : `${remainingToMin}s until you can stop`}
            </Text>
            <LevelMeter meteringDb={recorderState.metering ?? null} />
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
