// app/(auth)/purpose_signup.tsx
import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PurposeSignup() {
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

  const onNext = () => {
    router.push({
      pathname: "/try",
      params: selectedPurpose ? { purpose: selectedPurpose } : undefined,
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {/* Heading */}
          <View style={{ marginBottom: verticalScale(6) }}>
            <Text style={styles.titleLine}>What brings you to</Text>

            {/* Row kept to avoid clipping; spacing tightened */}
            <View style={styles.titleRow}>
              <Text style={styles.highlightBig}>Niice</Text>
              <Text style={styles.questionMark}>?</Text>
            </View>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Are you looking for a romantic{"\n"}
            relationship, new friends, or to{"\n"}
            network without boredom?
          </Text>

          {/* Options */}
          <View style={styles.buttonGroup}>
            {["Date", "Friends", "Date & Friends"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.optionButton,
                  selectedPurpose === p && styles.optionButtonSelected,
                ]}
                onPress={() => setSelectedPurpose(p)}
                activeOpacity={0.9}
              >
                <Text style={styles.optionText}>{p}</Text>
                <View
                  style={[
                    styles.circle,
                    selectedPurpose === p && styles.circleSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Next */}
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  progressWrapper: {
    marginTop: verticalScale(58 + 30),
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
  },
  progressFill: {
    height: verticalScale(6),
    width: "13.33%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },

  contentWrapper: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(20),
  },

  // Title line (kept)
  titleLine: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(30),
    lineHeight: verticalScale(48),
    color: INK,
    includeFontPadding: false,
    marginBottom: 0,
  },

  // Tighten spacing to the "Niice ?" row
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(-2),         // was +6 → pulls the row closer
  },

  // Large word; lineHeight slightly reduced but still safe from clipping
  highlightBig: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(42),
    lineHeight: verticalScale(62),        // was 62
    includeFontPadding: false,
  },

  // Bigger "?" with ample line box, slight optical nudge
  questionMark: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(54),
    lineHeight: verticalScale(80),        // was 70
    includeFontPadding: true,
    marginLeft: scale(8),
    transform: [{ translateY: verticalScale(1) }],
  },

  // Tighter spacing below heading
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    lineHeight: verticalScale(26),
    color: INK,
    marginTop: verticalScale(4),          // was 6
    marginBottom: verticalScale(10),
  },

  buttonGroup: {
    gap: verticalScale(10),
  },
  optionButton: {
    backgroundColor: BLUE,
    borderRadius: scale(12),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(18),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#1838B3",
  },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: "#FFFFFF",
  },
  circle: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    borderWidth: scale(3),
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  circleSelected: {
    backgroundColor: "#FFFFFF",
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
});
