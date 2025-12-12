import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import { Fonts } from "../../constants/theme";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

const { width: W } = Dimensions.get("window");
const isSmall = W < 380;

const BellRinging = ({ size = 250 }: { size?: number }) => {
  const ringAnim = useRef(new Animated.Value(0)).current;
  const waveScale = useRef(new Animated.Value(0.8)).current;
  const waveOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: -1,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(waveScale, {
            toValue: 1.2,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(waveOpacity, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(waveScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(waveOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const ringRotation = ringAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-15deg", "15deg"],
  });

  return (
    <View
      style={{
        width: size + 100,
        height: size,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <Animated.View
        style={{
          transform: [{ rotate: ringRotation }],
          position: "absolute",
          top: -100,
          left: 40,
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Path
            d="M32 8c8.8 0 16 7.2 16 16v10.5c0 1.8.6 3.6 1.6 5.1l2.1 3.2c.8 1.2-.1 2.7-1.5 2.7H13.8c-1.4 0-2.3-1.5-1.5-2.7l2.1-3.2c1-1.6 1.6-3.3 1.6-5.1V24c0-8.8 7.2-16 16-16Z"
            fill={Colors.BLUE}
          />
          <SvgCircle cx="32" cy="48" r="5" fill={Colors.INK} />
        </Svg>
      </Animated.View>

      <Svg
        width={size}
        height={12}
        viewBox="0 0 64 12"
        style={{ position: "absolute", top: size * 0.6 }}
      >
        <Path
          d="M8 6c0 3.3 10.7 6 24 6s24-2.7 24-6S45.3 0 32 0 8 2.7 8 6Z"
          fill={Colors.BLUE}
          opacity={0.25}
        />
      </Svg>

      <Animated.View
        style={{
          position: "absolute",
          right: -10,
          top: size * 0.05,
          transform: [{ rotate: "-40deg" }, { scale: waveScale }],
          opacity: waveOpacity,
        }}
      >
        <Svg width={160} height={120} viewBox="0 0 140 90">
          <Path
            d="M8,22 q28,18 56,0"
            stroke={Colors.BLUE}
            strokeWidth={4.5}
            fill="none"
          />
          <Path
            d="M10,38 q30,20 60,0"
            stroke={Colors.BLUE}
            strokeWidth={5}
            fill="none"
          />
          <Path
            d="M12,54 q32,22 64,0"
            stroke={Colors.BLUE}
            strokeWidth={5.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default function NotificationSignup() {
  const [loading, setLoading] = useState(false);

  const onAllow = async () => {
    try {
      setLoading(true);
      await Notifications.requestPermissionsAsync();
      router.push("/done_signup");
    } catch {
      Alert.alert("Error", "Could not request notifications.");
      router.push("/done_signup");
    } finally {
      setLoading(false);
    }
  };

  const onSkip = () => {
    router.push("/done_signup");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </View>
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Get the latest likes{"\n"}in your area</Text>
        <Text style={styles.pageSubtitle}>
          Turn on your notifications so we can let you know when a Niice around liked you
        </Text>
      </View>

      <View style={styles.bellWrapper}>
        <BellRinging size={isSmall ? 180 : 220} />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={onAllow}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.primaryButtonText}>Requesting...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Allow Notifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.secondaryButton}
          onPress={onSkip}
        >
          <Text style={styles.secondaryButtonText}>Not Now</Text>
        </TouchableOpacity>

        <View style={styles.infoNote}>
          <View style={styles.infoIconCircle}>
            <Ionicons name="information-circle" size={18} color={Colors.BLUE} />
          </View>
          <Text style={styles.infoNoteText}>
            You can always change this later in your device settings
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  backButton: {
    marginTop: verticalScale(16),
    marginLeft: scale(20),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerContainer: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(24),
  },
  pageTitle: {
    fontSize: moderateScale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    lineHeight: verticalScale(36),
    marginBottom: verticalScale(12),
    paddingTop: verticalScale(6.5),
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: moderateScale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(22),
  },
  bellWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(100),
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
    gap: verticalScale(12),
  },
  primaryButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.3)",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(50),
    paddingVertical: verticalScale(16),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    letterSpacing: 0.3,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(8),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    gap: scale(12),
  },
  infoIconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(2),
  },
  infoNoteText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
    paddingTop: verticalScale(0.5),
  },
});