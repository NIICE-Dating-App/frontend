import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Theme constants
const BLUE = "#1B44CD";

interface TagChipProps {
  label: string;
}

export const TagChip: React.FC<TagChipProps> = ({ label }) => (
  <View style={styles.tagChip}>
    <Text style={styles.tagText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  tagChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.08)",
  },
  tagText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
});