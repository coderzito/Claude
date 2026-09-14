import React, { useRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  type TextInputProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { theme, shadow } from "../theme";

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  function handlePress() {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        style={[
          styles.button,
          variant === "secondary" && styles.buttonSecondary,
          variant === "ghost" && styles.buttonGhost,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? "#0a0c10" : theme.text} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {icon}
            <Text
              style={[
                styles.buttonText,
                variant === "secondary" && styles.buttonTextSecondary,
                variant === "ghost" && styles.buttonTextGhost,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: theme.space.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.faint}
        style={[styles.input, style]}
        autoCapitalize="none"
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style, flat }: { children: React.ReactNode; style?: object; flat?: boolean }) {
  return <View style={[styles.card, !flat && shadow, style]}>{children}</View>;
}

export function Screen({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <View style={styles.dividerLine} />;
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: theme.space.xl },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radius,
    padding: theme.space.lg,
  },
  label: { color: theme.subtext, marginBottom: theme.space.xs + 2, fontSize: 13, fontWeight: "500" },
  input: {
    backgroundColor: theme.cardAlt,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.accent,
    borderRadius: theme.radiusSm + 2,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  buttonGhost: { backgroundColor: "transparent", paddingVertical: 8 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#0a0c10", fontSize: 16, fontWeight: "700" },
  buttonTextSecondary: { color: theme.text },
  buttonTextGhost: { color: theme.accent, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: theme.space.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerLabel: { color: theme.faint, marginHorizontal: theme.space.md, fontSize: 13 },
});
