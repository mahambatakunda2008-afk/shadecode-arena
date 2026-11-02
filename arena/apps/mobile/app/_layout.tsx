import { Stack } from "expo-router";
import { StatusBar } from "react-native";

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#07131B" },
          headerTintColor: "#F4FAFC",
          contentStyle: { backgroundColor: "#07131B" },
          headerShadowVisible: false,
        }}
      />
    </>
  );
}
