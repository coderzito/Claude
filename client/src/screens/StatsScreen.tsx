import React, { useEffect, useState } from "react";
import { Text, View, ScrollView, ActivityIndicator } from "react-native";
import { api } from "../api/client";
import { Screen, Card } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import type { StreakHistory, WeekStat, MonthStat } from "../api/types";

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return `${MONTH_LABEL[d.getMonth()]} ${d.getDate()}`;
}

function monthLabel(month: string): string {
  const d = new Date(month);
  return MONTH_LABEL[d.getMonth()];
}

function BarChart({
  data,
  color,
  trackColor,
  labelColor,
}: {
  data: { key: string; value: number; label: string }[];
  color: string;
  trackColor: string;
  labelColor: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 8 }}>
      {data.map((d) => (
        <View key={d.key} style={{ flex: 1, alignItems: "center" }}>
          <View style={{ width: "100%", height: 80, justifyContent: "flex-end" }}>
            <View
              style={{
                width: "100%",
                height: Math.max(4, (d.value / max) * 80),
                borderRadius: 6,
                backgroundColor: d.value > 0 ? color : trackColor,
              }}
            />
          </View>
          <Text style={{ color: labelColor, fontSize: 11, marginTop: 6 }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const [history, setHistory] = useState<StreakHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<StreakHistory>("/streak/history")
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !history) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.text} />
        </View>
      </Screen>
    );
  }

  const weeks: WeekStat[] = [...history.weeks].reverse();
  const months: MonthStat[] = [...history.months].reverse();

  const thisWeek = weeks[weeks.length - 1]?.sessionsCompleted ?? 0;
  const priorWeeks = weeks.slice(0, -1);
  const priorAvg = priorWeeks.length
    ? priorWeeks.reduce((sum, w) => sum + w.sessionsCompleted, 0) / priorWeeks.length
    : null;

  const thisMonth = months[months.length - 1];
  const priorMonths = months.slice(0, -1).filter((m) => m.avgScore !== null);
  const priorMonthAvg = priorMonths.length
    ? priorMonths.reduce((sum, m) => sum + (m.avgScore ?? 0), 0) / priorMonths.length
    : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.space.lg }}>
        <View style={{ marginBottom: theme.space.xl }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: theme.space.xs }}>
            Weekly sessions
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 13, marginBottom: theme.space.lg }}>
            {priorAvg === null
              ? "Not enough history yet to compare."
              : thisWeek >= priorAvg
                ? `${thisWeek >= priorAvg + 0.5 ? "Up" : "On par"} vs your ${priorAvg.toFixed(1)}/week average`
                : `Down vs your ${priorAvg.toFixed(1)}/week average`}
          </Text>
          <Card>
            <BarChart
              data={weeks.map((w) => ({ key: w.weekStart, value: w.sessionsCompleted, label: weekLabel(w.weekStart) }))}
              color={theme.accent}
              trackColor={theme.track}
              labelColor={theme.subtext}
            />
          </Card>
        </View>

        <View style={{ marginBottom: theme.space.xl }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: theme.space.xs }}>
            Monthly average score
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 13, marginBottom: theme.space.lg }}>
            {priorMonthAvg === null || thisMonth?.avgScore == null
              ? "Score a few sessions this month to see a trend."
              : thisMonth.avgScore >= priorMonthAvg
                ? `Up vs your ${priorMonthAvg.toFixed(0)} average`
                : `Down vs your ${priorMonthAvg.toFixed(0)} average`}
          </Text>
          <Card>
            <BarChart
              data={months.map((m) => ({ key: m.month, value: m.avgScore ?? 0, label: monthLabel(m.month) }))}
              color={theme.good}
              trackColor={theme.track}
              labelColor={theme.subtext}
            />
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
