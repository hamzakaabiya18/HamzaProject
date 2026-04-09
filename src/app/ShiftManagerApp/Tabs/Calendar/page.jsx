"use client"
import { useRouter } from "next/navigation"
import { HiPlus } from "react-icons/hi"
import { useState, useMemo, useEffect } from "react"
import { calculateHours } from "@/lib/shiftUtils"
import BottomNav from "@/components/BottomNav"
import { db, auth } from "@/app/LoginPage/Firebase"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { SparkleIcon, SHIFT_COLORS, SHIFT_ICONS } from "@/components/ShiftIcons"

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


export default function CalendarScreen() {
  const router = useRouter()
  const today = new Date()
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0])
  const [shifts,       setShifts]       = useState([])
  const [hourlyRate,   setHourlyRate]   = useState(50)

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const q = query(
          collection(db, "shifts"),
          where("userId", "==", user.uid),
          orderBy("date", "desc")
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setShifts(data)
      } catch (e) { console.error(e) }
    } else {
      router.push("/LoginPage")
    }
  })
}, [])


  const calendarDays = useMemo(() => {
    const firstDay  = new Date(currentYear, currentMonth, 1)
    const lastDay   = new Date(currentYear, currentMonth + 1, 0)
    const startPad  = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let i = 1; i <= totalDays; i++) days.push(i)
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [currentYear, currentMonth])

  const shiftsMap = useMemo(() => {
    const map = {}
    shifts.forEach(s => {
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    })
    return map
  }, [shifts])

  const goToPreviousMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
    setSelectedDate(null)
  }

  const getDateStr = (day) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const todayStr  = today.toISOString().split("T")[0]
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const selectedShifts = selectedDate ? (shiftsMap[selectedDate] || []) : []

  //  + AddShift 
  const handleAddShiftForDate = () => {
    if (!selectedDate) {
      router.push("/ShiftManagerApp/Tabs/AddShift")
      return
    }
    const parts = selectedDate.split("-")
    const params = new URLSearchParams({
      date:      selectedDate,
      startTime: "",
      endTime:   "",
    })
    router.push(`/ShiftManagerApp/Tabs/AddShift?${params.toString()}`)
  }

  return (
    <div style={{
      backgroundColor: "#0f1117", minHeight: "100vh", color: "white",
      padding: "20px 16px", fontFamily: "'Inter', sans-serif", paddingBottom: "90px"
    }}>

      {/* Month Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <button onClick={goToPreviousMonth} style={{
          background: "#1c2132", border: "1px solid #2a2f3e", color: "white",
          fontSize: "20px", cursor: "pointer", padding: "8px 14px", borderRadius: "10px"
        }}>‹</button>
        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>{monthName}</h2>
        <button onClick={goToNextMonth} style={{
          background: "#1c2132", border: "1px solid #2a2f3e", color: "white",
          fontSize: "20px", cursor: "pointer", padding: "8px 14px", borderRadius: "10px"
        }}>›</button>
      </div>

      {/* Days Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "8px" }}>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} style={{ textAlign: "center", color: "#6b7280", fontSize: "12px", fontWeight: "600", padding: "8px 0" }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {calendarDays.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} style={{ height: "52px" }} />
          const dateStr   = getDateStr(day)
          const isToday   = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const dayShifts = shiftsMap[dateStr] || []
          const hasShift  = dayShifts.length > 0

          return (
            <div key={dateStr} onClick={() => setSelectedDate(dateStr)} style={{
              height: "56px", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: "12px", cursor: "pointer",
              backgroundColor: isSelected ? "#3B82F6" : isToday ? "rgba(59,130,246,0.15)" : "transparent",
              border: isSelected ? "none" : isToday ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
            }}>
              <span style={{
                color: isSelected ? "white" : isToday ? "#3B82F6" : "white",
                fontWeight: isToday || isSelected ? "700" : "400",
                fontSize: "15px"
              }}>{day}</span>

              {hasShift && (
                <div style={{ display: "flex", gap: "2px", marginTop: "3px" }}>
                  {dayShifts.slice(0, 3).map((s, i) => (
                    <div key={i} style={{
                      width: "5px", height: "5px", borderRadius: "50%",
                      backgroundColor: isSelected ? "white" : (SHIFT_COLORS[s.shiftType] || "#10B981")
                    }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Day Details */}
      {selectedDate && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric"
              })}
            </h3>
            {/* ✅ زر + يفتح AddShift مع التاريخ */}
            <div onClick={handleAddShiftForDate} style={{
              backgroundColor: "#3B82F6", borderRadius: "50%",
              width: "36px", height: "36px", display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 4px 12px rgba(59,130,246,0.4)"
            }}>
              <HiPlus size={20} color="white" />
            </div>
          </div>

          {selectedShifts.length === 0 ? (
            <div style={{
              backgroundColor: "#1c2132", borderRadius: "14px",
              padding: "32px", border: "1px solid #2a2f3e", textAlign: "center"
            }}>
              <p style={{ color: "#6b7280", fontSize: "15px", marginBottom: "8px" }}>No shifts on this day</p>
              {/* Add Shift Button */}
              <p onClick={handleAddShiftForDate}
                style={{ color: "#3B82F6", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                + Add a shift
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {selectedShifts.map(shift => {
                const color = SHIFT_COLORS[shift.shiftType] || "#10B981"
                const icon  = SHIFT_ICONS[shift.shiftType]  || <SparkleIcon />
                const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
                const pay   = hours * hourlyRate

                return (
                  <div key={shift.id} style={{
                    backgroundColor: "#1c2132", borderRadius: "14px",
                    padding: "16px", border: "1px solid #2a2f3e",
                    borderLeft: `4px solid ${color}`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          backgroundColor: `${color}18`, borderRadius: "10px",
                          padding: "8px", display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {icon}
                        </div>
                        <div>
                          <p style={{ fontWeight: "700", fontSize: "15px", textTransform: "capitalize", color }}>
                            {shift.shiftType} Shift
                          </p>
                          <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: "2px" }}>
                            {shift.startTime} – {shift.endTime}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: "#3B82F6", fontWeight: "700", fontSize: "15px" }}>₪{pay.toFixed(2)}</p>
                        <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>{hours.toFixed(1)}h</p>
                      </div>
                    </div>

                    {shift.breakDuration > 0 && (
                      <p style={{ color: "#4B5563", fontSize: "11px", marginTop: "10px" }}>
                        {shift.breakDuration}min break included
                      </p>
                    )}
                    {shift.notes && (
                      <p style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginTop: "6px" }}>
                         {shift.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <BottomNav />

    </div>
  )
}