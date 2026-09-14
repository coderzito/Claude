import React, { useState } from "react";
import { Text, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAuth } from "../context/AuthContext";
import { Screen, Field, Button } from "../components/ui";
import { ApiError } from "../api/client";
import { theme } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const { signup } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      await signup(email.trim(), password, displayName.trim() || undefined);
    } catch (err) {
      const message = err instanceof ApiError ? String(err.body && (err.body as any).error) : "Something went wrong";
      Alert.alert("Couldn't sign up", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={{ color: theme.text, fontSize: 28, fontWeight: "700", marginBottom: 24 }}>Create an account</Text>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} autoComplete="name" />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <Field label="Password (min 8 characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password-new" />
      <Button title="Sign up" onPress={onSubmit} loading={loading} />
      <Text style={{ color: theme.subtext, textAlign: "center", marginTop: 16 }} onPress={() => navigation.navigate("Login")}>
        Already have an account? <Text style={{ color: theme.accent }}>Log in</Text>
      </Text>
    </Screen>
  );
}
