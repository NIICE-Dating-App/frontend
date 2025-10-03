// app/(auth)/done_signup.tsx
import { router } from "expo-router";
import React from "react";
import {
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { Fonts } from "../constants/theme";

const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1A44CC";

const { width: W, height: H } = Dimensions.get("window");
const isSmall = W < 380;

export default function DoneSignup() {
  const onCreateProfile = () => {
    router.push("/try");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <BackButton style={styles.backButton} />

      {/* Copy */}
      <View style={styles.copy}>
        <Text style={styles.lead}>You are set!</Text>

        {/* Ascent buffer to prevent top clipping on big headline */}
        <View style={styles.accentWrap}>
          <Text style={styles.accent}>That’s Niice</Text>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaArea}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryBtnDark}
          onPress={onCreateProfile}
        >
          <Text style={styles.primaryTextLight}>Create Your Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const TOP_OFFSET = H * 0.14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 16,
  },

  copy: {
    marginTop: isSmall ? TOP_OFFSET * 0.8 : TOP_OFFSET,
    marginBottom: 32,
    alignItems: "flex-start",
  },

  // first line
  lead: {
    color: INK,
    fontSize: isSmall ? 34 : 38,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
    lineHeight: isSmall ? 55 : 60, // safely > fontSize, keeps a stable box
  },

  // wrapper adds headroom *above* the large text so iOS doesn't crop the ascent
  accentWrap: {
    paddingTop: 10,             // ascent buffer (prevents the “pushed up” look)
    marginTop: -8,              // visually tightens the two lines
    overflow: "visible",
  },

  // second (big) line
  accent: {
    color: BLUE,
    fontSize: isSmall ? 48 : 56,
    fontFamily: Fonts.bold,
    fontWeight: "800",
    lineHeight: isSmall ? 80 : 90, // like your working screen: comfortably > fontSize
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },

  ctaArea: {
    marginTop: "auto",
    paddingBottom: 36,
  },

  // keep EXACT geometry
  primaryBtnDark: {
    height: 56,
    borderRadius: 28,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    width: "92%",
    alignSelf: "center",
    shadowColor: "#00000040",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
  },
  primaryTextLight: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Fonts.bold,
    fontWeight: "bold",
  },
});
