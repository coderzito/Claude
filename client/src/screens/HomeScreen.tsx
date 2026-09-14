import React, { useCallback, useState } from "react";
import { Text, View, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Screen, Card, Button } from "../components/ui";
import { theme } from "../theme";
import type { StreakStatus } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<StreakStatus>("/streak");
      setStreak(res);
    } catch {
      // best-effort; the home screen still works without the streak widget
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.text} />}
      >
        <Text style={{ color: theme.subtext, fontSize: 16 }}>Welcome back,</Text>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: "700", marginBottom: 20 }}>{user?.displayName}</Text>

        {streak && (
          <Card style={{ marginBottom: 20 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}>
              {streak.currentStreakWeeks} week{streak.currentStreakWeeks === 1 ? "" : "s"} streak
            </Text>
            <Text style={{ color: theme.subtext, marginTop: 4 }}>
              {streak.sessionsCompleted}/{streak.weeklyQuota} sessions this week · {streak.freezesRemaining} freeze
              {streak.freezesRemaining === 1 ? "" : "s"} left
            </Text>
          </Card>
        )}

        <View style={{ gap: 12 }}>
          <Button title="🎲 Roll Random!" onPress={() => navigation.navigate("Roll")} />
          <Button title="History" variant="secondary" onPress={() => navigation.navigate("History")} />
          <Button title="Friends leaderboard" variant="secondary" onPress={() => navigation.navigate("Leaderboard")} />
          <Button title="Log out" variant="secondary" onPress={logout} />
        </View>
      </ScrollView>
    </Screen>
  );
}
