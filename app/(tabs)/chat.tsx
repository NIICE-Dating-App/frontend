// app/(tabs)/(up_tab)/chat.tsx
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

type TabKey = "chat" | "groups" | "communities";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ChatConversation = {
  id: string;
  type: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  unreadCount: number;
  matchRequestId: string | null;
  hasFrame: boolean;
};

type Community = {
  id: string;
  name: string;
  iconUrl: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  category: string;
};

type Announcement = {
  id: string;
  title: string | null;
  content: string;
  pinned: boolean;
  createdAt: string;
  authorName: string | null;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main Component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityChat, setCommunityChat] = useState<ChatConversation | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // Helper function to sign photo URLs
  const signPhotoUrl = async (urlOrPath: string | null): Promise<string | null> => {
    if (!urlOrPath) return null;
    
    // If it's already a signed URL or external URL, return as-is
    if (urlOrPath.startsWith("http") && urlOrPath.includes("?token=")) {
      return urlOrPath;
    }
    
    // Extract storage path from URL if needed
    let storagePath = urlOrPath;
    if (urlOrPath.startsWith("http")) {
      const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
      for (const m of markers) {
        const i = urlOrPath.indexOf(m);
        if (i !== -1) {
          storagePath = decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
          break;
        }
      }
    }
    
    const { data, error } = await supabase.storage
      .from("user_photos")
      .createSignedUrl(storagePath, 3600);
    
    if (error) {
      console.warn("signPhotoUrl error:", error.message);
      return urlOrPath;
    }
    
    return data?.signedUrl ?? urlOrPath;
  };

  // Helper function to capitalize names
  const capitalizeName = (name: string | null | undefined): string => {
    if (!name) return "Unknown";
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const fetchChats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Get current user
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        console.log("No user ID found");
        setConversations([]);
        return;
      }

      // Query conversations where user is a member
      // For 1:1 chats (match)
      const { data: memberData, error: memberError } = await supabase
        .from("conversation_members")
        .select(`
          conversation_id,
          last_read_at,
          conversations!inner (
            id,
            type,
            match_request_id,
            created_at,
            updated_at,
            match_requests (
              id,
              requester_id,
              target_id,
              status
            )
          )
        `)
        .eq("user_id", userId);

      if (memberError) {
        console.error("Error fetching conversations:", memberError);
        setConversations([]);
        return;
      }

      if (!memberData || memberData.length === 0) {
        setConversations([]);
        return;
      }

      // Filter to only 1:1 match chats (not group/event/community chats)
      const matchChats = memberData.filter((m: any) => {
        const convType = m.conversations?.type;
        return convType === "match";
      });

      // Build conversation list with other user's info
      const conversationPromises = matchChats.map(async (member: any) => {
        const conv = member.conversations;
        const matchRequest = conv.match_requests;
        
        if (!matchRequest) return null;

        // Determine the other user's ID
        const otherUserId = matchRequest.requester_id === userId 
          ? matchRequest.target_id 
          : matchRequest.requester_id;

        // Get other user's profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, age, bio, frame_id")
          .eq("id", otherUserId)
          .single();

        // Get other user's main photo
        const { data: photoData } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", otherUserId)
          .eq("is_main", true)
          .maybeSingle();

        // Get last message
        const { data: lastMsgData } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count (messages after last_read_at that aren't from current user)
        let unreadCount = 0;
        if (member.last_read_at) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", userId)
            .gt("created_at", member.last_read_at);
          unreadCount = count || 0;
        } else {
          // If never read, count all messages from other user
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", userId);
          unreadCount = count || 0;
        }

        // Sign the photo URL
        const signedAvatarUrl = await signPhotoUrl(photoData?.photo_url || null);

        // Check if user has active frame
        let hasFrame = false;
        if (profileData?.frame_id) {
          const { data: frameData } = await supabase
            .from("frames")
            .select("id, expires_at")
            .eq("id", profileData.frame_id)
            .gt("expires_at", new Date().toISOString())
            .maybeSingle();
          hasFrame = !!frameData;
        }

        const conversation: ChatConversation = {
          id: conv.id,
          type: conv.type,
          name: capitalizeName(profileData?.full_name),
          avatarUrl: signedAvatarUrl,
          lastMessage: lastMsgData?.content || null,
          lastMessageAt: lastMsgData?.created_at || null,
          updatedAt: lastMsgData?.created_at || conv.updated_at || conv.created_at,
          unreadCount,
          matchRequestId: matchRequest.id,
          hasFrame,
        };

        return conversation;
      });

      const fetchedConversations = (await Promise.all(conversationPromises))
        .filter((c): c is ChatConversation => c !== null)
        .sort((a, b) => {
          // Sort by most recent activity
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });

      setConversations(fetchedConversations);
    } catch (error) {
      console.error("Error in fetchChats:", error);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        setConversations([]);
        return;
      }

      // Get groups where user is a member
      const { data: groupMemberships, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          groups!inner (
            id,
            name,
            cover_image_url,
            member_count
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching groups:", error);
        setConversations([]);
        return;
      }

      if (!groupMemberships || groupMemberships.length === 0) {
        setConversations([]);
        return;
      }

      // For each group, get the conversation and last message
      const groupConversations = await Promise.all(
        groupMemberships.map(async (membership: any) => {
          const group = membership.groups;
          
          // Get conversation for this group
          const { data: convData } = await supabase
            .from("conversations")
            .select("id, updated_at")
            .eq("group_id", group.id)
            .eq("type", "group_chat")
            .maybeSingle();

          if (!convData) return null;

          // Get my membership for last_read_at
          const { data: myMembership } = await supabase
            .from("conversation_members")
            .select("last_read_at")
            .eq("conversation_id", convData.id)
            .eq("user_id", userId)
            .maybeSingle();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", convData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count
          let unreadCount = 0;
          if (myMembership?.last_read_at) {
            const { count } = await supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", convData.id)
              .neq("sender_id", userId)
              .gt("created_at", myMembership.last_read_at);
            unreadCount = count || 0;
          }

          const conversation: ChatConversation = {
            id: convData.id,
            type: "group_chat",
            name: group.name,
            avatarUrl: group.cover_image_url,
            lastMessage: lastMsg?.content || null,
            lastMessageAt: lastMsg?.created_at || null,
            updatedAt: lastMsg?.created_at || convData.updated_at,
            unreadCount,
            matchRequestId: null,
            hasFrame: false,
          };

          return conversation;
        })
      );

      const validConversations = groupConversations
        .filter((c): c is ChatConversation => c !== null)
        .sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });

      setConversations(validConversations);
    } catch (error) {
      console.error("Error in fetchGroups:", error);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCommunities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        setCommunities([]);
        return;
      }

      // Get communities where user is a member
      const { data: communityMemberships, error } = await supabase
        .from("community_members")
        .select(`
          community_id,
          communities!inner (
            id,
            name,
            icon_url,
            cover_image_url,
            member_count,
            category
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching communities:", error);
        setCommunities([]);
        return;
      }

      if (!communityMemberships || communityMemberships.length === 0) {
        setCommunities([]);
        return;
      }

      const communityList: Community[] = communityMemberships.map((membership: any) => {
        const comm = membership.communities;
        return {
          id: comm.id,
          name: comm.name,
          iconUrl: comm.icon_url,
          coverImageUrl: comm.cover_image_url,
          memberCount: comm.member_count,
          category: comm.category,
        };
      });

      setCommunities(communityList);
    } catch (error) {
      console.error("Error in fetchCommunities:", error);
      setCommunities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCommunityDetail = useCallback(async (community: Community) => {
    setCommunityLoading(true);
    setSelectedCommunity(community);
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      // Get community conversation
      const { data: convData } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .eq("community_id", community.id)
        .eq("type", "community_chat")
        .maybeSingle();

      if (convData) {
        // Get my membership for last_read_at
        const { data: myMembership } = await supabase
          .from("conversation_members")
          .select("last_read_at")
          .eq("conversation_id", convData.id)
          .eq("user_id", userId)
          .maybeSingle();

        // Get last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", convData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        let unreadCount = 0;
        if (myMembership?.last_read_at) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", convData.id)
            .neq("sender_id", userId)
            .gt("created_at", myMembership.last_read_at);
          unreadCount = count || 0;
        }

        setCommunityChat({
          id: convData.id,
          type: "community_chat",
          name: `${community.name} Chat`,
          avatarUrl: community.iconUrl,
          lastMessage: lastMsg?.content || "No messages yet",
          lastMessageAt: lastMsg?.created_at || null,
          updatedAt: lastMsg?.created_at || convData.updated_at,
          unreadCount,
          matchRequestId: null,
          hasFrame: false,
        });
      } else {
        setCommunityChat(null);
      }

      // Get announcements
      const { data: announcementsData } = await supabase
        .from("community_announcements")
        .select(`
          id,
          title,
          content,
          pinned,
          created_at,
          author_id,
          profiles!community_announcements_author_id_fkey (
            full_name
          )
        `)
        .eq("community_id", community.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (announcementsData) {
        const formattedAnnouncements: Announcement[] = announcementsData.map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          pinned: a.pinned,
          createdAt: a.created_at,
          authorName: a.profiles?.full_name || "Admin",
        }));
        setAnnouncements(formattedAnnouncements);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error("Error fetching community detail:", error);
      setCommunityChat(null);
      setAnnouncements([]);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  const getFilteredConversations = useCallback(() => {
    if (!filterUnreadOnly) return conversations;
    return conversations.filter(conv => conv.unreadCount > 0);
  }, [conversations, filterUnreadOnly]);

  useEffect(() => {
    if (activeTab === "chat") fetchChats();
    else if (activeTab === "groups") fetchGroups();
    else fetchCommunities();
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (selectedCommunity) return;
      
      if (activeTab === "chat") fetchChats();
      else if (activeTab === "groups") fetchGroups();
      else fetchCommunities();
    }, [activeTab, selectedCommunity])
  );

  const onRefresh = useCallback(() => {
    if (activeTab === "chat") fetchChats(true);
    else if (activeTab === "groups") fetchGroups(true);
    else fetchCommunities(true);
  }, [activeTab]);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  const handleChatPress = (conversation: ChatConversation) => {
    if (conversation.matchRequestId) {
      router.push({
        pathname: "/(tabs_support)/chat_talk",
        params: { matchId: conversation.matchRequestId },
      });
    } else {
      router.push({
        pathname: "/(tabs_support)/chat_talk",
        params: { conversationId: conversation.id },
      });
    }
  };

  // Community detail view
  if (selectedCommunity) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedCommunity(null);
              setCommunityChat(null);
              setAnnouncements([]);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={INK} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedCommunity.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {selectedCommunity.memberCount.toLocaleString()} members
            </Text>
          </View>
          
          <View style={styles.headerButton} />
        </View>

        {communityLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : (
          <FlatList
            data={[
              { type: "chat" as const, data: communityChat },
              { type: "spacer" as const, data: null },
              { type: "header" as const, data: null },
              ...announcements.map((a) => ({ type: "announcement" as const, data: a })),
            ]}
            keyExtractor={(item, idx) => 
              item.type === "chat" ? "chat" : 
              item.type === "spacer" ? "spacer" :
              item.type === "header" ? "header" : 
              (item.data as Announcement).id
            }
            contentContainerStyle={styles.communityListContent}
            renderItem={({ item }) => {
              if (item.type === "chat" && item.data) {
                return (
                  <TouchableOpacity
                    style={styles.communityChatCard}
                    activeOpacity={0.8}
                    onPress={() => handleChatPress(item.data as ChatConversation)}
                  >
                    <View style={styles.communityChatIcon}>
                      <Ionicons name="chatbubbles" size={24} color={BLUE} />
                    </View>
                    <View style={styles.communityChatContent}>
                      <Text style={styles.communityChatTitle}>Community Chat</Text>
                      <Text style={styles.communityChatPreview} numberOfLines={1}>
                        {(item.data as ChatConversation).lastMessage || "No messages yet"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.25)" />
                  </TouchableOpacity>
                );
              }

              if (item.type === "spacer") {
                return <View style={{ height: verticalScale(24) }} />;
              }

              if (item.type === "header") {
                return (
                  <View style={styles.announcementHeader}>
                    <View style={styles.announcementHeaderIcon}>
                      <Ionicons name="megaphone" size={16} color={BLUE} />
                    </View>
                    <Text style={styles.announcementHeaderText}>Announcements</Text>
                  </View>
                );
              }

              if (item.type === "announcement" && item.data) {
                const a = item.data as Announcement;
                return (
                  <View style={styles.announcementCard}>
                    {a.pinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={11} color={BLUE} />
                        <Text style={styles.pinnedText}>Pinned</Text>
                      </View>
                    )}
                    {a.title && <Text style={styles.announcementTitle}>{a.title}</Text>}
                    <Text style={styles.announcementContent} numberOfLines={3}>
                      {a.content}
                    </Text>
                    <Text style={styles.announcementMeta}>
                      {a.authorName || "Admin"} Â· {formatTime(a.createdAt)}
                    </Text>
                  </View>
                );
              }

              return null;
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // Main chat list view
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerButton} />

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerButton} 
          activeOpacity={0.7}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons 
            name="options-outline" 
            size={22} 
            color={filterUnreadOnly ? BLUE : INK} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TabButton
          label="Chats"
          active={activeTab === "chat"}
          onPress={() => setActiveTab("chat")}
        />
        <TabButton
          label="Groups"
          active={activeTab === "groups"}
          onPress={() => setActiveTab("groups")}
        />
        <TabButton
          label="Communities"
          active={activeTab === "communities"}
          onPress={() => setActiveTab("communities")}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : activeTab === "communities" ? (
        communities.length > 0 ? (
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
                colors={[BLUE]}
              />
            }
            renderItem={({ item }) => (
              <CommunityRow
                community={item}
                onPress={() => fetchCommunityDetail(item)}
              />
            )}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No communities yet"
            subtitle="Join or create a community to connect with others"
            buttonLabel="Explore communities"
            onPress={() => router.push("/in_progress")}
          />
        )
      ) : (
        getFilteredConversations().length > 0 ? (
          <FlatList
            data={getFilteredConversations()}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
                colors={[BLUE]}
              />
            }
            renderItem={({ item }) => (
              <ChatRow
                conversation={item}
                onPress={() => handleChatPress(item)}
              />
            )}
          />
        ) : (
          <EmptyState
            icon={activeTab === "chat" ? "chatbubble-outline" : "people-outline"}
            title={
              filterUnreadOnly 
                ? "No unread messages" 
                : (activeTab === "chat" ? "No chats yet" : "No groups yet")
            }
            subtitle={
              filterUnreadOnly
                ? "You're all caught up!"
                : (activeTab === "chat"
                  ? "Start connecting with people on the map"
                  : "Create or join a group to start chatting")
            }
            buttonLabel={activeTab === "chat" ? "Find people" : "Create group"}
            onPress={() => router.push(activeTab === "chat" ? "/(tabs)/map" : "/in_progress")}
          />
        )
      )}

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        unreadOnly={filterUnreadOnly}
        onToggleUnread={() => setFilterUnreadOnly(!filterUnreadOnly)}
      />
    </SafeAreaView>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sub-components
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

type ChatRowProps = {
  conversation: ChatConversation;
  onPress: () => void;
};

const ChatRow: React.FC<ChatRowProps> = ({ conversation, onPress }) => {
  const { name, avatarUrl, lastMessage, updatedAt, unreadCount, hasFrame } = conversation;
  const hasUnread = unreadCount > 0;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <TouchableOpacity 
      style={styles.chatRow} 
      activeOpacity={0.6} 
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        {hasFrame && (
          <LinearGradient
            colors={[BLUE, "#678CFF", "#A8C4FF", BLUE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.frameRing}
          />
        )}
        <View style={[styles.avatarInner, hasFrame && styles.avatarWithFrame]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={22} color={BLUE} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.chatTime}>
            {formatTime(updatedAt)}
          </Text>
        </View>
        <View style={styles.chatFooter}>
          <Text
            style={[styles.chatMessage, hasUnread && styles.chatMessageUnread]}
            numberOfLines={1}
          >
            {lastMessage || "Start a conversation"}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type CommunityRowProps = {
  community: Community;
  onPress: () => void;
};

const CommunityRow: React.FC<CommunityRowProps> = ({ community, onPress }) => (
  <TouchableOpacity style={styles.chatRow} activeOpacity={0.6} onPress={onPress}>
    <View style={styles.avatarContainer}>
      <View style={styles.avatarInner}>
        {community.iconUrl ? (
          <Image source={{ uri: community.iconUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="people" size={22} color={BLUE} />
          </View>
        )}
      </View>
    </View>

    <View style={styles.chatContent}>
      <View style={styles.chatHeader}>
        <Text style={styles.chatName} numberOfLines={1}>
          {community.name}
        </Text>
      </View>
      <Text style={styles.chatMessage} numberOfLines={1}>
        {community.memberCount.toLocaleString()} members Â· {community.category}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.25)" />
  </TouchableOpacity>
);

type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  onPress,
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon as any} size={48} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    <TouchableOpacity style={styles.emptyButton} activeOpacity={0.8} onPress={onPress}>
      <Text style={styles.emptyButtonText}>{buttonLabel}</Text>
    </TouchableOpacity>
  </View>
);

const FilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  unreadOnly: boolean;
  onToggleUnread: () => void;
}> = ({ visible, onClose, unreadOnly, onToggleUnread }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable 
        style={styles.filterModal} 
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={INK} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.filterOption}
          onPress={onToggleUnread}
          activeOpacity={0.7}
        >
          <View style={styles.filterOptionLeft}>
            <View style={styles.filterOptionIcon}>
              <Ionicons name="mail-unread-outline" size={20} color={BLUE} />
            </View>
            <Text style={styles.filterOptionText}>Show unread only</Text>
          </View>
          <View style={[
            styles.filterToggle,
            unreadOnly && styles.filterToggleActive
          ]}>
            <View style={[
              styles.filterToggleKnob,
              unreadOnly && styles.filterToggleKnobActive
            ]} />
          </View>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Styles - 2025 Modern Design
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
  },
  headerButton: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: verticalScale(2),
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
  },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: scale(20),
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: "center",
    borderRadius: scale(28),
    backgroundColor: "transparent",
  },
  tabButtonActive: {
  backgroundColor: BLUE,
  shadowColor: BLUE,  // â† ADD THIS LINE
  shadowOffset: { width: 0, height: 4 },  // â† ADD THIS LINE
  shadowOpacity: 0.25,  // â† ADD THIS LINE
  shadowRadius: 8,  // â† ADD THIS LINE
  elevation: 6,  // â† ADD THIS LINE
},
  tabButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.4)",
    letterSpacing: -0.2,
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(24),
  },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    gap: scale(14),
  },

  avatarContainer: {
    position: "relative",
    width: scale(60),
    height: scale(60),
    alignItems: "center",
    justifyContent: "center",
  },
  frameRing: {
    position: "absolute",
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
  },
  avatarInner: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWithFrame: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarBlind: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },

  chatContent: {
    flex: 1,
    gap: verticalScale(4),
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(8),
  },
  chatName: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  chatTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.4)",
  },
  chatFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  chatMessage: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
    lineHeight: scale(22),
  },
  chatMessageUnread: {
    fontFamily: Fonts.bold,
    color: INK,
  },

  unreadBadge: {
    minWidth: scale(22),
    height: scale(22),
    paddingHorizontal: scale(6),
    borderRadius: scale(11),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(-10),
  },
  unreadBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "#FFFFFF",
    
  },

  communityListContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(24),
  },
  communityChatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(16),
    gap: scale(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  communityChatIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  communityChatContent: {
    flex: 1,
    gap: verticalScale(4),
  },
  communityChatTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  communityChatPreview: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },

  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  announcementHeaderIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  announcementHeaderText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  announcementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(12),
    gap: verticalScale(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    alignSelf: "flex-start",
    backgroundColor: "#F0F4F9",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  pinnedText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  announcementTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  announcementContent: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.65)",
    lineHeight: scale(20),
  },
  announcementMeta: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.4)",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(40),
    paddingBottom: verticalScale(80),
  },
  emptyIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(8),
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
    lineHeight: scale(22),
    marginBottom: verticalScale(24),
  },
  emptyButton: {
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(14),
    borderRadius: scale(16),
    backgroundColor: INK,
  },
  emptyButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(34),
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(16),
  },
  filterTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    letterSpacing: -0.5,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(16),
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(14),
  },
  filterOptionIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  filterToggle: {
    width: scale(52),
    height: verticalScale(32),
    borderRadius: scale(16),
    backgroundColor: "#E5E7EB",
    padding: scale(2),
    justifyContent: "center",
  },
  filterToggleActive: {
    backgroundColor: BLUE,
  },
  filterToggleKnob: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterToggleKnobActive: {
    marginLeft: "auto",
  },
});