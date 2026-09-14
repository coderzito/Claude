import React, { useCallback, useState } from "react";
import { Text, View, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Screen, Card, Button } from "../components/ui";
import { SegmentedBar } from "../components/Progress";
import { DieIcon } from "../components/DieIcon";
import { theme } from "../theme";
import type { StreakStatus } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.text} />}
      >
        <Text style={{ color: theme.subtext, fontSize: 16 }}>Welcome back,</Text>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: "800", marginBottom: theme.space.xl }}>
          {user?.displayName}
        </Text>

        {streak && (
          <Card style={{ marginBottom: theme.space.xl }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: theme.space.md }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>
                {streak.currentStreakWeeks} week{streak.currentStreakWeeks === 1 ? "" : "s"} streak
              </Text>
              <Text style={{ color: theme.faint, fontSize: 13 }}>
                {streak.freezesRemaining} freeze{streak.freezesRemaining === 1 ? "" : "s"} left
              </Text>
            </View>
            <SegmentedBar segments={streak.weeklyQuota} filled={streak.sessionsCompleted} />
            <Text style={{ color: theme.subtext, marginTop: theme.space.sm, fontSize: 13 }}>
              {streak.sessionsCompleted} of {streak.weeklyQuota} sessions this week
            </Text>
          </Card>
        )}

        <View style={{ gap: theme.space.md }}>
          <Button title="Roll Random!" icon={<DieIcon />} onPress={() => navigation.navigate("Roll")} />
          <Button title="History" variant="secondary" onPress={() => navigation.navigate("History")} />
          <Button title="Friends leaderboard" variant="secondary" onPress={() => navigation.navigate("Leaderboard")} />
        </View>
      </ScrollView>
    </Screen>
  );
}
