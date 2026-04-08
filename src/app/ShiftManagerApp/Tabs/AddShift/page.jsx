"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { db, auth } from "@/app/LoginPage/Firebase"
import { collection, addDoc, doc, updateDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const SETTINGS_KEY = "shiftmanager_settings"

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      hourlyRate:      parsed.hourlyRate      || 50,
      nightMultiplier: parsed.nightMultiplier || 1.25,
    }
  } catch { return { hourlyRate: 50, nightMultiplier: 1.25 } }
}

const calculateHours = (start, end, breakMin = 0) => {
  if (!start || !end) return 0
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRegex.test(start) || !timeRegex.test(end)) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let h = eh - sh + (em - sm) / 60
  if (h < 0) h += 24
  return Math.max(0, h - breakMin / 60)
}

const SunIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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

const SunsetIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="13" r="4" fill="#8B5CF6" opacity="0.85"/>
    <line x1="2" y1="17" x2="22" y2="17" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="5" y1="20" x2="19" y2="20" stroke="#8B5CF6" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
    <g stroke="#8B5CF6" strokeWidth="1.6" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="5"/>
      <line x1="4.5" y1="6.5" x2="6" y2="8"/>
      <line x1="19.5" y1="6.5" x2="18" y2="8"/>
      <line x1="2.5" y1="13" x2="4.5" y2="13"/>
      <line x1="19.5" y1="13" x2="21.5" y2="13"/>
    </g>
  </svg>
)

const MoonIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#3B82F6" opacity="0.9"/>
    <circle cx="17" cy="5" r="1" fill="#93C5FD" opacity="0.7"/>
    <circle cx="20" cy="9" r="0.6" fill="#93C5FD" opacity="0.5"/>
  </svg>
)

const SparkleIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z" fill="#10B981" opacity="0.9"/>
    <circle cx="18" cy="5" r="1.2" fill="#6EE7B7" opacity="0.6"/>
    <circle cx="6" cy="17" r="0.9" fill="#6EE7B7" opacity="0.4"/>
  </svg>
)

const SHIFT_TYPES = [
  { value: "morning", label: "Morning", Icon: SunIcon,     color: "#F59E0B", defaultStart: "07:00", defaultEnd: "15:00" },
  { value: "evening", label: "Evening", Icon: SunsetIcon,  color: "#8B5CF6", defaultStart: "15:00", defaultEnd: "23:00" },
  { value: "night",   label: "Night",   Icon: MoonIcon,    color: "#3B82F6", defaultStart: "23:00", defaultEnd: "07:00" },
  { value: "custom",  label: "Custom",  Icon: SparkleIcon, color: "#10B981", defaultStart: "",      defaultEnd: "" },
]

const BREAK_OPTIONS = ["0", "15", "30", "45", "60"]
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function MiniCalendar({ day, month, year, onSelect }) {
  const [calMonth, setCalMonth] = useState(parseInt(month) - 1)
  const [calYear,  setCalYear]  = useState(parseInt(year))
  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const today = new Date()
  const selectedDay   = parseInt(day)
  const selectedMonth = parseInt(month) - 1
  const selectedYear  = parseInt(year)

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ backgroundColor: "#131929", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e", marginTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div onClick={prevMonth} style={{ cursor: "pointer", color: "#9ca3af", fontSize: "18px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1c2132", borderRadius: "8px" }}>‹</div>
        <p style={{ fontWeight: "700", fontSize: "14px", color: "white" }}>{MONTHS[calMonth]} {calYear}</p>
        <div onClick={nextMonth} style={{ cursor: "pointer", color: "#9ca3af", fontSize: "18px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1c2132", borderRadius: "8px" }}>›</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: "11px", color: "#6b7280", fontWeight: "600", padding: "4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const isSelected = d === selectedDay && calMonth === selectedMonth && calYear === selectedYear
          const isToday    = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
          return (
            <div key={i} onClick={() => onSelect(d, calMonth + 1, calYear)} style={{
              textAlign: "center", fontSize: "13px", fontWeight: isSelected ? "700" : "500",
              padding: "8px 4px", borderRadius: "10px", cursor: "pointer",
              backgroundColor: isSelected ? "#3B82F6" : isToday ? "#1c2132" : "transparent",
              color: isSelected ? "white" : isToday ? "#3B82F6" : "#d1d5db",
              border: isToday && !isSelected ? "1px solid #3B82F6" : "1px solid transparent",
              transition: "all 0.15s"
            }}>{d}</div>
          )
        })}
      </div>
      <div onClick={() => onSelect(today.getDate(), today.getMonth() + 1, today.getFullYear())}
        style={{ marginTop: "12px", textAlign: "center", cursor: "pointer", color: "#3B82F6", fontSize: "12px", fontWeight: "600", padding: "8px", backgroundColor: "#1c2132", borderRadius: "10px" }}>
        Today
      </div>
    </div>
  )
}

function AddShiftForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")
  const isEditMode = !!editId

  const [hourlyRate,      setHourlyRate]      = useState(50)
  const [nightMultiplier, setNightMultiplier] = useState(1.25)
  const [currentUser,     setCurrentUser]     = useState(null)
  const today = new Date()

  const initDate  = searchParams.get("date") || ""
  const initParts = initDate ? initDate.split("-") : []

  const [selectedType,  setSelectedType]  = useState(SHIFT_TYPES.find(t => t.value === searchParams.get("shiftType")) || SHIFT_TYPES[0])
  const [dateDay,       setDateDay]       = useState(initParts[2] || String(today.getDate()).padStart(2, "0"))
  const [dateMonth,     setDateMonth]     = useState(initParts[1] || String(today.getMonth() + 1).padStart(2, "0"))
  const [dateYear,      setDateYear]      = useState(initParts[0] || String(today.getFullYear()))
  const [startTime,     setStartTime]     = useState(searchParams.get("startTime") || "07:00")
  const [endTime,       setEndTime]       = useState(searchParams.get("endTime")   || "15:00")
  const [breakDuration, setBreakDuration] = useState(searchParams.get("breakDuration") || "30")
  const [notes,         setNotes]         = useState(searchParams.get("notes") || "")
  const [saving,        setSaving]        = useState(false)
  const [showCalendar,  setShowCalendar]  = useState(false)

  useEffect(() => {
    const s = loadSettings()
    setHourlyRate(s.hourlyRate)
    setNightMultiplier(s.nightMultiplier)

    // ✅ يقرأ المستخدم الحالي
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user)
      else router.push("/LoginPage")
    })
    return () => unsub()
  }, [])

  const handleCalendarSelect = (d, m, y) => {
    setDateDay(String(d).padStart(2, "0"))
    setDateMonth(String(m).padStart(2, "0"))
    setDateYear(String(y))
    setShowCalendar(false)
  }

  const handleSelectType = (type) => {
    setSelectedType(type)
    if (!isEditMode) {
      if (type.value !== "custom") { setStartTime(type.defaultStart); setEndTime(type.defaultEnd) }
      else { setStartTime(""); setEndTime("") }
    }
  }

  const hours = calculateHours(startTime, endTime, parseInt(breakDuration) || 0)
  const multiplier = selectedType.value === "night" ? nightMultiplier : 1
  const previewPay = hours * hourlyRate * multiplier

  const selectedDateLabel = (() => {
    try {
      const d = new Date(`${dateYear}-${dateMonth}-${dateDay}T00:00:00`)
      if (isNaN(d)) return ""
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    } catch { return "" }
  })()

  const handleSave = async () => {
    if (!currentUser) return alert("Please login first.")
    const dateStr = `${dateYear}-${dateMonth.padStart(2,"0")}-${dateDay.padStart(2,"0")}`
    if (isNaN(new Date(dateStr).getTime())) return alert("Invalid date.")
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime)) return alert("Invalid start time.")
    if (!timeRegex.test(endTime))   return alert("Invalid end time.")

    setSaving(true)
    try {
      const payload = {
        date: dateStr,
        startTime,
        endTime,
        shiftType: selectedType.value,
        breakDuration: parseInt(breakDuration) || 0,
        notes: notes.trim() || "",
        // ✅ نحفظ userId مع كل وردية
        userId: currentUser.uid,
      }
      if (isEditMode) {
        await updateDoc(doc(db, "shifts", editId), { ...payload, updatedAt: new Date().toISOString() })
      } else {
        await addDoc(collection(db, "shifts"), { ...payload, createdAt: new Date().toISOString() })
      }
      router.push("/ShiftManagerApp/Tabs/Shifts")
    } catch (e) { alert("Error saving shift.") }
    setSaving(false)
  }

  const isNight = selectedType.value === "night"

  return (
    <div style={{ backgroundColor: "#0f1117", minHeight: "100vh", color: "white", fontFamily: "'Inter', sans-serif" }}>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 20px 16px", borderBottom: "1px solid #1f2937",
        position: "sticky", top: 0, backgroundColor: "#0f1117", zIndex: 10
      }}>
        <div onClick={() => router.back()} style={{
          cursor: "pointer", color: "#6b7280", width: "36px", height: "36px",
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "#1c2132", borderRadius: "10px", fontSize: "20px"
        }}>✕</div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
            {isEditMode ? "✏️ Edit Shift" : "Add Shift"}
          </h2>
          {isEditMode && <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>Editing existing shift</p>}
        </div>
        <div onClick={handleSave} style={{
          cursor: "pointer", color: saving ? "#6b7280" : "#3B82F6",
          fontWeight: "700", fontSize: "15px", padding: "4px 8px"
        }}>
          {saving ? "Saving..." : "Save"}
        </div>
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "60px" }}>

        {/* Shift Type */}
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px" }}>Shift Type</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {SHIFT_TYPES.map(type => {
              const isSelected = selectedType.value === type.value
              return (
                <div key={type.value} onClick={() => handleSelectType(type)} style={{
                  padding: "16px 8px", borderRadius: "16px", textAlign: "center", cursor: "pointer",
                  backgroundColor: isSelected ? `${type.color}22` : "#1c2132",
                  border: `2px solid ${isSelected ? type.color : "#2a2f3e"}`,
                  transition: "all 0.2s",
                  boxShadow: isSelected ? `0 0 16px ${type.color}33` : "none"
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}><type.Icon /></div>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: isSelected ? type.color : "#6b7280" }}>{type.label}</p>
                </div>
              )
            })}
          </div>
          {isNight && (
            <div style={{
              marginTop: "12px", padding: "10px 14px",
              backgroundColor: "rgba(59,130,246,0.1)", borderRadius: "10px",
              border: "1px solid rgba(59,130,246,0.2)",
              display: "flex", alignItems: "center", gap: "8px"
            }}>
              <span style={{ fontSize: "14px" }}>🌙</span>
              <p style={{ color: "#93C5FD", fontSize: "12px", fontWeight: "600" }}>
                Night shift rate: ×{nightMultiplier} ({Math.round(nightMultiplier * 100)}%)
              </p>
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Date</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "10px" }}>
            {[
              { label: "Day",   value: dateDay,   setter: setDateDay,   max: 2, placeholder: "DD" },
              { label: "Month", value: dateMonth, setter: setDateMonth, max: 2, placeholder: "MM" },
              { label: "Year",  value: dateYear,  setter: setDateYear,  max: 4, placeholder: "YYYY" },
            ].map(({ label, value, setter, max, placeholder }) => (
              <div key={label}>
                <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "6px" }}>{label}</p>
                <input
                  type="number" value={value} placeholder={placeholder}
                  onChange={e => setter(e.target.value.slice(0, max))}
                  style={{
                    width: "100%", backgroundColor: "#1c2132", border: "2px solid #2a2f3e",
                    borderRadius: "12px", padding: "14px 10px", color: "white",
                    fontSize: "16px", fontWeight: "600", textAlign: "center",
                    boxSizing: "border-box", outline: "none"
                  }}
                />
              </div>
            ))}
          </div>
          <div onClick={() => setShowCalendar(!showCalendar)} style={{
            marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#1c2132", borderRadius: "12px", padding: "12px 16px",
            border: `1px solid ${showCalendar ? "#3B82F6" : "#2a2f3e"}`,
            cursor: "pointer", transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "16px" }}>📅</span>
              <div>
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>
                  {showCalendar ? "Close calendar" : "Open calendar"}
                </p>
                {selectedDateLabel && <p style={{ fontSize: "13px", color: "white", fontWeight: "600" }}>{selectedDateLabel}</p>}
              </div>
            </div>
            <span style={{ color: "#3B82F6", fontSize: "16px", transform: showCalendar ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}>⌄</span>
          </div>
          {showCalendar && (
            <MiniCalendar day={dateDay} month={dateMonth} year={dateYear} onSelect={handleCalendarSelect} />
          )}
        </div>

        {/* Time */}
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Time</p>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "6px" }}>Start Time</p>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{
                width: "100%", backgroundColor: "#1c2132", border: "2px solid #2a2f3e",
                borderRadius: "12px", padding: "14px 16px", color: "white",
                fontSize: "16px", fontWeight: "600", textAlign: "center", boxSizing: "border-box", outline: "none"
              }}/>
            </div>
            <div style={{ color: "#4B5563", fontSize: "20px", paddingBottom: "14px" }}>→</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#6b7280", fontSize: "11px", marginBottom: "6px" }}>End Time</p>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{
                width: "100%", backgroundColor: "#1c2132", border: "2px solid #2a2f3e",
                borderRadius: "12px", padding: "14px 16px", color: "white",
                fontSize: "16px", fontWeight: "600", textAlign: "center", boxSizing: "border-box", outline: "none"
              }}/>
            </div>
          </div>
        </div>

        {/* Break */}
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Break Duration (minutes)</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            {BREAK_OPTIONS.map(b => (
              <div key={b} onClick={() => setBreakDuration(b)} style={{
                padding: "12px 8px", borderRadius: "12px", textAlign: "center", cursor: "pointer",
                backgroundColor: breakDuration === b ? "#3B82F6" : "#1c2132",
                border: `2px solid ${breakDuration === b ? "#3B82F6" : "#2a2f3e"}`,
                color: breakDuration === b ? "white" : "#6b7280",
                fontWeight: "700", fontSize: "14px", transition: "all 0.2s"
              }}>{b}</div>
            ))}
          </div>
        </div>

        {/* Preview */}
        {startTime && endTime && (
          <div style={{
            backgroundColor: "#1c2132", borderRadius: "14px", padding: "16px 20px",
            border: `1px solid ${isNight ? "rgba(59,130,246,0.3)" : "#2a2f3e"}`,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>Total Hours</p>
              <p style={{ color: "white", fontWeight: "700", fontSize: "22px" }}>{hours.toFixed(1)}h</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>
                Estimated Pay {isNight ? `(×${nightMultiplier})` : ""}
              </p>
              <p style={{ color: isNight ? "#93C5FD" : "#10B981", fontWeight: "800", fontSize: "22px" }}>
                ₪{previewPay.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Notes (Optional)</p>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this shift..."
            rows={3}
            style={{
              width: "100%", backgroundColor: "#1c2132", border: "2px solid #2a2f3e",
              borderRadius: "12px", padding: "14px 16px", color: "white",
              fontSize: "14px", resize: "none", boxSizing: "border-box",
              outline: "none", fontFamily: "inherit"
            }}
          />
        </div>

        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", backgroundColor: "#3B82F6", border: "none",
          borderRadius: "14px", padding: "18px", color: "white",
          fontWeight: "700", cursor: saving ? "not-allowed" : "pointer",
          fontSize: "16px", boxShadow: "0 4px 15px rgba(59,130,246,0.4)", transition: "all 0.2s"
        }}>
          {saving ? "Saving..." : isEditMode ? "✏️ Update Shift" : "Add Shift"}
        </button>

      </div>
    </div>
  )
}

export default function AddShiftPage() {
  return (
    <Suspense fallback={
      <div style={{ backgroundColor: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading...</p>
      </div>
    }>
      <AddShiftForm />
    </Suspense>
  )
}