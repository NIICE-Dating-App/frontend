// app/(tabs)/map.tsx
// OPTION A FIX: Stabilized callbacks, removed duplicate triggers, fixed retry logic
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Easing,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import MapView, { Camera, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActiveFramesModal from "../(frames)/active_frames";

// Import all components from map_components
import {
  CreateEventButton,
  DEFAULT_PROFILE_PHOTO,
  EventData,
  EventDetailsModal,
  EventMarker,
  FALLBACK,
  FilterButton,
  FilterModal,
  FilterState,
  googleBlueStyle,
  haversineMeters,
  IiLoader,
  LocateFab,
  // Components
  ProfileMarker,
  QuickFilterChip,
  SCREEN_H,
  SCREEN_W,
  signPath,
  smoothPoint,
  // Styles
  styles,
  TAB_HEIGHT,
  // Utilities
  toStoragePath,
  updateUserLocationInDB,
  // Types
  UserMapCard,
  UserMarker,
  UserPreferences,
  UserProfileModal
} from "@/components/map_components";
import { useNotification } from "@/components/NotificationContext";



/* ===================== MAIN SCREEN ===================== */
export default function MapScreen() {
  const { showNotification, showConfirmation } = useNotification();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fabRotation = useRef(new RNAnimated.Value(0)).current;

  const [pos, setPos] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(DEFAULT_PROFILE_PHOTO);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAge, setCurrentUserAge] = useState<number | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  
  // User discovery states
  const [users, setUsers] = useState<UserMapCard[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserMapCard | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showFrameViewerMain, setShowFrameViewerMain] = useState(false);
  const [frameViewerFrames, setFrameViewerFrames] = useState<any[]>([]);
  
  // Filter state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    ageMin: 18, ageMax: 99, distanceKm: 4, interestedIn: ['man', 'woman', 'nonbinary'],
  });
  const [filters, setFilters] = useState<FilterState>({
    ageMin: 18, ageMax: 99, distanceKm: 4, genders: ['man', 'woman', 'nonbinary'],
    intentions: undefined,
    activeToday: false,
  });
  
  const EVENT_RADIUS_METERS = 30000;

  const lastRawPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const smoothPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCameraAtRef = useRef<number>(0);
  const lastSetPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const cameraPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  
  // âœ… NEW: Refs to access latest values without recreating functions
  const posRef = useRef(pos);
  const currentUserIdRef = useRef(currentUserId);
  
  // Keep refs in sync with state
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const plusRef = useRef<View>(null);
  const [revealVisible, setRevealVisible] = useState(false);
  const revealAnim = useRef(new RNAnimated.Value(0)).current;
  const [revealOrigin, setRevealOrigin] = useState({ x: 0, y: 0 });
  const [revealScaleFinal, setRevealScaleFinal] = useState(1);
  const BASE_DIAM = 40;

  const startPlusReveal = useCallback(() => {
    plusRef.current?.measureInWindow?.((x, y, w, h) => {
      const cx = x + w / 2, cy = y + h / 2;
      const dx = Math.max(cx, SCREEN_W - cx);
      const dy = Math.max(cy, SCREEN_H - cy);
      const maxRadius = Math.sqrt(dx * dx + dy * dy);
      const finalScale = (maxRadius * 2) / BASE_DIAM;

      setRevealOrigin({ x: cx, y: cy });
      setRevealScaleFinal(finalScale);
      setRevealVisible(true);

      revealAnim.setValue(0);
      RNAnimated.timing(revealAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          router.push("/(events)/add_event");
          setTimeout(() => setRevealVisible(false), 200);
        }
      });
    });
  }, [revealAnim, router]);

  // Auth setup
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          console.log("User authenticated:", session.user.id);
          setCurrentUserId(session.user.id);
          
          const userId = session.user.id;
          const { data: mainPhoto } = await supabase
            .from("user_photos")
            .select("photo_url")
            .eq("user_id", userId)
            .eq("is_main", true)
            .maybeSingle();

          if (mainPhoto?.photo_url) {
            const storagePath = toStoragePath(mainPhoto.photo_url);
            const signed = await signPath(storagePath);
            setUserProfilePhoto(signed ?? mainPhoto.photo_url);
          } else {
            setUserProfilePhoto(null);
          }
          
          const { data: profilePrefs } = await supabase
            .from('profiles')
            .select('age_pref_min, age_pref_max, distance_km, interested_in, age, gender')
            .eq('id', userId)
            .single();
          
          if (profilePrefs) {
            setCurrentUserAge(profilePrefs.age ?? null);
            setCurrentUserGender(profilePrefs.gender ?? null);
            
            const prefs: UserPreferences = {
              ageMin: profilePrefs.age_pref_min || 18,
              ageMax: profilePrefs.age_pref_max || 99,
              distanceKm: profilePrefs.distance_km || 4,
              interestedIn: profilePrefs.interested_in || ['man', 'woman', 'nonbinary'],
            };
            setUserPrefs(prefs);
            setFilters({
              ageMin: prefs.ageMin,
              ageMax: prefs.ageMax,
              distanceKm: prefs.distanceKm,
              genders: prefs.interestedIn as ('man' | 'woman' | 'nonbinary')[],
              intentions: undefined,
              activeToday: false,
            });
          }
        } else {
          console.log("[ERROR] No session found");
        }
        
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user && mounted) {
            console.log("Auth state changed, user:", session.user.id);
            setCurrentUserId(session.user.id);
          }
        });
        authSubscription = data.subscription;
      } catch (error) {
        console.error("Auth setup error:", error);
        setUserProfilePhoto(null);
      }
    })();
    
    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // âœ… FIX #1: Stable fetchEvents - uses refs to always get current values
  const fetchEvents = useCallback(async () => {
    // Access current values from refs (always up-to-date)
    const currentPos = posRef.current;
    const userId = currentUserIdRef.current;
    
    if (!currentPos || !userId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_nearby_events_with_coordinates', {
        p_user_lat: currentPos.lat,
        p_user_lng: currentPos.lng,
        p_radius_meters: EVENT_RADIUS_METERS,
        p_status: 'active'
      });

      if (error) {
        console.error("[ERROR] Error fetching events:", error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`RPC returned ${data.length} events`);
        
        const validEvents = data.filter((event: any) => {
          if (!event.latitude || !event.longitude) {
            console.log(`   [WARN] Skipping ${event.event_name}: missing lat/lng`);
            return false;
          }
          const eventEndTime = new Date(event.time_end).getTime();
          const isValid = eventEndTime >= Date.now();
          if (!isValid) {
            console.log(`   [WARN] Skipping ${event.event_name}: expired`);
          }
          return isValid;
        });
        
        console.log(`After time filter: ${validEvents.length} valid events`);
        
        const eventIds = validEvents.map((e: any) => e.id);
        let userApplicationMap = new Map<string, string>();
        let userInviteSet = new Set<string>();
        
        if (userId && eventIds.length > 0) {
          try {
            const { data: userAppData } = await supabase
              .from('event_applications')
              .select('event_id, status')
              .in('event_id', eventIds)
              .eq('applicant_id', userId);
            
            if (userAppData) {
              userAppData.forEach((a: any) => {
                userApplicationMap.set(a.event_id, a.status);
              });
              console.log(`Found ${userAppData.length} applications for current user`);
            }
          } catch (err) {
            console.warn("Could not fetch user applications");
          }
          
          try {
            const { data: inviteData } = await supabase
              .from('event_invites')
              .select('event_id')
              .in('event_id', eventIds)
              .eq('invited_user_id', userId);
            
            if (inviteData) {
              inviteData.forEach((inv: any) => {
                userInviteSet.add(inv.event_id);
              });
            }
          } catch (err) {
            console.warn("Could not fetch invites");
          }
        }
        
        const enrichedEvents = validEvents.map((event: any) => {
          const eventType = event.event_type || 'public';
          const fuzzyRadius = event.fuzzy_radius_meters || 500;
          const acceptedCount = typeof event.accepted_count === 'string' 
            ? parseInt(event.accepted_count, 10) 
            : (event.accepted_count || 0);
          
          return {
            ...event,
            latitude: typeof event.latitude === 'string' ? parseFloat(event.latitude) : event.latitude,
            longitude: typeof event.longitude === 'string' ? parseFloat(event.longitude) : event.longitude,
            event_type: eventType,
            fuzzy_radius_meters: fuzzyRadius,
            accepted_count: acceptedCount,
            user_application_status: userApplicationMap.get(event.id) || 'none',
          };
        });
        
        const visibleEvents = enrichedEvents.filter((event: any) => {
          const eventType = event.event_type;
          
          if (event.host_id === userId) return true;
          
          if (eventType === 'public' || eventType === 'public_application' || eventType === 'private') {
            return true;
          }
          
          if (eventType === 'invite_only' && userInviteSet.has(event.id)) {
            return true;
          }
          
          return false;
        });
        
        console.log(`Loaded ${visibleEvents.length} events to display`);
        visibleEvents.forEach((e: any) => {
          console.log(`   ${e.event_name}: type=${e.event_type}, count=${e.accepted_count}, status=${e.user_application_status}`);
        });
        
        setEvents(visibleEvents as EventData[]);
      } else {
        console.log(`RPC returned no events`);
        setEvents([]);
      }
    } catch (error) {
      console.error("Exception in fetchEvents:", error);
    }
  }, []); // âœ… Empty dependencies - stable function

  // âœ… FIX #2: Stable fetchUsers - uses refs to always get current values
  const fetchUsers = useCallback(async () => {
    const userId = currentUserIdRef.current;
    
    if (!userId) {
      console.log("[WARN] No currentUserId, can't fetch users");
      return false; // Return success status
    }
    
    try {
      console.log(`Fetching users...`);
      
      const { data, error } = await supabase.rpc('get_map_cards', {});

      if (error) {
        console.error("[ERROR] Error fetching users:", error);
        return false;
      }
      
      if (data && data.length > 0) {
        console.log(`Loaded ${data.length} user(s) on map`);
        
        const userIds = data.map((u: any) => u.user_id);
        const { data: genderData } = await supabase
          .from('profiles')
          .select('id, gender')
          .in('id', userIds);
        
        const genderMap: Record<string, string> = {};
        genderData?.forEach((p: any) => {
          genderMap[p.id] = p.gender?.toLowerCase() || '';
        });
        
        data.forEach((u: any) => {
          console.log(`   ${u.full_name}, age ${u.age}, gender: ${genderMap[u.user_id] || 'unknown'}, access: ${u.access_level || 'unknown'}`);
        });
        
        const usersWithPhotosAndGender = await Promise.all(
          data.map(async (user: any) => {
            let photoUrl = user.main_photo_url;
            if (photoUrl && !photoUrl.startsWith('http')) {
              const { data: signedData } = await supabase.storage
                .from("user_photos")
                .createSignedUrl(photoUrl, 3600);
              photoUrl = signedData?.signedUrl || null;
            }
            return { 
              ...user, 
              main_photo_url: photoUrl,
              gender: genderMap[user.user_id] || null 
            };
          })
        );
        
        setUsers(usersWithPhotosAndGender as UserMapCard[]);
        return true; // Success
      } else if (data) {
        console.log("No users found on map");
        setUsers([]);
        return true; // Success (empty result)
      }
      return false;
    } catch (error) {
      console.error("Exception in fetchUsers:", error);
      return false;
    }
  }, []); // âœ… Empty dependencies - stable function

  // âœ… FIX #3: REMOVED duplicate initial fetch effect
  // This was causing unnecessary fetches on every pos/currentUserId change

  // âœ… FIX #4: Fixed retry logic - fetches BOTH users and events on initial load
