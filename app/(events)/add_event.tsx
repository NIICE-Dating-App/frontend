// app/(tabs)/add_event/index.tsx
// Requires: expo-location, @react-native-community/datetimepicker, react-native-maps
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { MAPBOX_CONFIG, reverseGeocode, searchPlaces } from "@/config/mapbox";
import { Fonts } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

/* ===================== THEME ===================== */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BG = "#FAFBFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";
const ERROR_RED = "#D5222B";

const GRADIENTS = {
  primary: [BLUE, "#2E54E8"],
  card: ["#FFFFFF", "#F8FAFF"],
  accent: ["#EEF4FF", "#DCE8FF"],
} as const;

/* ===================== TYPES ===================== */
type EventCategory = 
  | "food_drinks"
  | "nightlife_party"
  | "outdoors_nature"
  | "sports_fitness"
  | "games_hobbies"
  | "arts_culture_entertainment"
  | "learning_career"
  | "community_volunteering"
  | "romantic_dating"
  | "travel_adventure"
  | "online_virtual"
  | "other";

type GenderFilter = "Man" | "Woman" | "Beyond Binary" | "Everyone";

interface EventFormData {
  eventName: string;
  category: EventCategory | null;
  description: string;
  timeStart: Date;
  timeEnd: Date;
  location: { latitude: number; longitude: number } | null;
  locationName: string;
  capacity: number;
  genderAllowed: GenderFilter;
  ageMin: number;
  ageMax: number;
}

/* ===================== HELPERS ===================== */
const categoryDisplayNames: Record<EventCategory, { label: string; icon: string }> = {
  food_drinks: { label: "Food & Drinks", icon: "silverware-fork-knife" },
  nightlife_party: { label: "Nightlife & Party", icon: "weather-night" },
  outdoors_nature: { label: "Outdoors & Nature", icon: "pine-tree" },
  sports_fitness: { label: "Sports & Fitness", icon: "dumbbell" },
  games_hobbies: { label: "Games & Hobbies", icon: "gamepad-variant" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "palette" },
  learning_career: { label: "Learning & Career", icon: "school" },
  community_volunteering: { label: "Community", icon: "account-group" },
  romantic_dating: { label: "Romantic & Dating", icon: "heart" },
  travel_adventure: { label: "Travel & Adventure", icon: "airplane" },
  online_virtual: { label: "Online / Virtual", icon: "laptop" },
  other: { label: "Other", icon: "dots-horizontal" },
};

const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
};

