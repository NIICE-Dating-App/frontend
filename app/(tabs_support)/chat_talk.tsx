// app/(tabs_support)/chat_talk.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isMine: boolean;
}

interface ChatPartner {
  id: string;
  name: string;
  avatarUrl: string | null;
  isBlind: boolean;
}

interface MatchInfo {
  id: string;
  conversationId: string;
  otherUserId: string;
  connectionVisibility: "full_profile" | "blind";
  matchMode: "dating" | "friend";
  chatAllowed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatTalkScreen() {
  const params = useLocalSearchParams<{ matchId?: string; conversationId?: string }>();
  const matchId = params.matchId;
  const conversationIdParam = params.conversationId;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [partner, setPartner] = useState<ChatPartner | null>(null);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Initialize chat
  // ─────────────────────────────────────────────────────────────────────────────

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

      let conversationId = conversationIdParam;
      let otherUserId: string | null = null;
      let connectionVisibility: "full_profile" | "blind" = "full_profile";
      let matchMode: "dating" | "friend" = "dating";
      let chatAllowed = true;

      // If we have a matchId, get the match request info first
      if (matchId) {
        const { data: matchData, error: matchError } = await supabase
          .from("match_requests")
          .select("id, requester_id, target_id, connection_visibility, match_mode, chat_allowed, status")
          .eq("id", matchId)
          .single();

        if (matchError || !matchData) {
          setError("Match not found");
          return;
        }

        if (matchData.status !== "accepted") {
          setError("This match is not active");
          return;
        }

        // Determine the other user
        otherUserId = matchData.requester_id === user.id 
          ? matchData.target_id 
          : matchData.requester_id;

        connectionVisibility = matchData.connection_visibility || "full_profile";
        matchMode = matchData.match_mode || "dating";
        chatAllowed = matchData.chat_allowed ?? true;

        // Get the conversation for this match
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .eq("match_request_id", matchId)
          .single();

        if (convError || !convData) {
          setError("Conversation not found");
          return;
        }

        conversationId = convData.id;
      }

      // If we only have conversationId (no matchId), get the match info from conversation
      if (!matchId && conversationId) {
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("id, type, match_request_id")
          .eq("id", conversationId)
          .single();

        if (convError || !convData) {
          setError("Conversation not found");
          return;
        }

        if (convData.match_request_id) {
          const { data: matchData } = await supabase
            .from("match_requests")
            .select("id, requester_id, target_id, connection_visibility, match_mode, chat_allowed")
            .eq("id", convData.match_request_id)
            .single();

          if (matchData) {
            otherUserId = matchData.requester_id === user.id 
              ? matchData.target_id 
              : matchData.requester_id;
            connectionVisibility = matchData.connection_visibility || "full_profile";
            matchMode = matchData.match_mode || "dating";
            chatAllowed = matchData.chat_allowed ?? true;
          }
        }

        // Get the other user from conversation members if not found from match
        if (!otherUserId) {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .neq("user_id", user.id)
            .limit(1)
            .single();

          if (members) {
            otherUserId = members.user_id;
          }
        }
      }

      if (!conversationId) {
        setError("No conversation found");
        return;
      }

      setMatchInfo({
        id: matchId || "",
        conversationId,
        otherUserId: otherUserId || "",
        connectionVisibility,
        matchMode,
        chatAllowed,
      });

      // Get partner info based on visibility
      if (otherUserId) {
        const isBlind = connectionVisibility === "blind";
        
        if (isBlind) {
          // For blind matches, use placeholder
          setPartner({
            id: otherUserId,
            name: matchMode === "dating" ? "Mystery Date" : "Mystery Friend",
            avatarUrl: null,
            isBlind: true,
          });
        } else {
          // For full_profile, try to get actual profile using the RPC function
          try {
            const { data: profileData, error: profileError } = await supabase
              .rpc("get_profile_full_for_user", { target_user: otherUserId });

            if (profileError) {
              console.warn("Profile fetch error:", profileError);
              // Fallback to basic info
              setPartner({
                id: otherUserId,
                name: "Match",
                avatarUrl: null,
                isBlind: false,
              });
            } else if (profileData && profileData.length > 0) {
              const profile = profileData[0];
              let avatarUrl = profile.main_photo_url;
              
              // Sign the URL if needed
              if (avatarUrl) {
                const storagePath = toStoragePath(avatarUrl);
                if (storagePath) {
                  avatarUrl = await signPath(storagePath);
                }
              }

              setPartner({
                id: otherUserId,
                name: profile.full_name || "Match",
                avatarUrl,
                isBlind: false,
              });
            } else {
              setPartner({
                id: otherUserId,
                name: "Match",
                avatarUrl: null,
                isBlind: false,
              });
            }
          } catch (err) {
            console.error("Error fetching partner profile:", err);
            setPartner({
              id: otherUserId,
              name: "Match",
              avatarUrl: null,
              isBlind: false,
            });
          }
        }
      }

      // Load messages
      await loadMessages(conversationId, user.id);

    } catch (err) {
      console.error("Initialize chat error:", err);
      setError("Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [matchId, conversationIdParam]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load messages
  // ─────────────────────────────────────────────────────────────────────────────

  const loadMessages = async (conversationId: string, userId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load messages error:", error);
      return;
    }

    const msgs: Message[] = (data || []).map((m: any) => ({
      id: m.id,
      content: m.content,
      senderId: m.sender_id,
      createdAt: m.created_at,
      isMine: m.sender_id === userId,
    }));

    setMessages(msgs);

    // Mark messages as read
    await markAsRead(conversationId, userId);

    // Fetch partner's last_read_at for read receipts
    const { data: partnerData } = await supabase
      .from("conversation_members")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)
      .single();
    
    if (partnerData?.last_read_at) {
      setPartnerLastReadAt(new Date(partnerData.last_read_at));
    }

    // Scroll to bottom after messages load
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Mark as read
  // ─────────────────────────────────────────────────────────────────────────────

  const markAsRead = async (conversationId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);
      
      if (error) {
        console.warn("Error marking as read:", error.message);
      }
    } catch (err) {
      console.warn("Error marking as read:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Send message
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!inputText.trim() || !matchInfo?.conversationId || !currentUserId || sending) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: matchInfo.conversationId,
          sender_id: currentUserId,
          content: messageText,
        })
        .select("id, content, sender_id, created_at")
        .single();

      if (error) {
        console.error("Send message error:", error);
        setInputText(messageText); // Restore the message
        return;
      }

      if (data) {
        const newMessage: Message = {
          id: data.id,
          content: data.content,
          senderId: data.sender_id,
          createdAt: data.created_at,
          isMine: true,
        };
        setMessages(prev => [...prev, newMessage]);

        // Update conversation updated_at and mark as read for sender
        await Promise.all([
          supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", matchInfo.conversationId),
          markAsRead(matchInfo.conversationId, currentUserId),
        ]);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.error("Send error:", err);
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Real-time subscription for messages
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!matchInfo?.conversationId || !currentUserId) return;

    const subscription = supabase
      .channel(`messages:${matchInfo.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${matchInfo.conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's not from us (we already added it optimistically)
          if (newMsg.sender_id !== currentUserId) {
            setMessages(prev => [
              ...prev,
              {
                id: newMsg.id,
                content: newMsg.content,
                senderId: newMsg.sender_id,
                createdAt: newMsg.created_at,
                isMine: false,
              },
            ]);
            // Mark as read since user is viewing the chat
            markAsRead(matchInfo.conversationId, currentUserId);
            // Scroll to bottom for new messages
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [matchInfo?.conversationId, currentUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Real-time subscription for read receipts (partner's last_read_at)
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!matchInfo?.conversationId || !matchInfo?.otherUserId) return;

    const subscription = supabase
      .channel(`read_receipts:${matchInfo.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${matchInfo.conversationId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          // Only update if it's the partner's read status
          if (updated.user_id === matchInfo.otherUserId && updated.last_read_at) {
            setPartnerLastReadAt(new Date(updated.last_read_at));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [matchInfo?.conversationId, currentUserId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.createdAt, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/chat");
    }
  };

  const handleViewProfile = () => {
    if (partner?.id && !partner.isBlind) {
      router.push({
        pathname: "/(tabs_support)/other_profile",
        params: { userId: partner.id, matchId: matchId || matchInfo?.id || "" },
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={handleGoBack}>
            <Ionicons name="chevron-back" size={24} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat</Text>
          <View style={{ width: scale(32) }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(10,14,26,0.3)" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleGoBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleGoBack}>
          <Ionicons name="chevron-back" size={24} color={INK} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerCenter}
          onPress={handleViewProfile}
          disabled={partner?.isBlind}
        >
          <View style={[
            styles.headerAvatar,
            partner?.isBlind && styles.headerAvatarBlind
          ]}>
            {partner?.avatarUrl ? (
              <Image source={{ uri: partner.avatarUrl }} style={styles.headerAvatarImage} />
            ) : partner?.isBlind ? (
              <Ionicons name="eye-off" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="person" size={20} color={BLUE} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {partner?.name || "Chat"}
            </Text>
            {partner?.isBlind && (
              <Text style={styles.headerBlindLabel}>Blind Match</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={() => {
            // TODO: Show options menu (view profile, block, etc.)
          }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={INK} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.messagesList}
          renderItem={({ item: group }) => (
            <View>
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>
                  {formatDateHeader(group.date)}
                </Text>
              </View>
              {group.messages.map((msg: Message) => {
                // Check if message was read by partner (for my messages only)
                const isRead = msg.isMine && partnerLastReadAt && 
                  new Date(msg.createdAt) <= partnerLastReadAt;
                
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      msg.isMine ? styles.messageBubbleMine : styles.messageBubbleTheirs,
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      msg.isMine ? styles.messageTextMine : styles.messageTextTheirs,
                    ]}>
                      {msg.content}
                    </Text>
                    <View style={styles.messageFooter}>
                      <Text style={[
                        styles.messageTime,
                        msg.isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                      ]}>
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                      {msg.isMine && (
                        <View style={styles.readReceipt}>
                          <Ionicons 
                            name="checkmark-done" 
                            size={14} 
                            color={isRead ? "#34B7F1" : "rgba(255,255,255,0.5)"} 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Ionicons 
                name={partner?.isBlind ? "eye-off-outline" : "chatbubble-outline"} 
                size={48} 
                color="rgba(10,14,26,0.15)" 
              />
              <Text style={styles.emptyMessagesText}>
                {partner?.isBlind 
                  ? "Start chatting with your mystery match!"
                  : "Start the conversation!"
                }
              </Text>
            </View>
          }
        />

        {/* Input */}
        {matchInfo?.chatAllowed !== false ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="rgba(10,14,26,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatDisabledContainer}>
            <Text style={styles.chatDisabledText}>
              Chat is not available for this match
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  errorText: {
    marginTop: verticalScale(12),
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
  },
  errorButton: {
    marginTop: verticalScale(20),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    backgroundColor: BLUE,
    borderRadius: scale(12),
  },
  errorButtonText: {
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10,14,26,0.08)",
    backgroundColor: "#FFFFFF",
  },
  headerBackButton: {
    width: scale(32),
    height: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: scale(12),
  },
  headerAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#E4EBFA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: scale(10),
  },
  headerAvatarBlind: {
    backgroundColor: BLUE,
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  headerBlindLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: BLUE,
    marginTop: verticalScale(1),
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    textAlign: "center",
  },
  headerActionButton: {
    width: scale(32),
    height: scale(32),
    alignItems: "center",
    justifyContent: "center",
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: verticalScale(16),
  },
  dateSeparatorText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
    backgroundColor: "rgba(10,14,26,0.04)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(10),
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: scale(18),
    marginBottom: verticalScale(6),
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: BLUE,
    borderBottomRightRadius: scale(4),
  },
  messageBubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: scale(4),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.06)",
  },
  messageText: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    lineHeight: scale(35),
  },
  messageTextMine: {
    color: "#FFFFFF",
  },
  messageTextTheirs: {
    color: INK,
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
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: verticalScale(4),
    gap: scale(4),
  },
  readReceipt: {
    marginLeft: scale(2),
  },
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
    paddingVertical: verticalScale(12),
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(10,14,26,0.08)",
  },
  textInput: {
    flex: 1,
    minHeight: verticalScale(40),
    maxHeight: verticalScale(100),
    backgroundColor: "rgba(10,14,26,0.04)",
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: INK,
    marginRight: scale(10),
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(27,68,205,0.4)",
  },
  chatDisabledContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: "rgba(10,14,26,0.04)",
    alignItems: "center",
  },
  chatDisabledText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
});