import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Theme constants
const INK = "#0A0E1A";

interface LifestyleItemProps {
  icon: React.ReactNode;
  value: string;
}

export const LifestyleItem: React.FC<LifestyleItemProps> = ({ icon, value }) => (
  <View style={styles.lifestyleItem}>
    <View style={styles.lifestyleIcon}>{icon}</View>
    <Text style={styles.lifestyleValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  lifestyleItem: {
    flex: 1,
    height: verticalScale(130),
    padding: scale(12),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleIcon: {
    marginBottom: verticalScale(6),
  },
  lifestyleValue: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
  },
});