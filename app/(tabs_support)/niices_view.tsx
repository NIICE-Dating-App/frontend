// app/(tabs_support)/niices_view.tsx

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

// ================== TYPES ==================
type ConnectionVisibility = "full_profile" | "blind";

interface NiiceMatch {
  id: string;
  other_user_id: string;
  full_name: string;
  age: number | null;
  main_photo_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  from_blind_meet: boolean;
  connection_visibility: ConnectionVisibility;
  created_at: string;
}

// ================== UTILITY FUNCTIONS ==================
const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// ================== NIICE CARD COMPONENT ==================
const NiiceCard: React.FC<{ 
  match: NiiceMatch; 
  onPress: () => void;
  onChatPress: () => void;
}> = ({ match, onPress, onChatPress }) => (
  <View style={styles.niiceCard}>
    <TouchableOpacity style={styles.niiceCardBody} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.niiceAvatarContainer}>
        {match.main_photo_url ? (
          <Image source={{ uri: match.main_photo_url }} style={styles.niiceAvatar} />
        ) : (
          <View style={styles.niiceAvatarPlaceholder}>
            <Ionicons name="person" size={28} color="rgba(10,14,26,0.4)" />
          </View>
        )}
        {match.from_blind_meet && (
          <View style={styles.niiceBlindBadge}>
            <Ionicons name="eye-off" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>
      
      <View style={styles.niiceInfo}>
        <Text style={styles.niiceName} numberOfLines={1}>
          {match.full_name}{match.age ? `, ${match.age}` : ""}
        </Text>
        <Text style={styles.niiceMeta}>
          Connected {formatRelativeTime(match.created_at)}
        </Text>
      </View>

      <TouchableOpacity style={styles.chatButton} onPress={onChatPress} activeOpacity={0.7}>
        <Ionicons name="chatbubble" size={18} color={BLUE} />
      </TouchableOpacity>
    </TouchableOpacity>
  </View>
);

// ================== EMPTY STATE ==================
const EmptyState: React.FC<{ 
  icon: string; 
  title: string; 
  subtitle: string; 
  ctaLabel?: string; 
  onCta?: () => void;
}> = ({ icon, title, subtitle, ctaLabel, onCta }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name={icon as any} size={40} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {ctaLabel && onCta && (
      <TouchableOpacity style={styles.emptyCta} onPress={onCta} activeOpacity={0.85}>
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ================== MAIN COMPONENT ==================
export default function NiicesViewScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [niiceMatches, setNiiceMatches] = useState<NiiceMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<NiiceMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load User ID
  useEffect(() => {
    const loadUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    loadUserId();
  }, []);

  // Get user preview using RPC (same as niices.tsx)
  const getUserPreview = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await supabase.rpc('get_matched_user_profile', { target_user_id: targetUserId });
      const row = Array.isArray(data) ? data[0] : data;
      let photoUrl = row?.main_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
        photoUrl = signedData?.signedUrl || null;
      }
      return { full_name: row?.full_name ?? null, age: row?.age ?? null, main_photo_url: photoUrl };
    } catch { 
      return { full_name: null, age: null, main_photo_url: null }; 
    }
  }, []);

  // Load Niice Matches (Friends only)
  const loadNiiceMatches = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Query all accepted full_profile friend matches
      const { data: matches, error } = await supabase
        .from('match_requests')
        .select('id, requester_id, target_id, match_mode, connection_visibility, created_at, responded_at')
        .eq('status', 'accepted')
        .eq('connection_visibility', 'full_profile')
        .eq('match_mode', 'friend')
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .order('responded_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching matches:", error);
        setNiiceMatches([]);
        setFilteredMatches([]);
        return;
      }

      if (!matches || matches.length === 0) {
        setNiiceMatches([]);
        setFilteredMatches([]);
        return;
      }

      // Build niice matches array using RPC for profile data
      const niices: NiiceMatch[] = await Promise.all(
        matches.map(async (m) => {
          const otherId = m.requester_id === userId ? m.target_id : m.requester_id;
          const preview = await getUserPreview(otherId);
          
          // Get last message
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("match_request_id", m.id)
            .maybeSingle();
          
          let lastMsg: { content: string; created_at: string } | null = null;
          if (conv) {
            const { data: msg } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastMsg = msg;
          }

          return {
            id: m.id,
            other_user_id: otherId,
            full_name: preview.full_name || "Unknown",
            age: preview.age || null,
            main_photo_url: preview.main_photo_url || null,
            last_message_preview: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            from_blind_meet: false,
            connection_visibility: m.connection_visibility as ConnectionVisibility,
            created_at: m.responded_at || m.created_at,
          };
        })
      );

      setNiiceMatches(niices);
      setFilteredMatches(niices);
    } catch (err) {
      console.error("Error loading niice matches:", err);
      setNiiceMatches([]);
      setFilteredMatches([]);
    } finally {
      setLoading(false);
    }
  }, [userId, getUserPreview]);

  useEffect(() => {
    if (userId) loadNiiceMatches();
  }, [userId, loadNiiceMatches]);

  // Filter matches based on search only
  useEffect(() => {
    let filtered = niiceMatches;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.full_name.toLowerCase().includes(query)
      );
    }

    setFilteredMatches(filtered);
  }, [niiceMatches, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNiiceMatches();
    setRefreshing(false);
  };

  const handleViewProfile = (targetUserId: string) => {
    router.push({ pathname: "/profile", params: { userId: targetUserId } });
  };

  const handleChatPress = (matchId: string) => {
    router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId } });
  };

  const totalCount = niiceMatches.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Niices</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{totalCount}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(10,14,26,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search niices..."
            placeholderTextColor="rgba(10,14,26,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="rgba(10,14,26,0.4)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading your niices...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />
          }
        >
          {filteredMatches.length === 0 ? (
            searchQuery.trim() ? (
              <View style={styles.emptyInlineState}>
                <Ionicons name="search" size={24} color="rgba(10,14,26,0.3)" />
                <Text style={styles.emptyInlineText}>No niices found</Text>
              </View>
            ) : (
              <EmptyState
                icon="people-outline"
                title="No Niices Yet"
                subtitle="Start connecting with people nearby to grow your network of niices"
                ctaLabel="Find People"
                onCta={() => router.push("/(tabs)/nicees")}
              />
            )
          ) : (
            filteredMatches.map((match) => (
              <NiiceCard
                key={match.id}
                match={match}
                onPress={() => handleViewProfile(match.other_user_id)}
                onChatPress={() => handleChatPress(match.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.06)",
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
  },
  headerCount: {
    backgroundColor: BLUE,
    borderRadius: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    minWidth: scale(32),
    alignItems: "center",
  },
  headerCountText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#FFFFFF",
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    gap: scale(10),
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: INK,
    padding: 0,
  },
  
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(100),
  },
  
  // Niice Card
  niiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.06)",
    overflow: "hidden",
  },
  niiceCardBody: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
  },
  niiceAvatarContainer: {
    position: "relative",
    marginRight: scale(12),
  },
  niiceAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
  },
  niiceAvatarPlaceholder: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  niiceBlindBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  niiceInfo: {
    flex: 1,
  },
  niiceName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    marginBottom: verticalScale(4),
  },
  niiceMeta: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
  },
  chatButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: scale(8),
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(100),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(12),
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
    marginBottom: verticalScale(24),
    lineHeight: scale(20),
  },
  emptyCta: {
    backgroundColor: BLUE,
    borderRadius: scale(12),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
  },
  emptyCtaText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },
  emptyInlineState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
    gap: verticalScale(12),
  },
  emptyInlineText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.4)",
  },
});