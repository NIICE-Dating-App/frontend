import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const GRADIENTS = {
  primary: [BLUE, "#2E54E8"] as const,
  header: ["rgba(255,255,255,0.98)", "rgba(250,251,255,0.95)"] as const,
} as const;

interface FloatingHeaderProps {
  title?: string;
  fullName: string;
  onSave?: () => void;
  onBack?: () => void;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({
  title,
  fullName,
  onSave,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const TOOLBAR_HEIGHT = verticalScale(56);
  const headerHeight = insets.top + TOOLBAR_HEIGHT;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.floatingHeader,
        { height: headerHeight, paddingTop: insets.top },
      ]}
    >
      <BlurView intensity={98} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={GRADIENTS.header}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <View style={styles.chevronWrapper}>
            <View style={[styles.chevronLine, styles.chevronLineTop]} />
            <View style={[styles.chevronLine, styles.chevronLineBottom]} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{fullName || title || "Profile"}</Text>
          <Text style={styles.headerSubtitle}>Edit Mode</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <LinearGradient colors={GRADIENTS.primary} style={styles.saveGradient}>
            <Text style={styles.saveText}>Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
  },
  headerSubtitle: {
    fontSize: scale(11),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(2),
  },
  saveButton: {
    borderRadius: scale(20),
    overflow: "hidden",
  },
  saveGradient: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
  },
  saveText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  backButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: {
    width: scale(16),
    height: scale(16),
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleX: -1 }],
  },
  chevronLine: {
    position: "absolute",
    width: scale(12),
    height: Math.max(2, Math.round(scale(2))),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(1),
    left: scale(2),
  },
  chevronLineTop: {
    top: scale(3),
    transform: [{ rotate: "45deg" }],
  },
  chevronLineBottom: {
    bottom: scale(4),
    transform: [{ rotate: "-45deg" }],
  },
});