// app/(tabs_support)/event_application_user.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const BG = "#EEF7FF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const BLUES = { b60: "#2D58D6", b80: "#4E7DE9", b90: "#6B95F0" };

type EventCategory = "food_drinks" | "nightlife_party" | "outdoors_nature" | "sports_fitness" | "games_hobbies" | "arts_culture_entertainment" | "learning_career" | "community_volunteering" | "romantic_dating" | "travel_adventure" | "online_virtual" | "other";
type EventType = 'public' | 'public_application' | 'private' | 'invite_only' | 'group_event' | 'community_event';

interface EventData {
  id: string;
  event_name: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  event_description?: string;
  host_id: string;
  age_min: number;
  age_max: number;
  gender_allowed: string;
  event_type?: EventType;
  accepted_count?: number;
}

interface HostInfo {
  id: string;
  full_name: string;
  age: number | null;
  photo_url: string | null;
}

const eventTypeDisplay: Record<EventType, { label: string; icon: string; color: string }> = {
  public: { label: "Public", icon: "earth", color: "#22C55E" },
  public_application: { label: "Apply to Join", icon: "clipboard-check-outline", color: "#3B82F6" },
  private: { label: "Private", icon: "lock-outline", color: "#8B5CF6" },
  invite_only: { label: "Invite Only", icon: "email-outline", color: "#F59E0B" },
  group_event: { label: "Group Event", icon: "account-group", color: "#EC4899" },
  community_event: { label: "Community", icon: "home-group", color: "#06B6D4" },
};

