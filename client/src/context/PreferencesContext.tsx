import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export type TextSize = "small" | "default" | "large";
export type SpeechSpeed = "slower" | "normal" | "faster";

export interface Preferences {
  textSize: TextSize;
  speechSpeed: SpeechSpeed;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  reminderEnabled: boolean;
  reminderHour: number; // 24h, local device time
}

const DEFAULTS: Preferences = {
  textSize: "default",
  speechSpeed: "normal",
  hapticsEnabled: true,
  reduceMotion: false,
  reminderEnabled: false,
  reminderHour: 18,
};

export const TEXT_SIZE_SCALE: Record<TextSize, number> = { small: 0.88, default: 1, large: 1.2 };
export const SPEECH_RATE: Record<SpeechSpeed, number> = { slower: 0.78, normal: 0.95, faster: 1.15 };

const STORAGE_KEY = "cold_call_preferences";
const REMINDER_NOTIFICATION_ID = "daily-study-reminder";

interface PreferencesContextValue {
  prefs: Preferences;
  loaded: boolean;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function syncReminder(prefs: Preferences) {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID).catch(() => {});
  if (!prefs.reminderEnabled) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_NOTIFICATION_ID,
    content: {
      title: "Time to study",
      body: "Roll a topic and knock out a quick session.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.reminderHour,
      minute: 0,
    },
  });
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      if (key === "reminderEnabled" || key === "reminderHour") syncReminder(next).catch(() => {});
      return next;
    });
  }, []);

  return <PreferencesContext.Provider value={{ prefs, loaded, setPref }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
