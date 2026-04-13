@AGENTS.md
"use client"
// Tells Next.js this file runs in the browser (not on the server)
// Required because we use hooks, events, and browser APIs like localStorage

import { useState, useEffect, Suspense } from "react"
// useState: stores values that change over time (form inputs, loading state, etc.)
// useEffect: runs code after the component loads (like fetching data or auth check)
// Suspense: shows a fallback UI while waiting for lazy-loaded components

import { useRouter, useSearchParams } from "next/navigation"
// useRouter: lets us navigate between pages programmatically (e.g. go back, push to /Shifts)
// useSearchParams: reads URL query params (e.g. ?date=2026-04-09&id=abc for edit mode)

import { db, auth } from "@/app/LoginPage/Firebase"
// db: Firestore database instance — used to save/update shifts
// auth: Firebase Auth instance — used to check if user is logged in

import { collection, addDoc, doc, updateDoc } from "firebase/firestore"
// collection: references the "shifts" collection in Firestore
// addDoc: adds a new shift document to Firestore
// doc: references a specific shift document by ID (for editing)
// updateDoc: updates an existing shift document in Firestore

import { onAuthStateChanged } from "firebase/auth"
// onAuthStateChanged: listens for login/logout changes
// If user is not logged in → redirects to /LoginPage

import { loadSettings, calculateHours } from "@/lib/shiftUtils"
// loadSettings: reads hourlyRate and nightMultiplier from localStorage
// calculateHours: computes total work hours = (endTime - startTime - breakDuration)

import { SunIcon, SunsetIcon, MoonIcon, SparkleIcon } from "@/components/ShiftIcons"
// Custom SVG icons for each shift type:
// SunIcon → Morning shift
// SunsetIcon → Evening shift
// MoonIcon → Night shift
// SparkleIcon → Custom shift

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SHIFT_TYPES = [
  // Array of shift type objects — each has a value, label, icon, color, and default times
  // Used to render the 4 shift type buttons and set default start/end times
  { value: "morning", label: "Morning", Icon: SunIcon,     color: "#F59E0B", defaultStart: "07:00", defaultEnd: "15:00" },
  { value: "evening", label: "Evening", Icon: SunsetIcon,  color: "#8B5CF6", defaultStart: "15:00", defaultEnd: "23:00" },
  { value: "night",   label: "Night",   Icon: MoonIcon,    color: "#3B82F6", defaultStart: "23:00", defaultEnd: "07:00" },
  { value: "custom",  label: "Custom",  Icon: SparkleIcon, color: "#10B981", defaultStart: "",      defaultEnd: "" },
]

const BREAK_OPTIONS = ["0", "15", "30", "45", "60"]
// Quick-select options for break duration in minutes
// Rendered as clickable buttons below the time inputs

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
// Day labels for the mini calendar header row

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
// Month names used in the mini calendar header

// ─────────────────────────────────────────────
// MINI CALENDAR COMPONENT
// ─────────────────────────────────────────────

function MiniCalendar({ day, month, year, onSelect }) {
  // A small inline calendar that lets the user pick a date visually
  // Props:
  //   day, month, year → currently selected date (from parent form)
  //   onSelect → callback function called when user clicks a day

  const [calMonth, setCalMonth] = useState(parseInt(month) - 1)
  // Tracks which month is currently displayed in the calendar (0-indexed)

  const [calYear, setCalYear] = useState(parseInt(year))
  // Tracks which year is currently displayed in the calendar

  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  // Gets the weekday index (0=Sun) of the 1st day of the month
  // Used to add empty cells before the 1st day in the grid

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  // Gets total number of days in the current calendar month

  const today = new Date()
  // Today's date — used to highlight the current day in the calendar

  const selectedDay   = parseInt(day)
  const selectedMonth = parseInt(month) - 1
  const selectedYear  = parseInt(year)
  // Convert the selected date props to numbers for comparison

  const prevMonth = () => {
    // Navigate to the previous month, wrapping December → previous year
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  const nextMonth = () => {
    // Navigate to the next month, wrapping December → next year
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  // Push empty cells for days before the 1st of the month

  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Push day numbers 1 to end of month

  return 
     backgroundColor: "#131929", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e", marginTop: "12px" }
      
      {/* Month navigation header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div onClick={prevMonth} style={{ cursor: "pointer", color: "#9ca3af", fontSize: "18px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1c2132", borderRadius: "8px" }}>‹</div>
        <p style={{ fontWeight: "700", fontSize: "14px", color: "white" }}>{MONTHS[calMonth]} {calYear}</p>
        <div onClick={nextMonth} style={{ cursor: "pointer", color: "#9ca3af", fontSize: "18px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1c2132", borderRadius: "8px" }}>›</div>
      </div>

      {/* Day labels row: Sun Mon Tue ... */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: "11px", color: "#6b7280", fontWeight: "600", padding: "4px 0" }}>{d}</div>)}
      </div>

      {/* Calendar day cells grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          // Empty cell for days before the 1st of the month

          const isSelected = d === selectedDay && calMonth === selectedMonth && calYear === selectedYear
          // True if this cell matches the currently selected date

          const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
          // True if this cell is today's date

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

      {/* "Today" shortcut button */}
      <div onClick={() => onSelect(today.getDate(), today.getMonth() + 1, today.getFullYear())}
        style={{ marginTop: "12px", textAlign: "center", cursor: "pointer", color: "#3B82F6", fontSize: "12px", fontWeight: "600", padding: "8px", backgroundColor: "#1c2132", borderRadius: "10px" }}>
        Today
      </div>
    </div>
  


