import { Stack } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../global.css";
import { AuthProvider } from "../providers/auth-provider";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(modals)/settings" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/notifications" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/ai-download" options={{ presentation: "modal", gestureEnabled: false }} />
          <Stack.Screen name="(modals)/ai-manager" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/trip-details" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/chat" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/album" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/timeline" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/voting" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/qr" options={{ presentation: "modal" }} />
          <Stack.Screen name="(modals)/settlements" options={{ presentation: "modal" }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
