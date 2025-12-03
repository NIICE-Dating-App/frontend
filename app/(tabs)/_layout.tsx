import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// THEME (match profile.tsx values)
const BG = "#FFFFFF";
const INK = "#000910";
const BLUE = "#1B44CD";
const HEADER_BG = "#FAFBFF"; // top bar background

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

  const tail = String(route.name).split("/").pop();

  const source = (() => {
    switch (tail) {
      case "profile":
        return require("../../assets/images/icon_profile.png");
      case "map":
        return require("../../assets/images/icon_map.png");
      case "nicees":
        return require("../../assets/images/niices_icon.png");
      case "event":
      case "events":
        return require("../../assets/images/event_icon.png");
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
        style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
      >
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
    <View
      style={[
        styles.bottomContainer,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <BlurView intensity={95} tint="light" style={styles.blurBackground} />
      <View style={styles.tintOverlay} pointerEvents="none" />
      {filteredRoutes.map((route, index) => {
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
      })}
    </View>
  );
}

// -------- Header cloned from profile.tsx (with Friend pill) --------
function ProfileLikeHeader() {
  const popScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(popScale, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  };

  const handlePressOut = () => {
    Animated.sequence([
      Animated.spring(popScale, {
        toValue: 1.08,
        useNativeDriver: true,
        friction: 4,
        tension: 160,
      }),
      Animated.spring(popScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
    ]).start();
  };

  return (
    <SafeAreaView edges={[]} style={styles.headerSafeArea}>
      <View style={styles.topBar}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          hitSlop={10}
        >
          <Animated.View
            style={[
              styles.logoRow,
              {
                transform: [
                  { translateY: verticalScale(60.4) },
                  { scale: popScale },
                ],
              },
            ]}
          >
            <Image
              source={require("../../assets/images/niice_logo_icon.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <View style={styles.modePill}>
              <Text style={styles.modePillText}>Friend</Text>
            </View>
          </Animated.View>
        </Pressable>

        {/* Spacer to mimic place of edit + settings buttons */}
        <View style={styles.headerRightSpacer} />
      </View>
    </SafeAreaView>
  );
}

// -------- Main Tabs layout --------
export default function TabsLayout() {
  const WITH_HEADER = new Set(["chat", "nicees", "event", "events"]);

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
        <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      </Tabs>
    </View>
  );
}

// -------- Styles --------
const styles = StyleSheet.create({
  // bottom tab bar
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

  // header
  headerSafeArea: {
    backgroundColor: HEADER_BG,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(12),
    backgroundColor: HEADER_BG,
  },

  // logo + pill row (no transform here, we apply it inline with scale)
  logoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  logo: {
    width: scale(110),
    height: verticalScale(38),
    marginRight: scale(6),
    marginBottom: verticalScale(2),
  },

  modePill: {
    marginLeft: scale(6),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(3),
    height: verticalScale(28),
    paddingHorizontal: scale(18),
    borderRadius: verticalScale(999),
    backgroundColor: BLUE,
    borderWidth: 1.2,
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  modePillText: {
    color: BG,
    fontSize: scale(13),
    fontFamily: "Kadwa-Bold",
    fontWeight: "700",
    letterSpacing: 0.15,
  },

  headerRightSpacer: {
    width: scale(40 + 12 + 40),
  },
});