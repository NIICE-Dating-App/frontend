import React, { useEffect } from "react";
import { Dimensions } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

type Props = {
  size?: number;
  top?: number;
  duration?: number;
  offsetPercentage?: number;
};

export const AnimatedCircle: React.FC<Props> = ({
  size = 70,
  top = 0,
  duration = 12000,
  offsetPercentage = 0,
}) => {
  const translateX = useSharedValue(-size + (width + size * 2) * offsetPercentage);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(width + size, {
        duration: duration * (1 - offsetPercentage),
        easing: Easing.linear,
      }),
      -1,
      false,
      (finished) => {
        if (finished) {
          translateX.value = -size;
        }
      }
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [duration, size, offsetPercentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#C8DBE8",
          opacity: 0.75,
        },
        animatedStyle,
      ]}
    />
  );
};