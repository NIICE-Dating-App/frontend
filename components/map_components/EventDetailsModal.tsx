// components/map_components/EventDetailsModal.tsx
// NO GRADIENTS - using solid background colors
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Animated as RNAnimated,
  Linking,
  Platform,
  Image,
  Share,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { BLUE, SCREEN_H, categoryDisplayNames, eventTypeDisplayNames } from "./constants";
import { EventData, EventCategory } from "./types";
import { styles } from "./styles";
import { useNotification } from "@/components/NotificationContext";
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

interface EventDetailsModalProps {
  visible: boolean;
  event: EventData | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwnEvent: boolean;
  currentUserId: string | null;
  currentUserAge: number | null;
  currentUserGender: string | null;
  onApplySuccess?: () => void;
  onEventUpdate?: (updatedEvent: EventData) => void;
  onEventSelect?: (eventId: string) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ 
  visible, 
  event, 
  onClose, 
  onEdit, 
  onDelete, 
  isOwnEvent, 
  currentUserId, 
  currentUserAge, 
  currentUserGender, 
  onApplySuccess, 
  onEventUpdate,
  onEventSelect
}) => {
  const { showNotification, showConfirmation } = useNotification();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;
  const panY = useRef(new RNAnimated.Value(0)).current;
  const startY = useRef(0);
  const isClosing = useRef(false);
  
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  
  // New state for enhancements
  const [attendees, setAttendees] = useState<any[]>([]);
  const [hostInfo, setHostInfo] = useState<any>(null);
  const [similarEvents, setSimilarEvents] = useState<any[]>([]);
  const [countdown, setCountdown] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      setApplyMessage('');
      const initialStatus = event?.user_application_status;
      
      if (initialStatus && initialStatus !== 'none' && initialStatus !== 'cancelled') {
        setApplicationStatus(initialStatus as 'pending' | 'approved' | 'rejected');
      } else {
        setApplicationStatus('none');
      }
      
      // Enhanced animation with backdrop fade and scale
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
      
      if (event && currentUserId && !isOwnEvent) {
        checkExistingApplication();
      }
    } else if (!isClosing.current) {
      // Smooth close animation
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
    }
  }, [visible, event, currentUserId]);
  
  const checkExistingApplication = async () => {
    if (!event || !currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('event_applications')
        .select('status')
        .eq('event_id', event.id)
        .eq('applicant_id', currentUserId)
        .maybeSingle();
      
      if (error) {
        console.warn("Could not check existing application:", error.message);
        return;
      }
      
      if (data) {
        setApplicationStatus(data.status as any);
      }
    } catch (err: any) {
      console.warn("Exception checking application:", err?.message);
    }
  };
  // Fetch attendees (approved event_applications)
  const fetchAttendees = async () => {
    if (!event) return;
    
    // Check access: only show attendees if user is host, approved, or event is public
    const canSeeAttendees = isOwnEvent || 
      applicationStatus === 'approved' || 
      event.event_type === 'public' ||
      event.event_type === 'group_event' ||
      event.event_type === 'community_event';
    
    if (!canSeeAttendees) {
      setAttendees([]);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('event_applications')
        .select('applicant_id, profiles(id, full_name, user_photos(photo_url))')
        .eq('event_id', event.id)
        .eq('status', 'approved')
        .limit(5);
      
      if (data) {
        const attendeesWithPhotos = await Promise.all(
          data.map(async (app: any) => {
            const profile = app.profiles;
            let photoUrl = profile?.user_photos?.[0]?.photo_url;
            
            if (photoUrl && !photoUrl.startsWith('http')) {
              const { data: signedData } = await supabase.storage
                .from("user_photos")
                .createSignedUrl(photoUrl, 3600);
              photoUrl = signedData?.signedUrl || null;
            }
            
            return {
              id: profile?.id,
              name: profile?.full_name,
              photo: photoUrl
            };
          })
        );
        
        setAttendees(attendeesWithPhotos);
      }
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  };
  
  // Fetch host information
  const fetchHostInfo = async () => {
    if (!event?.host_id) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, user_photos(photo_url)')
        .eq('id', event.host_id)
        .single();
      
      if (profile) {
        let photoUrl = profile.user_photos?.[0]?.photo_url;
        
        if (photoUrl && !photoUrl.startsWith('http')) {
          const { data: signedData } = await supabase.storage
            .from("user_photos")
            .createSignedUrl(photoUrl, 3600);
          photoUrl = signedData?.signedUrl || null;
        }
        
        // Count events hosted
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', event.host_id);
        
        setHostInfo({
          id: profile.id,
          name: profile.full_name,
          photo: photoUrl,
          eventsHosted: count || 0
        });
      }
    } catch (error) {
      console.error("Error fetching host info:", error);
    }
  };
  
  // Fetch similar events (same category, nearby)
  const fetchSimilarEvents = async () => {
    if (!event) return;
    
    try {
      const { data } = await supabase.rpc('get_nearby_events_with_coordinates', {
        p_user_lat: event.latitude,
        p_user_lng: event.longitude,
        p_radius_meters: 5000, // 5km radius
        p_status: 'active'
      });
      
      if (data) {
        const similar = data
          .filter((e: any) => 
            e.id !== event.id && 
            e.category === event.category &&
            new Date(e.time_end).getTime() > Date.now()
          )
          .slice(0, 3);
        
        setSimilarEvents(similar);
      }
    } catch (error) {
      console.error("Error fetching similar events:", error);
    }
  };
  
  // Generate vibe tags from description
  const generateVibeTags = () => {
    if (!event?.event_description) {
      setVibeTags([]);
      return;
    }
    
    const description = event.event_description.toLowerCase();
    const tags: string[] = [];
    
    const vibeKeywords = {
      'chill': ['chill', 'relaxed', 'laid back', 'casual', 'easy going'],
      'active': ['active', 'energetic', 'high energy', 'intense', 'workout'],
      'outdoor': ['outdoor', 'outside', 'nature', 'park', 'hike'],
      'social': ['social', 'meet', 'network', 'mingle', 'friends'],
      'competitive': ['competitive', 'compete', 'game', 'challenge'],
      'learning': ['learn', 'study', 'workshop', 'class', 'educational'],
      'creative': ['creative', 'art', 'craft', 'make', 'design'],
      'fun': ['fun', 'exciting', 'enjoyable', 'entertaining']
    };
    
    Object.entries(vibeKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => description.includes(keyword))) {
        tags.push(tag);
      }
    });
    
    setVibeTags(tags.slice(0, 3)); // Max 3 tags
  };
  
  // Update countdown timer
  useEffect(() => {
    if (!event || !visible) return;
    
    const updateCountdown = () => {
      const now = Date.now();
      const start = new Date(event.time_start).getTime();
      const diff = start - now;
      
      if (diff < 0) {
        const end = new Date(event.time_end).getTime();
        if (end > now) {
          setCountdown('Happening now!');
        } else {
          setCountdown('Event ended');
        }
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours < 1) {
        setCountdown(`Starts in ${minutes}m`);
      } else if (hours < 24) {
        setCountdown(`Starts in ${hours}h ${minutes}m`);
      } else {
        const days = Math.floor(hours / 24);
        setCountdown(`Starts in ${days}d ${hours % 24}h`);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [event, visible]);
  
  // Call fetch functions when modal opens
  useEffect(() => {
    if (visible && event) {
      fetchAttendees();
      fetchHostInfo();
      fetchSimilarEvents();
      generateVibeTags();
    }
  }, [visible, event, applicationStatus]);
  
  // Handle share event
  const handleShareEvent = async () => {
    if (!event) return;
    
    try {
      await Share.share({
        message: `Check out this event: ${event.event_name}
${event.location_name}
${new Date(event.time_start).toLocaleString()}`,
        title: 'Share Event',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };


  if (!event) return null;

  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  const eventTypeInfo = eventTypeDisplayNames[event.event_type || 'public'];
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const canSeeExactLocation = () => {
    if (isOwnEvent) return true;
    if (event.event_type !== 'private') return true;
    return applicationStatus === 'approved';
  };

  const getDisplayLocation = () => {
    if (!event?.location_name) return 'Location TBD';
    if (canSeeExactLocation()) {
      return event.location_name;
    }
    return `Near ${event.location_name.split(',')[0] || 'this area'}`;
  };

  // âœ… FIX: Close modal before showing notification/confirmation
  const openInGoogleMaps = () => {
    if (!canSeeExactLocation()) {
      onClose(); // âœ… Close modal first
      setTimeout(() => {
        showNotification({
          type: "info",
          title: "Location Hidden",
          message: "Exact location revealed after approval",
          duration: 4000,
        });
      }, 100);
      return;
    }
    
    const eventToNavigate = event; // Save reference
    
    onClose(); // âœ… Close modal first
    
    setTimeout(() => {
      showConfirmation({
        title: "Open in Maps",
        message: `Navigate to ${eventToNavigate.location_name}?`,
        confirmText: "Open",
        cancelText: "Cancel",
        confirmColor: BLUE,
        onConfirm: async () => {
          const url = Platform.select({
            ios: `maps://app?daddr=${eventToNavigate.latitude},${eventToNavigate.longitude}`,
            android: `google.navigation:q=${eventToNavigate.latitude},${eventToNavigate.longitude}`,
          });
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${eventToNavigate.latitude},${eventToNavigate.longitude}`;
          
          try {
            const supported = await Linking.canOpenURL(url!);
            if (supported) {
              await Linking.openURL(url!);
            } else {
              await Linking.openURL(fallbackUrl);
            }
          } catch {
            await Linking.openURL(fallbackUrl);
          }
        }
      });
    }, 100);
  };

  const handleTouchStart = (e: any) => {
    startY.current = e.nativeEvent.pageY;
  };

  const handleTouchMove = (e: any) => {
    const deltaY = e.nativeEvent.pageY - startY.current;
    if (deltaY > 0) {
      panY.setValue(deltaY);
    }
  };

  const handleTouchEnd = (e: any) => {
    const deltaY = e.nativeEvent.pageY - startY.current;
    if (deltaY > 100) {
      isClosing.current = true;
      panY.setValue(0);
      RNAnimated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    } else {
      RNAnimated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  };
  
  // âœ… FIX: Close modal before showing notifications
  const handleApply = async () => {
    if (!event || !currentUserId) return;
    
    setApplyLoading(true);
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_to_event', {
        p_event_id: event.id,
        p_message: applyMessage.trim() || null,
      });
      
      if (rpcError) {
        console.error("RPC error:", rpcError);
        
        onClose(); // âœ… Close modal first
        setTimeout(() => {
          showNotification({
            type: "error",
            title: "Failed to apply",
            message: rpcError.message || "Please try again",
          });
        }, 100);
        return;
      }
      
      if (rpcResult) {
        if (rpcResult.success) {
          const newStatus = rpcResult.status as 'approved' | 'pending';
          setApplicationStatus(newStatus);
          setApplyMessage('');
          
          if (onEventUpdate) {
            const updatedEvent: EventData = {
              ...event,
              user_application_status: newStatus,
              accepted_count: newStatus === 'approved' ? (event.accepted_count || 0) + 1 : event.accepted_count,
            };
            onEventUpdate(updatedEvent);
          }
          
          onApplySuccess?.();
          
          onClose(); // âœ… Close modal first
          setTimeout(() => {
            showNotification({
              type: "success",
              title: rpcResult.message,
            });
          }, 100);
        } else {
          if (rpcResult.status) {
            setApplicationStatus(rpcResult.status as 'approved' | 'pending' | 'rejected');
          }
          
          onClose(); // âœ… Close modal first
          setTimeout(() => {
            showNotification({
              type: "error",
              title: "Cannot Join",
              message: rpcResult.error || "Failed to apply",
            });
          }, 100);
        }
      }
    } catch (error: any) {
      console.error("Apply exception:", error);
      
      onClose(); // âœ… Close modal first
      setTimeout(() => {
        showNotification({
          type: "error",
          title: "Failed to apply",
          message: error.message,
        });
      }, 100);
    } finally {
      setApplyLoading(false);
    }
  };
  
  const handleViewApplications = () => {
    onClose();
    if (event.event_type === 'public') {
      router.push({
        pathname: "/(tabs_support)/host_applications_public",
        params: { eventId: event.id }
      });
    } else {
      router.push({
        pathname: "/(tabs_support)/host_applications",
        params: { eventId: event.id }
      });
    }
  };
  
  const requiresApplication = event.event_type === 'public_application' || event.event_type === 'private';
  const isDirectJoin = event.event_type === 'public' || event.event_type === 'group_event' || event.event_type === 'community_event';
  
  const checkEligibility = (): { eligible: boolean; reason: string | null } => {
    if (!event) return { eligible: true, reason: null };
    
    if (currentUserAge !== null) {
      if (currentUserAge < event.age_min) {
        return { eligible: false, reason: `Min age: ${event.age_min}` };
      }
      if (currentUserAge > event.age_max) {
        return { eligible: false, reason: `Max age: ${event.age_max}` };
      }
    }
    
    if (currentUserGender && event.gender_allowed && event.gender_allowed !== 'Everyone') {
      const userGenderLower = currentUserGender.toLowerCase();
      const allowedGender = event.gender_allowed.toLowerCase();
      const genderMatch = 
        (allowedGender === 'man' && userGenderLower === 'man') ||
        (allowedGender === 'woman' && userGenderLower === 'woman') ||
        (allowedGender === 'beyond binary' && userGenderLower === 'nonbinary');
      
      if (!genderMatch) {
        return { eligible: false, reason: `${event.gender_allowed} only` };
      }
    }

    return { eligible: true, reason: null };
  };
  
  const { eligible: isEligible, reason: ineligibilityReason } = checkEligibility();
  const canApply = applicationStatus === 'none' && !isOwnEvent && isEligible;
  
  const getActionButtonText = () => {
    if (applicationStatus === 'approved') return 'Joined';
    if (applicationStatus === 'pending') return 'Pending...';
    if (applicationStatus === 'rejected') return 'Rejected';
    if (!isEligible) return ineligibilityReason || 'Not Eligible';
    if (isDirectJoin) return 'Join Event';
    return 'Apply to Join';
  };

  // Get button background color based on status - NO GRADIENTS
  const getButtonBgColor = () => {
    if (applicationStatus === 'approved') return '#22C55E';
    if (applicationStatus === 'pending') return '#F59E0B';
    if (applicationStatus === 'rejected') return '#9CA3AF';
    if (!isEligible) return '#EF4444';
    return BLUE;
  };

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
            styles.modalContainer,
            {
              transform: [{ translateY: RNAnimated.add(slideAnim, panY) }],
              paddingBottom: Math.max(insets.bottom, 20)
            }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Swipeable handle area */}
            <View
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ paddingVertical: 8 }}
            >
              <View style={styles.modalHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <View style={styles.categoryBadge}>
                    <MaterialCommunityIcons name={(categoryInfo?.icon || 'circle') as any} size={14} color={BLUE} />
                    <Text style={styles.categoryBadgeText}>{categoryInfo?.label || 'Event'}</Text>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: `${eventTypeInfo?.color || '#1B44CD'}15` }]}>
                    <MaterialCommunityIcons name={eventTypeInfo.icon as any} size={14} color={eventTypeInfo?.color || BLUE} />
                    <Text style={[styles.categoryBadgeText, { color: eventTypeInfo?.color || BLUE }]}>{eventTypeInfo?.label || 'Event'}</Text>
                  </View>
                </View>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.event_name || 'Unnamed Event'}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={26} color="#0A0E1A" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ maxHeight: SCREEN_H * 0.5 }} showsVerticalScrollIndicator={false}>
              <View style={{ padding: 20, gap: 20 }}>
                {/* Attendees Count */}
                <View style={styles.attendeesCard}>
                  <Ionicons 
                    name={(event.accepted_count || 0) > 0 ? "checkmark-circle" : "people-outline"} 
                    size={18} 
                    color={(event.accepted_count || 0) > 0 ? "#22C55E" : BLUE} 
                  />
                  <Text style={[
                    styles.attendeesText,
                    { color: (event.accepted_count || 0) > 0 ? "#22C55E" : BLUE }
                  ]}>
                    {event.accepted_count || 0} {(event.accepted_count || 0) === 1 ? 'person' : 'people'} joining
                  </Text>
                  <Text style={styles.capacityText}>/ {event.capacity || 0} spots</Text>
                </View>

                {/* Countdown Timer - Always visible */}
                {countdown && countdown.length > 0 && (
                  <View style={{
                    backgroundColor: countdown.includes('now') ? '#22C55E15' : '#1B44CD08',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: countdown.includes('now') ? '#22C55E30' : '#1B44CD15',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: countdown.includes('now') ? '#22C55E25' : '#1B44CD15',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons 
                        name={countdown.includes('now') ? "radio-button-on" : "time-outline"} 
                        size={18} 
                        color={countdown.includes('now') ? '#22C55E' : BLUE} 
                      />
                    </View>
                    <Text style={{
                      fontSize: 15,
                      fontFamily: Fonts.bold,
                      color: countdown.includes('now') ? '#22C55E' : BLUE,
                      letterSpacing: 0.3,
                    }}>
                      {String(countdown)}
                    </Text>
                  </View>
                )}

                {/* Capacity Progress Bar with urgency */}
                {(() => {
                  const filled = (event.accepted_count || 0);
                  const total = event.capacity || 1;
                  const percentage = Math.min(100, Math.max(0, (filled / total) * 100));
                  const remaining = Math.max(0, total - filled);
                  
                  let barColor = '#22C55E'; // Green
                  if (percentage > 80) barColor = '#EF4444'; // Red
                  else if (percentage > 60) barColor = '#F59E0B'; // Yellow
                  
                  return (
                    <View style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      gap: 12,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontFamily: Fonts.bold, color: '#0A0E1A' }}>
                          Event Capacity
                        </Text>
                        {remaining <= 3 && remaining > 0 && (
                          <View style={{
                            backgroundColor: '#EF444415',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}>
                            <Text style={{ fontSize: 12, fontFamily: Fonts.bold, color: '#EF4444' }}>
                              {remaining === 1 ? '1 spot left!' : `${remaining} spots left!`}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={{
                        height: 8,
                        backgroundColor: '#E5E7EB',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: barColor,
                          borderRadius: 4,
                        }} />
                      </View>
                      
                      <Text style={{ fontSize: 13, fontFamily: Fonts.primary, color: '#6B7280' }}>
                        {String(filled)} / {String(total)} spots filled
                      </Text>
                    </View>
                  );
                })()}

                {/* Vibe Tags - Always visible if generated */}
                {vibeTags.length > 0 && (
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    {vibeTags.map((tag, index) => {
                      const tagColors: Record<string, string> = {
                        'chill': '#8B5CF6',
                        'active': '#EF4444',
                        'outdoor': '#10B981',
                        'social': '#3B82F6',
                        'competitive': '#F59E0B',
                        'learning': '#6366F1',
                        'creative': '#EC4899',
                        'fun': '#F97316'
                      };
                      const color = tagColors[tag] || '#6B7280';
                      
                      return (
                        <View key={`vibe-${index}`} style={{
                          backgroundColor: `${color}15`,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: `${color}30`,
                        }}>
                          <Text style={{
                            fontSize: 12,
                            fontFamily: Fonts.bold,
                            color: color,
                            textTransform: 'capitalize',
                          }}>
                            {String(tag || '')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Attendee Avatars Row - Access controlled */}
                {(() => {
                  const canSeeAttendees = isOwnEvent || 
                    applicationStatus === 'approved' || 
                    event.event_type === 'public' ||
                    event.event_type === 'group_event' ||
                    event.event_type === 'community_event';
                  
                  if (!canSeeAttendees || attendees.length === 0) return null;
                  
                  const displayAttendees = attendees.slice(0, 5);
                  const remaining = (event.accepted_count || 0) - displayAttendees.length;
                  
                  return (
                    <TouchableOpacity 
                      onPress={() => {
                        onClose();
                        router.push({
                          pathname: "/(tabs_support)/host_applications_public",
                          params: { eventId: event.id }
                        });
                      }}
                      activeOpacity={0.7}
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderRadius: 14,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontFamily: Fonts.bold, color: '#0A0E1A' }}>
                          Who's Coming
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -8 }}>
                        {displayAttendees.map((attendee, index) => (
                          <View key={attendee.id} style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            overflow: 'hidden',
                            backgroundColor: '#E5E7EB',
                            zIndex: displayAttendees.length - index,
                          }}>
                            {attendee.photo ? (
                              <Image source={{ uri: attendee.photo }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
                                <Ionicons name="person" size={20} color="#6B7280" />
                              </View>
                            )}
                          </View>
                        ))}
                        {remaining > 0 && (
                          <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                            backgroundColor: '#E5E7EB',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 0,
                          }}>
                            <Text style={{ fontSize: 12, fontFamily: Fonts.bold, color: '#6B7280' }}>
                              +{String(remaining)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })()}

                {/* Host Profile Card - Always visible */}
                {hostInfo && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (hostInfo.id === currentUserId) return; // Don't navigate to own profile
                      onClose();
                      router.push({
                        pathname: "/(tabs_support)/other_profile",
                        params: { userId: hostInfo.id }
                      });
                    }}
                    disabled={hostInfo.id === currentUserId}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 14,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      overflow: 'hidden',
                      backgroundColor: '#E5E7EB',
                    }}>
                      {hostInfo.photo ? (
                        <Image source={{ uri: hostInfo.photo }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1D5DB' }}>
                          <Ionicons name="person" size={24} color="#6B7280" />
                        </View>
                      )}
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontFamily: Fonts.bold, color: '#0A0E1A' }}>
                          {hostInfo.name}
                        </Text>
                        <View style={{
                          backgroundColor: '#1B44CD15',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}>
                          <Text style={{ fontSize: 10, fontFamily: Fonts.bold, color: BLUE }}>
                            HOST
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: Fonts.primary, color: '#6B7280', marginTop: 2 }}>
                        {hostInfo.eventsHosted === 1 ? 'Hosted 1 event' : `Hosted ${hostInfo.eventsHosted || 0} events`}
                      </Text>
                    </View>
                    
                    {hostInfo.id !== currentUserId && (
                      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                )}

                {/* Application Status Timeline - For events requiring application */}
                {(event.event_type === 'public_application' || event.event_type === 'private') && !isOwnEvent && applicationStatus !== 'none' && (
                  <View style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <Text style={{ fontSize: 14, fontFamily: Fonts.bold, color: '#0A0E1A', marginBottom: 16 }}>
                      Application Status
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',}}>
                      {['Applied', 'Under Review', 'Approved'].map((step, index) => {
                        const isActive = 
                          (index === 0) ||
                          (index === 1 && (applicationStatus === 'pending' || applicationStatus === 'approved')) ||
                          (index === 2 && applicationStatus === 'approved');
                        
                        const isRejected = applicationStatus === 'rejected' && index === 2;
                        
                        return (
                          <React.Fragment key={step}>
                            <View style={{ alignItems: 'center', flex: 1, minWidth: 60 }}>
                              <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isRejected ? '#EF444415' : isActive ? '#22C55E15' : '#E5E7EB',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 2,
                                borderColor: isRejected ? '#EF4444' : isActive ? '#22C55E' : '#D1D5DB',
                              }}>
                                <Ionicons 
                                  name={isRejected ? "close" : isActive ? "checkmark" : "ellipse-outline"} 
                                  size={16} 
                                  color={isRejected ? '#EF4444' : isActive ? '#22C55E' : '#9CA3AF'} 
                                />
                              </View>
                              <Text 
  numberOfLines={2}
  style={{
    fontSize: 10,
    fontFamily: Fonts.primary,
    color: isRejected ? '#EF4444' : isActive ? '#0A0E1A' : '#9CA3AF',
    paddingTop: 2,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 13,
  }}
>
  {isRejected && index === 2 ? 'Rejected' : step}
</Text>
                            </View>
                            
                            {index < 2 && (
                              <View style={{
                                height: 2,
                                flex: 0.8,
                                backgroundColor: isActive && index === 0 ? '#22C55E' : '#E5E7EB',
                                marginHorizontal: 4,
                                marginTop: 15,
                              }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>
                    
                    {applicationStatus === 'pending' && (
                      <Text style={{
                        fontSize: 12,
                        fontFamily: Fonts.primary,
                        color: '#6B7280',
                        marginTop: 12,
                        textAlign: 'center',
                        fontStyle: 'italic',
                      }}>
                        Usually replies within 24h
                      </Text>
                    )}
                  </View>
                )}

                {/* Location Preview Mini-Map */}
                {canSeeExactLocation() && (
                  <View style={{
                    height: 140,
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}>
                    <MapView
                      style={{ flex: 1 }}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={{
                        latitude: event.latitude,
                        longitude: event.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      pitchEnabled={false}
                      rotateEnabled={false}
                    >
                      <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: BLUE,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 3,
                          borderColor: '#FFFFFF',
                        }}>
                          <MaterialCommunityIcons name={categoryInfo.icon as any} size={20} color="#FFFFFF" />
                        </View>
                      </Marker>
                    </MapView>
                    
                    <TouchableOpacity 
                      onPress={openInGoogleMaps}
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: BLUE,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="navigate" size={14} color="#FFFFFF" />
                      <Text style={{ fontSize: 12, fontFamily: Fonts.bold, color: '#FFFFFF' }}>
                        Navigate
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                
                {/* Time */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={BLUE} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Starts</Text>
                      <Text style={styles.infoValue}>{formatTime(event.time_start)}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color={BLUE} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Ends</Text>
                      <Text style={styles.infoValue}>{formatTime(event.time_end)}</Text>
                    </View>
                  </View>
                </View>

                {/* Location */}
                <TouchableOpacity onPress={openInGoogleMaps} activeOpacity={0.7}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Ionicons 
                        name={canSeeExactLocation() ? "location-outline" : "locate-outline"} 
                        size={20} 
                        color={canSeeExactLocation() ? BLUE : "#8B5CF6"} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>
                          {canSeeExactLocation() ? "Location" : "Approximate Location"}
                        </Text>
                        <Text style={styles.infoValue}>{getDisplayLocation()}</Text>
                        {!canSeeExactLocation() && event.event_type === 'private' && (
                          <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 4, fontStyle: 'italic' }}>
                            Exact location revealed after approval
                          </Text>
                        )}
                      </View>
                      {canSeeExactLocation() && (
                        <Ionicons name="chevron-forward" size={20} color="rgba(10, 14, 26, 0.3)" />
                      )}
                      {!canSeeExactLocation() && (
                        <Ionicons name="lock-closed" size={16} color="#8B5CF6" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Description */}
                {event.event_description && event.event_description.trim() && (
                  <View style={styles.infoCard}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.descText}>{event.event_description}</Text>
                  </View>
                )}

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailBox}>
                    <Ionicons name="people-outline" size={18} color={BLUE} />
                    <Text style={styles.detailBoxText}>{event.capacity || 0} spots</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Ionicons name="person-outline" size={18} color={BLUE} />
                    <Text style={styles.detailBoxText}>{event.age_min || 18}-{event.age_max || 99} y/o</Text>
                  </View>
                </View>
                
                {/* Gender Preference */}
                {event.gender_allowed && (
                  <View style={[styles.detailsGrid, { marginTop: 10 }]}>
                    <View style={[styles.detailBox, { flex: 1 }]}>
                      <MaterialCommunityIcons 
                        name={
                          event.gender_allowed === 'Man' ? 'gender-male' :
                          event.gender_allowed === 'Woman' ? 'gender-female' :
                          event.gender_allowed === 'Beyond Binary' ? 'gender-non-binary' :
                          'gender-male-female'
                        } 
                        size={18} 
                        color={BLUE} 
                      />
                      <Text style={styles.detailBoxText}>
                        {event.gender_allowed === 'Everyone' ? 'Open to Everyone' : `${event.gender_allowed} Only`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Similar Events - Always visible */}
                {similarEvents.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{
                      fontSize: 16,
                      fontFamily: Fonts.bold,
                      color: '#0A0E1A',
                      marginBottom: 12,
                    }}>
                      Similar Events Nearby
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                      {similarEvents.map((similarEvent) => (
                        <TouchableOpacity
                          key={similarEvent.id}
                          onPress={() => {
                            onClose();
                            setTimeout(() => {
                              if (onEventSelect) {
                                // Parent will handle opening the modal with the new event
                                onEventSelect(similarEvent.id);
                              }
                            }, 300);
                          }}
                          style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            flexDirection: 'row',
                            gap: 12,
                          }}
                        >
                          <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: '#1B44CD15',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#1B44CD30',
                          }}>
                            <MaterialCommunityIcons 
                              name={(categoryDisplayNames[similarEvent.category as EventCategory] || categoryDisplayNames.other).icon as any} 
                              size={24} 
                              color={BLUE} 
                            />
                          </View>
                          
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 14,
                              fontFamily: Fonts.bold,
                              color: '#0A0E1A',
                              marginBottom: 4,
                            }} numberOfLines={1}>
                              {similarEvent.event_name || 'Unnamed Event'}
                            </Text>
                            <Text style={{
                              fontSize: 12,
                              fontFamily: Fonts.primary,
                              color: '#6B7280',
                            }} numberOfLines={1}>
                              {similarEvent.time_start ? new Date(similarEvent.time_start).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              }) : 'TBD'}
                            </Text>
                          </View>
                          
                          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

              </View>
            </ScrollView>

            {/* Action Buttons - NO GRADIENTS */}
            <View style={styles.modalFooter}>
              {isOwnEvent ? (
                <View style={{ flex: 1, gap: 10 }}>
                  {/* Share Event Button */}
                  <TouchableOpacity 
                    onPress={handleShareEvent}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderWidth: 1.5,
                      borderColor: 'rgba(16, 185, 129, 0.2)',
                      gap: 7,
                    }}
                  >
                    <Ionicons name="share-social-outline" size={19} color="#10B981" />
                    <Text style={{
                      fontSize: 14,
                      fontFamily: Fonts.bold,
                      color: '#10B981',
                      letterSpacing: 0.2,
                    }}>
                      Share Event
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={handleViewApplications} style={styles.applicationsBtnFull}>
                    <Ionicons name="people" size={20} color={BLUE} />
                    <Text style={styles.applicationsBtnText}>
                      {event.event_type === 'public' ? 'See Participants' : 'View Applications'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="rgba(27, 68, 205, 0.5)" />
                  </TouchableOpacity>
                  
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={onDelete} style={styles.deleteBtnSmall}>
                      <Ionicons name="trash-outline" size={20} color="#D5222B" />
                    </TouchableOpacity>
                    {/* Edit button - solid color, NO GRADIENT */}
                    <TouchableOpacity onPress={onEdit} style={styles.editBtnFull}>
                      <View style={[styles.editBtnGradient, { backgroundColor: BLUE }]}>
                        <Ionicons name="create-outline" size={20} color="#FFF" />
                        <Text style={styles.editBtnText}>Edit Event</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => {
                    if (canApply) {
                      if (requiresApplication) {
                        onClose();
                        router.push({
                          pathname: "/(tabs_support)/event_application_user",
                          params: { eventId: event.id }
                        });
                      } else {
                        handleApply();
                      }
                    }
                  }}
                  style={[
                    styles.applyBtn,
                    !canApply && styles.applyBtnDisabled,
                    applicationStatus === 'approved' && styles.applyBtnJoined,
                    !isEligible && styles.applyBtnIneligible,
                  ]}
                  disabled={!canApply || applyLoading}
                >
                  {/* Apply button - solid color, NO GRADIENT */}
                  <View style={[styles.applyBtnContent, { backgroundColor: getButtonBgColor() }]}>
                    <Ionicons 
                      name={
                        applicationStatus === 'approved' ? 'checkmark-circle' :
                        applicationStatus === 'pending' ? 'hourglass-outline' :
                        applicationStatus === 'rejected' ? 'close-circle' :
                        !isEligible ? 'ban' :
                        requiresApplication ? 'paper-plane' : 'enter-outline'
                      } 
                      size={19} 
                      color="#FFF" 
                    />
                    <Text style={styles.applyBtnText}>
                      {applyLoading ? 'Sending...' : getActionButtonText()}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {/* Share Event Button - For non-owners */}
              {!isOwnEvent && (
                <TouchableOpacity 
                  onPress={handleShareEvent}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    marginTop: 10,
                    borderRadius: 14,
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                    gap: 7,
                  }}
                >
                  <Ionicons name="share-social-outline" size={19} color="#10B981" />
                  <Text style={{
                    fontSize: 14,
                    fontFamily: Fonts.bold,
                    color: '#10B981',
                    letterSpacing: 0.2,
                  }}>
                    Share Event
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};