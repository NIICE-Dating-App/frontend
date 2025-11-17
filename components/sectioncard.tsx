import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";
const GRADIENTS = {
  card: ["#FFFFFF", "#F8FAFF"] as const,
};

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  action,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    if (action) {
      RNAnimated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 150,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (action) {
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    }
  };

  return (
    <View style={styles.sectionCard}>
      <LinearGradient colors={GRADIENTS.card} style={StyleSheet.absoluteFillObject} />
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon && <View style={styles.sectionIcon}>{icon}</View>}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity
            onPress={action}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <RNAnimated.View
              style={[styles.editButtonSmall, { transform: [{ scale: scaleAnim }] }]}
            >
              <Ionicons name="chevron-forward" size={18} color={BLUE} />
            </RNAnimated.View>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
    borderRadius: scale(20),
    overflow: "hidden",
    backgroundColor: CARD_BG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: INK,
  },
  sectionContent: {
    padding: scale(20),
  },
  editButtonSmall: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
});