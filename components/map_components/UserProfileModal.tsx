// components/map_components/UserProfileModal.tsx
// MODERN REDESIGN: Pill-shaped buttons (borderRadius: 999) and card-based distance display
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Animated as RNAnimated,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { BLUE, BLUES, SCREEN_H, INK, CARD_BG } from "./constants";
import { UserMapCard, MatchStatus } from "./types";
import { capitalizeWords, getAllLookingForLabels } from "./utils";
import { styles } from "./styles";
import { scale, verticalScale } from "@/utils/responsive";
import { Fonts } from "@/constants/theme";
const toRad = (d: number) => (d * Math.PI) / 180;
import { useNotification } from "@/components/NotificationContext";

// Inside your component:

interface UserProfileModalProps {
  visible: boolean;
  user: UserMapCard | null;
  onClose: () => void;
  currentUserId: string | null;
  onOpenFrames: (frames: any[]) => void;
  userPosition: { lat: number; lng: number } | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  visible, 
  user, 
  onClose, 
  currentUserId, 
  onOpenFrames, 
  userPosition 
}) => {
 const { showNotification, showConfirmation } = useNotification(); 
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userFrames, setUserFrames] = useState<any[]>([]);
  const [requestMessage, setRequestMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [showLookingForDetail, setShowLookingForDetail] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [currentUserLookingFor, setCurrentUserLookingFor] = useState<string[]>([]);
  
  const isPublicProfile = user?.access_level === 'full';
  
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);
  
  const distanceKm = useMemo(() => {
    if (!userPosition || !user) return null;
    return calculateDistance(userPosition.lat, userPosition.lng, user.approx_lat, user.approx_lng);
  }, [userPosition, user, calculateDistance]);
  
  useEffect(() => {
    if (visible && user) {
      fetchMatchStatus();
      fetchCurrentUserLookingFor(); // Fetch for mutual interests
      setBioExpanded(false); // Reset bio expansion
      if (user.access_level === 'full' && user.frame_id) {
        fetchUserFrames();
      } else {
        setUserFrames([]);
      }
      setProfilePhoto(user.main_photo_url);
      setRequestMessage('');
      setShowMessageInput(false);
      
      RNAnimated.parallel([
        RNAnimated.spring(slideAnim, { 
          toValue: 0, 
          useNativeDriver: true, 
          tension: 80, 
          friction: 12,
        }),
        RNAnimated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        RNAnimated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      RNAnimated.parallel([
        RNAnimated.timing(slideAnim, { 
          toValue: SCREEN_H, 
          duration: 250, 
          useNativeDriver: true 
        }),
        RNAnimated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
        }),
        RNAnimated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      setShowMessageInput(false);
      setShowLookingForDetail(false);
    }
  }, [visible, user]);
  
  const fetchMatchStatus = async () => {
    if (!user || !currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('match_requests')
        .select('id, status, requester_id, target_id, sender_message')
        .or(`and(requester_id.eq.${currentUserId},target_id.eq.${user.user_id}),and(requester_id.eq.${user.user_id},target_id.eq.${currentUserId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data && !error) {
        setMatchStatus({
          status: data.status,
          is_requester: data.requester_id === currentUserId,
          match_id: data.id,
          sender_message: data.sender_message,
        });
      } else {
        setMatchStatus({ status: null, is_requester: false, match_id: null });
      }
    } catch (error) {
      console.error("Error fetching match status:", error);
    }
  };
  
  const fetchUserFrames = async () => {
    if (!user || !user.frame_id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_active_frames', {
        target_user_id: user.user_id
      });
      
      if (error) {
        console.error("Error fetching frames:", error);
        return;
      }
      
      if (data && data.length > 0) {
        const processedFrames = await Promise.all(
          data.map(async (frame: any) => {
            if (frame.media_url && !frame.media_url.startsWith('http')) {
              const { data: signedData } = await supabase.storage
                .from("frames")
                .createSignedUrl(frame.media_url, 3600);
              return { ...frame, media_url: signedData?.signedUrl || frame.media_url };
            }
            return frame;
          })
        );
        setUserFrames(processedFrames);
      }
    } catch (error) {
      console.error("Error fetching frames:", error);
    }
  };
  
  // Fetch current user's looking_for to find mutual interests
  const fetchCurrentUserLookingFor = async () => {
    if (!currentUserId) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('looking_for')
        .eq('id', currentUserId)
        .single();
      
      if (data?.looking_for) {
        setCurrentUserLookingFor(data.looking_for);
      }
    } catch (error) {
      console.error("Error fetching current user looking_for:", error);
    }
  };
  
  // Calculate mutual interests
  const mutualInterests = useMemo(() => {
    if (!user?.looking_for || !currentUserLookingFor || currentUserLookingFor.length === 0) {
      return [];
    }
    
    const displayMap: Record<string, string> = {
      'new_friends_nearby': 'New friends nearby',
      'workout_fitness_buddy': 'Workout buddy',
      'travel_companions': 'Travel companions',
      'activity_hobby_partners': 'Hobby partners',
      'casual_hangouts': 'Casual hangouts',
      'professional_networking': 'Networking',
      'close_friendships': 'Close friendships',
    };
    
    return user.looking_for
      .filter(interest => currentUserLookingFor.includes(interest))
      .map(interest => displayMap[interest] || interest)
      .slice(0, 3); // Show max 3
  }, [user?.looking_for, currentUserLookingFor]);
  
  // Format distance with visual categories
  const getDistanceInfo = useCallback(() => {
    if (distanceKm === null) return { text: "", icon: "help-circle", color: "#9CA3AF" };
    
    if (distanceKm < 0.1) return { text: "Very close by", icon: "location-sharp", color: "#10B981" };
    if (distanceKm < 0.5) return { text: "Nearby", icon: "location-sharp", color: "#10B981" };
    if (distanceKm < 1) return { text: "Less than 1km away", icon: "walk", color: "#22C55E" };
    if (distanceKm < 2) return { text: "About 1km away", icon: "walk", color: "#22C55E" };
    if (distanceKm < 3) return { text: `${Math.round(distanceKm)}km away`, icon: "bicycle", color: "#F59E0B" };
    
    const rounded = Math.round(distanceKm / 5) * 5;
    return { text: `Around ${rounded}km away`, icon: "car", color: "#EF4444" };
  }, [distanceKm]);
  
  // Handle share profile
  const handleShareProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      await Share.share({
        message: `Check out ${capitalizeWords(user.full_name)}'s profile on our app!`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [user]);
  
  // Bio truncation logic
  const bioPreviewLength = 150;
  const shouldTruncateBio = user?.bio && user.bio.length > bioPreviewLength;
  const displayBio = useMemo(() => {
    if (!user?.bio) return '';
    if (!shouldTruncateBio || bioExpanded) return user.bio;
    return user.bio.substring(0, bioPreviewLength) + '...';
  }, [user?.bio, shouldTruncateBio, bioExpanded]);
  
  // Example: When sending a connection request
const handleLike = async () => {
  if (!user || !currentUserId || loading) return;
  
  setLoading(true);
  try {
    const { error: rpcError } = await supabase.rpc('send_match_request_with_context', {
      p_target_id: user.user_id,
      p_message: requestMessage || null
    });
    
    if (rpcError) {
      if (rpcError.code === '23505') {
        // âœ… CLOSE MODAL FIRST
        onClose();
        setTimeout(() => {
          showNotification({
            type: "warning",
            title: "Already sent",
            message: "You've already sent a request to this person",
          });
        }, 100);
      } else {
        console.error("RPC error:", rpcError);
        // âœ… CLOSE MODAL FIRST
        onClose();
        setTimeout(() => {
          showNotification({
            type: "error",
            title: "Failed to send request",
          });
        }, 100);
      }
    } else {
      // âœ… SUCCESS - Show notification after closing
      setRequestMessage('');
      setShowMessageInput(false);
      await fetchMatchStatus();
      
      onClose();
      setTimeout(() => {
        showNotification({
          type: "success",
          title: "Connection request sent!",
        });
      }, 100);
    }
  } catch (error) {
    console.error("Error sending like:", error);
    onClose();
    setTimeout(() => {
      showNotification({
        type: "error",
        title: "Failed to send request",
      });
    }, 100);
  } finally {
    setLoading(false);
  }
};
  
  const handlePass = async () => {
    if (!user || !currentUserId || loading) return;
    
    setLoading(true);
    try {
      await supabase
        .from('match_requests')
        .insert({
          requester_id: currentUserId,
          target_id: user.user_id,
          status: 'denied'
        });
      
      onClose();
    } catch (error) {
      console.error("Error passing:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptRequest = async () => {
  if (!matchStatus?.match_id || !currentUserId || loading) return;
  
  setLoading(true);
  try {
    const { error } = await supabase
      .from('match_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', matchStatus.match_id)
      .eq('target_id', currentUserId);
    
    if (!error) {
      await fetchMatchStatus();
      onClose(); // âœ… Close modal first
      setTimeout(() => {
        showNotification({
          type: "success",
          title: "Request accepted!",
        });
      }, 100);
    } else {
      onClose(); // âœ… Close modal first
      setTimeout(() => {
        showNotification({
          type: "error",
          title: "Failed to accept request",
        });
      }, 100);
    }
  } catch (error) {
    console.error("Error accepting request:", error);
    onClose(); // âœ… Close modal first
    setTimeout(() => {
      showNotification({
        type: "error",
        title: "Failed to accept request",
      });
    }, 100);
  } finally {
    setLoading(false);
  }
};

  
  const handleViewProfile = () => {
  if (!user) return;
  if (user.access_level !== 'full') {
    onClose(); // âœ… Close modal first
    setTimeout(() => {
      showNotification({
        type: "info",
        title: "Private Profile",
        message: "Connect with them first to see their full profile.",
        duration: 4000,
      });
    }, 100);
    return;
  }
  onClose();
  router.push({
    pathname: "/(tabs_support)/other_profile",
    params: { userId: user.user_id, matchId: matchStatus?.match_id || "" }
  });
};

  
  const handleStartChat = () => {
    if (!matchStatus?.match_id) return;
    onClose();
    router.push({
      pathname: "/(tabs_support)/chat_talk",
      params: { matchId: matchStatus.match_id }
    });
  };
  const capitalizeName = (name: string) => capitalizeWords(name);

  const handleBlock = async () => {
  if (!user || !currentUserId) return;
  
  const userToBlock = user; // Save reference
  
  // âœ… CLOSE USER MODAL FIRST
  onClose();
  
  // âœ… SHOW CONFIRMATION AFTER DELAY
  setTimeout(() => {
    showConfirmation({
      title: "Block User",
      message: `Are you sure you want to block ${capitalizeWords(userToBlock.full_name)}?`,
      confirmText: "Block",
      cancelText: "Cancel",
      confirmColor: "#EF4444",
      onConfirm: async () => {
        try {
          await supabase.from('blocks').insert({
            blocker_id: currentUserId,
            blocked_id: userToBlock.user_id
          });
          showNotification({
            type: "success",
            title: "User blocked",
          });
        } catch (error) {
          console.error("Error blocking:", error);
          showNotification({
            type: "error",
            title: "Failed to block user",
          });
        }
      }
    });
  }, 100);
};
  
  if (!user) return null;
  
  const isMatched = matchStatus?.status === 'accepted';
  const isPending = matchStatus?.status === 'pending';
  const isDenied = matchStatus?.status === 'denied';
  const isRequester = matchStatus?.is_requester;
  const hasFrames = userFrames.length > 0;
  
  // REDESIGNED: Modern distance formatting with better text
  const formatDistance = () => {
    if (distanceKm === null) return null;
    
    if (distanceKm < 0.1) return "Very close by";
    if (distanceKm < 0.5) return "Nearby";
    if (distanceKm < 1) return "Less than 1km away";
    if (distanceKm < 2) return "About 1km away";
    if (distanceKm < 5) return `${Math.round(distanceKm)}km away`;
    
    const rounded = Math.round(distanceKm / 5) * 5;
    return `Around ${rounded}km away`;
  };
  
  const allLookingForLabels = getAllLookingForLabels(user?.looking_for || null);
  
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <RNAnimated.View 
          style={[
            { ...require('react-native').StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.5)" },
            { opacity: backdropAnim }
          ]}
          pointerEvents="none"
        />
        <RNAnimated.View 
          style={[
            styles.userModalSheet,
            { 
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              paddingBottom: Math.max(insets.bottom, verticalScale(24)) 
            }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            
            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: verticalScale(16) }}
            >
              {showLookingForDetail ? (
                <View>
                  <View style={styles.lookingForDetailHeader}>
                    <TouchableOpacity 
                      style={styles.lookingForBackBtn}
                      onPress={() => setShowLookingForDetail(false)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-back" size={scale(22)} color={BLUE} />
                    </TouchableOpacity>
                    <Text style={styles.lookingForDetailTitle}>What they're looking for</Text>
                    <View style={{ width: scale(36) }} />
                  </View>
                  
                  <View style={styles.lookingForDetailList}>
                    {allLookingForLabels.map((label, index) => (
                      <View key={index} style={styles.lookingForDetailItem}>
                        <View style={styles.lookingForDetailIcon}>
                          <Ionicons name="checkmark" size={scale(16)} color={BLUE} />
                        </View>
                        <Text style={styles.lookingForDetailText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <>
                  {/* Header Row */}
                  <View style={styles.userSheetHeader}>
                    <TouchableOpacity
                      activeOpacity={(hasFrames || isPublicProfile) ? 0.8 : 1}
                      onPress={() => {
                        if (hasFrames) {
                          onClose();
                          setTimeout(() => onOpenFrames(userFrames), 300);
                        } else if (isPublicProfile) {
                          handleViewProfile();
                        }
                      }}
                      disabled={!hasFrames && !isPublicProfile}
                      style={styles.userSheetAvatarWrap}
                    >
                      {hasFrames && <View style={styles.userSheetFrameRing} />}
                      <View style={[styles.userSheetAvatar, hasFrames && styles.userSheetAvatarWithRing]}>
                        {profilePhoto ? (
                          <Image source={{ uri: profilePhoto }} style={styles.userSheetAvatarImg} resizeMode="cover" />
                        ) : (
                          <View style={[styles.userSheetAvatarImg, styles.userSheetAvatarPlaceholder]}>
                            <Ionicons name="person" size={scale(28)} color={CARD_BG} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.userSheetInfo}
                      onPress={isPublicProfile ? handleViewProfile : undefined}
                      activeOpacity={isPublicProfile ? 0.7 : 1}
                      disabled={!isPublicProfile}
                    >
                      <View style={styles.userSheetNameRow}>
                        <Text style={styles.userSheetName}>{capitalizeWords(user.full_name)}, {user.age}</Text>
                        <View style={[
                          styles.userSheetVisibilityBadge,
                          { backgroundColor: isPublicProfile ? "rgba(34, 197, 94, 0.1)" : "rgba(139, 92, 246, 0.1)" }
                        ]}>
                          <Ionicons 
                            name={isPublicProfile ? "globe-outline" : "lock-closed-outline"} 
                            size={scale(12)} 
                            color={isPublicProfile ? "#22C55E" : "#8B5CF6"} 
                          />
                          <Text style={[
                            styles.userSheetVisibilityText,
                            { color: isPublicProfile ? "#22C55E" : "#8B5CF6" }
                          ]}>
                            {isPublicProfile ? "Public" : "Private"}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Enhanced distance visualization */}
                      {distanceKm !== null && (() => {
                        const distInfo = getDistanceInfo();
                        return (
                          <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            alignSelf: "flex-start",
                            backgroundColor: `${distInfo.color}15`,
                            paddingHorizontal: scale(10),
                            paddingVertical: verticalScale(7),
                            borderRadius: scale(999),
                            gap: scale(7),
                            marginTop: verticalScale(8),
                            borderWidth: 1,
                            borderColor: `${distInfo.color}30`,
                          }}>
                            <View style={{
                              width: scale(22),
                              height: scale(22),
                              borderRadius: scale(11),
                              backgroundColor: `${distInfo.color}25`,
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                              <Ionicons name={distInfo.icon as any} size={scale(13)} color={distInfo.color} />
                            </View>
                            <Text style={{
                              fontFamily: Fonts.bold,
                              fontSize: scale(13),
                              color: distInfo.color,
                              letterSpacing: 0.3,
                            }}>
                              {distInfo.text}
                            </Text>
                          </View>
                        );
                      })()}
                    </TouchableOpacity>
                  </View>
                  

                  
                  {/* Mutual Interests Badge */}
                  {mutualInterests.length > 0 && (
                    <View style={{
                      marginHorizontal: scale(20),
                      marginTop: verticalScale(12),
                      backgroundColor: "rgba(139, 92, 246, 0.08)",
                      borderRadius: scale(14),
                      padding: scale(14),
                      borderWidth: 1,
                      borderColor: "rgba(139, 92, 246, 0.2)",
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(8) }}>
                        <View style={{
                          width: scale(24),
                          height: scale(24),
                          borderRadius: scale(12),
                          backgroundColor: "rgba(139, 92, 246, 0.15)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <Ionicons name="heart" size={scale(13)} color="#8B5CF6" />
                        </View>
                        <Text style={{
                          fontFamily: Fonts.bold,
                          fontSize: scale(13),
                          color: "#8B5CF6",
                          letterSpacing: 0.3,
                        }}>
                          You both want
                        </Text>
                      </View>
                      <Text style={{
                        fontFamily: Fonts.primary,
                        fontSize: scale(14),
                        color: INK,
                        lineHeight: scale(20),
                      }}>
                        {mutualInterests.join(' • ')}
                      </Text>
                    </View>
                  )}

                  {/* Looking For Section */}
                  {allLookingForLabels.length > 0 && (
                    <View style={styles.userSheetChips}>
                      <TouchableOpacity 
                        style={styles.userSheetChip}
                        onPress={() => setShowLookingForDetail(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="people-outline" size={scale(14)} color={BLUE} />
                        <Text style={styles.userSheetChipText}>What they're looking for</Text>
                        <Ionicons name="chevron-forward" size={scale(14)} color={BLUE} />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Bio Section - Enhanced */}
                  {user.bio && (
                    <View style={styles.userSheetBioSection}>
                      <Text style={styles.userSheetBioLabel}>About</Text>
                      <Text style={{
                        fontFamily: Fonts.primary,
                        fontSize: scale(15),
                        color: INK,
                        lineHeight: scale(24),
                      }}>
                        {displayBio}
                      </Text>
                      {shouldTruncateBio && (
                        <TouchableOpacity 
                          onPress={() => setBioExpanded(!bioExpanded)}
                          style={{ marginTop: verticalScale(8) }}
                        >
                          <Text style={{
                            fontFamily: Fonts.bold,
                            fontSize: scale(14),
                            color: BLUE,
                            letterSpacing: 0.3,
                          }}>
                            {bioExpanded ? 'Show less' : 'Read more'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  {/* Status Badges */}
                  {isMatched && (
                    <View style={[styles.userSheetStatusBadge, { backgroundColor: "#E8F5E9" }]}>
                      <Ionicons name="checkmark-circle" size={scale(16)} color="#22C55E" />
                      <Text style={[styles.userSheetStatusText, { color: "#22C55E" }]}>
                        You're connected!
                      </Text>
                    </View>
                  )}
                  {isPending && isRequester && (
                    <View style={[styles.userSheetStatusBadge, { backgroundColor: "#FFF3E0" }]}>
                      <Ionicons name="time-outline" size={scale(16)} color="#FF9800" />
                      <Text style={[styles.userSheetStatusText, { color: "#FF9800" }]}>Request sent</Text>
                    </View>
                  )}
                  {isPending && !isRequester && (
                    <View style={[styles.userSheetStatusBadge, { backgroundColor: "rgba(27, 68, 205, 0.08)" }]}>
                      <Ionicons name="mail-outline" size={scale(16)} color={BLUE} />
                      <Text style={[styles.userSheetStatusText, { color: BLUE }]}>
                        Sent you a match request
                      </Text>
                    </View>
                  )}
                  {isPending && !isRequester && matchStatus?.sender_message && (
  <View style={styles.senderMessageCard}>
    <View style={styles.senderMessageHeader}>
      <View style={styles.senderMessageIconCircle}>
        <Ionicons name="chatbubble" size={scale(16)} color={BLUE} />
      </View>
      <Text style={styles.senderMessageLabel}>Their Message</Text>
    </View>
    <Text style={styles.senderMessageText}>"{matchStatus.sender_message}"</Text>
  </View>
)}
                  
                  {/* Action Buttons - REDESIGNED with borderRadius: 999 */}
                  <View style={styles.userSheetActions}>
                    {!isMatched && !isPending && !isDenied && (
                      <>
                        {showMessageInput ? (
                          <View style={styles.messageInputContainer}>
                            <View style={styles.messageInputWrap}>
                              <Ionicons name="chatbubble-outline" size={scale(20)} color={BLUE} style={{ marginRight: scale(10) }} />
                              <TextInput
                                style={styles.messageInput}
                                placeholder="Add a message (optional)"
                                placeholderTextColor="rgba(10, 14, 26, 0.4)"
                                value={requestMessage}
                                onChangeText={setRequestMessage}
                                maxLength={200}
                                multiline
                              />
                            </View>
                            <View style={styles.messageInputActions}>
                              <TouchableOpacity 
                                style={[styles.messageInputCancelBtn, { borderRadius: scale(999) }]}
                                onPress={() => {
                                  setShowMessageInput(false);
                                  setRequestMessage('');
                                }}
                              >
                                <Text style={styles.messageInputCancelText}>Cancel</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity 
                                style={[styles.userSheetPrimaryBtn, { flex: 1, borderRadius: scale(999) }]}
                                onPress={handleLike}
                                disabled={loading}
                                activeOpacity={0.8}
                              >
                                <View style={styles.userSheetPrimaryBtnContent}>
                                  <Ionicons name="paper-plane-outline" size={scale(20)} color={CARD_BG} />
                                  <Text style={styles.userSheetPrimaryBtnText}>
                                    {loading ? 'Sending...' : 'Send Request'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={[styles.userSheetPrimaryBtn, { borderRadius: scale(999) }]}
                            onPress={() => setShowMessageInput(true)}
                            disabled={loading}
                            activeOpacity={0.8}
                          >
                            <View style={styles.userSheetPrimaryBtnContent}>
                              <Ionicons name="heart-outline" size={scale(20)} color={CARD_BG} />
                              <Text style={styles.userSheetPrimaryBtnText}>Connect</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    
                    {isMatched && (
                      <View style={{ gap: verticalScale(12) }}>
                        <TouchableOpacity 
                          style={[styles.userSheetSecondaryBtn, { borderRadius: scale(999) }]}
                          onPress={handleViewProfile}
                        >
                          <Ionicons name="person-outline" size={scale(20)} color={BLUE} />
                          <Text style={styles.userSheetSecondaryBtnText}>View Profile</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.userSheetPrimaryBtn, { borderRadius: scale(999) }]}
                          onPress={handleStartChat}
                        >
                          <View style={styles.userSheetPrimaryBtnContent}>
                            <Ionicons name="chatbubbles-outline" size={scale(20)} color={CARD_BG} />
                            <Text style={styles.userSheetPrimaryBtnText}>Start Chat</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {isPending && !isRequester && (
                      <View style={styles.userSheetIncomingActions}>
                        <View style={styles.userSheetIncomingBtns}>
                          <TouchableOpacity 
                            style={[styles.userSheetDeclineBtn, { borderRadius: scale(999) }]}
                            onPress={handlePass}
                            disabled={loading}
                          >
                            <Ionicons name="close" size={scale(24)} color="#9E9E9E" />
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.userSheetAcceptBtn, { borderRadius: scale(999) }]}
                            onPress={handleAcceptRequest}
                            disabled={loading}
                          >
                            <View style={styles.userSheetAcceptBtnContent}>
                              <Ionicons name="checkmark" size={scale(24)} color={CARD_BG} />
                              <Text style={styles.userSheetAcceptBtnText}>Accept Request</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
            
            {/* Quick Actions Bar */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingVertical: verticalScale(16),
              paddingHorizontal: scale(20),
              borderTopWidth: 1,
              borderTopColor: "rgba(10, 14, 26, 0.06)",
              backgroundColor: CARD_BG,
            }}>
              <TouchableOpacity 
                onPress={handleShareProfile}
                style={{
                  alignItems: 'center',
                  gap: verticalScale(4),
                }}
              >
                <View style={{
                  width: scale(44),
                  height: scale(44),
                  borderRadius: scale(22),
                  backgroundColor: "rgba(27, 68, 205, 0.08)",
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="share-social-outline" size={scale(20)} color={BLUE} />
                </View>
                <Text style={{
                  fontFamily: Fonts.primary,
                  fontSize: scale(11),
                  color: "rgba(10, 14, 26, 0.6)",
                }}>
                  Share
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleBlock}
                style={{
                  alignItems: 'center',
                  gap: verticalScale(4),
                }}
              >
                <View style={{
                  width: scale(44),
                  height: scale(44),
                  borderRadius: scale(22),
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="ban-outline" size={scale(20)} color="#EF4444" />
                </View>
                <Text style={{
                  fontFamily: Fonts.primary,
                  fontSize: scale(11),
                  color: "rgba(10, 14, 26, 0.6)",
                }}>
                  Block
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    showNotification({
                      type: "info",
                      title: "Coming Soon",
                      message: "Report feature will be available soon",
                    });
                  }, 100);
                }}
                style={{
                  alignItems: 'center',
                  gap: verticalScale(4),
                }}
              >
                <View style={{
                  width: scale(44),
                  height: scale(44),
                  borderRadius: scale(22),
                  backgroundColor: "rgba(245, 158, 11, 0.08)",
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="flag-outline" size={scale(20)} color="#F59E0B" />
                </View>
                <Text style={{
                  fontFamily: Fonts.primary,
                  fontSize: scale(11),
                  color: "rgba(10, 14, 26, 0.6)",
                }}>
                  Report
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};