const formatDateTime = (date: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dateNum = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}, ${dateNum} ${month} · ${hours}:${minutes}`;
};

/* ===================== COMPONENTS ===================== */
const StepHeader: React.FC<{
  currentStep: 1 | 2;
  onBack: () => void;
  onNext?: () => void;
  onSave?: () => void;
  nextEnabled?: boolean;
  loading?: boolean;
}> = ({ currentStep, onBack, onNext, onSave, nextEnabled = true, loading = false }) => {
  const insets = useSafeAreaInsets();
  const TOOLBAR_HEIGHT = verticalScale(56);
  const headerHeight = insets.top + TOOLBAR_HEIGHT;

  return (
    <View style={[styles.floatingHeader, { height: headerHeight, paddingTop: insets.top }]}>
      <BlurView intensity={98} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={["rgba(255,255,255,0.98)", "rgba(250,251,255,0.95)"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={styles.chevronWrapper}>
            <View style={[styles.chevronLine, styles.chevronLineTop]} />
            <View style={[styles.chevronLine, styles.chevronLineBottom]} />
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressSegment, { backgroundColor: BLUE }]} />
            <View style={[styles.progressSegment, { backgroundColor: currentStep === 2 ? BLUE : "rgba(27,68,205,0.2)" }]} />
          </View>
        </View>

        {currentStep === 1 ? (
          <TouchableOpacity 
            onPress={onNext} 
            style={styles.nextButton}
            disabled={!nextEnabled}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={nextEnabled ? GRADIENTS.primary : ["#E0E4EC", "#E0E4EC"]} 
              style={styles.nextGradient}
            >
              <Text style={[styles.nextText, !nextEnabled && styles.nextTextDisabled]}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={onSave} 
            style={styles.saveButton}
            disabled={loading || !nextEnabled}
            activeOpacity={0.8}
          >
            <LinearGradient colors={GRADIENTS.primary} style={styles.saveGradient}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Create</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const CategoryChip: React.FC<{
  category: EventCategory;
  selected: boolean;
  onPress: () => void;
}> = ({ category, selected, onPress }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  const { label, icon } = categoryDisplayNames[category];

  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <RNAnimated.View style={[
        styles.categoryChip,
        selected && styles.categoryChipSelected,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {selected && (
          <LinearGradient 
            colors={GRADIENTS.primary} 
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
        <MaterialCommunityIcons 
          name={icon as any} 
          size={20} 
          color={selected ? "#FFFFFF" : BLUE} 
        />
        <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
          {label}
        </Text>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

const DateTimeCard: React.FC<{
  label: string;
  value: Date;
  onPress: () => void;
}> = ({ label, value, onPress }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, { toValue: 0.98, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.dateTimeCardWrapper}
      activeOpacity={0.9}
    >
      <RNAnimated.View style={[styles.dateTimeCard, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.dateTimeLabel}>{label}</Text>
        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={18} color={BLUE} style={styles.dateTimeIcon} />
          <Text style={styles.dateTimeValue}>{formatDateTime(value)}</Text>
        </View>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

const GenderPill: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({ label, selected, onPress }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.genderPillWrapper}
      activeOpacity={0.8}
    >
      <RNAnimated.View style={[
        styles.genderPill,
        selected && styles.genderPillSelected,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {selected && (
          <LinearGradient 
            colors={GRADIENTS.primary} 
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <Text style={[styles.genderPillText, selected && styles.genderPillTextSelected]}>
          {label}
        </Text>
      </RNAnimated.View>
    </TouchableOpacity>
  );
};

/* ===================== MAIN SCREEN ===================== */
export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<EventFormData>({
    eventName: "",
    category: null,
    description: "",
    timeStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    timeEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // Tomorrow + 2 hours
    location: { latitude: 41.455, longitude: 12.625 }, // Default to Anzio area
    locationName: "",
    capacity: 10,
    genderAllowed: "Everyone",
    ageMin: 18,
    ageMax: 99,
  });

  // UI state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: 41.455, // Default to Anzio area
    longitude: 12.625,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [isManuallyTyping, setIsManuallyTyping] = useState(false);
  const [isUpdatingFromMap, setIsUpdatingFromMap] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // Debounced search function
  const performPlaceSearch = useCallback(async (text: string) => {
    if (text.length > 2) {
      setSearchingPlaces(true);
      try {
        const results = await searchPlaces(
          text,
          formData.location ? {
            lat: formData.location.latitude,
            lng: formData.location.longitude
          } : undefined
        );
        setPlaceResults(results);
      } catch (error) {
        console.log("Places search error:", error);
      } finally {
        setSearchingPlaces(false);
      }
    } else {
      setPlaceResults([]);
      setSearchingPlaces(false);
    }
  }, [formData.location]);

  const debouncedSearch = useDebounce(performPlaceSearch, 500);

  // Reverse geocode to get address from coordinates
  const performReverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    // Don't update if user is manually typing
    if (isManuallyTyping) return;
    
    setIsUpdatingFromMap(true);
    setIsReverseGeocoding(true);
    try {
      const address = await reverseGeocode(latitude, longitude);
      if (address) {
        // Extract the main place name (first part before first comma)
        const mainName = address.split(',')[0].trim();
        setFormData(prev => ({ 
          ...prev, 
          locationName: mainName 
        }));
      }
    } catch (error) {
      console.log("Reverse geocode error:", error);
    } finally {
      setIsUpdatingFromMap(false);
      setIsReverseGeocoding(false);
    }
  }, [isManuallyTyping]);

  const debouncedReverseGeocode = useDebounce(performReverseGeocode, 800);

  useEffect(() => {
    setWordCount(countWords(formData.description));
  }, [formData.description]);

  // Validation
  const isStep1Valid = () => {
    return (
      formData.eventName.trim().length > 0 &&
      formData.category !== null &&
      wordCount >= 10 &&
      wordCount <= 500 &&
      formData.timeEnd > formData.timeStart
    );
  };

  const isStep2Valid = () => {
    return (
      formData.location !== null &&
      formData.locationName.trim().length > 0 &&
      formData.capacity > 0 &&
      formData.ageMax >= formData.ageMin
    );
  };

  const handleNext = () => {
    if (isStep1Valid()) {
      setCurrentStep(2);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const handleCreate = async () => {
    if (!isStep2Valid()) return;
    
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert("Error", "You must be logged in to create an event");
        setLoading(false);
        return;
      }

      // Map gender filter to DB enum
      let genderForDb: "Man" | "Woman" | "Beyond Binary" = "Man";
      if (formData.genderAllowed !== "Everyone") {
        genderForDb = formData.genderAllowed as "Man" | "Woman" | "Beyond Binary";
      }

      console.log("📝 Creating event with data:", {
        event_name: formData.eventName,
        category: formData.category,
        location: formData.location,
        location_name: formData.locationName,
        time_start: formData.timeStart.toISOString(),
        time_end: formData.timeEnd.toISOString(),
      });

      // Method 1: If you run the SQL migration with the function
      const { data, error } = await supabase
        .rpc('create_event_with_location', {
          p_event_data: {
            host_id: userId,
            event_name: formData.eventName,
            category: formData.category,
            event_description: formData.description,
            latitude: formData.location!.latitude,
            longitude: formData.location!.longitude,
            location_name: formData.locationName,
            time_start: formData.timeStart.toISOString(),
            time_end: formData.timeEnd.toISOString(),
            capacity: formData.capacity,
            gender_allowed: genderForDb,
            age_min: formData.ageMin,
            age_max: formData.ageMax,
            status: 'active'
          }
        });

      // Method 2: Alternative - If you added latitude/longitude columns
      // const { data, error } = await supabase
      //   .from("events")
      //   .insert({
      //     host_id: userId,
      //     event_name: formData.eventName,
      //     category: formData.category,
      //     event_description: formData.description,
      //     latitude: formData.location!.latitude,
      //     longitude: formData.location!.longitude,
      //     location_name: formData.locationName,
      //     time_start: formData.timeStart.toISOString(),
      //     time_end: formData.timeEnd.toISOString(),
      //     capacity: formData.capacity,
      //     gender_allowed: genderForDb,
      //     age_min: formData.ageMin,
      //     age_max: formData.ageMax,
      //     status: 'active'
      //   });

      if (error) {
        console.error("❌ Event creation error:", error);
        Alert.alert("Error", error.message || "Failed to create event. Please try again.");
      } else {
        console.log("✅ Event created successfully:", data);
        Alert.alert(
          "Success!",
          "Your event has been created. People nearby can now see it.",
          [{ 
            text: "OK", 
            onPress: () => {
              // Navigate back to map - the real-time subscription will auto-refresh
              router.back();
            }
          }]
        );
      }
    } catch (e) {
      console.error("❌ Event creation exception:", e);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StepHeader
        currentStep={currentStep}
        onBack={() => currentStep === 1 ? router.back() : setCurrentStep(1)}
        onNext={handleNext}
        onSave={handleCreate}
        nextEnabled={currentStep === 1 ? isStep1Valid() : isStep2Valid()}
        loading={loading}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + verticalScale(56)}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {currentStep === 1 ? (
            /* ========== STEP 1: BASICS ========== */
            <>
              {/* Event Name */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Event name</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={formData.eventName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, eventName: text.slice(0, 120) }))}
                    placeholder="Keep it short & clear"
                    placeholderTextColor="rgba(10,14,26,0.3)"
                    maxLength={120}
                  />
                  <Text style={styles.charCounter}>{formData.eventName.length}/120</Text>
                </View>
              </View>

              {/* Category */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {Object.keys(categoryDisplayNames).map((cat) => (
                    <CategoryChip
                      key={cat}
                      category={cat as EventCategory}
                      selected={formData.category === cat}
                      onPress={() => setFormData(prev => ({ ...prev, category: cat as EventCategory }))}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    ref={descriptionInputRef}
                    style={styles.textArea}
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                    placeholder="What's happening, what should people expect, any rules or vibe?"
                    placeholderTextColor="rgba(10,14,26,0.3)"
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                  <Text style={[
                    styles.wordCounter,
                    (wordCount < 10 || wordCount > 500) && styles.wordCounterError
                  ]}>
                    {wordCount} / 500 words
                  </Text>
                  {wordCount < 10 && (
                    <Text style={styles.errorText}>Write at least 10 words so people know what to expect</Text>
                  )}
                  {wordCount > 500 && (
                    <Text style={styles.errorText}>Try to keep it under 500 words</Text>
                  )}
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date & time</Text>
                <View style={styles.dateTimeContainer}>
                  <DateTimeCard
                    label="Start"
                    value={formData.timeStart}
                    onPress={() => setShowStartPicker(true)}
                  />
                  <DateTimeCard
                    label="End"
                    value={formData.timeEnd}
                    onPress={() => setShowEndPicker(true)}
                  />
                </View>
                {formData.timeEnd <= formData.timeStart && (
                  <Text style={styles.errorText}>End time must be after start time</Text>
                )}
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={formData.timeStart}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, date) => {
                    setShowStartPicker(Platform.OS === "android");
                    if (date) {
                      setFormData(prev => ({ 
                        ...prev, 
                        timeStart: date,
                        timeEnd: new Date(date.getTime() + 2 * 60 * 60 * 1000)
                      }));
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={formData.timeEnd}
                  mode="datetime"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, date) => {
                    setShowEndPicker(Platform.OS === "android");
                    if (date) {
                      setFormData(prev => ({ ...prev, timeEnd: date }));
                    }
                  }}
                  minimumDate={formData.timeStart}
                />
              )}
            </>
          ) : (
            /* ========== STEP 2: LOCATION & WHO ========== */
            <>
              {/* Location */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.mapCard}>
                  <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    region={mapRegion}
                    onRegionChangeComplete={(region) => {
                      setMapRegion(region);
                      setFormData(prev => ({
                        ...prev,
                        location: {
                          latitude: region.latitude,
                          longitude: region.longitude,
                        }
                      }));
                      
                      // Reverse geocode to get address for the new location
                      debouncedReverseGeocode(region.latitude, region.longitude);
                    }}
                  >
                    {formData.location && (
                      <Marker 
                        coordinate={formData.location}
                        anchor={{ x: 0.5, y: 1 }}
                      >
                        <View style={styles.markerContainer}>
                          <View style={styles.marker}>
                            <Ionicons name="location" size={24} color={BLUE} />
                          </View>
                          <View style={styles.markerShadow} />
                        </View>
                      </Marker>
                    )}
                  </MapView>
                  
                  {/* Loading indicator when getting address from map */}
                  {isReverseGeocoding && (
                    <View style={styles.reverseGeocodingIndicator}>
                      <View style={styles.reverseGeocodingBadge}>
                        <ActivityIndicator size="small" color={BLUE} style={{ marginRight: scale(6) }} />
                        <Text style={styles.reverseGeocodingText}>Getting address...</Text>
                      </View>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.useLocationButton}
                    onPress={async () => {
                      try {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== "granted") {
                          Alert.alert("Permission Required", "Please allow location access in Settings to use this feature.");
                          return;
                        }
                        
                        try {
                          const location = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                          });
                          const newRegion = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.02,
                            longitudeDelta: 0.02,
                          };
                          setMapRegion(newRegion);
                          mapRef.current?.animateToRegion(newRegion, 500);
                          setFormData(prev => ({
                            ...prev,
                            location: {
                              latitude: location.coords.latitude,
                              longitude: location.coords.longitude,
                            }
                          }));
                          console.log("📍 Using current location:", location.coords.latitude, location.coords.longitude);
                        } catch (locationError) {
                          console.log("📍 Location error:", locationError);
                          Alert.alert(
                            "Location Error", 
                            "Could not get your current location. Please ensure Location Services are enabled in Settings, or select a location on the map."
                          );
                        }
                      } catch (error) {
                        console.log("📍 Permission error:", error);
                        Alert.alert("Error", "Could not access location. Please try again.");
                      }
                    }}
                  >
                    <LinearGradient colors={["#FFFFFF", "#F8FAFF"]} style={styles.useLocationGradient}>
                      <Ionicons name="navigate" size={16} color={BLUE} style={{ marginRight: scale(6) }} />
                      <Text style={styles.useLocationText}>Use my current location</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={formData.locationName}
                    onFocus={() => {
                      setIsManuallyTyping(true);
                    }}
                    onBlur={() => {
                      // Small delay to allow dropdown selection to work
                      setTimeout(() => setIsManuallyTyping(false), 200);
                    }}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, locationName: text }));
                      
                      // Only search if not updating from map
                      if (!isUpdatingFromMap) {
                        debouncedSearch(text);
                      }
                    }}
                    placeholder="Search for a place (bar, park, restaurant...)"
                    placeholderTextColor="rgba(10,14,26,0.3)"
                  />
                  {searchingPlaces && (
                    <ActivityIndicator 
                      style={styles.searchIndicator} 
                      size="small" 
                      color={BLUE} 
                    />
                  )}
                </View>
                
                {placeResults.length > 0 && (
                  <View style={styles.placesDropdown}>
                    {placeResults.slice(0, MAPBOX_CONFIG.SEARCH_LIMIT).map((place) => (
                      <TouchableOpacity
                        key={place.id}
                        style={styles.placeItem}
                        onPress={() => {
                          // Set manual typing to false since user selected from dropdown
                          setIsManuallyTyping(false);
                          
                          // Set the place name (use text which is the main name)
                          const placeName = place.text || place.place_name.split(',')[0];
                          setFormData(prev => ({ 
                            ...prev, 
                            locationName: placeName 
                          }));
                          setPlaceResults([]);
                          
                          // Update location from Mapbox center coordinates
                          if (place.center) {
                            const newLocation = {
                              latitude: place.center[1], // Mapbox uses [lng, lat]
                              longitude: place.center[0],
                            };
                            
                            // Update map and form
                            setFormData(prev => ({
                              ...prev,
                              location: newLocation,
                            }));
                            
                            const newRegion = {
                              ...newLocation,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01,
                            };
                            setMapRegion(newRegion);
                            mapRef.current?.animateToRegion(newRegion, 500);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.placeItemContent}>
                          <Ionicons name="location-outline" size={18} color={BLUE} style={styles.placeIcon} />
                          <View style={styles.placeTextContainer}>
                            <Text style={styles.placeMainText} numberOfLines={1}>
                              {place.text}
                            </Text>
                            <Text style={styles.placeSecondaryText} numberOfLines={1}>
                              {place.place_name.split(',').slice(1).join(', ').trim() || 
                               place.place_type?.join(', ') || ''}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Capacity */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Spots available</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.slider}
                    minimumValue={2}
                    maximumValue={50}
                    step={1}
                    value={formData.capacity}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, capacity: Math.round(value) }))}
                    minimumTrackTintColor={BLUE}
                    maximumTrackTintColor="rgba(27,68,205,0.2)"
                    thumbTintColor={BLUE}
                  />
                  <View style={styles.sliderBadge}>
                    <Text style={styles.sliderBadgeText}>{formData.capacity} people</Text>
                  </View>
                </View>
              </View>

              {/* Age Range */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age range</Text>
                <View style={styles.ageSliderContainer}>
                  <View style={styles.ageRow}>
                    <Text style={styles.ageLabel}>Min age</Text>
                    <Slider
                      style={styles.ageSlider}
                      minimumValue={18}
                      maximumValue={60}
                      step={1}
                      value={formData.ageMin}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        ageMin: Math.round(value),
                        ageMax: Math.max(prev.ageMax, Math.round(value))
                      }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={styles.ageValue}>{formData.ageMin}</Text>
                  </View>
                  <View style={styles.ageRow}>
                    <Text style={styles.ageLabel}>Max age</Text>
                    <Slider
                      style={styles.ageSlider}
                      minimumValue={formData.ageMin}
                      maximumValue={99}
                      step={1}
                      value={formData.ageMax}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ageMax: Math.round(value) }))}
                      minimumTrackTintColor={BLUE}
                      maximumTrackTintColor="rgba(27,68,205,0.2)"
                      thumbTintColor={BLUE}
                    />
                    <Text style={styles.ageValue}>{formData.ageMax}</Text>
                  </View>
                </View>
                <Text style={styles.helperText}>Everyone must be at least 18</Text>
              </View>

              {/* Gender Filter */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Who can join?</Text>
                <View style={styles.genderContainer}>
                  <GenderPill
                    label="Everyone"
                    selected={formData.genderAllowed === "Everyone"}
                    onPress={() => setFormData(prev => ({ ...prev, genderAllowed: "Everyone" }))}
                  />
                  <GenderPill
                    label="Man"
                    selected={formData.genderAllowed === "Man"}
                    onPress={() => setFormData(prev => ({ ...prev, genderAllowed: "Man" }))}
                  />
                  <GenderPill
                    label="Woman"
                    selected={formData.genderAllowed === "Woman"}
                    onPress={() => setFormData(prev => ({ ...prev, genderAllowed: "Woman" }))}
                  />
                  <GenderPill
                    label="Beyond Binary"
                    selected={formData.genderAllowed === "Beyond Binary"}
                    onPress={() => setFormData(prev => ({ ...prev, genderAllowed: "Beyond Binary" }))}
                  />
                </View>
              </View>

              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <LinearGradient colors={["#F0F5FF", "#E8F0FF"]} style={StyleSheet.absoluteFillObject} />
                <Text style={styles.summaryTitle}>Event Summary</Text>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryRow}>
                    <Ionicons name="pricetag-outline" size={16} color={BLUE} />
                    <Text style={styles.summaryText}>
                      {formData.eventName || "Untitled"} · {formData.category ? categoryDisplayNames[formData.category].label : "No category"}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Ionicons name="time-outline" size={16} color={BLUE} />
                    <Text style={styles.summaryText}>
                      {formatDateTime(formData.timeStart)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Ionicons name="location-outline" size={16} color={BLUE} />
                    <Text style={styles.summaryText}>
                      {formData.locationName || "Location not set"} · {formData.capacity} spots · {formData.ageMin}–{formData.ageMax} y/o
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(80),
    paddingBottom: verticalScale(30),
  },

  // Header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(6),
  },
  progressContainer: {
    flexDirection: "row",
    gap: scale(6),
  },
  progressSegment: {
    width: scale(40),
    height: verticalScale(3),
    borderRadius: scale(1.5),
  },

  backButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: {
    width: scale(16),
    height: scale(16),
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scaleX: -1 }],
  },
  chevronLine: {
    position: "absolute",
    width: scale(12),
    height: Math.max(2, Math.round(scale(2))),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(1),
    left: scale(2),
  },
  chevronLineTop: {
    top: scale(3),
    transform: [{ rotate: "45deg" }],
  },
  chevronLineBottom: {
    bottom: scale(4),
    transform: [{ rotate: "-45deg" }],
  },

  nextButton: {
    borderRadius: scale(20),
    overflow: "hidden",
  },
  nextGradient: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(8),
  },
  nextText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  nextTextDisabled: {
    color: "rgba(10,14,26,0.3)",
  },

  saveButton: {
    borderRadius: scale(20),
    overflow: "hidden",
  },
  saveGradient: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    minWidth: scale(70),
    alignItems: "center",
  },
  saveText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },

  // Sections
  section: {
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(28),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(12),
  },

  // Input fields
  inputContainer: {
    position: "relative",
  },
  textInput: {
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  charCounter: {
    position: "absolute",
    right: scale(16),
    top: "50%",
    marginTop: -verticalScale(10),
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },

  // Text area
  textAreaContainer: {
    position: "relative",
  },
  textArea: {
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(32),
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: verticalScale(140),
    maxHeight: verticalScale(200),
  },
  wordCounter: {
    position: "absolute",
    right: scale(16),
    bottom: verticalScale(12),
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },
  wordCounterError: {
    color: ERROR_RED,
    fontFamily: Fonts.bold,
  },
  errorText: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: ERROR_RED,
    marginTop: verticalScale(6),
  },
  helperText: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(6),
  },

  // Categories
  categoryScroll: {
    marginHorizontal: -scale(20),
  },
  categoryScrollContent: {
    paddingHorizontal: scale(20),
    gap: scale(10),
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.2)",
    backgroundColor: CARD_BG,
    marginRight: scale(10),
    gap: scale(6),
    overflow: "hidden",
  },
  categoryChipSelected: {
    borderColor: BLUE,
  },
  categoryChipText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },

  // Date time
  dateTimeContainer: {
    gap: verticalScale(12),
  },
  dateTimeCardWrapper: {
    flex: 1,
  },
  dateTimeCard: {
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  dateTimeLabel: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(6),
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTimeIcon: {
    marginRight: scale(8),
  },
  dateTimeValue: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: INK,
  },

  // Map
  mapCard: {
    height: verticalScale(220),
    borderRadius: scale(16),
    overflow: "hidden",
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: BORDER,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  markerShadow: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: verticalScale(2),
  },
  useLocationButton: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  useLocationGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
  },
  useLocationText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  
  // Reverse geocoding indicator
  reverseGeocodingIndicator: {
    position: "absolute",
    bottom: scale(12),
    left: scale(12),
    right: scale(12),
  },
  reverseGeocodingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reverseGeocodingText: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: BLUE,
  },

  // Capacity slider
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
  },
  slider: {
    flex: 1,
    height: verticalScale(30),
  },
  sliderBadge: {
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
    marginLeft: scale(12),
  },
  sliderBadgeText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },

  // Age range
  ageSliderContainer: {
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
  },
  ageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  ageLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    width: scale(70),
  },
  ageSlider: {
    flex: 1,
    height: verticalScale(30),
  },
  ageValue: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    width: scale(30),
    textAlign: "right",
  },
  
  // Search indicator
  searchIndicator: {
    position: "absolute",
    right: scale(16),
    top: "50%",
    marginTop: -verticalScale(10),
  },
  
  // Google Places dropdown
  placesDropdown: {
    backgroundColor: CARD_BG,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: verticalScale(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  placeItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  placeItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  placeIcon: {
    marginRight: scale(12),
  },
  placeTextContainer: {
    flex: 1,
  },
  placeMainText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(2),
  },
  placeSecondaryText: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
  },

  // Gender pills
  genderContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
  },
  genderPillWrapper: {
    flex: 1,
    minWidth: scale(100),
  },
  genderPill: {
    paddingVertical: verticalScale(14),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.2)",
    backgroundColor: CARD_BG,
    alignItems: "center",
    overflow: "hidden",
  },
  genderPillSelected: {
    borderColor: BLUE,
  },
  genderPillText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  genderPillTextSelected: {
    color: "#FFFFFF",
  },

  // Summary card
  summaryCard: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
    borderRadius: scale(16),
    padding: scale(20),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.1)",
  },
  summaryTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: BLUE,
    marginBottom: verticalScale(16),
  },
  summaryContent: {
    gap: verticalScale(12),
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
  },
  summaryText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: INK,
    flex: 1,
    lineHeight: verticalScale(20),
  },
});