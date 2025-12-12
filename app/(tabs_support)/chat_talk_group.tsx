// app/(tabs_support)/chat_talk_group.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Types
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: string;
  isMine: boolean;
  messageType: string;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  conversationId: string;
}

interface GroupMember {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: "owner" | "admin" | "member";
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Utilities
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const signPhotoUrl = async (urlOrPath: string | null, bucket = "user_photos"): Promise<string | null> => {
  if (!urlOrPath) return null;
  
  if (urlOrPath.startsWith("http") && urlOrPath.includes("?token=")) {
    return urlOrPath;
  }
  
  if (urlOrPath.startsWith("http") && !urlOrPath.includes("?token=")) {
    return urlOrPath;
  }
  
  let storagePath = urlOrPath;
  if (urlOrPath.startsWith("http")) {
    const markers = [`/object/sign/${bucket}/`, `/object/public/${bucket}/`, `/${bucket}/`];
    for (const m of markers) {
      const i = urlOrPath.indexOf(m);
      if (i !== -1) {
        storagePath = decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
        break;
      }
    }
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600);
  
  if (error) {
    console.warn("signPhotoUrl error:", error.message);
    return urlOrPath;
  }
  
  return data?.signedUrl ?? urlOrPath;
};

const capitalizeName = (name: string | null | undefined): string => {
  if (!name) return "Unknown";
  return name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatMessageTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function ChatTalkGroupScreen() {
  const params = useLocalSearchParams<{ groupId?: string; conversationId?: string }>();
  const groupId = params.groupId;
  const conversationIdParam = params.conversationId;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Map<string, GroupMember>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Action menu state
  const [showActionMenu, setShowActionMenu] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Initialize Chat
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }
      setCurrentUserId(user.id);

      let actualGroupId = groupId;
      let conversationId = conversationIdParam;

      // If we have conversationId but not groupId, get groupId from conversation
      if (conversationId && !actualGroupId) {
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("id, group_id, type")
          .eq("id", conversationId)
          .single();

        if (convError || !convData || convData.type !== "group_chat") {
          setError("Conversation not found or not a group chat");
          return;
        }

        actualGroupId = convData.group_id;
      }

      if (!actualGroupId) {
        setError("No group ID provided");
        return;
      }

      // Get group info
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          cover_image_url,
          member_count
        `)
        .eq("id", actualGroupId)
        .single();

      if (groupError || !groupData) {
        setError("Group not found");
        return;
      }

      // Get or find conversation for this group
      if (!conversationId) {
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .eq("group_id", actualGroupId)
          .eq("type", "group_chat")
          .single();

        if (convError || !convData) {
          setError("Group conversation not found");
          return;
        }

        conversationId = convData.id;
      }

      // Sign cover image URL
      let coverUrl = groupData.cover_image_url;
      if (coverUrl) {
        coverUrl = await signPhotoUrl(coverUrl, "group_photos");
      }

      setGroupInfo({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        coverImageUrl: coverUrl,
        memberCount: groupData.member_count,
        conversationId: conversationId!,
      });

      // Load group members using RPC function (bypasses RLS for group members)
      const { data: membersData, error: membersError } = await supabase
        .rpc("get_group_members_with_connections", {
          p_group_id: actualGroupId,
        });

      if (membersError) {
        console.warn("Error fetching members via RPC:", membersError.message);
      }

      const membersMap = new Map<string, GroupMember>();

      // Add current user to the members map
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();

      const { data: currentUserPhoto } = await supabase
        .from("user_photos")
        .select("photo_url")
        .eq("user_id", user.id)
        .eq("is_main", true)
        .maybeSingle();

      const currentUserSignedUrl = await signPhotoUrl(currentUserPhoto?.photo_url || null);

      // Get current user's role in the group
      const { data: currentUserMembership } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", actualGroupId)
        .eq("user_id", user.id)
        .single();

      membersMap.set(user.id, {
        id: user.id,
        userId: user.id,
        fullName: capitalizeName(currentUserProfile?.full_name),
        avatarUrl: currentUserSignedUrl,
        role: (currentUserMembership?.role as "owner" | "admin" | "member") || "member",
      });

      // Add other members from RPC result
      if (membersData && membersData.length > 0) {
        for (const m of membersData) {
          const signedUrl = await signPhotoUrl(m.main_photo_url || null);

          membersMap.set(m.user_id, {
            id: m.user_id,
            userId: m.user_id,
            fullName: capitalizeName(m.full_name),
            avatarUrl: signedUrl,
            role: m.role as "owner" | "admin" | "member",
          });
        }
      }

      setMembers(membersMap);

      // Update last_read_at
      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId!)
        .eq("user_id", user.id);

    } catch (error) {
      console.error("Error initializing chat:", error);
      setError("Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [groupId, conversationIdParam]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Load Messages
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const loadMessages = useCallback(async () => {
    if (!groupInfo?.conversationId || !currentUserId) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_type
        `)
        .eq("conversation_id", groupInfo.conversationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (messagesError) {
        console.error("Error loading messages:", messagesError);
        return;
      }

      if (!messagesData) {
        setMessages([]);
        return;
      }

      const formattedMessages: Message[] = messagesData.map((msg) => {
        const member = members.get(msg.sender_id);
        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.sender_id,
          senderName: member?.fullName || "Unknown",
          senderAvatar: member?.avatarUrl || null,
          createdAt: msg.created_at,
          isMine: msg.sender_id === currentUserId,
          messageType: msg.message_type,
        };
      });

