import React, { useCallback, useState } from "react";
import { Text, View, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { Screen, Card, Button, Segmented, SwitchRow } from "../components/ui";
import { SegmentedBar } from "../components/Progress";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

interface MeResponse {
  user: { displayName: string; email: string };
  quota: { sessionsUsedToday: number; dailyLimit: number };
}

const REMINDER_HOURS: { label: string; value: number }[] = [
  { label: "Morning", value: 9 },
  { label: "Afternoon", value: 15 },
  { label: "Evening", value: 18 },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: theme.faint, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: theme.space.sm }}>
      {children}
    </Text>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const { prefs, setPref, loaded } = usePreferences();
  const [me, setMe] = useState<MeResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<MeResponse>("/auth/me")
        .then(setMe)
        .catch(() => {});
    }, [])
  );

  const nearestReminderHour = REMINDER_HOURS.reduce((best, opt) =>
    Math.abs(opt.value - prefs.reminderHour) < Math.abs(best.value - prefs.reminderHour) ? opt : best
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.space.lg }}>
        <View style={{ marginBottom: theme.space.xl }}>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>{me?.user.displayName ?? "…"}</Text>
            <Text style={{ color: theme.subtext, marginTop: 2 }}>{me?.user.email ?? ""}</Text>
            {me && (
              <View style={{ marginTop: theme.space.md }}>
                <SegmentedBar segments={me.quota.dailyLimit} filled={me.quota.sessionsUsedToday} />
                <Text style={{ color: theme.subtext, fontSize: 13, marginTop: theme.space.sm }}>
                  {me.quota.sessionsUsedToday} of {me.quota.dailyLimit} free sessions used today
                </Text>
              </View>
            )}
          </Card>
        </View>

        <View style={{ marginBottom: theme.space.xl }}>
          <SectionLabel>Reading & listening</SectionLabel>
          <Card style={{ gap: theme.space.lg }}>
            <View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600", marginBottom: theme.space.sm }}>Text size</Text>
              <Segmented
                options={[
                  { label: "Small", value: "small" as const },
                  { label: "Default", value: "default" as const },
                  { label: "Large", value: "large" as const },
                ]}
                value={prefs.textSize}
                onChange={(v) => setPref("textSize", v)}
              />
            </View>
            <View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600", marginBottom: theme.space.sm }}>Listen speed</Text>
              <Segmented
                options={[
                  { label: "Slower", value: "slower" as const },
                  { label: "Normal", value: "normal" as const },
                  { label: "Faster", value: "faster" as const },
                ]}
                value={prefs.speechSpeed}
                onChange={(v) => setPref("speechSpeed", v)}
              />
            </View>
          </Card>
        </View>

        <View style={{ marginBottom: theme.space.xl }}>
          <SectionLabel>Feel</SectionLabel>
          <Card style={{ gap: theme.space.lg }}>
            <SwitchRow
              label="Haptic feedback"
              description="A light buzz on taps and key moments"
              value={prefs.hapticsEnabled}
              onChange={(v) => setPref("hapticsEnabled", v)}
            />
            <SwitchRow
              label="Reduce motion"
              description="Turns off bounce/spring animations"
              value={prefs.reduceMotion}
              onChange={(v) => setPref("reduceMotion", v)}
            />
          </Card>
        </View>

        <View style={{ marginBottom: theme.space.xl }}>
          <SectionLabel>Daily reminder</SectionLabel>
          <Card style={{ gap: theme.space.lg }}>
            <SwitchRow
              label="Remind me to study"
              description="One notification a day, on this device"
              value={prefs.reminderEnabled}
              onChange={(v) => setPref("reminderEnabled", v)}
            />
            {prefs.reminderEnabled && (
              <Segmented
                options={REMINDER_HOURS.map((h) => ({ label: h.label, value: h.label }))}
                value={nearestReminderHour.label}
                onChange={(label) => {
                  const hour = REMINDER_HOURS.find((h) => h.label === label)?.value;
                  if (hour !== undefined) setPref("reminderHour", hour);
                }}
              />
            )}
          </Card>
        </View>

        {loaded && <Button title="Log out" variant="ghost" onPress={logout} />}
      </ScrollView>
    </Screen>
  );
}
