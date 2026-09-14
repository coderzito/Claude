import React from "react";
import { Pressable, Text, TextInput, View, StyleSheet, ActivityIndicator, type TextInputProps } from "react-native";
import { theme } from "../theme";

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0b0d11" : theme.text} />
      ) : (
        <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.subtext}
        style={[styles.input, style]}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 20 },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  label: { color: theme.subtext, marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#0b0d11", fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: theme.text },
});
