import React, { useState } from "react";
import { Text, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { Screen, Field, Button } from "../components/ui";
import { ApiError } from "../api/client";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const message = err instanceof ApiError ? String(err.body && (err.body as any).error) : "Something went wrong";
      Alert.alert("Couldn't log in", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700", marginBottom: 24 }}>Cold Call</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Button title="Log in" onPress={onSubmit} loading={loading} />
      <Text style={{ color: theme.subtext, textAlign: "center", marginTop: 16 }} onPress={() => navigation.navigate("Signup")}>
        New here? <Text style={{ color: theme.accent }}>Create an account</Text>
      </Text>
    </Screen>
  );
}
