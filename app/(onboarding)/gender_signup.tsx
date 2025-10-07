import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GenderSignup() {
  const params = useLocalSearchParams();
  const rawName =
    typeof params.name === "string" && params.name.trim() !== ""
      ? params.name
      : "there";
  const userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedSubGender, setSelectedSubGender] = useState<string | null>(null);
  const [hideFromProfile, setHideFromProfile] = useState(false);
  const [loading, setLoading] = useState(false);

  const animationsRef = useRef<Record<string, Record<string, Animated.Value>>>({});

  const genderOptions: Record<string, string[]> = {
    Man: ["Cis Man", "Intersex Man", "Trans Man", "Transmasculine", "Not listed"],
    Woman: ["Cis Woman", "Intersex Woman", "Trans Woman", "Transfeminine", "Not listed"],
    "Beyond Binary": [
      "Agender",
      "Bigender",
      "Gender Questioning",
      "Genderfluid",
      "Genderqueer",
      "Intersex",
      "Nonbinary",
      "Pangender",
      "Trans Person",
      "Transfeminine",
      "Transmasculine",
      "Two-Spirit",
      "Not listed",
    ],
  };

  useEffect(() => {
    if (selectedGender === "Man") setSelectedSubGender("Cis Man");
    else if (selectedGender === "Woman") setSelectedSubGender("Cis Woman");
    else setSelectedSubGender(null);
  }, [selectedGender]);

  const toggleGender = (gender: string) => {
    if (selectedGender === gender) setSelectedGender(null);
    else setSelectedGender(gender);
  };

  const handleNext = async () => {
    if (!selectedGender) {
      Alert.alert("Missing info", "Please select your gender.");
      return;
    }
    if (!selectedSubGender) {
      Alert.alert("Missing info", "Please select your gender subtype.");
      return;
    }

    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        Alert.alert("Error", "Session not found. Please log in again.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          gender: selectedGender,
          gender_subtype: selectedSubGender,
          show_gender_on_profile: !hideFromProfile,
          onboarding_step: 2,
        })
        .eq("id", session.user.id);

      if (updateError) {
        Alert.alert("Error", updateError.message);
        setLoading(false);
        return;
      }

      router.push("/(onboarding)/purpose_signup");
    } catch (err) {
      console.error("Gender update error:", err);
      Alert.alert("Unexpected error", "Please try again.");
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

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: verticalScale(10) }} />

          {/* Heading */}
          <View style={{ marginBottom: verticalScale(9) }}>
            <Text style={styles.titleLine}>
              Hello <Text style={styles.name}>{userName}</Text>
            </Text>

            <View style={styles.inlineRow}>
              <Text style={styles.titleLine}>It&apos;s </Text>
              <Text style={styles.highlightBig}>Niice</Text>
              <Text style={styles.titleLine}> to</Text>
            </View>

            <Text style={styles.titleLine}>meet you!</Text>
          </View>

          <Text style={styles.subtitle}>
            We are happy to welcome you. Pick the gender that best describes you.
          </Text>

          {/* Gender Buttons */}
          {["Woman", "Man", "Beyond Binary"].map((gender) => (
            <View key={gender} style={{ marginBottom: verticalScale(12) }}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  selectedGender === gender && styles.genderButtonSelected,
                ]}
                onPress={() => toggleGender(gender)}
                activeOpacity={0.9}
              >
                <Text style={styles.genderText}>{gender}</Text>
                <Ionicons
                  name={selectedGender === gender ? "chevron-up" : "chevron-down"}
                  size={moderateScale(22)}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              {/* Sub-options */}
              {selectedGender === gender && (
                <View style={styles.subMenuWrapper}>
                  {genderOptions[gender].map((sub) => {
                    if (!animationsRef.current[gender])
                      animationsRef.current[gender] = {};
                    if (!animationsRef.current[gender][sub]) {
                      animationsRef.current[gender][sub] = new Animated.Value(1);
                    }

                    const anim = animationsRef.current[gender][sub];
                    const isSelected = selectedSubGender === sub;

                    const pressAnim = () => {
                      Animated.sequence([
                        Animated.timing(anim, {
                          toValue: 1.08,
                          duration: 130,
                          useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                          toValue: 1,
                          duration: 150,
                          useNativeDriver: true,
                        }),
                      ]).start();
                      setSelectedSubGender(sub);
                    };

                    return (
                      <Pressable key={sub} onPress={pressAnim}>
                        <Animated.View
                          style={[
                            { transform: [{ scale: anim }] },
                            styles.shadowWrapper,
                          ]}
                        >
                          <LinearGradient
                            colors={
                              isSelected
                                ? ["#1B44CD", "#3C6FFF", "#7AA9FF"]
                                : ["#F8FAFF", "#EBF1FF"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                              styles.subButton,
                              isSelected && styles.subButtonSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.subText,
                                isSelected && styles.subTextSelected,
                              ]}
                            >
                              {sub}
                            </Text>
                          </LinearGradient>
                        </Animated.View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ))}

          {/* Show/Hide on Profile */}
          <View style={styles.profileNoteWrapper}>
            <Text style={styles.noteText}>
              It&apos;s up to you to show this information on your profile.
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Do not show on profile</Text>
              <Switch
                value={hideFromProfile}
                onValueChange={setHideFromProfile}
                trackColor={{ false: "#C8CDD2", true: BLUE }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#C8CDD2"
              />
            </View>
          </View>
        </ScrollView>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={loading}>
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
    width: "12.50%",
    backgroundColor: BLUE,
    borderRadius: scale(3),
  },
  scrollContainer: { flex: 1 },
  scrollContent: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(120),
  },
  titleLine: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(30),
    lineHeight: verticalScale(48),
    color: INK,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "baseline",
    height: verticalScale(48),
  },
  name: { color: BLUE },
  highlightBig: {
    fontFamily: Fonts.bold,
    color: BLUE,
    fontSize: moderateScale(42),
    lineHeight: verticalScale(60),
    marginHorizontal: scale(4),
    transform: [{ translateY: verticalScale(-2) }],
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    lineHeight: verticalScale(26),
    color: INK,
    marginBottom: verticalScale(24),
  },
  genderButton: {
    backgroundColor: BLUE,
    borderRadius: scale(12),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(18),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  genderButtonSelected: { backgroundColor: "#1838B3" },
  genderText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: "#FFFFFF",
  },
  subMenuWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginTop: verticalScale(10),
  },
  shadowWrapper: {
    shadowColor: "#1B44CD",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  subButton: {
    borderRadius: scale(30),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    minWidth: scale(120),
    alignItems: "center",
    justifyContent: "center",
  },
  subButtonSelected: {
    shadowOpacity: 0.45,
    shadowRadius: 10,
    transform: [{ scale: 1.02 }],
  },
  subText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(17),
    color: "#1B2B44",
    textAlign: "center",
  },
  subTextSelected: {
    color: "#FFFFFF",
  },
  profileNoteWrapper: { marginTop: verticalScale(24) },
  noteText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#6C757D",
    lineHeight: verticalScale(30),
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginTop: verticalScale(4),
  },
  switchLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(16),
    color: "#6C757D",
    lineHeight: verticalScale(30),
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
