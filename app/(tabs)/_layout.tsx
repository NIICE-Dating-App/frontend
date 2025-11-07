// app/(tabs)/_layout.tsx
import { supabase } from "@/lib/supabase";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

/* THEME */
const BG = "#FFFFFF";
const BLUE = "#1B44CD";
const INK = "#000910";

/* Helper: glass container */
function GlassBar({ children, radius = 22 }: { children: React.ReactNode; radius?: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
      {/* shadow below bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 40,
          shadowColor: "#0F172A",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 6,
        }}
      />
      {children}
    </View>
  );
}

/** Stubbed unread-logic. */
function useHasUnreadChat() {
  const [hasUnread, setHasUnread] = useState(false);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        const { count, error } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("is_read", false);

        if (!error && isMounted) setHasUnread((count ?? 0) > 0);
      } catch {/* noop */}
    })();
    return () => { isMounted = false; };
  }, []);
  return hasUnread;
}

/* === Single Tab Item (glass highlight + robust re-triggering) === */
function TabItem({
  route,
  isFocused,
  onPress,
  navigation,
  hasUnread,
}: any) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(0)).current; // 0=unfocused, 1=focused

  const FOCUSED_SCALE = 1.24;

  // Re-run focus animation every time focus changes
  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [isFocused, focusAnim]);

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();

  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();

  // Combine press + focus scale
  const combinedScale = Animated.multiply(
    pressScale,
    focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, FOCUSED_SCALE],
    })
  );

  const iconOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const glowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const source = (() => {
    switch (route.name) {
      case "profile":
        return require("../../assets/images/icon_profile.png");
      case "map":
        return require("../../assets/images/icon_map.png");
      case "nicees":
        return require("../../assets/images/niices_icon.png");
      case "chat":
        return hasUnread
          ? require("../../assets/images/icon_chat_message.png")
          : require("../../assets/images/icon_chat.png");
      case "event":
        return require("../../assets/images/event_icon.png");
      default:
        return undefined;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={() =>
        navigation.emit({ type: "tabLongPress", target: route.key })
      }
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={styles.tab}
    >
      {/* glass highlight “pill” behind focused icon */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.focusPill,
          {
            opacity: glowOpacity,
            transform: [{ scale: focusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })}],
          },
        ]}
      >
        <BlurView
          intensity={Platform.select({ ios: 30, android: 24, default: 30 })}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.focusStroke} />
      </Animated.View>

      <Animated.View
        style={{
          transform: [{ scale: combinedScale }],
          opacity: iconOpacity,
        }}
      >
        <Image source={source} resizeMode="contain" style={styles.icon} />
      </Animated.View>
    </Pressable>
  );
}

/* === Custom TabBar with reliable focus detection & glass background === */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hasUnread = useHasUnreadChat();

  // Use the actual router order so indices match — prevents “first click only” bugs
  const routes = state.routes;

  const items = useMemo(() => {
    return routes.map((route, index) => {
      const isFocused = state.index === index;

      const onPress = () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        // Navigate even if already focused to re-trigger animations if desired
        if (!event.defaultPrevented) {
          navigation.navigate(route.name as never);
        }
      };

      return (
        <TabItem
          key={route.key}
          route={route}
          isFocused={isFocused}
          onPress={onPress}
          navigation={navigation}
          hasUnread={hasUnread}
        />
      );
    });
  }, [routes, state.index, navigation, hasUnread]);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {/* Glass background (blur + gradient + hairline) */}
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={Platform.select({ ios: 32, android: 26, default: 32 })}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* inner & outer strokes for crisp edge */}
        <View style={styles.topHairline} />
        <View style={styles.innerStroke} />
      </View>

      {/* Shadow helper underneath */}
      <GlassBar>
        <View />
      </GlassBar>

      {items}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="map"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: "none" },
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {/* Order: profile, map, nicees, chat, event (events last) */}
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="nicees" options={{ title: "Niice's" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="event" options={{ title: "Events" }} />
    </Tabs>
  );
}

/* === Styles === */
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: "transparent",
    paddingTop: 10,
    paddingHorizontal: 12,
    height: 90,
    borderTopWidth: 0,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  icon: {
    width: 32,
    height: 32,
  },

  /* Glass chrome */
  topHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  innerStroke: {
    position: "absolute",
    top: StyleSheet.hairlineWidth,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.65)",
  },

  /* Focused glow pill behind icon */
  focusPill: {
    position: "absolute",
    bottom: 8,
    width: 56,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    // subtle shadow to lift the pill
    shadowColor: BLUE,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: "hidden",
  },
  focusStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.8)",
  },
});