const categoryDisplay: Record<EventCategory, { label: string; icon: string }> = {
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

export default function EventApplicationUserScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = params.eventId;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [host, setHost] = useState<HostInfo | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const loadEventData = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }

    try {
      const { data: auth } = await supabase.auth.getUser();
      setCurrentUserId(auth?.user?.id ?? null);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, event_name, category, latitude, longitude, location_name, time_start, time_end, capacity, event_description, host_id, age_min, age_max, gender_allowed, event_type")
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        Alert.alert("Error", "Could not load event");
        router.back();
        return;
      }

      const { count } = await supabase
        .from("event_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "approved");

      setEvent({ ...eventData, accepted_count: count || 0 });

      if (auth?.user?.id) {
        const { data: existingApp } = await supabase
          .from("event_applications")
          .select("status")
          .eq("event_id", eventId)
          .eq("applicant_id", auth.user.id)
          .maybeSingle();
        if (existingApp) setExistingStatus(existingApp.status);
      }

      if (eventData.host_id) {
        const { data: hostData } = await supabase
          .from("profiles")
          .select("id, full_name, age")
          .eq("id", eventData.host_id)
          .single();

        const { data: photoData } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", eventData.host_id)
          .eq("is_main", true)
          .maybeSingle();

        let signedUrl: string | null = null;
        if (photoData?.photo_url) {
          const path = photoData.photo_url.startsWith("http") ? null : photoData.photo_url.replace(/^\/+/, "");
          if (path) {
            const { data } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
            signedUrl = data?.signedUrl || null;
          }
        }

        setHost({
          id: hostData?.id || eventData.host_id,
          full_name: hostData?.full_name || "Unknown",
          age: hostData?.age ?? null,
          photo_url: signedUrl,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadEventData(); }, [loadEventData]);

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} · ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!event || !currentUserId) return;
    if (existingStatus) {
      Alert.alert("Already Applied", `Status: ${existingStatus}`);
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const { data: result, error } = await supabase.rpc('apply_to_event', {
        p_event_id: event.id,
        p_message: applicationMessage.trim() || null,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      if (result?.success) {
        if (result.status === 'approved') {
          Alert.alert("You're In! 🎉", "You've joined the event!", [{ text: "Great!", onPress: () => router.back() }]);
        } else {
          Alert.alert("Application Sent! ✓", "You'll be notified when the host responds.", [{ text: "OK", onPress: () => router.back() }]);
        }
      } else {
        Alert.alert("Cannot Apply", result?.error || "Failed");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHostProfile = () => {
    if (host?.id) {
      router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: host.id } });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={scale(48)} color="#FF4444" />
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = eventTypeDisplay[event.event_type || 'public'];
  const catInfo = categoryDisplay[event.category] || categoryDisplay.other;
  const isPrivate = event.event_type === 'private';
  const spotsLeft = event.capacity - (event.accepted_count || 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={scale(24)} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply to Event</Text>
          <View style={styles.headerBackBtn} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Event Card */}
          <View style={styles.eventCard}>
            <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
              <MaterialCommunityIcons name={typeInfo.icon as any} size={scale(14)} color="#FFF" />
              <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
            </View>

            <Text style={styles.eventName}>{event.event_name}</Text>

            <View style={styles.categoryRow}>
              <MaterialCommunityIcons name={catInfo.icon as any} size={scale(16)} color={BLUE} />
              <Text style={styles.categoryText}>{catInfo.label}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Ionicons name="calendar-outline" size={scale(18)} color={BLUE} /></View>
              <Text style={styles.infoText}>{formatDateTime(event.time_start)}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Ionicons name="location-outline" size={scale(18)} color={BLUE} /></View>
              <Text style={styles.infoText}>{isPrivate ? `Near ${event.location_name.split(',')[0]}` : event.location_name}</Text>
              {isPrivate && (
                <View style={styles.privateBadge}>
                  <Ionicons name="eye-off-outline" size={scale(12)} color="#8B5CF6" />
                  <Text style={styles.privateText}>Revealed after approval</Text>
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Ionicons name="people-outline" size={scale(18)} color={BLUE} /></View>
              <Text style={styles.infoText}>{event.accepted_count || 0}/{event.capacity} attending{spotsLeft > 0 && <Text style={styles.spotsText}> · {spotsLeft} spots left</Text>}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Ionicons name="person-outline" size={scale(18)} color={BLUE} /></View>
              <Text style={styles.infoText}>{event.age_min}–{event.age_max} y/o</Text>
            </View>

            {event.event_description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>About</Text>
                <Text style={styles.descriptionText}>{event.event_description}</Text>
              </View>
            )}
          </View>

          {/* Host Card - Simple: photo, name, age only */}
          {host && (
            <TouchableOpacity style={styles.hostCard} onPress={handleViewHostProfile} activeOpacity={0.7}>
              <View style={styles.hostPhotoWrap}>
                {host.photo_url ? (
                  <Image source={{ uri: host.photo_url }} style={styles.hostPhoto} />
                ) : (
                  <View style={styles.hostPhotoPlaceholder}>
                    <Ionicons name="person" size={scale(22)} color={BLUES.b90} />
                  </View>
                )}
              </View>
              <View style={styles.hostInfo}>
                <Text style={styles.hostLabel}>Hosted by</Text>
                <Text style={styles.hostName}>{host.full_name}{host.age ? `, ${host.age}` : ''}</Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(20)} color={BLUES.b90} />
            </TouchableOpacity>
          )}

          {/* Application Section */}
          {existingStatus ? (
            <View style={styles.existingStatusCard}>
              <View style={[styles.statusBadge, existingStatus === 'approved' ? styles.statusApproved : existingStatus === 'rejected' ? styles.statusRejected : styles.statusPending]}>
                <Ionicons name={existingStatus === 'approved' ? 'checkmark-circle' : existingStatus === 'rejected' ? 'close-circle' : 'time'} size={scale(20)} color="#FFF" />
                <Text style={styles.statusText}>{existingStatus === 'approved' ? 'Approved' : existingStatus === 'rejected' ? 'Rejected' : 'Pending'}</Text>
              </View>
              <Text style={styles.statusDescription}>
                {existingStatus === 'approved' ? "You're going!" : existingStatus === 'rejected' ? "Not accepted." : "Waiting for host."}
              </Text>
            </View>
          ) : (
            <View style={styles.applicationSection}>
              <Text style={styles.applicationTitle}>Why do you want to join?</Text>
              <Text style={styles.applicationSubtitle}>Introduce yourself to the host.</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Hi! I'd love to join because..."
                  placeholderTextColor="rgba(10, 14, 26, 0.4)"
                  multiline
                  maxLength={500}
                  value={applicationMessage}
                  onChangeText={setApplicationMessage}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{applicationMessage.length}/500</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {!existingStatus && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, verticalScale(16)) }]}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
              <LinearGradient colors={[BLUES.b60, BLUES.b80]} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {submitting ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="paper-plane" size={scale(20)} color="#FFF" style={{ marginRight: scale(8) }} />
                    <Text style={styles.submitText}>Send Application</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: scale(24), gap: verticalScale(12) },
  errorText: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK },
  backButton: { paddingHorizontal: scale(24), paddingVertical: verticalScale(12), backgroundColor: BLUE, borderRadius: scale(12), marginTop: verticalScale(12) },
  backButtonText: { fontFamily: Fonts.bold, fontSize: scale(14), color: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "rgba(27,68,205,0.1)" },
  headerBackBtn: { width: scale(40), height: scale(40), alignItems: "center", justifyContent: "center", borderRadius: scale(20), backgroundColor: "rgba(27,68,205,0.06)" },
  headerTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(16), paddingTop: verticalScale(16), paddingBottom: verticalScale(100) },
  eventCard: { backgroundColor: "#FFF", borderRadius: scale(20), padding: scale(18), marginBottom: verticalScale(16), elevation: 4, borderWidth: 1, borderColor: "rgba(27,68,205,0.08)" },
  typeBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: scale(10), paddingVertical: verticalScale(5), borderRadius: scale(12), gap: scale(4), marginBottom: verticalScale(12) },
  typeBadgeText: { fontFamily: Fonts.bold, fontSize: scale(12), color: "#FFF" },
  eventName: { fontFamily: Fonts.bold, fontSize: scale(22), color: INK, marginBottom: verticalScale(8) },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: scale(6), marginBottom: verticalScale(16) },
  categoryText: { fontFamily: Fonts.primary, fontSize: scale(14), color: BLUE, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(12), flexWrap: "wrap" },
  infoIconWrap: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center", marginRight: scale(10) },
  infoText: { fontFamily: Fonts.primary, fontSize: scale(14), color: INK, flex: 1 },
  spotsText: { color: "#22C55E", fontWeight: "600" },
  privateBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(139,92,246,0.1)", paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: scale(8), gap: scale(4), marginLeft: scale(8), marginTop: verticalScale(4) },
  privateText: { fontFamily: Fonts.primary, fontSize: scale(11), color: "#8B5CF6" },
  descriptionSection: { marginTop: verticalScale(12), paddingTop: verticalScale(16), borderTopWidth: 1, borderTopColor: "rgba(27,68,205,0.1)" },
  descriptionLabel: { fontFamily: Fonts.bold, fontSize: scale(14), color: INK, marginBottom: verticalScale(8) },
  descriptionText: { fontFamily: Fonts.primary, fontSize: scale(14), color: INK, opacity: 0.8, lineHeight: scale(22) },
  hostCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: scale(16), padding: scale(14), marginBottom: verticalScale(16), elevation: 3, borderWidth: 1, borderColor: "rgba(27,68,205,0.08)" },
  hostPhotoWrap: { width: scale(48), height: scale(48), borderRadius: scale(24), overflow: "hidden", borderWidth: 2, borderColor: "rgba(27,68,205,0.15)" },
  hostPhoto: { width: "100%", height: "100%" },
  hostPhotoPlaceholder: { width: "100%", height: "100%", backgroundColor: "rgba(27,68,205,0.1)", alignItems: "center", justifyContent: "center" },
  hostInfo: { flex: 1, marginLeft: scale(12) },
  hostLabel: { fontFamily: Fonts.primary, fontSize: scale(12), color: INK, opacity: 0.6 },
  hostName: { fontFamily: Fonts.bold, fontSize: scale(15), color: INK },
  existingStatusCard: { backgroundColor: "#FFF", borderRadius: scale(20), padding: scale(18), alignItems: "center", elevation: 4, borderWidth: 1, borderColor: "rgba(27,68,205,0.08)" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(14), gap: scale(8), marginBottom: verticalScale(12) },
  statusApproved: { backgroundColor: "#22C55E" },
  statusRejected: { backgroundColor: "#EF4444" },
  statusPending: { backgroundColor: "#F59E0B" },
  statusText: { fontFamily: Fonts.bold, fontSize: scale(15), color: "#FFF" },
  statusDescription: { fontFamily: Fonts.primary, fontSize: scale(14), color: INK, opacity: 0.7, textAlign: "center" },
  applicationSection: { backgroundColor: "#FFF", borderRadius: scale(20), padding: scale(18), elevation: 4, borderWidth: 1, borderColor: "rgba(27,68,205,0.08)" },
  applicationTitle: { fontFamily: Fonts.bold, fontSize: scale(18), color: INK, marginBottom: verticalScale(6) },
  applicationSubtitle: { fontFamily: Fonts.primary, fontSize: scale(14), color: INK, opacity: 0.7, marginBottom: verticalScale(16) },
  inputContainer: { backgroundColor: "rgba(27,68,205,0.04)", borderRadius: scale(16), borderWidth: 1.5, borderColor: "rgba(27,68,205,0.12)" },
  textInput: { fontFamily: Fonts.primary, fontSize: scale(15), color: INK, padding: scale(16), minHeight: verticalScale(120), maxHeight: verticalScale(200) },
  charCount: { fontFamily: Fonts.primary, fontSize: scale(12), color: INK, opacity: 0.5, textAlign: "right", paddingRight: scale(16), paddingBottom: scale(12) },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: scale(16), paddingTop: verticalScale(12), backgroundColor: "rgba(255,255,255,0.95)", borderTopWidth: 1, borderTopColor: "rgba(27,68,205,0.1)" },
  submitButton: { borderRadius: scale(16), overflow: "hidden", elevation: 6 },
  submitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(16), paddingHorizontal: scale(24) },
  submitText: { fontFamily: Fonts.bold, fontSize: scale(16), color: "#FFF" },
});