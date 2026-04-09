export const SunIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4.5" fill="#F59E0B" opacity="0.9"/>
    <g stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="4.5"/>
      <line x1="12" y1="19.5" x2="12" y2="21.5"/>
      <line x1="2.5" y1="12" x2="4.5" y2="12"/>
      <line x1="19.5" y1="12" x2="21.5" y2="12"/>
      <line x1="5.2" y1="5.2" x2="6.6" y2="6.6"/>
      <line x1="17.4" y1="17.4" x2="18.8" y2="18.8"/>
      <line x1="18.8" y1="5.2" x2="17.4" y2="6.6"/>
      <line x1="6.6" y1="17.4" x2="5.2" y2="18.8"/>
    </g>
  </svg>
)

export const SunsetIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="13" r="4" fill="#8B5CF6" opacity="0.85"/>
    <line x1="2" y1="17" x2="22" y2="17" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round"/>
    <g stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="5"/>
      <line x1="4.5" y1="6.5" x2="6" y2="8"/>
      <line x1="19.5" y1="6.5" x2="18" y2="8"/>
      <line x1="2.5" y1="13" x2="4.5" y2="13"/>
      <line x1="19.5" y1="13" x2="21.5" y2="13"/>
    </g>
  </svg>
)

export const MoonIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#3B82F6" opacity="0.9"/>
    <circle cx="17" cy="5" r="1" fill="#93C5FD" opacity="0.7"/>
    <circle cx="20" cy="9" r="0.6" fill="#93C5FD" opacity="0.5"/>
  </svg>
)

export const SparkleIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z" fill="#10B981" opacity="0.9"/>
    <circle cx="18" cy="5" r="1.2" fill="#6EE7B7" opacity="0.6"/>
    <circle cx="6" cy="17" r="0.9" fill="#6EE7B7" opacity="0.4"/>
  </svg>
)

export const SHIFT_COLORS = {
  morning: "#F59E0B",
  evening: "#8B5CF6",
  night:   "#3B82F6",
  custom:  "#10B981",
}

export const SHIFT_ICONS = {
  morning: <SunIcon />,
  evening: <SunsetIcon />,
  night:   <MoonIcon />,
  custom:  <SparkleIcon />,
}