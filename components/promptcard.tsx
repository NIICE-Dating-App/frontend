import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, StyleSheet, Text, View } from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

export interface PromptAnswer {
  title: string;
  answer: string;
}

interface PromptCardProps {
  prompt: PromptAnswer;
  index: number;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, index }) => {
  const fade = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fade, {
      toValue: 1,
      duration: 400,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [index, fade]);

  return (
    <RNAnimated.View style={[styles.promptCard, { opacity: fade }]}>
      <LinearGradient
        colors={["#F0F5FF", "#E8F0FF"] as const}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.promptContent}>
        <Text style={styles.promptTitle}>{prompt.title}</Text>
        <Text style={styles.promptAnswer}>{prompt.answer}</Text>
      </View>
    </RNAnimated.View>
  );
};

const styles = StyleSheet.create({
  promptCard: {
    padding: scale(16),
    borderRadius: scale(14),
    overflow: "hidden",
  },
  promptContent: {
    flex: 1,
    paddingRight: scale(10),
  },
  promptTitle: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
    marginBottom: verticalScale(6),
  },
  promptAnswer: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
    lineHeight: verticalScale(22),
  },
});