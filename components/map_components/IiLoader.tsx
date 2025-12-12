// components/map_components/IiLoader.tsx
// REDESIGNED: Clean loading screen - NO GRADIENTS
import React, { useRef, useState, useEffect } from "react";
import { View, Text, Animated as RNAnimated, Easing } from "react-native";
import { Fonts } from "@/constants/theme";
import { useKadwaBold } from "./utils";
import { BLUE, BG } from "./constants";
import { styles } from "./styles";
import { scale, verticalScale } from "@/utils/responsive";

export const IiLoader: React.FC = () => {
  const kadwaReady = useKadwaBold();
  const look = useRef(new RNAnimated.Value(0)).current;
  const runner = useRef(new RNAnimated.Value(0)).current;
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const lookLoop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(look, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        RNAnimated.timing(look, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    lookLoop.start();
    return () => lookLoop.stop();
  }, [look]);

  useEffect(() => {
    const runLoop = RNAnimated.loop(RNAnimated.timing(runner, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    runLoop.start();
    return () => runLoop.stop();
  }, [runner]);

  const lRot = look.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "-3deg"] });
  const rRot = look.interpolate({ inputRange: [0, 1], outputRange: ["10deg", "3deg"] });
  const lDotTx = look.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });
  const rDotTx = look.interpolate({ inputRange: [0, 1], outputRange: [4, -8] });
  const runnerTx = barW === 0 ? 0 : runner.interpolate({ inputRange: [0, 1], outputRange: [-barW * 0.3, barW] });
  const iStyle = [styles.iLetter, { fontFamily: kadwaReady ? "KadwaBold" : Fonts.bold }];

  return (
    <View style={styles.loading}>
      <View style={styles.iiRow}>
        <RNAnimated.View style={{ alignItems: "center", transform: [{ rotate: lRot }] }}>
          <RNAnimated.View style={[styles.iDot, { transform: [{ translateX: lDotTx }] }]} />
          <Text style={iStyle}>I</Text>
        </RNAnimated.View>
        <RNAnimated.View style={{ alignItems: "center", transform: [{ rotate: rRot }] }}>
          <RNAnimated.View style={[styles.iDot, { transform: [{ translateX: rDotTx }] }]} />
          <Text style={iStyle}>I</Text>
        </RNAnimated.View>
      </View>
      <Text style={styles.loadingText}>Locating you...</Text>
      <View style={styles.progressOuter} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        <RNAnimated.View style={[styles.progressRunner, { transform: [{ translateX: runnerTx }] }]} />
      </View>
    </View>
  );
};