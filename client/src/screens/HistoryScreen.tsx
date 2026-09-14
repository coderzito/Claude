import React, { useEffect, useState } from "react";
import { Text, FlatList, View } from "react-native";
import { api } from "../api/client";
import { Screen, Card } from "../components/ui";
import { theme } from "../theme";
import type { SessionSummary } from "../api/types";

const STATUS_LABEL: Record<string, string> = {
  studying: "Studying",
  recording: "Recording",
  transcribing: "Transcribing",
  grading: "Grading",
  scored: "Scored",
  rejected: "Rejected",
};

// Every recording is kept and listed chronologically — this screen is the
// product's retention hook, so it always shows every session regardless of
// leaderboard privacy.
export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ sessions: SessionSummary[] }>("/sessions")
      .then((res) => setSessions(res.sessions))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        refreshing={loading}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!loading ? <Text style={{ color: theme.subtext }}>No sessions yet.</Text> : null}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>{item.subtopic_title}</Text>
                <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
                  {new Date(item.created_at).toLocaleDateString()} · {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
              {item.total !== null && (
                <Text style={{ color: theme.accent, fontSize: 20, fontWeight: "700" }}>{Math.round(item.total)}</Text>
              )}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
