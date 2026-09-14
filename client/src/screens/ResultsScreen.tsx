import React, { useEffect, useRef, useState } from "react";
import { Text, ScrollView, View, ActivityIndicator, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { Screen, Card, Button } from "../components/ui";
import { ProgressRing } from "../components/Progress";
import { theme } from "../theme";
import type { ScoreResult } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

interface ResultResponse {
  status: string;
  rejectReason: string | null;
  score: ScoreResult | null;
}

function scoreColor(n: number): string {
  if (n >= 80) return theme.good;
  if (n >= 50) return theme.warn;
  return theme.bad;
}

function ScoreReveal({ total }: { total: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(
      total >= 80
        ? Haptics.NotificationFeedbackType.Success
        : total >= 50
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ alignItems: "center", marginBottom: theme.space.xl, opacity, transform: [{ scale }] }}>
      <ProgressRing size={148} strokeWidth={12} progress={Math.max(0, Math.min(1, total / 100))} color={scoreColor(total)}>
        <Text style={{ color: scoreColor(total), fontSize: 40, fontWeight: "800" }}>{Math.round(total)}</Text>
      </ProgressRing>
      <Text style={{ color: theme.subtext, marginTop: theme.space.md }}>Total score</Text>
    </Animated.View>
  );
}

function Subscore({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: scoreColor(value), fontSize: 22, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function ResultsScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [result, setResult] = useState<ResultResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await api.get<ResultResponse>(`/sessions/${sessionId}/result`);
      if (!cancelled) setResult(res);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!result) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.text} />
        </View>
      </Screen>
    );
  }

  if (result.status === "transcribing" || result.status === "grading") {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.text} />
          <Text style={{ color: theme.subtext, marginTop: 12 }}>Still {result.status}…</Text>
        </View>
      </Screen>
    );
  }

  if (result.status === "rejected" || !result.score) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "600", marginBottom: 8 }}>Session rejected</Text>
          <Text style={{ color: theme.subtext, textAlign: "center" }}>
            {result.rejectReason === "too_short" && "Your recording was shorter than the 2 minute minimum."}
            {result.rejectReason === "too_long" && "Your recording ran past the 5 minute maximum."}
            {!result.rejectReason && "This session couldn't be scored."}
          </Text>
        </View>
        <Button title="Back home" onPress={() => navigation.navigate("Home")} />
      </Screen>
    );
  }

  const score = result.score;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScoreReveal total={score.total} />

        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row" }}>
            <Subscore label="Accuracy" value={score.accuracy} />
            <Subscore label="Coverage" value={score.coverage} />
            <Subscore label="Structure" value={score.structure} />
            <Subscore label="Delivery" value={score.delivery} />
          </View>
        </Card>

        {score.flags?.likelyScriptReading && (
          <Card style={{ marginBottom: 16, borderColor: theme.warn }}>
            <Text style={{ color: theme.warn, fontWeight: "600" }}>Flagged: sounded scripted</Text>
            <Text style={{ color: theme.subtext, marginTop: 4 }}>
              Unusually steady pacing and few fillers. This doesn't affect your score — just a heads up.
            </Text>
          </Card>
        )}

        {score.missed_points.length > 0 && (
          <>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Missed key points</Text>
            {score.missed_points.map((mp) => (
              <Card key={mp.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: theme.text }}>{mp.claim}</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>Line {mp.source_line} of the chapter</Text>
              </Card>
            ))}
          </>
        )}

        {score.contradictions.length > 0 && (
          <>
            <Text style={{ color: theme.bad, fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 8 }}>
              Contradictions
            </Text>
            {score.contradictions.map((c, i) => (
              <Card key={i} style={{ marginBottom: 8, borderColor: theme.bad }}>
                <Text style={{ color: theme.text }}>{c.claim}</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>Contradicts line {c.source_line}</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <Button title="Back home" onPress={() => navigation.navigate("Home")} />
    </Screen>
  );
}