      setMessages(formattedMessages);

      // Update last_read_at
      await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", groupInfo.conversationId)
        .eq("user_id", currentUserId);

    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [groupInfo?.conversationId, currentUserId, members]);

  useEffect(() => {
    if (groupInfo?.conversationId && currentUserId && members.size > 0) {
      loadMessages();
    }
  }, [groupInfo?.conversationId, currentUserId, members, loadMessages]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Real-time Subscription
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  useEffect(() => {
    if (!groupInfo?.conversationId || !currentUserId) return;

    const subscription = supabase
      .channel(`group-chat-${groupInfo.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${groupInfo.conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          const member = members.get(newMsg.sender_id);

          const formattedMsg: Message = {
            id: newMsg.id,
            content: newMsg.content,
            senderId: newMsg.sender_id,
            senderName: member?.fullName || "Unknown",
            senderAvatar: member?.avatarUrl || null,
            createdAt: newMsg.created_at,
            isMine: newMsg.sender_id === currentUserId,
            messageType: newMsg.message_type,
          };

          setMessages((prev) => [formattedMsg, ...prev]);

          // Update last_read_at for incoming messages
          if (newMsg.sender_id !== currentUserId) {
            await supabase
              .from("conversation_members")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", groupInfo.conversationId)
              .eq("user_id", currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [groupInfo?.conversationId, currentUserId, members]);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Send Message
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const sendMessage = async () => {
    if (!inputText.trim() || !groupInfo?.conversationId || !currentUserId || sending) return;

    const messageContent = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const { error: insertError } = await supabase.from("messages").insert({
        conversation_id: groupInfo.conversationId,
        sender_id: currentUserId,
        content: messageContent,
        message_type: "text",
      });

      if (insertError) {
        console.error("Error sending message:", insertError);
        setInputText(messageContent);
        Alert.alert("Error", "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(messageContent);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Voice Recording (placeholder - same as chat_talk.tsx)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Required", "Microphone access is needed for voice messages.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }

    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendVoiceMessage = async () => {
    if (!recording || !groupInfo?.conversationId || !currentUserId) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    setSending(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // For now, just show a placeholder - actual upload logic would go here
      Alert.alert("Voice Message", "Voice message recording saved (upload not implemented yet)");
      
    } catch (error) {
      console.error("Error sending voice message:", error);
      Alert.alert("Error", "Failed to send voice message");
    } finally {
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      setSending(false);
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Navigate to Group Details
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const navigateToGroupDetails = () => {
    if (groupInfo) {
      router.push({
        pathname: "/(tabs_support)/group_details",
        params: { groupId: groupInfo.id },
      });
    }
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Navigate to Member Profile
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const navigateToProfile = (userId: string) => {
    // Don't navigate to own profile
    if (userId === currentUserId) return;
    
    router.push({
      pathname: "/(tabs_support)/other_profile",
      params: { 
        userId: userId,
        fromGroup: groupInfo?.id, // Pass group context
      },
    });
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Message Rendering
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const showDateHeader =
      index === messages.length - 1 ||
      new Date(item.createdAt).toDateString() !==
        new Date(messages[index + 1]?.createdAt).toDateString();

    const showSenderInfo =
      !item.isMine &&
      (index === messages.length - 1 || messages[index + 1]?.senderId !== item.senderId);

    return (
      <>
        <View
          style={[
            styles.messageContainer,
            item.isMine ? styles.messageContainerMine : styles.messageContainerTheirs,
          ]}
        >
          {/* Avatar for others' messages - Clickable to go to profile */}
          {!item.isMine && showSenderInfo && (
            <TouchableOpacity 
              style={styles.messageAvatarContainer}
              onPress={() => navigateToProfile(item.senderId)}
              activeOpacity={0.7}
            >
              {item.senderAvatar ? (
                <Image source={{ uri: item.senderAvatar }} style={styles.messageAvatar} />
              ) : (
                <View style={styles.messageAvatarPlaceholder}>
                  <Ionicons name="person" size={14} color="rgba(10,14,26,0.3)" />
                </View>
              )}
            </TouchableOpacity>
          )}
          {!item.isMine && !showSenderInfo && <View style={styles.messageAvatarSpacer} />}

          <View
            style={[
              styles.messageBubble,
              item.isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
            ]}
          >
            {/* Sender name for others' messages - Clickable to go to profile */}
            {!item.isMine && showSenderInfo && (
              <TouchableOpacity onPress={() => navigateToProfile(item.senderId)} activeOpacity={0.7}>
                <Text style={styles.senderName}>{item.senderName}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.messageContent}>
              <Text
                style={[
                  styles.messageText,
                  styles.messageTextWithFooter,
                  item.isMine ? styles.messageTextMine : styles.messageTextTheirs,
                ]}
              >
                {item.content}
              </Text>
              <View style={styles.messageInlineFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    item.isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                  ]}
                >
                  {formatMessageTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.createdAt)}</Text>
          </View>
        )}
      </>
    );
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Render
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading group chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !groupInfo) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="rgba(10,14,26,0.3)" />
          <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header - Clickable to go to group details */}
      <TouchableOpacity style={styles.header} onPress={navigateToGroupDetails} activeOpacity={0.7}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            {groupInfo.coverImageUrl ? (
              <Image source={{ uri: groupInfo.coverImageUrl }} style={styles.headerAvatarImage} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="people" size={18} color={BLUE} />
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {groupInfo.name}
            </Text>
            <Text style={styles.headerSubtext}>{groupInfo.memberCount} members</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(10,14,26,0.3)" />
        </View>

        <TouchableOpacity
          style={styles.headerMenuBtn}
          onPress={() => setShowActionMenu(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={INK} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubbles-outline" size={48} color="rgba(10,14,26,0.2)" />
              <Text style={styles.emptyMessagesText}>
                No messages yet.{"\n"}Start the conversation!
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {isRecording ? (
            <View style={styles.recordingContainer}>
              <TouchableOpacity style={styles.recordingCancelBtn} onPress={cancelRecording}>
                <Ionicons name="close" size={20} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.recordingInfo}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {Math.floor(recordingDuration / 60)}:
                  {(recordingDuration % 60).toString().padStart(2, "0")}
                </Text>
              </View>
              <TouchableOpacity style={styles.recordingSendBtn} onPress={sendVoiceMessage}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor="rgba(10,14,26,0.4)"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
              />
              {inputText.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={sendMessage}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.voiceButton} onPress={startRecording}>
                  <Ionicons name="mic" size={20} color={BLUE} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowActionMenu(false)}>
          <View style={styles.sheetContainer}>
            <BlurView intensity={80} style={styles.sheetBlur}>
              <View style={styles.sheetContent}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Group Options</Text>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => {
                    setShowActionMenu(false);
                    navigateToGroupDetails();
                  }}
                >
                  <View style={[styles.sheetButton, { backgroundColor: BLUE }]}>
                    <Ionicons name="information-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetButtonText}>View Group Details</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => setShowActionMenu(false)}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "rgba(10,14,26,0.08)" }]}>
                    <Text style={styles.sheetButtonTextDark}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Styles
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
    paddingHorizontal: scale(40),
  },
  errorText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: BLUE,
  },
  retryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBackBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: scale(8),
    gap: scale(12),
  },
  headerAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: "hidden",
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: -0.3,
  },
  headerSubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(2),
  },
  headerMenuBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
  },

  // Keyboard & Messages
  keyboardAvoiding: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
  },

  // Date Header
  dateHeader: {
    alignItems: "center",
    marginVertical: verticalScale(16),
  },
  dateHeaderText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    backgroundColor: "rgba(10,14,26,0.05)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },

  // Messages
  messageContainer: {
    flexDirection: "row",
    marginBottom: verticalScale(4),
  },
  messageContainerMine: {
    justifyContent: "flex-end",
  },
  messageContainerTheirs: {
    justifyContent: "flex-start",
  },
  messageAvatarContainer: {
    width: scale(32),
    height: scale(32),
    marginRight: scale(8),
    marginTop: verticalScale(4),
  },
  messageAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: scale(16),
  },
  messageAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: scale(16),
    backgroundColor: "#F0F4F9",
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarSpacer: {
    width: scale(40),
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  messageBubbleMine: {
    backgroundColor: BLUE,
    borderBottomRightRadius: scale(6),
  },
  messageBubbleTheirs: {
    backgroundColor: CARD_BG,
    borderBottomLeftRadius: scale(6),
    borderWidth: 1,
    borderColor: BORDER,
  },
  senderName: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: BLUE,
    marginBottom: verticalScale(4),
  },
  messageContent: {
    position: "relative",
    minWidth: scale(60),
  },
  messageText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    lineHeight: scale(20),
    fontWeight: "500",
    flexShrink: 1,
    paddingTop: verticalScale(2),
  },
  messageTextWithFooter: {
    paddingRight: scale(55),
    paddingBottom: scale(2),
  },
  messageTextMine: {
    color: "#FFFFFF",
  },
  messageTextTheirs: {
    color: INK,
  },
  messageInlineFooter: {
    position: "absolute",
    bottom: scale(2),
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: scale(3),
  },
  messageTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(10),
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  messageTimeTheirs: {
    color: "rgba(10,14,26,0.4)",
  },

  // Empty State
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
  },
  emptyMessagesText: {
    marginTop: verticalScale(12),
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.4)",
    textAlign: "center",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(16),
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  textInput: {
    flex: 1,
    minHeight: verticalScale(36),
    maxHeight: verticalScale(80),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(9),
    paddingBottom: verticalScale(9),
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    marginRight: scale(8),
    borderWidth: 1,
    borderColor: BORDER,
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  // Recording
  recordingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(18),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: BORDER,
  },
  recordingCancelBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  recordingDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#EF4444",
  },
  recordingText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    letterSpacing: 0.2,
  },
  recordingSendBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
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
  sheetContent: {
    backgroundColor: "rgba(255,255,255,0.98)",
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
    marginBottom: verticalScale(20),
    letterSpacing: 0.2,
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