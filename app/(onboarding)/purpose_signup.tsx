// app/(onboarding)/purpose_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PurposeSignup() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const animRefs = useRef<{ [key: string]: Animated.Value }>({});

  const ensureAnim = (type: string) => {
    if (!animRefs.current[type]) {
      animRefs.current[type] = new Animated.Value(0);
    }
    return animRefs.current[type];
  };

  const handlePress = (type: string) => {
    const anim = ensureAnim(type);

    // Soft press animation
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();

    setSelected(type);
  };

  const handleNext = async () => {
    if (!selected) return;
  
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session found");
  
      const userId = session.user.id;
      const modeValue = selected.toLowerCase() === "date" ? "dating" : "friend";
      const bringsValue = selected.toLowerCase() === "date" ? "date" : "friends";
  
      // 🧠 Ensure deletion finishes before inserting
      const { error: deleteError } = await supabase
        .from("user_modes")
        .delete()
        .eq("user_id", userId);
  
      if (deleteError) throw deleteError;
  
      // 🧩 Insert the new mode
      const { error: insertError } = await supabase
        .from("user_modes")
        .insert({
          user_id: userId,
          mode: modeValue,
          updated_at: new Date().toISOString(),
        });
  
      if (insertError) throw insertError;
  
      // 🧩 Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          brings_you: bringsValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
  
      if (profileError) throw profileError;
  
      // ✅ Move to next step
      router.push({
        pathname: "/(onboarding)/who_to_meet_signup",
        params: { purpose: selected },
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View>
            <Text style={styles.titleLine}>What brings you to</Text>
            <View style={styles.titleRow}>
              <Text style={styles.highlightBig}>Niice</Text>
              <Text style={styles.questionMark}>?</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Are you looking for a <Text style={{ color: BLUE }}>date</Text> or{" "}
            <Text style={{ color: BLUE }}>friends</Text>?
          </Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {["Date", "Friends"].map((type) => {
              const isSelected = selected === type;
              const anim = ensureAnim(type);

              const bgColor = anim.interpolate({
                inputRange: [0, 1],
                outputRange: isSelected
                  ? ["#1B44CD", "#1437B3"]
                  : ["#FFFFFF", "#EAF1F8"],
              });

              const shadowOpacity = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.12, 0.35],
              });

              return (
                <Pressable key={type} onPress={() => handlePress(type)}>
                  <Animated.View
                    style={[
                      styles.cardWrapper,
                      {
                        backgroundColor: bgColor,
                        shadowOpacity,
                        transform: [
                          {
                            scale: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 0.97],
                            }),
                          },
                        ],
                      },
                      isSelected && styles.cardSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                    <View
                      style={[
                        styles.circle,
                        isSelected && styles.circleSelected,
                      ]}
                    />
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>

          {/* Note */}
          <Text style={styles.note}>
            You can change this mode anytime in the app.
          </Text>
        </View>

        {/* Next */}
        <TouchableOpacity
          style={[styles.nextButton, (!selected || loading) && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={!selected || loading}
        >
          <Ionicons
            name="chevron-forward"
            size={moderateScale(30)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  progressWrapper: {
    marginTop: verticalScale(58 + 30),
    paddingHorizontal: scale(24),
  },
  progressTrack: {
    height: verticalScale(6),
    backgroundColor: "#C8CDD2",
    borderRadius: scale(3),
  },
  progressFill: {
    height: verticalScale(6),
    width: "13%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(50),
    justifyContent: "flex-start",
  },
  titleLine: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(30),
    lineHeight: verticalScale(48),
    color: INK,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(-2),
  },
  highlightBig: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(42),
    lineHeight: verticalScale(62),
  },
  questionMark: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(54),
    lineHeight: verticalScale(80),
    marginLeft: scale(6),
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    lineHeight: verticalScale(26),
    color: INK,
    marginTop: verticalScale(7),
    marginBottom: verticalScale(26),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(1),
    marginBottom: verticalScale(50),
  },
  cardWrapper: {
    width: scale(150),
    height: verticalScale(130),
    borderRadius: scale(32),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B44CD",
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  cardSelected: { shadowOpacity: 0.35 },
  optionText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(20),
    color: "#1B2B44",
    marginBottom: verticalScale(14),
  },
  optionTextSelected: { color: "#FFFFFF" },
  circle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: scale(3),
    borderColor: "#1B2B44",
  },
  circleSelected: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  note: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    width: "100%",
    height: verticalScale(100),
    borderRadius: scale(35),
    marginTop: verticalScale(-20),
    marginBottom: verticalScale(50),
    color: "#6C757D",
    textAlign: "center",
  },
  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
  },
});
