import React from "react";
import { View } from "react-native";

// A plain geometric die face (no emoji) — five pips, drawn with Views.
export function DieIcon({ size = 22, color = "#0a0c10", pipColor = "#f5f6f8" }: { size?: number; color?: string; pipColor?: string }) {
  const pip = size * 0.16;
  const pos = (edge: "start" | "mid" | "end") => (edge === "start" ? size * 0.18 : edge === "mid" ? size / 2 - pip / 2 : size * 0.82 - pip);

  const dots: Array<[number, number]> = [
    [pos("start"), pos("start")],
    [pos("end"), pos("start")],
    [pos("mid"), pos("mid")],
    [pos("start"), pos("end")],
    [pos("end"), pos("end")],
  ];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: color,
        marginRight: 8,
      }}
    >
      {dots.map(([x, y], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: pip,
            height: pip,
            borderRadius: pip / 2,
            backgroundColor: pipColor,
          }}
        />
      ))}
    </View>
  );
}
