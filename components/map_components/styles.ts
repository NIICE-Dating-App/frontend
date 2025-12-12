// components/map_components/styles.ts
// REDESIGNED: Clean styles matching profile.tsx and niices.tsx - NO GLASS EFFECTS
import { StyleSheet, Platform } from "react-native";
import { scale, verticalScale } from "@/utils/responsive";
import { Fonts } from "@/constants/theme";
import { BG, BLUE, BLUES, INK, CARD_BG, BORDER, SCREEN_W, SCREEN_H } from "./constants";

export const styles = StyleSheet.create({
  // Root
  root: { 
    flex: 1, 
    backgroundColor: BG 
  },
  map: { 
    flex: 1 
  },
  
  // Loading Screen
  loading: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: BG, 
    gap: verticalScale(16) 
  },
  loadingText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: BLUE, 
    letterSpacing: 0.5 
  },
  loadingSubtext: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10, 14, 26, 0.5)",
  },
  
  // Overlay
  overlayTop: { 
    position: "absolute", 
    left: scale(16), 
    right: scale(16), 
    zIndex: 10, 
    gap: verticalScale(12) 
  },
  
  // Filter & Create Buttons Row
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  
  // Filter Button - Clean design
  filterBtn: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  filterBtnActive: {
    backgroundColor: BLUE,
  },
  filterBtnDot: {
    position: "absolute",
    top: scale(8),
    right: scale(8),
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#FF4757",
    borderWidth: 2,
    borderColor: CARD_BG,
  },
  
  // Create Event Button - Clean circular design
  createEventBtn: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  
  // Locate FAB - Clean design
  locateFab: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  
  // Loading animation
  iiRow: { 
    flexDirection: "row", 
    alignItems: "flex-end", 
    justifyContent: "center", 
    gap: scale(24), 
    marginBottom: verticalScale(10) 
  },
  iLetter: { 
    fontSize: scale(64), 
    lineHeight: scale(64), 
    includeFontPadding: false, 
    textAlignVertical: "center" as any, 
    textAlign: "center",
    color: BLUE,
  },
  iDot: { 
    width: scale(12), 
    height: scale(12), 
    borderRadius: scale(6), 
    backgroundColor: BLUE, 
    marginBottom: verticalScale(6) 
  },
  progressOuter: { 
    width: "68%", 
    height: verticalScale(6), 
    borderRadius: verticalScale(3), 
    overflow: "hidden", 
    marginTop: verticalScale(12), 
    backgroundColor: "rgba(27, 68, 205, 0.15)" 
  },
  progressRunner: { 
    position: "absolute", 
    top: 0, 
    bottom: 0, 
    left: 0, 
    width: "30%", 
    borderRadius: verticalScale(3), 
    backgroundColor: BLUE,
  },
  
  // Event Marker - Clean design
  eventMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  eventMarkerBubble: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  eventMarkerPin: {
    width: 0,
    height: 0,
    borderLeftWidth: scale(8),
    borderRightWidth: scale(8),
    borderTopWidth: scale(10),
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BLUE,
    marginTop: -2,
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  
  // Modal Container - Clean card design
  modalContainer: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingTop: verticalScale(8),
  },
  modalHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: "rgba(10, 14, 26, 0.15)",
    borderRadius: verticalScale(2),
    alignSelf: "center",
    marginBottom: verticalScale(12),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  
  // Category & Type Badges
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    gap: scale(4),
    marginBottom: verticalScale(8),
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  eventTitle: {
    fontSize: scale(22),
    fontFamily: Fonts.bold,
    color: INK,
  },
  closeBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(18),
    backgroundColor: "rgba(10, 14, 26, 0.05)",
    marginLeft: scale(12),
  },
  
  // Info Cards - Clean design
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: BORDER,
    gap: verticalScale(12),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(12),
  },
  infoLabel: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
    marginBottom: verticalScale(2),
  },
  infoValue: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: INK,
  },
  sectionLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(8),
  },
  descText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: INK,
    lineHeight: scale(20),
  },
  
  // Details Grid
  detailsGrid: {
    flexDirection: "row",
    gap: scale(10),
  },
  detailBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.05)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    gap: scale(6),
  },
  detailBoxText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  
  // Modal Footer
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: scale(10),
  },
  
  // Buttons - Clean design
  primaryBtn: {
    flex: 1,
    backgroundColor: BLUE,
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(8),
  },
  primaryBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: CARD_BG,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: scale(8),
  },
  secondaryBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  deleteBtn: {
    width: scale(52),
    height: scale(52),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(14),
    backgroundColor: "rgba(213, 34, 43, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(213, 34, 43, 0.2)",
  },
  
  // Attendees Card
  attendeesCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    gap: scale(8),
  },
  attendeesText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  capacityText: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  
  // Applications Button
  applicationsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(14),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.15)",
    gap: scale(8),
  },
  applicationsBtnText: {
    flex: 1,
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  applicationsBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(14),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.15)",
    gap: scale(8),
  },
  
  // Delete Button Small
  deleteBtnSmall: {
    width: scale(52),
    height: scale(52),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(14),
    backgroundColor: "rgba(213, 34, 43, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(213, 34, 43, 0.2)",
  },
  
  // Edit Button
  editBtnFull: {
    flex: 1,
    borderRadius: scale(14),
    overflow: "hidden",
  },
  editBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    gap: scale(8),
  },
  editBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: CARD_BG,
  },
  
  
  // User Sheet Styles - Clean design
  userModalSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SCREEN_H * 0.85,
  },
  userSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
    gap: scale(16),
  },
  userSheetAvatarWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  userSheetFrameRing: {
    position: "absolute",
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    borderWidth: 3,
    borderColor: BLUE,
  },
  userSheetAvatar: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    overflow: "hidden",
    borderWidth: 3,
    borderColor: CARD_BG,
    backgroundColor: CARD_BG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  userSheetAvatarWithRing: {
    width: scale(68),
    height: scale(68),
    borderRadius: scale(34),
  },
  userSheetAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: scale(36),
  },
  userSheetAvatarPlaceholder: {
    backgroundColor: BLUES.b100,
    alignItems: "center",
    justifyContent: "center",
  },
  userSheetInfo: {
    flex: 1,
    gap: verticalScale(4),
  },
  userSheetNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: scale(8),
  },
  userSheetName: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  userSheetVisibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    gap: scale(4),
  },
  userSheetVisibilityText: {
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  userSheetDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  userSheetDistance: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  
  // User Sheet Chips
  userSheetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
    gap: scale(8),
  },
  userSheetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    gap: scale(6),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  userSheetChipText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: BLUE,
    textTransform: "capitalize",
  },
  
  // Looking For Detail
  lookingForDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  lookingForBackBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  lookingForDetailTitle: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: INK,
  },
  lookingForDetailList: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    gap: verticalScale(12),
  },
  lookingForDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderRadius: scale(14),
    gap: scale(12),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
  },
  lookingForDetailIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  lookingForDetailText: {
    flex: 1,
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
  },
  
  // User Sheet Bio
  userSheetBioSection: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
  },
  userSheetBioLabel: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "rgba(10, 14, 26, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: verticalScale(6),
  },
  userSheetBio: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
    lineHeight: scale(22),
  },
  
  // Status Badge
  userSheetStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: scale(20),
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    gap: scale(6),
  },
  userSheetStatusText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
  },
  
  // User Sheet Actions
  userSheetActions: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
    gap: verticalScale(12),
  },
  userSheetPrimaryBtn: {
    backgroundColor: BLUE,
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  userSheetPrimaryBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    gap: scale(10),
  },
  userSheetPrimaryBtnText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: CARD_BG,
    letterSpacing: 0.3,
  },
  userSheetSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    borderRadius: scale(16),
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.15)",
    gap: scale(10),
  },
  userSheetSecondaryBtnText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.3,
  },
  
  // Message Input
  messageInputContainer: {
    width: '100%',
    gap: verticalScale(12),
  },
  messageInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(27, 68, 205, 0.04)',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderWidth: 1.5,
    borderColor: 'rgba(27, 68, 205, 0.12)',
  },
  messageInput: {
    flex: 1,
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: INK,
    minHeight: verticalScale(60),
    maxHeight: verticalScale(100),
    textAlignVertical: 'top',
  },
  messageInputActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  messageInputCancelBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    backgroundColor: 'rgba(10, 14, 26, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageInputCancelText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: 'rgba(10, 14, 26, 0.5)',
  },
  
  // Incoming Actions
  userSheetIncomingActions: {
    alignItems: "center",
    gap: verticalScale(12),
  },
  userSheetIncomingBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(16),
  },
  userSheetDeclineBtn: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  userSheetAcceptBtn: {
    flex: 1,
    maxWidth: scale(200),
    backgroundColor: "#22C55E",
    borderRadius: scale(28),
    overflow: "hidden",
  },
  userSheetAcceptBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    gap: scale(8),
  },
  userSheetAcceptBtnText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: CARD_BG,
  },
  
  // User Sheet Footer
  userSheetFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 14, 26, 0.06)",
    gap: scale(16),
  },
  userSheetFooterLink: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.4)",
  },
  
  // Sender Message Bubble
  // Sender Message Card - Modern 2024 Design (researched from dating app UI trends)
  // Sender Message Bubble - MODERN DESIGN
