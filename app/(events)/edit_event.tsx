// app/(tabs)/edit_event/index.tsx
import { reverseGeocode, searchPlaces } from "@/config/mapbox";
import { Fonts } from "@/constants/theme";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/lib/supabase";
import { verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BG = "#FAFBFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";
const ERROR_RED = "#D5222B";
const SUCCESS_GREEN = "#10B981";
const GRADIENTS = { 
  primary: [BLUE, "#2E54E8"] as const, 
  success: [SUCCESS_GREEN, "#059669"] as const 
};

type EventCategory = "food_drinks" | "nightlife_party" | "outdoors_nature" | "sports_fitness" | "games_hobbies" | "arts_culture_entertainment" | "learning_career" | "community_volunteering" | "romantic_dating" | "travel_adventure" | "online_virtual" | "other";
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
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
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

export default function EditEventScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<EventFormData>({
    eventName: "", category: null, description: "", timeStart: new Date(), timeEnd: new Date(),
    location: { latitude: 41.455, longitude: 12.625 }, locationName: "", capacity: 10,
    genderAllowed: "Everyone", ageMin: 18, ageMax: 99,
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [mapRegion, setMapRegion] = useState({ latitude: 41.455, longitude: 12.625, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [isManuallyTyping, setIsManuallyTyping] = useState(false);
  const [isUpdatingFromMap, setIsUpdatingFromMap] = useState(false);
  const mapRef = useRef<MapView>(null);

  const performPlaceSearch = async (text: string) => {
    if (text.length > 2) {
      setSearchingPlaces(true);
      try {
        const results = await searchPlaces(text, formData.location ? { lat: formData.location.latitude, lng: formData.location.longitude } : undefined);
        setPlaceResults(results);
      } catch (error) {
        console.log("Places search error:", error);
      } finally {
        setSearchingPlaces(false);
      }
    } else {
      setPlaceResults([]);
    }
  };

  const performReverseGeocode = async (latitude: number, longitude: number) => {
    if (isManuallyTyping) return;
    setIsUpdatingFromMap(true);
    try {
      const address = await reverseGeocode(latitude, longitude);
      if (address) setFormData(prev => ({ ...prev, locationName: address.split(',')[0].trim() }));
    } catch (error) {
      console.log("Reverse geocode error:", error);
    } finally {
      setIsUpdatingFromMap(false);
    }
  };

  const debouncedSearch = useDebounce(performPlaceSearch, 500);
  const debouncedReverseGeocode = useDebounce(performReverseGeocode, 800);

  useEffect(() => {
    setWordCount(countWords(formData.description));
  }, [formData.description]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        Alert.alert("Error", "No event ID provided");
        router.back();
        return;
      }
      try {
        setInitialLoading(true);
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (error || !data) {
          console.error("Error fetching event:", error);
          Alert.alert("Error", "Could not load event data");
          router.back();
          return;
        }

        console.log("📝 Loaded event for editing:", data);

        const eventData: EventFormData = {
          eventName: data.event_name || "",
          category: (data.category as EventCategory) || null,
          description: data.event_description || "",
          timeStart: new Date(data.time_start),
          timeEnd: new Date(data.time_end),
          location: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : { latitude: 41.455, longitude: 12.625 },
          locationName: data.location_name || "",
          capacity: data.capacity || 10,
          genderAllowed: (data.gender_allowed === "Man" || data.gender_allowed === "Woman" || data.gender_allowed === "Beyond Binary") ? data.gender_allowed : "Everyone",
          ageMin: data.age_min || 18,
          ageMax: data.age_max || 99,
        };
        setFormData(eventData);
        setWordCount(countWords(data.event_description || ""));
        if (data.latitude && data.longitude) {
          setMapRegion({ latitude: data.latitude, longitude: data.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        }
      } catch (error) {
        console.error("Exception loading event:", error);
        Alert.alert("Error", "An unexpected error occurred");
        router.back();
      } finally {
        setInitialLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  const isValid = () => {
    return formData.eventName.trim().length > 0 && formData.category !== null && wordCount >= 10 && wordCount <= 500 &&
      formData.timeEnd > formData.timeStart && formData.location !== null && formData.locationName.trim().length > 0 &&
      formData.capacity > 0 && formData.ageMax >= formData.ageMin;
  };

  const handleUpdate = async () => {
    if (!isValid()) return;
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        setLoading(false);
        return;
      }
      const genderForDb = formData.genderAllowed !== "Everyone" ? formData.genderAllowed : "Man";
      const { data, error } = await supabase.from('events').update({
        event_name: formData.eventName, category: formData.category, event_description: formData.description,
        latitude: formData.location!.latitude, longitude: formData.location!.longitude, location_name: formData.locationName,
        time_start: formData.timeStart.toISOString(), time_end: formData.timeEnd.toISOString(), capacity: formData.capacity,
        gender_allowed: genderForDb, age_min: formData.ageMin, age_max: formData.ageMax, updated_at: new Date().toISOString(),
      }).eq('id', eventId).eq('host_id', userId).select();
      if (error) {
        Alert.alert("Error", error.message || "Failed to update event");
      } else if (!data || data.length === 0) {
        Alert.alert("Error", "You don't have permission to edit this event");
      } else {
        Alert.alert("Success!", "Your event has been updated.", [{ text: "OK", onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <BlurView intensity={98} tint="light" style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
          <TouchableOpacity onPress={handleUpdate} style={styles.applyButton} disabled={loading || !isValid()} activeOpacity={0.8}>
            <LinearGradient colors={GRADIENTS.success} style={styles.applyGradient}>
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="checkmark" size={24} color="#FFF" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: verticalScale(80), paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          
          {/* Event Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Event name</Text>
            <TextInput style={styles.input} value={formData.eventName} onChangeText={(text) => setFormData(prev => ({ ...prev, eventName: text.slice(0, 120) }))} placeholder="Keep it short & clear" placeholderTextColor="rgba(10,14,26,0.3)" maxLength={120} />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {Object.entries(categoryDisplayNames).map(([cat, { label, icon }]) => (
                <TouchableOpacity key={cat} onPress={() => setFormData(prev => ({ ...prev, category: cat as EventCategory }))} style={[styles.chip, formData.category === cat && styles.chipActive]}>
                  {formData.category === cat && <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFillObject} />}
                  <MaterialCommunityIcons name={icon as any} size={18} color={formData.category === cat ? "#FFF" : BLUE} />
                  <Text style={[styles.chipText, formData.category === cat && { color: "#FFF" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.textArea} value={formData.description} onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))} placeholder="What's happening?" placeholderTextColor="rgba(10,14,26,0.3)" multiline textAlignVertical="top" />
            <Text style={[styles.counter, (wordCount < 10 || wordCount > 500) && { color: ERROR_RED }]}>{wordCount} / 500 words</Text>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Date & time</Text>
            <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateCard}>
              <Text style={styles.dateLabel}>Start</Text>
              <Text style={styles.dateValue}>{formatDateTime(formData.timeStart)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateCard}>
              <Text style={styles.dateLabel}>End</Text>
              <Text style={styles.dateValue}>{formatDateTime(formData.timeEnd)}</Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker 
              value={formData.timeStart} 
              mode="datetime" 
              display={Platform.OS === "ios" ? "spinner" : "default"} 
              onChange={(event, date) => { 
                if (Platform.OS === "android") {
                  setShowStartPicker(false);
                }
                if (date && event.type !== 'dismissed') {
                  setFormData(prev => ({ ...prev, timeStart: date }));
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
                if (Platform.OS === "android") {
                  setShowEndPicker(false);
                }
                if (date && event.type !== 'dismissed') {
                  setFormData(prev => ({ ...prev, timeEnd: date }));
                }
              }} 
              minimumDate={formData.timeStart} 
            />
          )}

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.mapCard}>
              <MapView 
                ref={mapRef} 
                style={{ flex: 1 }} 
                provider={PROVIDER_GOOGLE} 
                initialRegion={mapRegion}
                onRegionChangeComplete={(region) => { 
                  setMapRegion(region); 
                  setFormData(prev => ({ 
                    ...prev, 
                    location: { 
                      latitude: region.latitude, 
                      longitude: region.longitude 
                    } 
                  })); 
                  debouncedReverseGeocode(region.latitude, region.longitude); 
                }}
              >
                {formData.location && (
                  <Marker coordinate={formData.location}>
                    <View style={styles.marker}>
                      <Ionicons name="location" size={24} color={BLUE} />
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
            <TextInput style={styles.input} value={formData.locationName} onFocus={() => setIsManuallyTyping(true)} onBlur={() => setTimeout(() => setIsManuallyTyping(false), 200)} onChangeText={(text) => { setFormData(prev => ({ ...prev, locationName: text })); if (!isUpdatingFromMap) debouncedSearch(text); }} placeholder="Search for a place" placeholderTextColor="rgba(10,14,26,0.3)" />
            {searchingPlaces && <ActivityIndicator style={{ position: "absolute", right: 16, top: 44 }} size="small" color={BLUE} />}
            {placeResults.length > 0 && (
              <View style={styles.dropdown}>
                {placeResults.slice(0, 5).map((place) => (
                  <TouchableOpacity key={place.id} style={styles.dropdownItem} onPress={() => { setIsManuallyTyping(false); setFormData(prev => ({ ...prev, locationName: place.text || place.place_name.split(',')[0] })); setPlaceResults([]); if (place.center) { const newLocation = { latitude: place.center[1], longitude: place.center[0] }; setFormData(prev => ({ ...prev, location: newLocation })); setMapRegion({ ...newLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }); mapRef.current?.animateToRegion({ ...newLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500); } }}>
                    <Text style={styles.dropdownText}>{place.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Capacity */}
          <View style={styles.section}>
            <Text style={styles.label}>Spots available: {formData.capacity}</Text>
            <Slider style={{ height: 40 }} minimumValue={2} maximumValue={50} step={1} value={formData.capacity} onValueChange={(value) => setFormData(prev => ({ ...prev, capacity: Math.round(value) }))} minimumTrackTintColor={BLUE} maximumTrackTintColor="rgba(27,68,205,0.2)" thumbTintColor={BLUE} />
          </View>

          {/* Age Range */}
          <View style={styles.section}>
            <Text style={styles.label}>Age: {formData.ageMin}–{formData.ageMax}</Text>
            <Slider style={{ height: 40 }} minimumValue={18} maximumValue={60} step={1} value={formData.ageMin} onValueChange={(value) => setFormData(prev => ({ ...prev, ageMin: Math.round(value), ageMax: Math.max(prev.ageMax, Math.round(value)) }))} minimumTrackTintColor={BLUE} maximumTrackTintColor="rgba(27,68,205,0.2)" thumbTintColor={BLUE} />
            <Slider style={{ height: 40 }} minimumValue={formData.ageMin} maximumValue={99} step={1} value={formData.ageMax} onValueChange={(value) => setFormData(prev => ({ ...prev, ageMax: Math.round(value) }))} minimumTrackTintColor={BLUE} maximumTrackTintColor="rgba(27,68,205,0.2)" thumbTintColor={BLUE} />
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.label}>Who can join?</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {["Everyone", "Man", "Woman", "Beyond Binary"].map((gender) => (
                <TouchableOpacity key={gender} onPress={() => setFormData(prev => ({ ...prev, genderAllowed: gender as GenderFilter }))} style={[styles.pill, formData.genderAllowed === gender && styles.pillActive]}>
                  {formData.genderAllowed === gender && <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFillObject} />}
                  <Text style={[styles.pillText, formData.genderAllowed === gender && { color: "#FFF" }]}>{gender}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 56 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: Fonts.bold, color: INK },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  applyButton: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  applyGradient: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  label: { fontSize: 16, fontFamily: Fonts.bold, color: INK, marginBottom: 12 },
  input: { backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: Fonts.primary, color: INK, borderWidth: 1, borderColor: BORDER },
  textArea: { backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: Fonts.primary, color: INK, borderWidth: 1, borderColor: BORDER, minHeight: 120, textAlignVertical: "top" },
  counter: { fontSize: 12, fontFamily: Fonts.primary, color: "rgba(10,14,26,0.4)", marginTop: 6 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(27,68,205,0.2)", backgroundColor: CARD_BG, gap: 6, overflow: "hidden" },
  chipActive: { borderColor: BLUE },
  chipText: { fontSize: 13, fontFamily: Fonts.bold, color: BLUE },
  dateCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  dateLabel: { fontSize: 12, fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)", marginBottom: 6 },
  dateValue: { fontSize: 15, fontFamily: Fonts.bold, color: INK },
  mapCard: { height: 180, borderRadius: 14, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  marker: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: BLUE },
  dropdown: { backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, marginTop: 8, overflow: "hidden" },
  dropdownItem: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  dropdownText: { fontSize: 15, fontFamily: Fonts.bold, color: INK },
  pill: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(27,68,205,0.2)", backgroundColor: CARD_BG, overflow: "hidden" },
  pillActive: { borderColor: BLUE },
  pillText: { fontSize: 14, fontFamily: Fonts.bold, color: BLUE },
});