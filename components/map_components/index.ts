// components/map_components/index.ts
// REDESIGNED: Clean exports - NO GLASS COMPONENTS

// Types
export * from "./types";

// Constants
export * from "./constants";

// Utilities
export * from "./utils";

// Styles
export { styles } from "./styles";

// Components
export { PulseRing } from "./PulseRing";
export { ProfileMarker } from "./ProfileMarker";
export { UserMarker } from "./UserMarker";
export { EventMarker } from "./EventMarker";
export { IiLoader } from "./IiLoader";
export { FilterButton } from "./FilterButton";
export { CreateEventButton, PlusChipDiamond } from "./Createeventbutton";
export { LocateFab, GlassFab } from "./LocateFab";
export { FilterModal } from "./FilterModal";
export { UserProfileModal } from "./UserProfileModal";
export { EventDetailsModal } from "./EventDetailsModal";
export { QuickFilterChip } from "./QuickFilterChip";

// Legacy compatibility - GlassSurface is no longer used but exported for any remaining references
// Remove these exports once map.tsx is updated to not use them
export const GlassSurface = ({ children, style }: any) => children;
export const SearchIcon = () => null;