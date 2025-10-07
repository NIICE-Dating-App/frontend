// components/MapPins.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";

type MapPinProps = {
  size?: number;
  color?: string;
  dotColor?: string;
  delay?: number;
  style?: any;
};

export const MapPin: React.FC<MapPinProps> = ({
  size = 72,
  color = "#1A44CC",
  dotColor = "#000910",
  delay = 0,
  style,
}) => {
  const translateY = useSharedValue(-120);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 12, stiffness: 120 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Svg width={size} height={size * 1.4} viewBox="0 0 50 70">
        <Path
          d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z"
          fill={color}
        />
        <SvgCircle cx="25" cy="25" r="8" fill={dotColor} />
      </Svg>
    </Animated.View>
  );
};

export const LocationPinsHero: React.FC = () => {
  return (
    <View style={styles.heroWrap}>
      {/* Center pin FIRST */}
      <MapPin size={210} delay={0} style={[styles.pin, styles.centerPin]} />

      {/* Other pins sequentially after */}
      <MapPin size={64} delay={300} style={[styles.pin, { top: 0, left: "45%" }]} />
      <MapPin size={72} delay={500} style={[styles.pin, { top: 80, left: "6%" }]} />
      <MapPin size={72} delay={700} style={[styles.pin, { top: 88, right: "6%" }]} />
      <MapPin size={70} delay={900} style={[styles.pin, { bottom: 8, left: "10%" }]} />
      <MapPin size={70} delay={1100} style={[styles.pin, { bottom: 0, right: "10%" }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  heroWrap: {
    width: "100%",
    height: 360,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  pin: { position: "absolute" },
  centerPin: { top: "22%" },
});