// ─────────────────────────────────────────────
// MAIN FORM COMPONENT
// ─────────────────────────────────────────────

function AddShiftForm() {
  // The main form for adding or editing a shift
  // Handles: auth check, form state, pay preview, and saving to Firestore

  const router = useRouter()
  // Used to navigate back or redirect to /Shifts after saving

  const searchParams = useSearchParams()
  // Reads URL params — used for edit mode and pre-filling date from Calendar

  const editId = searchParams.get("id")
  // If ?id=xxx exists in the URL, we are in EDIT mode
  // If null, we are in ADD mode

  const isEditMode = !!editId
  // Converts editId to boolean: true = edit, false = add

  const [hourlyRate, setHourlyRate] = useState(50)
  // The user's hourly pay rate — loaded from localStorage via loadSettings()

  const [nightMultiplier, setNightMultiplier] = useState(1.25)
  // Night shift pay multiplier (e.g. 1.25 = 125%) — loaded from localStorage

  const [currentUser, setCurrentUser] = useState(null)
  // Stores the logged-in Firebase user object
  // Used to attach userId to each shift saved in Firestore

  const today = new Date()
  // Today's date — used to set default form values

  const initDate  = searchParams.get("date") || ""
  const initParts = initDate ? initDate.split("-") : []
  // If a date was passed via URL (from Calendar page), split it into [year, month, day]

  const [selectedType, setSelectedType] = useState(
    SHIFT_TYPES.find(t => t.value === searchParams.get("shiftType")) || SHIFT_TYPES[0]
  )
  // Currently selected shift type object — defaults to Morning
  // If ?shiftType=night is in the URL, pre-selects Night

  const [dateDay,       setDateDay]       = useState(initParts[2] || String(today.getDate()).padStart(2, "0"))
  const [dateMonth,     setDateMonth]     = useState(initParts[1] || String(today.getMonth() + 1).padStart(2, "0"))
  const [dateYear,      setDateYear]      = useState(initParts[0] || String(today.getFullYear()))
  // Day, month, year inputs for the shift date
  // Pre-filled from URL params if coming from Calendar, otherwise defaults to today

  const [startTime,     setStartTime]     = useState(searchParams.get("startTime") || "07:00")
  const [endTime,       setEndTime]       = useState(searchParams.get("endTime")   || "15:00")
  // Start and end time inputs — pre-filled from URL or defaulted to 07:00-15:00

  const [breakDuration, setBreakDuration] = useState(searchParams.get("breakDuration") || "30")
  // Break duration in minutes — defaults to 30 minutes

  const [notes,         setNotes]         = useState(searchParams.get("notes") || "")
  // Optional notes field for the shift

  const [saving,        setSaving]        = useState(false)
  // True while the shift is being saved to Firestore — disables the save button

  const [showCalendar,  setShowCalendar]  = useState(false)
  // Controls whether the MiniCalendar is visible or hidden

  useEffect(() => {
    // Runs once when the component mounts

    const s = loadSettings()
    setHourlyRate(s.hourlyRate)
    setNightMultiplier(s.nightMultiplier)
    // Load user's pay settings from localStorage

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user)
      else router.push("/LoginPage")
      // If user is not logged in, redirect to login page
    })
    return () => unsub()
    // Cleanup: unsubscribe from auth listener when component unmounts
  }, [])

  const handleCalendarSelect = (d, m, y) => {
    // Called when user clicks a day in MiniCalendar
    // Updates the date fields and closes the calendar
    setDateDay(String(d).padStart(2, "0"))
    setDateMonth(String(m).padStart(2, "0"))
    setDateYear(String(y))
    setShowCalendar(false)
  }

  const handleSelectType = (type) => {
    // Called when user clicks a shift type button (Morning/Evening/Night/Custom)
    // Updates selected type and auto-fills default start/end times
    setSelectedType(type)
    if (!isEditMode) {
      if (type.value !== "custom") { setStartTime(type.defaultStart); setEndTime(type.defaultEnd) }
      else { setStartTime(""); setEndTime("") }
    }
  }

  const hours = calculateHours(startTime, endTime, parseInt(breakDuration) || 0)
  // Live calculation of total work hours based on current form values
  // Formula: (endTime - startTime) - breakDuration (in hours)

  const multiplier = selectedType.value === "night" ? nightMultiplier : 1
  // Apply night multiplier only for night shifts, otherwise use 1 (no multiplier)

  const previewPay = hours * hourlyRate * multiplier
  // Live pay preview shown to the user before saving
  // Formula: hours × hourlyRate × multiplier

  const selectedDateLabel = (() => {
    // Formats the selected date as a readable string
    // e.g. "Wednesday, April 9, 2026"
    // Returns empty string if date is invalid
    try {
      const d = new Date(`${dateYear}-${dateMonth}-${dateDay}T00:00:00`)
      if (isNaN(d)) return ""
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    } catch { return "" }
  })()

  const handleSave = async () => {
    // Called when user clicks Save button
    // Validates inputs, builds the shift object, and saves to Firestore

    if (!currentUser) return alert("Please login first.")
    // Prevent saving if no user is logged in

    const dateStr = `${dateYear}-${dateMonth.padStart(2,"0")}-${dateDay.padStart(2,"0")}`
    if (isNaN(new Date(dateStr).getTime())) return alert("Invalid date.")
    // Validate that the date is a real date

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime)) return alert("Invalid start time.")
    if (!timeRegex.test(endTime))   return alert("Invalid end time.")
    // Validate time format HH:MM

    setSaving(true)
    // Show "Saving..." state on the button

    try {
      const payload = {
        date: dateStr,
        startTime,
        endTime,
        shiftType: selectedType.value,
        breakDuration: parseInt(breakDuration) || 0,
        notes: notes.trim() || "",
        userId: currentUser.uid,
        // userId links this shift to the logged-in user in Firestore
      }

      if (isEditMode) {
        await updateDoc(doc(db, "shifts", editId), { ...payload, updatedAt: new Date().toISOString() })
        // UPDATE existing shift document in Firestore
      } else {
        await addDoc(collection(db, "shifts"), { ...payload, createdAt: new Date().toISOString() })
        // ADD new shift document to Firestore
      }

      router.push("/ShiftManagerApp/Tabs/Shifts")
      // Navigate to Shifts list after successful save

    } catch (e) { alert("Error saving shift.") }
    setSaving(false)
    // Reset saving state if error occurs
  }

  const isNight = selectedType.value === "night"
  // Shorthand boolean — used to apply special night styling and multiplier info

  return 
     backgroundColor: "#0f1117", minHeight: "100vh", color: "white", fontFamily: "'Inter', sans-serif" }

      {/* Sticky header with back button and save button */}
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
            {isEditMode ? "Edit Shift" : "Add Shift"}
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

        {/* Shift Type Selector */}
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
          {/* Night shift multiplier notice */}
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

        {/* Date Input */}
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

          {/* Calendar toggle button */}
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

          {/* Mini Calendar — shown only when showCalendar is true */}
          {showCalendar && (
            <MiniCalendar day={dateDay} month={dateMonth} year={dateYear} onSelect={handleCalendarSelect} />
          )}
        </div>

        {/* Time Input */}
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

        {/* Break Duration Selector */}
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

        {/* Live Pay Preview — only shown when both times are filled */}
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

        {/* Optional Notes Textarea */}
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

        {/* Save / Update Button */}
        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", backgroundColor: "#3B82F6", border: "none",
          borderRadius: "14px", padding: "18px", color: "white",
          fontWeight: "700", cursor: saving ? "not-allowed" : "pointer",
          fontSize: "16px", boxShadow: "0 4px 15px rgba(59,130,246,0.4)", transition: "all 0.2s"
        }}>
          {saving ? "Saving..." : isEditMode ? "Update Shift" : "Add Shift"}
        </button>

      </div>
    </div>
  


// ─────────────────────────────────────────────
// PAGE EXPORT
// ─────────────────────────────────────────────

export default function AddShiftPage() 
  // Next.js requires this as the default export for page.jsx
  // Wraps AddShiftForm in Suspense because useSearchParams() requires it
  // Suspense shows a loading screen while the component initializes
  return 
    Suspense fallback=
     style={{ backgroundColor: "#0f1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        style= color: "#6b7280" >Loading...
      
    
      <AddShiftForm />
    </Suspense>
  
