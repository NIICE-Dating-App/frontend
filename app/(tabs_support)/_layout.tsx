// app/(tabs_support)/_layout.tsx
import { Stack } from "expo-router";

export default function TabsSupportLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}