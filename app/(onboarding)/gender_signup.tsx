import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

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

      router.push("/(onboarding)/hope_to_find_signup");
    } catch (err) {
      console.error("Gender update error:", err);
      Alert.alert("Unexpected error", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonCircle}>
            <Ionicons name="arrow-back" size={24} color={Colors.INK} />
          </View>
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
          {/* Heading */}
          <View style={{ marginBottom: verticalScale(12) }}>
            <Text style={styles.titleLine}>
              Hello <Text style={styles.name}>{userName}</Text>
            </Text>

            <View style={styles.inlineRow}>
              <Text style={styles.titleLine}>It's </Text>
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
                activeOpacity={0.8}
              >
                <Text style={styles.genderText}>{gender}</Text>
                <Ionicons
                  name={selectedGender === gender ? "chevron-up" : "chevron-down"}
                  size={22}
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
                          toValue: 1.05,
                          duration: 100,
                          useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                          toValue: 1,
                          duration: 100,
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
                          ]}
                        >
                          <LinearGradient
                            colors={
                              isSelected
                                ? ["#1B44CD", "#3C6FFF"] as const
                                : ["#FFFFFF", "#F8FAFF"] as const
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
              It's up to you to show this information on your profile.
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Do not show on profile</Text>
              <Switch
                value={hideFromProfile}
                onValueChange={setHideFromProfile}
                trackColor={{ false: "#C8CDD2", true: Colors.BLUE }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#C8CDD2"
              />
            </View>
          </View>
        </ScrollView>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  backButton: {
    position: "absolute",
    top: verticalScale(16),
    left: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressWrapper: {
    marginTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  progressTrack: {
    height: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressFill: {
    height: verticalScale(8),
    width: "11.76%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },
  titleLine: {
    fontFamily: Fonts.bold,
    fontSize: scale(28),
    lineHeight: verticalScale(38),
    color: Colors.INK,
    paddingTop: verticalScale(6.5),
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  name: {
    color: Colors.BLUE,
  },
  highlightBig: {
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    fontSize: scale(38),
    lineHeight: verticalScale(48),
    marginHorizontal: scale(4),
    paddingTop: verticalScale(8.5),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    lineHeight: verticalScale(24),
    color: Colors.INK,
    marginBottom: verticalScale(24),
  },
  genderButton: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  genderButtonSelected: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  genderText: {
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: "#FFFFFF",
  },
  subMenuWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginTop: verticalScale(12),
  },
  subButton: {
    borderRadius: scale(24),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(18),
    minWidth: scale(110),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  subButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  subText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
    textAlign: "center",
  },
  subTextSelected: {
    color: "#FFFFFF",
  },
  profileNoteWrapper: {
    marginTop: verticalScale(24),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  noteText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(8),
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: Colors.INK,
  },
  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});