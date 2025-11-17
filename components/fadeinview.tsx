import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, ViewStyle } from "react-native";

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  duration = 400,
  delay = 0,
  style,
}) => {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);

  return (
    <RNAnimated.View
      style={[
        style,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {children}
    </RNAnimated.View>
  );
};