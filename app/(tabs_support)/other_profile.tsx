// app/(tabs_support)/other_profile.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import ActiveFramesModal from "../(frames)/active_frames";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

const AVATAR_SIZE = scale(120);

// Types
interface PromptAnswer {
  slot?: number;
  question?: string;
  title?: string;
  answer: string;
}

// ✅ Interface for profile data to fix TypeScript errors
interface ProfileData {
  full_name?: string | null;
  age?: number | null;
  bio?: string | null;
  gender_subtype?: string | null;
  height_cm?: number | null;
  education?: string | null;
  sexual_orientation?: string | null;
  institution?: string | null;
  prompt_answers?: any[] | null;
  lat?: number | null;
  lng?: number | null;
}

// Utils
const toTitleCase = (str: string | null | undefined): string =>
  str?.toLowerCase().split(" ").map(w => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(" ") || "";

const humanize = (s: string | null | undefined): string =>
  toTitleCase((s ?? "").replace(/_/g, " "));

const formatLifestyleValue = (key: string, value: string | null | undefined): string => {
  if (!value) return "";
  const v = humanize(value);
  const pure = (key || "").split(".").pop() || key;
  const trimKeys = ["drinking","smoking","zodiac","religion","workout","communication","love_language","pets","kids","politics"];
  if (trimKeys.includes(pure)) {
    const i = v.indexOf(" ");
    return i !== -1 ? v.substring(i + 1) : v;
  }
  return v;
};

const getNameFontSize = (len: number): number => {
  if (len <= 8) return scale(24);
  if (len <= 12) return scale(22);
  if (len <= 16) return scale(20);
  if (len <= 20) return scale(18);
  return scale(16);
};

const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/","/object/public/user_photos/","/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

// ✅ Distance calculation helper
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  }
  return `${distance.toFixed(1)}km away`;
};

// Combination display logic for FRIEND MODE "What I'm Looking For"
const getCombinedLookingFor = (options: string[]): string => {
  if (!options || options.length === 0) return "";
  if (options.length === 1) return options[0];

  const combinations: Record<string, string> = {
    "Activity/hobby partners|||Casual hangouts": "Hobby partners & casual hangouts",
    "Activity/hobby partners|||Close friendships": "Close friends for hobbies",
    "Activity/hobby partners|||New friends nearby": "New local hobby friends",
    "Activity/hobby partners|||Professional networking": "Networking through shared hobbies",
    "Activity/hobby partners|||Travel companions": "Travel & hobby buddies",
    "Activity/hobby partners|||Workout/fitness buddy": "Active hobby & workout buddies",
    "Casual hangouts|||Close friendships": "Close friends & casual hangouts",
    "Casual hangouts|||New friends nearby": "New friends for casual hangouts",
    "Casual hangouts|||Professional networking": "Networking & hangouts",
    "Casual hangouts|||Travel companions": "Travel & casual hangouts",
    "Casual hangouts|||Workout/fitness buddy": "Workout & casual hangouts",
    "Close friendships|||New friends nearby": "Close local friends",
    "Close friendships|||Professional networking": "Close friends & networking",
    "Close friendships|||Travel companions": "Close friends to travel with",
    "Close friendships|||Workout/fitness buddy": "Close friends & workout buddies",
    "New friends nearby|||Professional networking": "Local friends & networking",
    "New friends nearby|||Travel companions": "Local travel buddies",
    "New friends nearby|||Workout/fitness buddy": "Local workout friends",
    "Professional networking|||Travel companions": "Network & travel buddies",
    "Professional networking|||Workout/fitness buddy": "Workout & networking",
    "Travel companions|||Workout/fitness buddy": "Active travel & workout buddies",
  };

  const sorted = [...options].map((s) => s.trim()).sort();
  const key = sorted.join("|||");
  return combinations[key] || sorted.join(" · ");
};

// Lifestyle icon mapping
const getLifestyleIcon = (key: string) => {
  const iconMap: Record<string, { name: string; library: 'ionicons' | 'material' }> = {
    gender_subtype: { name: "male-female", library: "ionicons" },
    height: { name: "resize", library: "ionicons" },
    education: { name: "school-outline", library: "material" },
    drinking: { name: "glass-wine", library: "material" },
    smoking: { name: "smoking", library: "material" },
    zodiac: { name: "star-outline", library: "ionicons" },
    religion: { name: "hands-pray", library: "material" },
    politics: { name: "bank", library: "material" },
    sexual_orientation: { name: "heart-outline", library: "ionicons" },
    institution: { name: "school-outline", library: "ionicons" },
    workout: { name: "dumbbell", library: "material" },
    communication: { name: "chatbubbles-outline", library: "ionicons" },
    love_language: { name: "heart-outline", library: "ionicons" },
    pets: { name: "paw-outline", library: "ionicons" },
    kids: { name: "baby-face-outline", library: "material" },
  };
  return iconMap[key] || { name: "help-circle-outline", library: "ionicons" };
};

// Photo Frame Component
const PhotoFrame: React.FC<{ uri: string; onPress?: () => void }> = ({ uri, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.photoFrame}>
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.photoInner}>
        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
      </View>
    </Pressable>
  );
};

