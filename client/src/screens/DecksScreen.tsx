import React, { useEffect, useState } from "react";
import { Text, FlatList, Pressable, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { api, API_URL, getToken } from "../api/client";
import { Screen, Card, Button } from "../components/ui";
import { theme } from "../theme";
import type { Deck } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Decks">;

export default function DecksScreen({ navigation }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ decks: Deck[] }>("/decks");
      setDecks(res.decks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadSyllabus() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];

    setUploading(true);
    try {
      const form = new FormData();
      form.append("title", file.name.replace(/\.(pdf|txt)$/i, ""));
      form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
      const token = await getToken();
      const res = await fetch(`${API_URL}/decks/syllabus`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      Alert.alert("Deck created", "Your syllabus has been turned into a deck.");
    } catch (err) {
      Alert.alert("Upload failed", "Couldn't process that file. Try a PDF or plain text syllabus.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Screen>
      <FlatList
        data={decks}
        keyExtractor={(d) => d.id}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={
          <Button title={uploading ? "Uploading…" : "Upload a syllabus"} variant="secondary" onPress={uploadSyllabus} loading={uploading} />
        }
        contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("Subtopics", { deckId: item.id, deckTitle: item.title })}>
            <Card>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: "600" }}>{item.title}</Text>
              <Text style={{ color: theme.subtext, marginTop: 4 }}>{item.subject}</Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
