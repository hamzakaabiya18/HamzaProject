
export const SETTINGS_KEY = "shiftmanager_settings"
export const defaultSettings = {
  hourlyRate: 50,
  overtimeRate: 1.5,
  nightMultiplier: 1.25,
  calendarSync: false,
  notifications: false,
}
// Load settings from localStorage, with fallback to defaults
export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings // JSON.parse handles Arabic/Hebrew correctly, no need for special decoding
  } catch {
    return defaultSettings
  }
}

export const saveSettings = (s) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) // JSON.stringify handles Arabic/Hebrew correctly, no need for special encoding
}
// Utility functions for shift calculations and settings management
export const calculateHours = (start, end, breakMin = 0) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let h = eh - sh + (em - sm) / 60
  if (h < 0) h += 24
  return Math.max(0, h - breakMin / 60)
}

export const calculatePay = (shift, hourlyRate, nightMultiplier) => {
  const hours = calculateHours(
    shift.startTime,
    shift.endTime,
    shift.breakDuration || 0
  )
  const multiplier = shift.shiftType === "night" ? nightMultiplier : 1
  return hours * hourlyRate * multiplier
}

export const getShiftTypeColor = (type) => {
  const colors = {
    morning: "#F59E0B",
    evening: "#8B5CF6",
    night: "#3B82F6",
    custom: "#10B981",
  }
  return colors[type] || "#10B981"
}