import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../context/ThemeContext";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  size = 160,
  strokeWidth = 12,
  progress,
  color,
  trackColor,
  children,
}: {
  size?: number;
  strokeWidth?: number;
  /** 0-1 */
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const resolvedColor = color ?? theme.accent;
  const resolvedTrackColor = trackColor ?? theme.track;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [progress, animated]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function SegmentedBar({
  segments,
  filled,
  color,
  trackColor,
  height = 8,
  gap = 4,
}: {
  segments: number;
  filled: number;
  color?: string;
  trackColor?: string;
  height?: number;
  gap?: number;
}) {
  const theme = useTheme();
  const resolvedColor = color ?? theme.accent;
  const resolvedTrackColor = trackColor ?? theme.track;
  return (
    <View style={{ flexDirection: "row", gap }}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height / 2,
            backgroundColor: i < filled ? resolvedColor : resolvedTrackColor,
          }}
        />
      ))}
    </View>
  );
}