// Action Modal Component
const ActionModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  userName: string;
}> = ({ visible, onClose, onBlock, onReport, userName }) => {
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    RNAnimated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <RNAnimated.View 
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={95} tint="light" style={styles.sheetBlur}>
              <LinearGradient
                colors={["rgba(255,255,255,0.95)", "rgba(246,248,252,0.98)"]}
                style={styles.sheetGradient}
              >
                <View style={styles.sheetHandle} />
                
                <Text style={styles.sheetTitle}>Actions for {userName}</Text>
                
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onBlock}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "#FF4444" }]}>
                    <Ionicons name="ban" size={20} color="#FFFFFF" style={{ marginRight: scale(8) }} />
                    <Text style={styles.sheetButtonText}>Block User</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onReport}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "#FFE4E4" }]}>
                    <Ionicons name="flag" size={20} color="#FF4444" style={{ marginRight: scale(8) }} />
                    <Text style={[styles.sheetButtonTextDark, { color: "#FF4444" }]}>Report User</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "#EEF4FF" }]}>
                    <Text style={styles.sheetButtonTextDark}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};

// Main Component
export default function OtherProfileScreen() {
  const params = useLocalSearchParams<{ userId: string; matchId?: string }>();
  const targetUserId = params.userId;
  const matchId = params.matchId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // ✅ Distance state
  const [distance, setDistance] = useState<string | null>(null);

  // ✅ Friend request status
  const [matchStatus, setMatchStatus] = useState<{
    status: 'pending' | 'accepted' | 'denied' | null;
    isRequester: boolean;
    matchId: string | null;
  }>({ status: null, isRequester: false, matchId: null });
  const [sendingRequest, setSendingRequest] = useState(false);

  const [profile, setProfile] = useState<{
    fullName: string; age: number | null; bio: string | null; genderSubtype: string | null; heightCm: number | null;
    education: string | null; sexualOrientation: string | null; institution: string | null;
    promptAnswers?: PromptAnswer[] | null;
  }>({ fullName: "", age: null, bio: null, genderSubtype: null, heightCm: null, education: null, sexualOrientation: null, institution: null, promptAnswers: null });

  const [lifestyle, setLifestyle] = useState<{
    drinking: string | null; smoking: string | null; zodiac: string | null; religion: string | null; politics: string | null;
    workout: string | null; communication: string | null; love_language: string | null; pets: string | null; kids: string | null;
  }>({ drinking: null, smoking: null, zodiac: null, religion: null, politics: null, workout: null, communication: null, love_language: null, pets: null, kids: null });

  const [communities, setCommunities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ avatar: string | null; first: string | null; second: string | null; third: string | null; }>({ avatar: null, first: null, second: null, third: null });
  const [modes, setModes] = useState<{ looking: string[]; values: string[] }>({ looking: [], values: [] });
  const [hobbies, setHobbies] = useState<string[]>([]);

  // Frames
  const [activeFrames, setActiveFrames] = useState<any[]>([]);
  const [showFrameViewer, setShowFrameViewer] = useState(false);

  // Modal for full-screen photo
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModalUri, setSelectedModalUri] = useState<string | null>(null);

  // Prompts carousel
  const [promptWidth, setPromptWidth] = useState(SCREEN_WIDTH);
  const [promptIndex, setPromptIndex] = useState(0);

  // Fetch active frames for user
  const fetchActiveFrames = async (userId: string) => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("frames")
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .gte("expires_at", now)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching frames:", error);
        setActiveFrames([]);
        return;
      }

      if (data && data.length > 0) {
        const processedFrames = await Promise.all(
          data.map(async (frame) => {
            if (!frame.media_url) return frame;
            if (frame.media_url.startsWith('http')) return frame;
            
            const { data: signedUrlData, error: signError } = await supabase.storage
              .from("frames")
              .createSignedUrl(frame.media_url, 3600);
            
            if (signError) {
              console.error("Error creating signed URL for frame", frame.id, ":", signError);
              return frame;
            }
            
            return {
              ...frame,
              media_url: signedUrlData?.signedUrl || frame.media_url,
            };
          })
        );
        
        setActiveFrames(processedFrames);
      } else {
        setActiveFrames([]);
      }
    } catch (error) {
      console.error("Error fetching active frames:", error);
      setActiveFrames([]);
    }
  };

  // ✅ Check match status
  const checkMatchStatus = async (currentUid: string, targetUid: string) => {
    try {
      const { data } = await supabase
        .from('match_requests')
        .select('id, status, requester_id, target_id')
        .or(`and(requester_id.eq.${currentUid},target_id.eq.${targetUid}),and(requester_id.eq.${targetUid},target_id.eq.${currentUid})`)
        .neq('status', 'denied')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setMatchStatus({
          status: data.status,
          isRequester: data.requester_id === currentUid,
          matchId: data.id,
        });
        console.log("✅ Match status:", data.status, "isRequester:", data.requester_id === currentUid);
      } else {
        setMatchStatus({ status: null, isRequester: false, matchId: null });
      }
    } catch (error) {
      console.error("Error checking match status:", error);
    }
  };

  // ✅ Send friend request
  const handleSendFriendRequest = async () => {
    if (!currentUserId || !targetUserId || sendingRequest) return;

    setSendingRequest(true);
    try {
      const { error } = await supabase
        .from('match_requests')
        .insert({
          requester_id: currentUserId,
          target_id: targetUserId,
          match_mode: 'friend',
          connection_visibility: 'full_profile',
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert("Already Sent", "You've already sent a friend request to this person.");
        } else {
          throw error;
        }
      } else {
        Alert.alert("Success", "Friend request sent!");
        // Refresh match status
        await checkMatchStatus(currentUserId, targetUserId);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Load profile data
  const loadProfileData = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const currentUid = auth?.user?.id ?? null;
      setCurrentUserId(currentUid);

      // ✅ Get current user's location
      let currentUserLat: number | null = null;
      let currentUserLng: number | null = null;
      if (currentUid) {
        const { data: currentUserProfile } = await supabase
          .from("profiles")
          .select("lat, lng")
          .eq("id", currentUid)
          .single();
        if (currentUserProfile) {
          currentUserLat = currentUserProfile.lat;
          currentUserLng = currentUserProfile.lng;
        }
      }

      // ✅ STEP 1: Check match status FIRST (before fetching data)
      let isFriend = false;
      if (currentUid) {
        await checkMatchStatus(currentUid, targetUserId);
        // Check the match status we just set
        const { data: matchCheck } = await supabase
          .from('match_requests')
          .select('status')
          .or(`and(requester_id.eq.${currentUid},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${currentUid})`)
          .eq('status', 'accepted')
          .maybeSingle();
        
        isFriend = !!matchCheck;
        console.log(isFriend ? "✅ FRIEND - Full visibility enabled" : "⚠️ NON-FRIEND - Limited visibility");
      }

      // Fetch active frames
      await fetchActiveFrames(targetUserId);

      // ✅ STEP 2: Fetch data based on friend status
      let targetProfileData: ProfileData | null = null;
      let friendMode;

      if (isFriend) {
        // ✅ FULL VISIBILITY - Fetch everything directly when friends
        const { data: fullProfile } = await supabase
          .from("profiles")
          .select("full_name, age, bio, gender_subtype, height_cm, education, sexual_orientation, institution, prompt_answers, lat, lng")
          .eq("id", targetUserId)
          .single();
        
        targetProfileData = fullProfile;
        
        // Get full friend mode data directly
        const { data: fullFriendMode } = await supabase
          .from("user_modes")
          .select("looking_for_friend, value_friend")
          .eq("user_id", targetUserId)
          .eq("mode", "friend")
          .maybeSingle();
        
        friendMode = fullFriendMode || {};
      } else {
        // ✅ LIMITED VISIBILITY - Use RPC for non-friends
        const { data: rpcProfile } = await supabase.rpc('get_matched_user_profile', { 
          target_user_id: targetUserId 
        });
        targetProfileData = (Array.isArray(rpcProfile) ? rpcProfile[0] : rpcProfile) as ProfileData;

        const { data: rpcFriendMode } = await supabase.rpc('get_user_friend_mode', { 
          target_user_id: targetUserId 
        });
        friendMode = Array.isArray(rpcFriendMode) ? rpcFriendMode[0] : (rpcFriendMode || {});
      }

      const p: ProfileData = targetProfileData || {};
      console.log("✅ Friend mode data:", friendMode);

      // ✅ Calculate distance if both coordinates exist
      if (currentUserLat && currentUserLng && p.lat && p.lng) {
        const dist = calculateDistance(currentUserLat, currentUserLng, p.lat, p.lng);
        setDistance(dist);
        console.log("📍 Distance calculated:", dist);
      }

      // ✅ STEP 3: Fetch additional data with appropriate visibility
      let lifeRes, mainRes, othersRes, hobbiesRes;

      if (isFriend) {
        // ✅ FULL VISIBILITY - Fetch all data directly
        [lifeRes, mainRes, othersRes, hobbiesRes] = await Promise.all([
          supabase.from("lifestyle").select("drinking, smoking, zodiac, religion, politics, workout, communication, love_language, pets, kids, communities").eq("user_id", targetUserId).maybeSingle(),
          supabase.from("user_photos").select("photo_url").eq("user_id", targetUserId).eq("is_main", true).maybeSingle(),
          supabase.from("user_photos").select("photo_url, created_at, is_main").eq("user_id", targetUserId).neq("is_main", true).order("created_at", { ascending: true }),
          supabase.from("user_hobbies").select("hobbies_master(label)").eq("user_id", targetUserId),
        ]);
      } else {
        // ✅ LIMITED VISIBILITY - Use RPC or restricted queries
        // For non-friends, we might want to limit what's shown
        [lifeRes, mainRes, othersRes, hobbiesRes] = await Promise.all([
          supabase.from("lifestyle").select("drinking, smoking, zodiac").eq("user_id", targetUserId).maybeSingle(), // Limited fields
          supabase.from("user_photos").select("photo_url").eq("user_id", targetUserId).eq("is_main", true).maybeSingle(),
          Promise.resolve({ data: [] }), // No additional photos for non-friends
          supabase.from("user_hobbies").select("hobbies_master(label)").eq("user_id", targetUserId).limit(3), // Limited hobbies
        ]);
      }

      // Prompts
      const promptsRaw = Array.isArray(p?.prompt_answers) ? p.prompt_answers : null;
      const prompts: PromptAnswer[] | null = promptsRaw
        ? [...promptsRaw]
            .filter((x: any) => x && typeof x === "object")
            .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
            .slice(0, 3)
        : null;

      setProfile({
        fullName: p.full_name || "",
        age: p.age ?? null,
        bio: p.bio || null,
        genderSubtype: p.gender_subtype ?? null,
        heightCm: p.height_cm ?? null,
        education: p.education ?? null,
        sexualOrientation: p.sexual_orientation ?? null,
        institution: p.institution ?? null,
        promptAnswers: prompts,
      });

      // Lifestyle
      const l = (lifeRes as any).data || {};
      setLifestyle({
        drinking: l.drinking ?? null, smoking: l.smoking ?? null, zodiac: l.zodiac ?? null, religion: l.religion ?? null,
        politics: l.politics ?? null, workout: l.workout ?? null, communication: l.communication ?? null,
        love_language: l.love_language ?? null, pets: l.pets ?? null, kids: l.kids ?? null
      });

      // Communities
      const COMMUNITY_OPTIONS = [
        "🌿 Environmentalism", "✊ Social justice", "🏳️‍🌈 LGBTQIA+", "♀️ Feminism", "🧠 Mental health awareness",
        "✊🏾 Black community", "🧧 Asian community", "🪅 Latino/Hispanic community", "✡️ Jewish community",
        "☪️ Muslim community", "♿ Disability awareness", "💖 Body positivity", "🐾 Animal rights", "🌍 Climate action",
      ];
      const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, '').trim();
      const normalizeLabel = (s: string) => stripEmoji(s).toLowerCase().trim();
      const communityList = Array.isArray(l.communities) ? l.communities : [];
      const matchedCommunities: string[] = [];
      communityList.forEach((comm: string) => {
        const normalized = normalizeLabel(comm);
        COMMUNITY_OPTIONS.forEach(commWithEmoji => {
          if (normalizeLabel(commWithEmoji) === normalized) matchedCommunities.push(commWithEmoji);
        });
      });
      setCommunities(matchedCommunities);

      // Photos
      const avatarUrl = (mainRes as any)?.data?.photo_url || null;
      const others = (othersRes as any)?.data || [];
      const [first, second, third] = others;
      const [avatarSigned, firstSigned, secondSigned, thirdSigned] = await Promise.all([
        signPath(toStoragePath(avatarUrl)),
        signPath(toStoragePath(first?.photo_url ?? null)),
        signPath(toStoragePath(second?.photo_url ?? null)),
        signPath(toStoragePath(third?.photo_url ?? null)),
      ]);
      setPhotos({
        avatar: avatarSigned ?? avatarUrl,
        first: firstSigned ?? first?.photo_url ?? null,
        second: secondSigned ?? second?.photo_url ?? null,
        third: thirdSigned ?? third?.photo_url ?? null,
      });

      // ✅ Process friend mode data
      const LOOKING_FOR_FRIEND_DISPLAY: Record<string, string> = {
        new_friends_nearby: "New friends nearby",
        workout_fitness_buddy: "Workout/fitness buddy",
        travel_companions: "Travel companions",
        activity_hobby_partners: "Activity/hobby partners",
        casual_hangouts: "Casual hangouts",
        professional_networking: "Professional networking",
        close_friendships: "Close friendships",
      };

      const lookingForEnums: string[] = Array.isArray(friendMode.looking_for_friend)
        ? friendMode.looking_for_friend
        : [];

      const lookingForDisplay = lookingForEnums
        .map((e) => LOOKING_FOR_FRIEND_DISPLAY[e])
        .filter(Boolean);

      let combinedLooking = "";
      if (lookingForDisplay.length === 1) {
        combinedLooking = lookingForDisplay[0];
      } else if (lookingForDisplay.length === 2) {
        combinedLooking = getCombinedLookingFor(lookingForDisplay);
      } else if (lookingForDisplay.length > 2) {
        combinedLooking = getCombinedLookingFor(lookingForDisplay.slice(0, 2));
      }

      const parseListHelper = (raw: any): string[] => {
        const list = Array.isArray(raw)
          ? raw.map((s) => humanize(String(s)))
          : typeof raw === "string"
          ? raw.split(/[,/&]| and /i).map((s: string) => humanize(s.trim()))
          : [];
        return Array.from(new Set(list.filter(Boolean)));
      };

      setModes({
        looking: combinedLooking ? [combinedLooking] : [],
        values: parseListHelper(friendMode.value_friend),
      });

      console.log("✅ Set modes:", {
        looking: combinedLooking ? [combinedLooking] : [],
        values: parseListHelper(friendMode.value_friend),
      });

      // Hobbies
      const hs = (hobbiesRes as any)?.data || [];
      setHobbies(hs.map((x: any) => x?.hobbies_master?.label).filter(Boolean).map(humanize));

    } catch (e) {
      console.log("Error loading profile:", e);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Block user function
  const handleBlock = async () => {
    if (!currentUserId || !targetUserId) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${profile.fullName || "this user"}? This will remove your connection and they won't be able to contact you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBlocking(true);
            try {
              const { error: blockError } = await supabase
                .from("blocks")
                .insert({ blocker_id: currentUserId, blocked_id: targetUserId });

              if (blockError && blockError.code !== '23505') {
                throw blockError;
              }

              await supabase
                .from("match_requests")
                .delete()
                .or(`and(requester_id.eq.${currentUserId},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${currentUserId})`);

              const { data: memberData } = await supabase
                .from("conversation_members")
                .select("conversation_id")
                .eq("user_id", currentUserId);

              const { data: otherMemberData } = await supabase
                .from("conversation_members")
                .select("conversation_id")
                .eq("user_id", targetUserId);

              if (memberData && otherMemberData) {
                const myConvs = new Set(memberData.map(m => m.conversation_id));
                const sharedConvs = otherMemberData
                  .filter(m => myConvs.has(m.conversation_id))
                  .map(m => m.conversation_id);

                for (const convId of sharedConvs) {
                  await supabase.from("messages").delete().eq("conversation_id", convId);
                  await supabase.from("conversation_members").delete().eq("conversation_id", convId);
                  await supabase.from("conversations").delete().eq("id", convId);
                }
              }

              Alert.alert("Blocked", `${profile.fullName || "User"} has been blocked.`, [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Failed to block user. Please try again.");
            } finally {
              setBlocking(false);
              setShowActionModal(false);
            }
          }
        }
      ]
    );
  };

  const handleReport = () => {
    setShowActionModal(false);
    Alert.alert("Report", "Report functionality coming soon. For urgent matters, please contact support@niice.app");
  };

  const handleChat = () => {
    if (matchId) {
      router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId } });
    } else {
      findAndNavigateToChat();
    }
  };

  const findAndNavigateToChat = async () => {
    if (!currentUserId || !targetUserId) return;

    try {
      const { data: match } = await supabase
        .from("match_requests")
        .select("id")
        .or(`and(requester_id.eq.${currentUserId},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${currentUserId})`)
        .eq("status", "accepted")
        .single();

      if (match) {
        router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId: match.id } });
      } else {
        Alert.alert("No Chat", "You don't have an active chat with this user.");
      }
    } catch (error) {
      console.error("Error finding chat:", error);
    }
  };

  // Derived values
  const displayName = useMemo(() => toTitleCase(profile.fullName) || "User", [profile.fullName]);
  const nameSize = useMemo(() => getNameFontSize(displayName.length), [displayName]);

  // Lifestyle table logic - only show items that have values (no mandatory for other users)
  const horizontalItems = useMemo(() => ([
    { key: "gender_subtype", value: profile.genderSubtype },
    { key: "height", value: profile.heightCm ? `${profile.heightCm} cm` : null },
    { key: "education", value: profile.education },
    { key: "drinking", value: lifestyle.drinking },
    { key: "smoking", value: lifestyle.smoking },
    { key: "zodiac", value: lifestyle.zodiac },
    { key: "religion", value: lifestyle.religion },
    { key: "politics", value: lifestyle.politics },
  ].filter(i => i.value)), [profile, lifestyle]);

  const verticalItems = useMemo(() => ([
    { key: "sexual_orientation", value: profile.sexualOrientation },
    { key: "institution", value: profile.institution },
    { key: "workout", value: lifestyle.workout },
    { key: "communication", value: lifestyle.communication },
    { key: "love_language", value: lifestyle.love_language },
    { key: "pets", value: lifestyle.pets },
    { key: "kids", value: lifestyle.kids },
  ].filter(i => i.value)), [profile, lifestyle]);

  const prompts: PromptAnswer[] = useMemo(() => {
    const arr = profile.promptAnswers || [];
    return [...arr].filter(p => p && p.answer).slice(0, 3);
  }, [profile.promptAnswers]);

  const onPromptScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / w);
    setPromptIndex(Math.max(0, Math.min(i, Math.max(0, prompts.length - 1))));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.75}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={INK} />
        </TouchableOpacity>
        
        <View style={styles.topRight}>
          {matchStatus.status === 'accepted' && (
            <TouchableOpacity
              onPress={handleChat}
              activeOpacity={0.7}
              style={styles.chatButtonIcon}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowActionModal(true)}
            activeOpacity={0.7}
            style={styles.settingsBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={INK} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => activeFrames.length > 0 && setShowFrameViewer(true)}
            disabled={activeFrames.length === 0}
          >
            <View style={[
              styles.avatarRing,
              activeFrames.length > 0 && styles.avatarRingActive
            ]}>
              {activeFrames.length > 0 && (
                <LinearGradient
                  colors={[BLUE, "#678CFF", "#A8C4FF", BLUE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                />
              )}
              <View style={styles.avatarInner}>
                {photos.avatar ? (
                  <Image source={{ uri: photos.avatar }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>No photo</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { fontSize: nameSize }]} numberOfLines={1}>
                {displayName}
              </Text>
              {profile.age != null && (
                <Text style={[styles.ageText, { fontSize: nameSize }]}>, {profile.age}</Text>
              )}
            </View>

            {/* Friend Status or Add Friend Button */}
            {matchStatus.status === 'accepted' ? (
              <View style={styles.friendBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginRight: scale(6) }} />
                <Text style={styles.friendBadgeText}>Friend</Text>
              </View>
            ) : matchStatus.status === 'pending' ? (
              matchStatus.isRequester ? (
                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" style={{ marginRight: scale(6) }} />
                  <Text style={styles.pendingBadgeText}>Request Sent</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  onPress={async () => {
                    if (!matchStatus.matchId) return;
                    try {
                      await supabase.from('match_requests').update({ status: 'accepted' }).eq('id', matchStatus.matchId);
                      Alert.alert("Success", "Friend request accepted!");
                      if (currentUserId) await checkMatchStatus(currentUserId, targetUserId);
                    } catch (error) {
                      Alert.alert("Error", "Failed to accept request");
                    }
                  }}
                  disabled={sendingRequest}
                  style={styles.acceptButton}
                >
                  {sendingRequest ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: scale(6) }} />
                      <Text style={styles.acceptButtonText}>Accept Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity 
                activeOpacity={0.85} 
                onPress={handleSendFriendRequest}
                disabled={sendingRequest}
                style={styles.addFriendButton}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: scale(6) }} />
                    <Text style={styles.addFriendText}>Add Friend</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Events Button */}
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push({ 
                pathname: "/(tabs_support)/other_event_status", 
                params: { userId: targetUserId } 
              })}
              style={styles.eventsButton}
            >
              <Ionicons name="calendar" size={16} color={BLUE} style={{ marginRight: scale(6) }} />
              <Text style={styles.eventsButtonText}>Events</Text>
              <Ionicons name="chevron-forward" size={16} color={BLUE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio Section */}
        {profile.bio && (
          <View style={styles.bioSection}>
            <LinearGradient
              colors={["#F5F9FF", "#EEF4FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bioCard}
            >
              <View style={styles.bioHeader}>
                <Text style={styles.bioLabel}>Bio</Text>
              </View>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </LinearGradient>
          </View>
        )}

        {/* What I'm Looking For - Featured */}
        {modes.looking.length > 0 && (
          <View style={styles.section}>
            <View style={styles.featuredCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.featuredAccent} />
              <View style={styles.featuredContent}>
                <View style={styles.featuredLabel}>
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={BLUE}
                    style={{ marginRight: scale(6) }}
                  />
                  <Text style={styles.featuredLabelText}>What They're Looking For</Text>
                </View>
                <View style={styles.featuredChipWrapper}>
                  <View style={styles.featuredChip}>
                    <Ionicons
                      name="people"
                      size={20}
                      color="rgba(255,255,255,0.9)"
                      style={{ marginLeft: scale(10), marginRight: scale(10) }}
                    />
                    <Text style={styles.featuredChipText}>{modes.looking[0]}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* First Photo */}
        {photos.first && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.first}
              onPress={() => { setSelectedModalUri(photos.first); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Values in a Friend */}
        {modes.values.length > 0 && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Values in a Friend</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.chipsGrid}>
                  {modes.values.map((tag, i) => (
                    <View key={`value-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Lifestyle Table */}
        {(horizontalItems.length > 0 || verticalItems.length > 0) && (
          <View style={styles.section}>
            <View style={styles.lifestyleCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              
              {/* Horizontal Items */}
              {!!horizontalItems.length && (
                <View style={styles.horizontalSection}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {horizontalItems.map(item => {
                      const iconInfo = getLifestyleIcon(item.key);
                      return (
                        <View key={item.key} style={styles.lifestyleChip}>
                          <View style={styles.lifestyleIconWrapper}>
                            {iconInfo.library === 'ionicons' ? (
                              <Ionicons name={iconInfo.name as any} size={20} color={BLUE} />
                            ) : (
                              <MaterialCommunityIcons name={iconInfo.name as any} size={20} color={BLUE} />
                            )}
                          </View>
                          <Text style={styles.lifestyleChipText}>
                            {formatLifestyleValue(item.key, item.value)}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Vertical Items */}
              {!!verticalItems.length && (
                <View style={styles.verticalSection}>
                  {verticalItems.map((item, idx) => {
                    const iconInfo = getLifestyleIcon(item.key);
                    return (
                      <View key={item.key}>
                        <View style={styles.lifestyleVerticalRow}>
                          <View style={styles.lifestyleVerticalIconWrapper}>
                            {iconInfo.library === 'ionicons' ? (
                              <Ionicons name={iconInfo.name as any} size={22} color={BLUE} />
                            ) : (
                              <MaterialCommunityIcons name={iconInfo.name as any} size={22} color={BLUE} />
                            )}
                          </View>
                          <Text style={styles.lifestyleVerticalText}>
                            {formatLifestyleValue(item.key, item.value)}
                          </Text>
                        </View>
                        {idx < verticalItems.length - 1 && <View style={styles.verticalDivider} />}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Second Photo */}
        {photos.second && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.second}
              onPress={() => { setSelectedModalUri(photos.second); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Hobbies */}
        {hobbies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="palette-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Hobbies & Interests</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.chipsGrid}>
                  {hobbies.map((hobby, i) => (
                    <View key={`hobby-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{hobby}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Prompts Carousel */}
        {!!prompts.length && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <Ionicons name="chatbubbles-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Prompts</Text>
              </View>
              <View style={styles.cardContent}>
                {/* Question Pill */}
                <View style={styles.promptPill}>
                  <Text style={styles.promptPillText}>
                    {(prompts[promptIndex] as any)?.question || prompts[promptIndex]?.title || "Prompt"}
                  </Text>
                </View>

                {/* Scrollable Carousel with Decorative Quotes */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  snapToInterval={promptWidth}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum
                  showsHorizontalScrollIndicator={false}
                  onLayout={(e) => setPromptWidth(e.nativeEvent.layout.width)}
                  onMomentumScrollEnd={onPromptScrollEnd}
                >
                  {prompts.map((p, i) => (
                    <View key={i} style={[styles.promptPage, { width: promptWidth }]}>
                      {/* Decorative quotes */}
                      <Text style={[styles.promptQuote, styles.promptQuoteLeft]}>"</Text>
                      <Text style={[styles.promptQuote, styles.promptQuoteRight]}>"</Text>

                      <View style={styles.promptInner}>
                        <Text style={styles.promptAnswerText} numberOfLines={5}>
                          {p.answer || ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Dots */}
                {prompts.length > 1 && (
                  <View style={styles.promptDotsRow}>
                    {prompts.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.promptDot,
                          i === promptIndex && styles.promptDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Third Photo */}
        {photos.third && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.third}
              onPress={() => { setSelectedModalUri(photos.third); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Communities */}
        {communities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Communities I Support</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.chipsGrid}>
                  {communities.map((community, i) => (
                    <View key={`community-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{community}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Photo Modal */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)} 
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          {!!selectedModalUri && (
            <Image 
              source={{ uri: selectedModalUri }} 
              style={styles.modalImage} 
              resizeMode="contain" 
            />
          )}
        </Pressable>
      </Modal>

      {/* Action Modal */}
      <ActionModal
        visible={showActionModal}
        onClose={() => setShowActionModal(false)}
        onBlock={handleBlock}
        onReport={handleReport}
        userName={displayName}
      />

      {/* Active Frames Viewer */}
      <ActiveFramesModal
        visible={showFrameViewer}
        onClose={() => setShowFrameViewer(false)}
        frames={activeFrames}
        isOwnProfile={false}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG 
  },
  loadingContainer: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  loadingText: { 
    marginTop: verticalScale(12), 
    fontFamily: Fonts.primary, 
    fontSize: scale(14), 
    color: "rgba(10,14,26,0.5)" 
  },
  topBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: scale(20), 
    paddingTop: verticalScale(10), 
    paddingBottom: verticalScale(12),
    backgroundColor: BG,
  },
  backButton: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: "rgba(27,68,205,0.06)", 
    alignItems: "center", 
    justifyContent: "center",
  },
  topRight: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: scale(12) 
  },
  chatButtonIcon: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: BLUE, 
    alignItems: "center", 
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  settingsBtn: { 
    padding: scale(8) 
  },
  scrollContent: { 
    paddingBottom: verticalScale(40) 
  },
  profileHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: scale(20), 
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(10),
  },
  avatarRing: { 
    width: AVATAR_SIZE, 
    height: AVATAR_SIZE, 
    borderRadius: AVATAR_SIZE / 2, 
    borderWidth: scale(2), 
    borderColor: "#E0E0E0", 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: scale(16),
  },
  avatarRingActive: { 
    borderWidth: 0,
  },
  avatarGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInner: { 
    width: AVATAR_SIZE - scale(10), 
    height: AVATAR_SIZE - scale(10), 
    borderRadius: (AVATAR_SIZE - scale(10)) / 2, 
    borderWidth: scale(2), 
    borderColor: "#FFFFFF", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FFFFFF",
  },
  avatar: { 
    width: AVATAR_SIZE - scale(18), 
    height: AVATAR_SIZE - scale(18), 
    borderRadius: (AVATAR_SIZE - scale(18)) / 2 
  },
  avatarPlaceholder: { 
    backgroundColor: "#E8EFF7", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  avatarPlaceholderText: { 
    color: INK, 
    fontSize: scale(12), 
    fontFamily: Fonts.primary 
  },
  nameContainer: { 
    flex: 1, 
    justifyContent: "center" 
  },
  nameRow: { 
    flexDirection: "row", 
    alignItems: "baseline"
  },
  nameText: { 
    color: INK, 
    fontFamily: Fonts.bold, 
    letterSpacing: 0.3 
  },
  ageText: { 
    color: BLUE, 
    fontFamily: Fonts.bold, 
    letterSpacing: 0.3 
  },
  // Friend Status Badge Styles
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
    backgroundColor: "rgba(34,197,94,0.1)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  friendBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#22C55E",
    letterSpacing: 0.2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  pendingBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#F59E0B",
    letterSpacing: 0.2,
  },
  addFriendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(8),
    alignSelf: "flex-start",
    backgroundColor: BLUE,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  addFriendText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(8),
    alignSelf: "flex-start",
    backgroundColor: "#22C55E",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    shadowColor: "#22C55E",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  acceptButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  eventsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.08)",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },
  eventsButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: BLUE,
    flex: 1,
  },
  bioSection: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(20) 
  },
  bioCard: { 
    borderRadius: scale(16), 
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
  },
  bioHeader: { 
    marginBottom: verticalScale(8) 
  },
  bioLabel: { 
    fontSize: scale(13), 
    fontFamily: Fonts.bold, 
    color: BLUE, 
    letterSpacing: 0.3 
  },
  bioText: { 
    fontSize: scale(15), 
    fontFamily: Fonts.primary, 
    color: INK, 
    lineHeight: verticalScale(22),
    fontWeight: "500",
  },
  section: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(16) 
  },
  photoContainer: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(16) 
  },
  photoFrame: { 
    borderRadius: scale(16), 
    overflow: "hidden",
    aspectRatio: 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  photoInner: { 
    flex: 1, 
    margin: scale(8), 
    borderRadius: scale(12), 
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  photoImage: { 
    width: "100%", 
    height: "100%" 
  },
  
  // Glass card styles
  glassCard: {
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(12),
  },
  cardIcon: {
    marginRight: scale(8),
  },
  cardTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  cardContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(18),
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(8),
  },
  customChip: {
    borderRadius: scale(20),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chipLabel: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Featured Card
  featuredCard: {
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
    marginBottom: verticalScale(8),
  },
  featuredAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(4),
    backgroundColor: BLUE,
  },
  featuredContent: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
  },
  featuredLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
  },
  featuredLabelText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  featuredChipWrapper: {
    alignItems: "center",
  },
  featuredChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
    borderRadius: scale(28),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    minWidth: "80%",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  featuredChipText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },

  // Lifestyle table
  lifestyleCard: {
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  horizontalSection: { 
    paddingVertical: verticalScale(14),
  },
  horizontalScroll: { 
    paddingHorizontal: scale(18), 
    gap: scale(10),
  },
  lifestyleChip: {
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(18),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  lifestyleIconWrapper: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleChipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: INK,
    letterSpacing: 0.2,
  },
  verticalSection: { 
    paddingHorizontal: scale(18), 
    paddingBottom: verticalScale(14),
  },
  lifestyleVerticalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    gap: scale(12),
  },
  lifestyleVerticalIconWrapper: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleVerticalText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: 0.2,
  },
  verticalDivider: { 
    height: StyleSheet.hairlineWidth, 
    backgroundColor: "rgba(27,68,205,0.15)", 
    marginLeft: scale(48),
  },

  // Prompts carousel
  promptPill: {
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },
  promptPillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: BLUE,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  promptPage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    minHeight: verticalScale(160),
    position: "relative",
  },
  promptQuote: {
    position: "absolute",
    fontSize: scale(80),
    color: BLUE,
    fontFamily: Fonts.bold,
    opacity: 0.15,
    zIndex: 0,
  },
  promptQuoteLeft: {
    left: scale(0),
    top: verticalScale(10),
  },
  promptQuoteRight: {
    right: scale(0),
    bottom: verticalScale(10),
  },
  promptInner: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: scale(10),
    zIndex: 1,
  },
  promptAnswerText: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    fontSize: scale(17),
    lineHeight: verticalScale(26),
    color: INK,
    fontWeight: "600",
  },
  promptDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(12),
    gap: scale(8),
  },
  promptDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "rgba(27,68,205,0.25)",
  },
  promptDotActive: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: BLUE,
  },

  // Modal styles
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.9)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  modalImage: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT 
  },
  closeButton: { 
    position: "absolute", 
    top: verticalScale(50), 
    right: scale(20), 
    width: scale(44), 
    height: scale(44), 
    borderRadius: scale(22), 
    backgroundColor: "rgba(255,255,255,0.2)", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 10 
  },
  closeButtonText: { 
    fontSize: scale(28), 
    color: "#FFFFFF", 
    fontWeight: "300" 
  },

  // Bottom Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: "hidden",
  },
  sheetBlur: {
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: "hidden",
  },
  sheetGradient: {
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(30),
    paddingHorizontal: scale(24),
  },
  sheetHandle: {
    width: scale(48),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(0,0,0,0.2)",
    alignSelf: "center",
    marginBottom: verticalScale(16),
  },
  sheetTitle: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: INK, 
    textAlign: "center", 
    marginBottom: verticalScale(20) 
  },
  sheetOption: {
    marginBottom: verticalScale(12),
  },
  sheetButton: {
    flexDirection: "row",
    height: verticalScale(56),
    borderRadius: scale(28),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sheetButtonText: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  sheetButtonTextDark: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.4,
  },
});