useEffect(() => {
  if (!currentUserId || !pos) return;
  
  let isMounted = true;
  
  const fetchInitialData = async () => {
    // âœ… FETCH EVENTS IMMEDIATELY
    if (posRef.current && currentUserIdRef.current) {
      console.log("Fetching initial events...");
      fetchEvents();
    }
    
    // âœ… FETCH USERS WITH RETRY LOGIC
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!isMounted) return;
      
      if (attempt > 0) {
        const delay = attempt * 1000; // 1s, 2s
        console.log(`Retry ${attempt}: waiting ${delay}ms before fetching users...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (!isMounted) return;
      
      const success = await fetchUsers();
      
      if (success) {
        console.log(`âœ… Users fetch succeeded on attempt ${attempt + 1}`);
        return; // âœ… SUCCESS - STOP RETRYING
      }
      
      console.log(`âŒ Users fetch failed on attempt ${attempt + 1}`);
    }
    
    console.warn("All retry attempts failed");
  };
  
  fetchInitialData();
  
  return () => {
    isMounted = false;
  };
}, [currentUserId, pos, fetchEvents, fetchUsers]); // âœ… Add fetch functions to deps

  // âœ… FIX #5: Refresh on screen focus - stable functions access latest values via refs
  useFocusEffect(
    useCallback(() => {
      console.log("Map screen focused - refreshing events and users");
      // Functions are stable but access latest values via refs
      if (posRef.current && currentUserIdRef.current) {
        fetchEvents();
        fetchUsers();
      }
    }, []) // âœ… Empty array - only triggers on focus, not on every state change
  );

  // Set up real-time subscription
  useEffect(() => {
    console.log("Setting up real-time subscriptions...");

    const eventsChannel = supabase
      .channel("events_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        (payload) => {
          console.log("Real-time event:", payload.eventType);
          
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            console.log("Refetching events");
            fetchEvents();
          } else if (payload.eventType === "DELETE") {
            const eventId = (payload.old as any)?.id;
            if (eventId) {
              setEvents(prev => prev.filter(e => e.id !== eventId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Events real-time connected");
        }
      });

    const applicationsChannel = supabase
      .channel("event_applications_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_applications" },
        (payload) => {
          console.log("Event application changed:", payload.eventType, payload.new || payload.old);
          
          const eventId = (payload.new as any)?.event_id || (payload.old as any)?.event_id;
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          
          if (eventId) {
            let countDelta = 0;
            
            if (payload.eventType === "INSERT" && newStatus === 'approved') {
              countDelta = 1;
            } else if (payload.eventType === "DELETE" && oldStatus === 'approved') {
              countDelta = -1;
            } else if (payload.eventType === "UPDATE") {
              if (oldStatus !== 'approved' && newStatus === 'approved') {
                countDelta = 1;
              } else if (oldStatus === 'approved' && newStatus !== 'approved') {
                countDelta = -1;
              }
            }
            
            if (countDelta !== 0) {
              setEvents(prev => {
                return prev.map(event => {
                  if (event.id !== eventId) return event;
                  
                  const newCount = Math.max(0, (event.accepted_count || 0) + countDelta);
                  console.log(`   Updating ${event.event_name} count: ${event.accepted_count} â†’ ${newCount}`);
                  return { ...event, accepted_count: newCount };
                });
              });
              
              setSelectedEvent(prev => {
                if (!prev || prev.id !== eventId) return prev;
                const newCount = Math.max(0, (prev.accepted_count || 0) + countDelta);
                console.log(`   Updating selected event count: ${prev.accepted_count} â†’ ${newCount}`);
                return { ...prev, accepted_count: newCount };
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Event applications real-time connected");
        }
      });

    const profilesChannel = supabase
      .channel("profiles_updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          console.log("Profile updated, refreshing users...");
          setTimeout(() => {
            fetchUsers();
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Profiles real-time connected");
        }
      });

    return () => {
      eventsChannel.unsubscribe();
      applicationsChannel.unsubscribe();
      profilesChannel.unsubscribe();
    };
  }, []); // âœ… Empty dependencies - stable subscriptions, use stable fetch functions

  // Periodic cleanup for expired events
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const now = Date.now();
        const active = prev.filter(e => new Date(e.time_end).getTime() > now);
        if (active.length !== prev.length) {
          console.log(`Removed ${prev.length - active.length} expired events`);
        }
        return active;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Location tracking
  useEffect(() => {
    let subPos: Location.LocationSubscription | null = null;
    let subHeading: Location.LocationSubscription | null = null;
    let locationUpdateTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied, using fallback location");
          const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
          setPos(fallback);
          smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          cameraPositionRef.current = { lat: fallback.lat, lng: fallback.lng };
          setLoading(false);
          
          setTimeout(() => {
            mapRef.current?.animateCamera(
              { center: { latitude: fallback.lat, longitude: fallback.lng }, zoom: 16, pitch: 0, heading: 0 },
              { duration: 400 }
            );
            lastCameraAtRef.current = Date.now();
          }, 0);
          return;
        }

        let initial;
        try {
          initial = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (locationError) {
          console.log("Could not get current location, using fallback:", locationError);
          const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
          setPos(fallback);
          smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          cameraPositionRef.current = { lat: fallback.lat, lng: fallback.lng };
          setLoading(false);
          
          setTimeout(() => {
            mapRef.current?.animateCamera(
              { center: { latitude: fallback.lat, longitude: fallback.lng }, zoom: 16, pitch: 0, heading: 0 },
              { duration: 400 }
            );
            lastCameraAtRef.current = Date.now();
          }, 0);
          return;
        }

        const init = { lat: initial.coords.latitude, lng: initial.coords.longitude, acc: initial.coords.accuracy ?? 30 };
        console.log("Got user location:", init.lat, init.lng);
        setPos(init);
        lastSetPosRef.current = { lat: init.lat, lng: init.lng };
        lastRawPosRef.current = { lat: init.lat, lng: init.lng };
        smoothPosRef.current = { lat: init.lat, lng: init.lng };
        cameraPositionRef.current = { lat: init.lat, lng: init.lng };

        if (currentUserId) {
          console.log("Saving initial location to database...");
          const saved = await updateUserLocationInDB(currentUserId, init.lat, init.lng);
          if (saved) {
            console.log("Location saved successfully, users can now discover this user");
          } else {
            console.warn("[WARN] Failed to save location, other users may not see this user");
          }
        }

        locationUpdateTimer = setInterval(() => {
          if (currentUserId && smoothPosRef.current) {
            updateUserLocationInDB(currentUserId, smoothPosRef.current.lat, smoothPosRef.current.lng);
          }
        }, 30000);

        setTimeout(() => {
          mapRef.current?.animateCamera(
            { center: { latitude: init.lat, longitude: init.lng }, zoom: 16, pitch: 0, heading: 0 },
            { duration: 400 }
          );
          lastCameraAtRef.current = Date.now();
        }, 0);

        try {
          subPos = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 1500, distanceInterval: 8 },
            (loc) => {
              const { latitude, longitude } = loc.coords;
              const locAcc: number | undefined = loc.coords.accuracy ?? undefined;
              const raw = { lat: latitude, lng: longitude };

              const prevRaw = lastRawPosRef.current;
              if (prevRaw) {
                const jump = haversineMeters(prevRaw, raw);
                if ((locAcc ?? 999) > 80 && jump > 50) {
                  console.log("Rejected GPS jump:", jump.toFixed(1), "m, accuracy:", locAcc);
                  return;
                }
                if (jump > 200) {
                  console.log("Rejected unrealistic jump:", jump.toFixed(1), "m");
                  return;
                }
              }
              lastRawPosRef.current = raw;

              const prevSmooth = smoothPosRef.current ?? raw;
              const smoothed = smoothPoint(prevSmooth, raw, locAcc);
              smoothPosRef.current = smoothed;

              const lastSet = lastSetPosRef.current ?? smoothed;
              const movedSinceSet = haversineMeters(lastSet, smoothed);

              if (movedSinceSet >= 5) {
                setPos({ lat: smoothed.lat, lng: smoothed.lng, acc: locAcc ?? 25 });
                lastSetPosRef.current = { lat: smoothed.lat, lng: smoothed.lng };
                
                if (currentUserId && movedSinceSet > 50) {
                  updateUserLocationInDB(currentUserId, smoothed.lat, smoothed.lng);
                }
              }

              if (isFollowing) {
                const now = Date.now();
                const lastCam = lastCameraAtRef.current;
                
                const camPos = cameraPositionRef.current ?? smoothed;
                const distFromCamera = haversineMeters(camPos, smoothed);

                if (distFromCamera > 15 && now - lastCam >= 1200 && (locAcc ?? 999) < 100) {
                  console.log("Following user - moved", distFromCamera.toFixed(1), "m from camera");
                  mapRef.current?.animateCamera(
                    { center: { latitude: smoothed.lat, longitude: smoothed.lng }, pitch: 0, heading: 0 },
                    { duration: 400 }
                  );
                  cameraPositionRef.current = { lat: smoothed.lat, lng: smoothed.lng };
                  lastCameraAtRef.current = now;
                }
              }
            }
          );
        } catch (watchError) {
          console.log("Could not watch position, using static location:", watchError);
        }

        try {
          subHeading = await Location.watchHeadingAsync((h) => {
            const deg = Number.isFinite(h?.trueHeading) && h.trueHeading >= 0 ? h.trueHeading : h.magHeading ?? 0;
            setHeadingDeg(deg);
          });
        } catch (headingError) {
          console.log("Could not watch heading:", headingError);
        }
      } catch (error) {
        console.error("Location setup error:", error);
        const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
        setPos(fallback);
        smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
        lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      subPos?.remove?.();
      subHeading?.remove?.();
      if (locationUpdateTimer) {
        clearInterval(locationUpdateTimer);
      }
    };
  }, [isFollowing, currentUserId]);

  const initialCamera: Camera = useMemo(() => ({
    center: { latitude: pos?.lat ?? FALLBACK.lat, longitude: pos?.lng ?? FALLBACK.lng },
    zoom: 16, heading: 0, pitch: 0, altitude: 0,
  }), [pos]);

  const recenter = useCallback(() => {
    const c = pos ?? { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
    setIsFollowing(true);
    cameraPositionRef.current = { lat: c.lat, lng: c.lng };
    mapRef.current?.animateCamera({ center: { latitude: c.lat, longitude: c.lng }, zoom: 16, pitch: 0, heading: 0 }, { duration: 400 });
    RNAnimated.sequence([
      RNAnimated.timing(fabRotation, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      RNAnimated.timing(fabRotation, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
    ]).start();
  }, [pos, fabRotation]);


  // Quick filter chip handlers
  const handleQuickAgeFilter = useCallback(() => {
    setShowFilterModal(true);
  }, []);
  
  const handleQuickHeightFilter = useCallback(() => {
    showNotification({
      type: "info",
      title: "Coming Soon",
      message: "Height filter will be available soon",
      duration: 3000,
    });
  }, [showNotification]);
  
  const handleQuickIntentionsFilter = useCallback(() => {
    setShowFilterModal(true);
  }, []);
  
  const handleQuickActiveTodayToggle = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      activeToday: !prev.activeToday,
    }));
  }, []);
  
  const handleQuickMoreFilters = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  // âœ… FIX #6: Auto-refresh every 30 seconds - stable function with ref access
  useEffect(() => {
    if (!currentUserId || !pos) return;
    
    const refreshInterval = setInterval(() => {
      // Only refresh if we still have valid data
      if (currentUserIdRef.current && posRef.current) {
        console.log("Auto-refreshing users (30s interval)...");
        fetchUsers();
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [currentUserId, pos]); // âœ… Set up interval when userId/pos become available

  // Filter users based on current filter state
  const filteredUsers = useMemo(() => {
    if (!pos) return users;
    
    const filtered = users.filter(user => {
      // Age filter
      if (user.age < filters.ageMin || user.age > filters.ageMax) return false;
      
      // Distance filter
      const distanceMeters = haversineMeters(pos, { lat: user.approx_lat, lng: user.approx_lng });
      if (distanceMeters > filters.distanceKm * 1000) return false;
      
      // Gender filter
      if (user.gender && filters.genders.length > 0) {
        const userGender = user.gender.toLowerCase();
        if (!filters.genders.includes(userGender as 'man' | 'woman' | 'nonbinary')) {
          return false;
        }
      }
      
      // Intentions filter (looking_for)
      if (filters.intentions && filters.intentions.length > 0) {
        if (!user.looking_for || user.looking_for.length === 0) return false;
        const hasMatchingIntention = filters.intentions.some(intention => 
          user.looking_for?.includes(intention)
        );
        if (!hasMatchingIntention) return false;
      }
      
      // Active today filter (last 24 hours)
      if (filters.activeToday) {
        if (!user.last_seen) return false;
        const lastSeenTime = new Date(user.last_seen).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (lastSeenTime < oneDayAgo) return false;
      }
      
      return true;
    });
    
    console.log(`Filter applied: ${filtered.length}/${users.length} users shown (age: ${filters.ageMin}-${filters.ageMax}, dist: ${filters.distanceKm}km, genders: ${filters.genders.join(',')}, intentions: ${filters.intentions?.length || 0}, activeToday: ${filters.activeToday || false})`);
    return filtered;
  }, [users, filters, pos]);
  
  const hasActiveFilters = useMemo(() => {
    const hasBasicFilters = filters.ageMin !== userPrefs.ageMin || 
      filters.ageMax !== userPrefs.ageMax ||
      filters.distanceKm !== userPrefs.distanceKm || 
      filters.genders.length !== userPrefs.interestedIn.length ||
      !filters.genders.every(g => userPrefs.interestedIn.includes(g));
    
    const hasIntentionsFilter = filters.intentions && filters.intentions.length > 0;
    const hasActiveTodayFilter = filters.activeToday === true;
    
    return hasBasicFilters || hasIntentionsFilter || hasActiveTodayFilter;
  }, [filters, userPrefs]);

  if (loading) return <IiLoader />;

  const fabSpin = fabRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const FAB_LOWERING = verticalScale(30);
  const revealScale = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.001, revealScaleFinal] });

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef} 
        style={styles.map} 
        provider={PROVIDER_GOOGLE} 
        initialCamera={initialCamera} 
        customMapStyle={googleBlueStyle}
        showsCompass={false} 
        showsPointsOfInterest={false} 
        showsMyLocationButton={false} 
        toolbarEnabled={false}
        showsScale={false} 
        showsIndoors={false} 
        showsIndoorLevelPicker={false} 
        showsBuildings 
        pitchEnabled={false}
        rotateEnabled={false} 
        scrollEnabled 
        zoomEnabled 
        moveOnMarkerPress={false} 
        onPanDrag={() => setIsFollowing(false)}
        minZoomLevel={10} 
        maxZoomLevel={20}
      >
        {pos && (
          <Marker
            key={userProfilePhoto || "placeholder"} 
            tracksViewChanges={true}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }} 
            anchor={{ x: 0.5, y: 0.5 }} 
            stopPropagation
            zIndex={1000}
          >
            <ProfileMarker photoUrl={userProfilePhoto} headingDeg={headingDeg} />
          </Marker>
        )}

        {/* Other user markers */}
        {filteredUsers.map((user) => (
          <Marker
            key={`user-${user.user_id}-${user.main_photo_url}`}
            coordinate={{ latitude: user.approx_lat, longitude: user.approx_lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={!!user.main_photo_url}
            zIndex={500}
            onPress={() => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
          >
            <UserMarker user={user} hasFrame={!!user.frame_id} />
          </Marker>
        ))}

        {/* Event markers */}
        {events.map((event) => {
          const isPrivateNotApproved = event.event_type === 'private' && 
            event.host_id !== currentUserId && 
            event.user_application_status !== 'approved';
          
          let displayLat = event.latitude;
          let displayLng = event.longitude;
          
          if (isPrivateNotApproved) {
            const fuzzyRadius = (event.fuzzy_radius_meters || 500) / 111000;
            const seedValue = event.id.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
            const angle = (seedValue % 360) * (Math.PI / 180);
            const offsetMultiplier = 0.3 + (seedValue % 70) / 100;
            displayLat = event.latitude + Math.cos(angle) * fuzzyRadius * offsetMultiplier;
            displayLng = event.longitude + Math.sin(angle) * fuzzyRadius * offsetMultiplier;
          }
          
          return (
            <Marker
              key={`evt-${event.id}`}
              coordinate={{ latitude: displayLat, longitude: displayLng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              onPress={() => {
                console.log(`Event marker pressed: "${event.event_name}", status=${event.user_application_status}, count=${event.accepted_count}`);
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
            >
              <EventMarker event={event} />
            </Marker>
          );
        })}
      </MapView>

      {/* Top Overlay - Filter row with action buttons below */}
      <View style={{ paddingTop: Math.max(insets.top, verticalScale(12)), left: 0, right: 0, position: 'absolute', zIndex: 10 }}>
        {/* Filter Row - Edge to Edge Scrolling */}
        <View style={{ marginBottom: verticalScale(12) }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingHorizontal: scale(16),
              gap: scale(8),
              alignItems: 'center',
            }}
          >
            {/* Filter Icon - FIRST item in scroll */}
            <FilterButton onPress={() => setShowFilterModal(true)} hasActiveFilters={hasActiveFilters} />
            
            <QuickFilterChip
              label={filters.ageMin !== userPrefs.ageMin || filters.ageMax !== userPrefs.ageMax 
                ? `Age ${filters.ageMin}-${filters.ageMax}` 
                : "Age"}
              active={filters.ageMin !== userPrefs.ageMin || filters.ageMax !== userPrefs.ageMax}
              onPress={handleQuickAgeFilter}
            />
            <QuickFilterChip
              label="Height"
              active={false}
              onPress={handleQuickHeightFilter}
            />
            <QuickFilterChip
              label={filters.intentions && filters.intentions.length > 0 
                ? `${filters.intentions.length} selected` 
                : "Intentions"}
              active={!!(filters.intentions && filters.intentions.length > 0)}
              onPress={handleQuickIntentionsFilter}
            />
            <QuickFilterChip
              label="Active today"
              active={filters.activeToday === true}
              onPress={handleQuickActiveTodayToggle}
            />
            <QuickFilterChip
              label="More"
              active={false}
              onPress={handleQuickMoreFilters}
            />
          </ScrollView>
        </View>
        
        {/* Action Buttons Row - Below Filter Row */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: scale(12),
          paddingHorizontal: scale(16),
        }}>
          <CreateEventButton ref={plusRef} onPress={startPlusReveal} />
        </View>
      </View>

      {/* Reveal animation */}
      {revealVisible && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 999, backgroundColor: "transparent" }]}>
          <RNAnimated.View
            style={{
              position: "absolute", 
              left: revealOrigin.x - BASE_DIAM / 2, 
              top: revealOrigin.y - BASE_DIAM / 2,
              width: BASE_DIAM, 
              height: BASE_DIAM, 
              borderRadius: BASE_DIAM / 2, 
              backgroundColor: "#FFFFFF",
              transform: [{ scale: revealScale }],
              ...(Platform.OS === "android" ? { elevation: 1001, renderToHardwareTextureAndroid: true } : {}),
            }}
          />
        </View>
      )}

      {/* Locate FAB */}
      <LocateFab 
        onPress={recenter} 
        spin={fabSpin} 
        bottom={Math.max(insets.bottom + TAB_HEIGHT, TAB_HEIGHT) - FAB_LOWERING} 
        right={scale(18)} 
      />

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showUserModal}
        user={selectedUser}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        currentUserId={currentUserId}
        onOpenFrames={(frames) => {
          setFrameViewerFrames(frames);
          setShowFrameViewerMain(true);
        }}
        userPosition={pos}
      />

      {/* Frames viewer */}
      <ActiveFramesModal
        visible={showFrameViewerMain}
        onClose={() => setShowFrameViewerMain(false)}
        frames={frameViewerFrames}
        isOwnProfile={false}
      />

      {/* Event Details Modal */}
      <EventDetailsModal
        visible={showEventModal}
        event={selectedEvent}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onEdit={() => {
          setShowEventModal(false);
          router.push({
            pathname: "/(events)/edit_event",
            params: { eventId: selectedEvent?.id }
          });
        }}
        onDelete={() => {
  const eventToDelete = selectedEvent;
  
  if (!eventToDelete) return; // âœ… Safety check
  
  // Close event modal first
  setShowEventModal(false);
  setSelectedEvent(null);
  
  // Show confirmation after a delay
  setTimeout(() => {
    showConfirmation({
      title: "Delete Event",
      message: "Are you sure you want to delete this event? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmColor: "#EF4444",
      onConfirm: async () => {
        // âœ… REMOVE FROM MAP IMMEDIATELY (optimistic update)
        setEvents(prev => {
          const filtered = prev.filter(e => e.id !== eventToDelete.id);
          console.log(`Removed event ${eventToDelete.id}, ${filtered.length} events remaining`);
          return filtered;
        });
        
        try {
          const { error } = await supabase
            .from("events")
            .delete()
            .eq("id", eventToDelete.id);
          
          if (error) {
            console.error("Delete error:", error);
            
            // âœ… ROLLBACK - Add event back if deletion failed
            setEvents(prev => [...prev, eventToDelete]);
            
            showNotification({
              type: "error",
              title: "Failed to delete event",
              message: "Please try again.",
            });
          } else {
            console.log("Event deleted from database:", eventToDelete.id);
            showNotification({
              type: "success",
              title: "Event deleted successfully",
            });
          }
        } catch (error) {
          console.error("Delete exception:", error);
          
          // âœ… ROLLBACK - Add event back on error
          setEvents(prev => [...prev, eventToDelete]);
          
          showNotification({
            type: "error",
            title: "An unexpected error occurred",
          });
        }
      }
    });
  }, 100);
}}
        isOwnEvent={selectedEvent?.host_id === currentUserId}
        currentUserId={currentUserId}
        currentUserAge={currentUserAge}
        currentUserGender={currentUserGender}
        onApplySuccess={() => {
          console.log("Event join successful - local state updated via onEventUpdate");
        }}
        onEventUpdate={(updatedEvent) => {
          console.log(`onEventUpdate: "${updatedEvent.event_name}", status=${updatedEvent.user_application_status}, count=${updatedEvent.accepted_count}`);
          setSelectedEvent(updatedEvent);
          setEvents(prev => prev.map(e => 
            e.id === updatedEvent.id ? updatedEvent : e
          ));
        }}
        onEventSelect={(eventId) => {
          // Find the event in the events array
          const newEvent = events.find(e => e.id === eventId);
          if (newEvent) {
            console.log(`Opening similar event: "${newEvent.event_name}"`);
            setSelectedEvent(newEvent);
            setShowEventModal(true);
          }
        }}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(newFilters) => {
          console.log("Applying new filters:", newFilters);
          setFilters(newFilters);
          fetchUsers();
        }}
        defaults={userPrefs}
      />
    </View>
  );
}