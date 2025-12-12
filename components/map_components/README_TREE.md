/components/map_components/
├── index.ts                 - Barrel exports for all components
├── types.ts                 - All TypeScript interfaces (UserMapCard, EventData, FilterState, etc.)
├── constants.ts             - Constants, colors, dimensions, display maps
├── utils.ts                 - Utility functions & hooks (supabase helpers, calculations)
├── styles.ts                - All shared StyleSheet styles
│
├── GlassSurface.tsx         - Glassmorphism card component
├── MapIcons.tsx             - SearchIcon, LocationIcon SVG components
├── PulseRing.tsx            - Animated pulse ring for markers
├── ProfileMarker.tsx        - Current user's marker with direction cone
├── UserMarker.tsx           - Other users' map markers
├── EventMarker.tsx          - Event map markers
├── IiLoader.tsx             - Loading animation component
├── FilterChip.tsx           - Filter chip with glow animation
├── PlusChipDiamond.tsx      - Diamond-shaped add event button
├── GlassFab.tsx             - Floating action button
├── FilterButton.tsx         - Filter toggle button
│
├── FilterModal.tsx          - Filter settings modal
├── UserProfileModal.tsx     - User profile bottom sheet
├── EventDetailsModal.tsx    - Event details bottom sheet