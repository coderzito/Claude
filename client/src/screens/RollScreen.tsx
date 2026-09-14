import React, { useState } from "react";
import { Text, View, Alert, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { Screen, Field, Button, Divider } from "../components/ui";
import { DieIcon } from "../components/DieIcon";
import { useTheme } from "../context/ThemeContext";
import type { Subtopic } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Roll">;

type Busy = "none" | "roll" | "custom";

export default function RollScreen({ navigation }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState<Busy>("none");
  const [topic, setTopic] = useState("");

  async function startStudying(subtopicId: string) {
    try {
      const res = await api.post<{ session: { id: string } }>("/sessions", { subtopicId });
      navigation.replace("Chapter", { sessionId: res.session.id });
    } catch (err: any) {
      if (err?.status === 429) {
        Alert.alert("Daily limit reached", "You've used today's free sessions. Come back tomorrow.");
      } else {
        Alert.alert("Couldn't start session", "Something went wrong generating your chapter.");
      }
    }
  }

  async function rollRandom() {
    setBusy("roll");
    try {
      const res = await api.post<{ subtopic: Subtopic }>("/decks/roll");
      await startStudying(res.subtopic.id);
    } catch {
      Alert.alert("Couldn't roll", "Try again in a moment.");
    } finally {
      setBusy("none");
    }
  }

  async function startCustomTopic() {
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      Alert.alert("Tell us more", "Type at least a few words about what you want to study.");
      return;
    }
    setBusy("custom");
    try {
      const res = await api.post<{ subtopic: Subtopic }>("/subtopics/custom", { topic: trimmed });
      await startStudying(res.subtopic.id);
    } catch {
      Alert.alert("Couldn't start that topic", "Try again in a moment.");
    } finally {
      setBusy("none");
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: theme.space.xs }}>
          Roll Random
        </Text>
        <Text style={{ color: theme.subtext, textAlign: "center", marginBottom: theme.space.xl }}>
          Pulls from a wide mix of subjects — economics to astronomy to philosophy.
        </Text>

        <Button title="Roll Random!" icon={<DieIcon />} onPress={rollRandom} loading={busy === "roll"} disabled={busy === "custom"} />

        <Divider label="or" />

        <Field
          label="What do you want to study?"
          placeholder="e.g. the French Revolution, Bayes' theorem…"
          value={topic}
          onChangeText={setTopic}
          onSubmitEditing={startCustomTopic}
          returnKeyType="go"
        />
        <Button title="Start studying" onPress={startCustomTopic} loading={busy === "custom"} disabled={busy === "roll"} />

        <Pressable onPress={() => navigation.navigate("Decks")} style={{ marginTop: theme.space.xl }}>
          <Text style={{ color: theme.subtext, textAlign: "center" }}>
            Or <Text style={{ color: theme.accent }}>browse decks</Text> (including your uploaded syllabi)
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
