// components/map_components/PulseRing.tsx
import React, { memo, useRef, useEffect } from "react";
import { Animated as RNAnimated, Easing, Platform } from "react-native";
import { RING_MAX_SCALE } from "./constants";

interface PulseRingProps {
  size: number;
  delay: number;
  ringColor?: string;
  ringWidth?: number;
  left: number;
  top: number;
}

export const PulseRing: React.FC<PulseRingProps> = memo(({
  size, 
  delay, 
  ringColor = "rgba(27,68,205,0.28)", 
  ringWidth = 2, 
  left, 
  top,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0.75)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(scaleAnim, { toValue: RING_MAX_SCALE, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          RNAnimated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(opacityAnim, { toValue: 0, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          RNAnimated.timing(opacityAnim, { toValue: 0.75, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacityAnim, scaleAnim]);

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={{
        position: "absolute", 
        left, 
        top, 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: "transparent", 
        borderWidth: ringWidth, 
        borderColor: ringColor,
        transform: [{ scale: scaleAnim }], 
        opacity: opacityAnim,
        ...(Platform.OS === "android" ? { elevation: 0 } : {}),
      }}
    />
  );
});