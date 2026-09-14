import React, { useState } from "react";
import { Text, View, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api } from "../api/client";
import { Screen, Card, Button } from "../components/ui";
import { useTheme } from "../context/ThemeContext";
import type { Subtopic } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Subtopics">;

export default function SubtopicsScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { deckId, deckTitle } = route.params;
  const [rolled, setRolled] = useState<Subtopic | null>(null);
  const [rolling, setRolling] = useState(false);
  const [starting, setStarting] = useState(false);

  async function roll() {
    setRolling(true);
    setRolled(null);
    try {
      const res = await api.post<{ subtopic: Subtopic }>(`/decks/${deckId}/roll`);
      setRolled(res.subtopic);
    } catch {
      Alert.alert("Couldn't roll", "This deck may be empty.");
    } finally {
      setRolling(false);
    }
  }

  async function startStudying() {
    if (!rolled) return;
    setStarting(true);
    try {
      const res = await api.post<{ session: { id: string } }>("/sessions", { subtopicId: rolled.id });
      navigation.replace("Chapter", { sessionId: res.session.id });
    } catch (err: any) {
      if (err?.status === 429) {
        Alert.alert("Daily limit reached", "You've used today's free sessions. Come back tomorrow.");
      } else {
        Alert.alert("Couldn't start session", "Something went wrong generating your chapter.");
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen>
      <Text style={{ color: theme.subtext, marginBottom: 20 }}>{deckTitle}</Text>

      {rolled ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>{rolled.title}</Text>
          <Text style={{ color: theme.subtext, marginTop: 6, textTransform: "capitalize" }}>{rolled.difficulty_tier}</Text>
        </Card>
      ) : (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: theme.subtext }}>Roll to get a random subtopic from this deck.</Text>
        </View>
      )}

      <View style={{ gap: 12 }}>
        <Button title={rolled ? "Roll again" : "Roll"} variant={rolled ? "secondary" : "primary"} onPress={roll} loading={rolling} />
        {rolled && <Button title="Start studying (4 min)" onPress={startStudying} loading={starting} />}
      </View>
    </Screen>
  );
}
