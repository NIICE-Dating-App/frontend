import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Theme constants
const BLUE = "#1B44CD";

interface EmptyStateProps {
  text: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  text,
  icon,
  onPress,
  showBorder = true,
}) => {
  const Container = onPress ? require("react-native").TouchableOpacity : View;
  
  return (
    <Container
      style={[
        styles.container,
        showBorder && styles.bordered,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {showBorder && (
        <LinearGradient
          colors={["#EEF4FF", "#DCE8FF"] as const}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.text}>{text}</Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    height: verticalScale(50),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: scale(16),
  },
  bordered: {
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.15)",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  iconContainer: {
    marginRight: scale(8),
  },
  text: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
});