import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { MapPin } from "./MapPins";

const { width, height } = Dimensions.get("window");

const CIRCLE_SIZE = 70;
const PIN_SIZE = 60;
const PIN_HEIGHT = PIN_SIZE * 1.4;
const DRIFT_DURATION = 14000; // 14 seconds to cross screen
const DROP_DURATION = 1600; // Pin drops in 1.6 seconds

type CircleProps = {
  top: number;
  delay: number;
  withPin: boolean;
};

const CircleWithPin: React.FC<CircleProps> = ({ top, delay, withPin }) => {
  const x = useSharedValue(-CIRCLE_SIZE - 100);
  const pinY = useSharedValue(-PIN_HEIGHT - 200);

  useEffect(() => {
    // Circle moves from off-screen left to off-screen right
    x.value = withDelay(
      delay,
      withRepeat(
        withTiming(width + CIRCLE_SIZE + 100, {
          duration: DRIFT_DURATION,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    // Pin drops once and stays (doesn't reset visibly)
    if (withPin) {
      const targetY = CIRCLE_SIZE / 2 - PIN_HEIGHT / 2;
      
      // Pin drops after circle starts moving
      pinY.value = withDelay(
        delay + 800,
        withRepeat(
          withTiming(targetY, {
            duration: DROP_DURATION,
            easing: Easing.out(Easing.cubic),
          }),
          -1,
          false
        )
      );
    }

    return () => {
      cancelAnimation(x);
      cancelAnimation(pinY);
    };
  }, [delay, withPin]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pinY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top,
          alignItems: "center",
          justifyContent: "center",
        },
        circleStyle,
      ]}
    >
      {/* Circle */}
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: "#C8DBE8",
          opacity: 0.85,
        }}
      />
      
      {/* Pin */}
      {withPin && (
        <Animated.View style={[{ position: "absolute" }, pinStyle]}>
          <MapPin size={PIN_SIZE} />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const AnimatedBackground = () => {
  // Fixed vertical spacing to prevent overlaps
  const verticalSpacing = 130; // Enough space between circles
  const numRows = Math.ceil(height / verticalSpacing);
  
  // Create 3 offset groups for continuous flow
  const groups = 3;
  const totalCircles = numRows * groups;
  
  const circles: CircleProps[] = [];
  
  // Generate circles in a controlled manner
  for (let group = 0; group < groups; group++) {
    for (let row = 0; row < numRows; row++) {
      // Fixed vertical position for each row
      const top = row * verticalSpacing + 10;
      
      // Each group starts at different time, evenly spaced
      const groupDelay = (group * DRIFT_DURATION) / groups;
      
      // Small offset within group to avoid perfect alignment
      const offset = (row * 300) % 1200;
      
      circles.push({
        top,
        delay: groupDelay + offset,
        withPin: row % 3 !== 0, // 2 out of 3 have pins (more predictable)
      });
    }
  }

  return (
    <View style={styles.wrap} pointerEvents="none">
      {circles.map((c, idx) => (
        <CircleWithPin key={idx} {...c} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FBFCFD",
    overflow: "hidden",
  },
});

export default AnimatedBackground;