// app/(tabs)/_layout.tsx
import { supabase } from "@/lib/supabase";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// THEME
const BG = "#FFFFFF";
const INK = "#000910";
const BLUE = "#1B44CD";

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
      } catch {
        /* fallback */
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return hasUnread;
}

// 🎯 Animated Tab Item Component
function TabItem({ route, isFocused, onPress, navigation, hasUnread }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.88,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.6,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.12 : 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.12 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  }, [isFocused]);

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
      default:
        return undefined;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      onLongPress={() =>
        navigation.emit({ type: "tabLongPress", target: route.key })
      }
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={styles.tab}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Image
          source={source}
          resizeMode="contain"
          style={styles.icon}
        />
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hasUnread = useHasUnreadChat();

  // Filter out duplicate "Profile" route
  const filteredRoutes = useMemo(() => {
    const seen = new Set<string>();
    return state.routes.filter((r) => {
      if (r.name === "profile") {
        if (seen.has("profile")) return false;
        seen.add("profile");
      }
      return true;
    });
  }, [state.routes]);

  const items = useMemo(() => {
    return filteredRoutes.map((route, index) => {
      const isFocused = state.index === index;

      const onPress = () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
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
  }, [filteredRoutes, state.index, navigation, hasUnread]);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
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
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="nicees" options={{ title: "Niice's" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    backgroundColor: BG,
    paddingTop: 12,           // 🔥 Much smaller top padding
    paddingHorizontal: 10,
    height: 90,               // 🔥 Shorter container
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",  // 🔥 Push to bottom
    paddingBottom: 3,            // 🔥 Small padding from absolute bottom
  },
  icon: {
    width: 32,                // 🔥 Bigger icons
    height: 32,               // 🔥 Bigger icons
  },
});