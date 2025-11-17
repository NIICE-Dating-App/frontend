import React, { useRef } from "react";
import {
    Pressable,
    PressableProps,
    Animated as RNAnimated,
    ViewStyle,
} from "react-native";

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  animationDuration?: number;
  useSpring?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  style,
  scaleValue = 0.95,
  animationDuration = 150,
  useSpring = true,
  onPressIn,
  onPressOut,
  ...pressableProps
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = (event: any) => {
    if (useSpring) {
      RNAnimated.spring(scaleAnim, {
        toValue: scaleValue,
        useNativeDriver: true,
        friction: 8,
        tension: 150,
      }).start();
    } else {
      RNAnimated.timing(scaleAnim, {
        toValue: scaleValue,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    if (useSpring) {
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();
    } else {
      RNAnimated.timing(scaleAnim, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(event);
  };

  return (
    <Pressable
      {...pressableProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <RNAnimated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </RNAnimated.View>
    </Pressable>
  );
};