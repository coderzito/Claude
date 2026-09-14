import React, { useEffect, useState } from "react";
import { Text, FlatList, View, Alert } from "react-native";
import { api } from "../api/client";
import { Screen, Card, Field, Button } from "../components/ui";
import { theme } from "../theme";
import type { LeaderboardEntry } from "../api/types";

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendEmail, setFriendEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ entries: LeaderboardEntry[] }>("/leaderboard");
      setEntries(res.entries);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addFriend() {
    if (!friendEmail.trim()) return;
    setAdding(true);
    try {
      await api.post("/friends", { email: friendEmail.trim() });
      setFriendEmail("");
      await load();
    } catch {
      Alert.alert("Couldn't add friend", "Check the email and try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <Field label="Add a friend by email" value={friendEmail} onChangeText={setFriendEmail} keyboardType="email-address" />
        <Button title="Add" variant="secondary" onPress={addFriend} loading={adding} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.userId}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        ListEmptyComponent={!loading ? <Text style={{ color: theme.subtext }}>Add friends to see a leaderboard.</Text> : null}
        renderItem={({ item }) => (
          <Card style={item.isSelf ? { borderColor: theme.accent } : undefined}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
                {item.displayName}
                {item.isSelf ? " (you)" : ""}
              </Text>
              <Text style={{ color: theme.accent, fontSize: 18, fontWeight: "700" }}>{item.percentile}th pct</Text>
            </View>
            {item.improvementVs30Day !== null && (
              <Text style={{ color: item.improvementVs30Day >= 0 ? theme.good : theme.bad, fontSize: 12, marginTop: 4 }}>
                {item.improvementVs30Day >= 0 ? "+" : ""}
                {item.improvementVs30Day.toFixed(1)} vs your 30-day average
              </Text>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}
