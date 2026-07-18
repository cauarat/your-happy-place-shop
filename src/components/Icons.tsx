import React from "react";

export const CapIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Top button */}
    <circle cx="12" cy="4" r="1" />
    {/* Crown dome */}
    <path d="M5 14C5 8.5 8 5 12 5C16 5 19 8.5 19 14" />
    {/* Crown panel seams */}
    <path d="M12 5V14" />
    <path d="M8.5 6C9.2 8 9.5 11 9.5 14" />
    <path d="M15.5 6C14.8 8 14.5 11 14.5 14" />
    {/* Brim */}
    <path d="M5 14H19" />
    <path d="M3 15.5C5.5 14 8.5 13.5 12 13.5C15.5 13.5 18.5 14 21 15.5" />
  </svg>
);

export const BagIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Top handle arch */}
    <path d="M9 9C9 6.2 15 6.2 15 9" />
    {/* Bag body */}
    <rect x="4" y="9" width="16" height="12" rx="3" />
    {/* Clasp / lock detail */}
    <path d="M10.5 9.5H13.5L13 12H11Z" />
  </svg>
);

export const PantsIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 3h10" />
    <path d="M7 3l-2 18h5l2-9 2 9h5l-2-18" />
  </svg>
);

export const ShortsIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 4h12" />
    <path d="M6 4l-1 12h5l2-5 2 5h5l-1-12" />
  </svg>
);

export const JacketIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 4l2 3v12" />
    <path d="M15 4l-2 3v12" />
    <path d="M9 4c0-1 6-1 6 0" />
    <path d="M9 4C5 5 4 8 3 12l-1 6h3.5" />
    <path d="M15 4C19 5 20 8 21 12l1 6h-3.5" />
    <path d="M7.5 8c1 3 1 7 .5 11" />
    <path d="M16.5 8c-1 3-1 7-.5 11" />
    <path d="M8 19h8v2H8z" />
    <path d="M2 18h3.5v2H2z" />
    <path d="M18.5 18H22v2h-3.5z" />
    <path d="M7.5 14.5l2-2v2l-2 1.5" />
    <path d="M16.5 14.5l-2-2v2l2 1.5" />
  </svg>
);

export const HoodieIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.4 8.9L16 6.3V6.5l-4-3-4 3v-0.2L3.6 8.9A2 2 0 0 0 3 10.6l1.3 2.7c.3.5 1 .6 1.5.2L8 12v9h8v-9l2.2 1.5c.5.4 1.2.3 1.5-.2l1.3-2.7a2 2 0 0 0-.6-1.7z" />
    <path d="M8 6.5a4 4 0 0 1 8 0" />
    <path d="M12 3.5v3" />
    <path d="M10 16h4v3h-4z" />
  </svg>
);

export const VestIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 3v5l-3 4v9h14v-9l-3-4V3" />
    <path d="M8 3l4 3 4-3" />
    <path d="M12 6v15" />
  </svg>
);

export const PoloIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20.4 8.9L16 6.3V4l-4-2-4 2v2.3L3.6 8.9A2 2 0 0 0 3 10.6l1.3 2.7c.3.5 1 .6 1.5.2L8 12v9h8v-9l2.2 1.5c.5.4 1.2.3 1.5-.2l1.3-2.7a2 2 0 0 0-.6-1.7z" />
    <path d="M16 4l-4 4-4-4" />
    <path d="M12 8v3" />
  </svg>
);

export const TankTopIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 3v6l-2 3v9h14v-9l-2-3V3" />
    <path d="M7 3h2c0 2 2 2 2 2s2 0 2-2h2" />
  </svg>
);

export const PufferJacketIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 5c0-1.5 1.5-2 4-2s4 .5 4 2v2H8V5z" />
    <path d="M12 7v14" />
    <path d="M8 7C5 7 3.5 9 3 12l-1 6c0 1 .5 2 2 2l1.5-7" />
    <path d="M16 7c3 0 4.5 2 5 5l1 6c0 1-.5 2-2 2l-1.5-7" />
    <path d="M5.5 13v6c0 1 1 2 2.5 2h8c1.5 0 2.5-1 2.5-2v-6" />
    <path d="M5 11h14" />
    <path d="M5.5 15h13" />
    <path d="M6 18h12" />
  </svg>
);

export const SweaterIcon = ({ size = 24, strokeWidth = 2, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 4l-1-1.5C8 2 9 2 12 2s4 0 4 .5L15 4" />
    <path d="M8 4c0 1 8 1 8 0" />
    <path d="M8 4C4.5 5 3.5 7 2.5 11l-1.5 8h4v2H2" />
    <path d="M16 4c3.5 1 4.5 3 5.5 7l1.5 8h-4v2h3" />
    <path d="M6 11l-1 8h14l-1-8" />
    <path d="M5 19v2h14v-2" />
  </svg>
);
