import React from "react";
import { ActivityIndicator, View, Pressable, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import RollScreen from "../screens/RollScreen";
import DecksScreen from "../screens/DecksScreen";
import SubtopicsScreen from "../screens/SubtopicsScreen";
import ChapterScreen from "../screens/ChapterScreen";
import RecordingScreen from "../screens/RecordingScreen";
import ResultsScreen from "../screens/ResultsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  Settings: undefined;
  Roll: undefined;
  Decks: undefined;
  Subtopics: { deckId: string; deckTitle: string };
  Chapter: { sessionId: string };
  Recording: { sessionId: string };
  Results: { sessionId: string };
  History: undefined;
  Leaderboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#111318" }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#111318" }, headerTintColor: "#fff" }}>
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: "Passion Study",
                headerRight: () => (
                  <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={12}>
                    <Text style={{ color: theme.accent, fontWeight: "600", fontSize: 15 }}>Settings</Text>
                  </Pressable>
                ),
              })}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
            <Stack.Screen name="Roll" component={RollScreen} options={{ title: "Roll" }} />
            <Stack.Screen name="Decks" component={DecksScreen} options={{ title: "Browse decks" }} />
            <Stack.Screen name="Subtopics" component={SubtopicsScreen} options={{ title: "Roll" }} />
            <Stack.Screen name="Chapter" component={ChapterScreen} options={{ title: "Study", headerBackVisible: false }} />
            <Stack.Screen name="Recording" component={RecordingScreen} options={{ title: "Explain it", headerBackVisible: false }} />
            <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Results", headerBackVisible: false }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ title: "History" }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: "Friends" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log in" }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
