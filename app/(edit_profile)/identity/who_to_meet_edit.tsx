import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    Colors,
    FloatingHeader,
} from "@/components";

import { supabase } from "@/lib/supabase";

type GenderEnum = "woman" | "man" | "nonbinary";

const MAIN = ["Woman", "Man", "Nonbinary"] as const;
const OPTIONS = [...MAIN, "All"] as const;

const ENUM_BY_LABEL: Record<(typeof MAIN)[number], GenderEnum> = {
  Woman: "woman",
  Man: "man",
  Nonbinary: "nonbinary",
};

const LABEL_BY_ENUM: Record<GenderEnum, (typeof MAIN)[number]> = {
  woman: "Woman",
  man: "Man",
  nonbinary: "Nonbinary",
};

export default function WhoToMeetEdit() {
  const [manualSet, setManualSet] = useState<string[]>([]);
  const [allMode, setAllMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const lastManualRef = useRef<string[]>([]);
  const animRefs = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_who_to_meet_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setManualSet(parsed.manualSet || []);
        setAllMode(parsed.allMode || false);
        if (parsed.lastManual) {
          lastManualRef.current = parsed.lastManual;
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("interested_in, full_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        
        const interested: GenderEnum[] = Array.isArray(data.interested_in) 
          ? data.interested_in 
          : [];

        if (interested.length === 3) {
          setAllMode(true);
          setManualSet([]);
          lastManualRef.current = MAIN.slice() as string[];
        } else {
          setAllMode(false);
          const labels = interested
            .map(e => LABEL_BY_ENUM[e])
            .filter(Boolean);
          setManualSet(labels);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const toggleOption = (opt: string) => {
    pulse(opt);
  
    if (opt === "All") {
      if (allMode) {
        setAllMode(false);
        setManualSet([]);
        lastManualRef.current = [];
      } else {
        lastManualRef.current = manualSet;
        setManualSet([]);
        setAllMode(true);
      }
      return;
    }
  
    if (allMode) {
      setAllMode(false);
      setManualSet([opt]);
      return;
    }
  
    const next = manualSet.includes(opt)
      ? manualSet.filter((x) => x !== opt)
      : [...manualSet, opt];
  
    if (MAIN.every((m) => next.includes(m))) {
      lastManualRef.current = next;
      setManualSet([]);
      setAllMode(true);
    } else {
      setManualSet(next);
    }
  };

  const isSelected = (opt: string) =>
    opt === "All" ? allMode : allMode ? true : manualSet.includes(opt);

  const handleSave = async () => {
    const normalized: GenderEnum[] = allMode
      ? ["woman", "man", "nonbinary"]
      : manualSet
          .filter((x): x is (typeof MAIN)[number] => (MAIN as readonly string[]).includes(x))
          .map((x) => ENUM_BY_LABEL[x]);

    if (normalized.length === 0) {
      Alert.alert("Missing Info", "Please select who you would like to meet.");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      const tempKey = `temp_who_to_meet_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        manualSet,
        allMode,
        lastManual: lastManualRef.current,
        fullName,
        normalized
      }));

      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="Who I'd Like to Meet" 
          fullName={fullName}
          onSave={handleSave}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
          >
            <Text style={styles.title}>Who would you like to meet?</Text>
            <Text style={styles.subtitle}>
              You can choose more than one answer or select "All".
            </Text>

            <View style={styles.optionsContainer}>
              {OPTIONS.map((opt) => {
                const anim = ensureAnim(opt);
                const selected = isSelected(opt);

                return (
                  <Pressable key={opt} onPress={() => toggleOption(opt)}>
                    <Animated.View style={{ transform: [{ scale: anim }] }}>
                      <LinearGradient
                        colors={
                          selected
                            ? ["#1B44CD", "#3C6FFF"] as const
                            : ["#FFFFFF", "#F8FAFF"] as const
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.optionButton,
                          selected && styles.optionButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                        <Ionicons
                          name={selected ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={selected ? "#FFFFFF" : Colors.BLUE}
                        />
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.infoNote}>
              <Ionicons 
                name="information-circle-outline" 
                size={18} 
                color="rgba(10,14,26,0.5)" 
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                Your preferences help us show you more compatible matches.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(100),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  title: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(8),
    lineHeight: verticalScale(32),
  },
  subtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(24),
    lineHeight: verticalScale(22),
  },
  optionsContainer: {
    gap: verticalScale(12),
  },
  optionButton: {
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  optionButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  optionText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(20),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
  },
});