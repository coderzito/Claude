import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

// expo-av reports metering in dBFS, roughly -160 (silence) to 0 (peak).
// Map that to a 0-1 fill so the user can see the mic is actually picking them up.
function normalize(db: number): number {
  const min = -60;
  const clamped = Math.max(min, Math.min(0, db));
  return (clamped - min) / -min;
}

export default function LevelMeter({ meteringDb }: { meteringDb: number | null }) {
  const level = meteringDb === null ? 0 : normalize(meteringDb);
  const bars = 20;
  const litBars = Math.round(level * bars);

  return (
    <View style={styles.row}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: i < litBars ? (i > bars * 0.8 ? theme.warn : theme.good) : theme.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3, alignItems: "flex-end", height: 36 },
  bar: { width: 6, height: 28, borderRadius: 3 },
});
