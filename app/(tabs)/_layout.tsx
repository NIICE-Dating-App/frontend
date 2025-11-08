import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// THEME (match profile.tsx values)
const BG = "#FFFFFF";
const INK = "#000910";
const BLUE = "#1B44CD";

// -------- Unread chat stub --------
function useHasUnreadChat() {
  const [hasUnread, setHasUnread] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("is_read", false);
        if (mounted) setHasUnread((count ?? 0) > 0);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return hasUnread;
}

// -------- Animated tab item --------
function TabItem({ route, isFocused, onPress, navigation, hasUnread }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, friction: 6, tension: 80 }),
      Animated.timing(opacityAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: isFocused ? 1.12 : 1, useNativeDriver: true, friction: 5, tension: 100 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: isFocused ? 1.12 : 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
  }, [isFocused]);

  const tail = String(route.name).split("/").pop();

  const source = (() => {
    switch (tail) {
      case "profile": return require("../../assets/images/icon_profile.png");
      case "map": return require("../../assets/images/icon_map.png");
      case "nicees": return require("../../assets/images/niices_icon.png");
      case "event":
      case "events": return require("../../assets/images/event_icon.png");
      case "chat":
        return hasUnread
          ? require("../../assets/images/icon_chat_message.png")
          : require("../../assets/images/icon_chat.png");
      default: return undefined;
    }
  })();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
        <Image source={source} resizeMode="contain" style={styles.icon} />
      </Animated.View>
    </Pressable>
  );
}

// -------- Custom bottom tab bar --------
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const hasUnread = useHasUnreadChat();

  const filteredRoutes = useMemo(() => {
    const seen = new Set<string>();
    return state.routes.filter((r) => {
      const tail = r.name.split("/").pop();
      if (tail === "profile") {
        if (seen.has("profile")) return false;
        seen.add("profile");
      }
      return true;
    });
  }, [state.routes]);

  return (
    <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView intensity={95} tint="light" style={styles.blurBackground} />
      <View style={styles.tintOverlay} pointerEvents="none" />
      {filteredRoutes.map((route, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
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
      })}
    </View>
  );
}

// -------- Header identical to profile.tsx (minus right buttons) --------
function ProfileLikeHeader() {
  return (
    <View style={styles.topBarContainer}>
      <BlurView intensity={95} tint="light" style={styles.blurView} />
      <View style={styles.topBar}>
        <Image
          source={require("../../assets/images/niice_logo_icon.png")}
          resizeMode="contain"
          style={styles.logo}
        />
        <View style={{ width: scale(38) }} />
      </View>
    </View>
  );
}

// -------- Main Tabs layout --------
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const WITH_HEADER = new Set(["chat", "nicees", "event", "events"]);
  const RESERVED_HEADER_HEIGHT = verticalScale(6 + 12 + 42) + insets.top * 0.5;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Tabs
        initialRouteName="map"
        screenOptions={({ route }) => {
          const tail = route.name.split("/").pop() ?? "";
          const showHeader = WITH_HEADER.has(tail);
          return {
            headerShown: showHeader,
            headerTransparent: false,
            headerTitle: "",
            headerStyle: { height: RESERVED_HEADER_HEIGHT, backgroundColor: "transparent" },
            headerBackgroundContainerStyle: { backgroundColor: "transparent" },
            header: showHeader ? () => <ProfileLikeHeader /> : undefined,
            tabBarShowLabel: false,
            tabBarStyle: { display: "none" },
            tabBarHideOnKeyboard: true,
          };
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="map" options={{ title: "Map" }} />
        <Tabs.Screen name="(up_tab)/event" options={{ title: "Events" }} />
        <Tabs.Screen name="(up_tab)/nicees" options={{ title: "Niice's" }} />
        <Tabs.Screen name="(up_tab)/chat" options={{ title: "Chat" }} />
      </Tabs>
    </View>
  );
}

// -------- Styles --------
const styles = StyleSheet.create({
  bottomContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingHorizontal: 10,
    height: 90,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tintOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 3,
    zIndex: 1,
  },
  icon: { width: 32, height: 32 },

  topBarContainer: { position: "relative", zIndex: 10 },
  blurView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -verticalScale(20),
    zIndex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(6),
    paddingBottom: verticalScale(12),
    zIndex: 2,
    backgroundColor: "transparent",
  },
  logo: { width: scale(120), height: verticalScale(42) },
});