senderMessageCard: {
  backgroundColor: "rgba(27, 68, 205, 0.04)",
  borderRadius: scale(16),
  borderWidth: 1,
  borderColor: "rgba(27, 68, 205, 0.12)",
  padding: scale(16),
  marginHorizontal: scale(20),
  marginTop: verticalScale(12),
  gap: verticalScale(12),
},
senderMessageHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: scale(12),
},
senderMessageIconCircle: {
  width: scale(32),
  height: scale(32),
  borderRadius: scale(16),
  backgroundColor: "rgba(27, 68, 205, 0.1)",
  alignItems: "center",
  justifyContent: "center",
},
senderMessageLabel: {
  fontSize: scale(11),
  fontFamily: Fonts.bold,
  color: BLUE,
  textTransform: "uppercase",
  letterSpacing: 0.5,
},
senderMessageText: {
  fontSize: scale(15),
  fontFamily: Fonts.primary,
  color: INK,
  lineHeight: scale(22),
},
  senderMessageInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
    gap: scale(12),
  },
  senderMessageIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: scale(2),
  },
  senderMessageContent: {
    flex: 1,
    gap: verticalScale(4),
  },

  
  // Filter Modal - Clean design with sliders
  filterBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    width: SCREEN_W - scale(40),
    maxWidth: scale(400),
    backgroundColor: CARD_BG,
    borderRadius: scale(24),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterHeaderIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  filterTitle: {
    flex: 1,
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  filterCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 14, 26, 0.05)",
  },
  filterSection: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
  },
  filterSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  filterSectionLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  filterSectionValue: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  
  // Gender Chips
  filterGenderRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  filterGenderChip: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.15)",
  },
  filterGenderChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  filterGenderText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUES.b40,
  },
  filterGenderTextActive: {
    color: CARD_BG,
  },
  
  // Slider styles
  sliderContainer: {
    marginTop: verticalScale(8),
  },
  sliderTrack: {
    height: verticalScale(6),
    borderRadius: verticalScale(3),
    backgroundColor: "rgba(27, 68, 205, 0.15)",
  },
  sliderFill: {
    height: verticalScale(6),
    borderRadius: verticalScale(3),
    backgroundColor: BLUE,
  },
  sliderThumb: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: CARD_BG,
    borderWidth: 3,
    borderColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Filter Actions
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(20),
    gap: scale(12),
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 14, 26, 0.05)",
  },
  filterResetText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: "rgba(10, 14, 26, 0.5)",
  },
  filterApplyBtn: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
  },
  filterApplyText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: CARD_BG,
    letterSpacing: 0.3,
  },
  
  // Apply button states
  applyBtn: {
    flex: 1,
    borderRadius: scale(14),
    overflow: "hidden",
    marginTop: verticalScale(9.5),
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(20),

    gap: scale(7),
    backgroundColor: BLUE,
    borderRadius: scale(14),
  },
  applyBtnText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: CARD_BG,
    letterSpacing: 0.2,
  },
  applyBtnJoined: {
    opacity: 1,
  },
  applyBtnIneligible: {
    opacity: 0.6,
  },
  
});