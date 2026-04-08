"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AiOutlineHome, AiOutlineCalendar, AiOutlineUnorderedList,
  AiOutlineDollar, AiOutlineSetting
} from "react-icons/ai"
import { db, auth } from "@/app/LoginPage/Firebase"
import { collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

const SETTINGS_KEY = "shiftmanager_settings"

// loadSettings with defaults
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
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let h = eh - sh + (em - sm) / 60
  if (h < 0) h += 24
  return Math.max(0, h - breakMin / 60)
}

// calculatePay with nightMultiplier
const calculatePay = (shift, hourlyRate, nightMultiplier) => {
  const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
  const multiplier = shift.shiftType === "night" ? nightMultiplier : 1
  return hours * hourlyRate * multiplier
}

const getMonthKey = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const formatMonth = (key) => {
  const [year, month] = key.split("-")
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

const SHIFT_TYPE_COLORS = {
  morning: "#F59E0B", evening: "#8B5CF6", night: "#3B82F6", custom: "#10B981",
}

export default function SalaryScreen() {
  const router = useRouter()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [hourlyRate, setHourlyRate] = useState(50)
  const [nightMultiplier, setNightMultiplier] = useState(1.25)

  const tabs = [
    { icon: <AiOutlineHome size={22} />, label: "Home", path: "/ShiftManagerApp/Tabs/Home" },
    { icon: <AiOutlineCalendar size={22} />, label: "Calendar", path: "/ShiftManagerApp/Tabs/Calendar" },
    { icon: <AiOutlineUnorderedList size={22} />, label: "Shifts", path: "/ShiftManagerApp/Tabs/Shifts" },
    { icon: <AiOutlineDollar size={22} />, label: "Salary", path: "/ShiftManagerApp/Tabs/Salary" },
    { icon: <AiOutlineSetting size={22} />, label: "Settings", path: "/ShiftManagerApp/Tabs/Settings" },
  ]

  useEffect(() => {
  const s = loadSettings()
  setHourlyRate(s.hourlyRate)
  setNightMultiplier(s.nightMultiplier)

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
      setLoading(false)
    } else {
      router.push("/LoginPage")
    }
  })
  return () => unsub()
}, [])


  const monthlyData = {}
  shifts.forEach(shift => {
    const key = getMonthKey(shift.date)
    if (!monthlyData[key]) monthlyData[key] = []
    monthlyData[key].push(shift)
  })

  const sortedMonths = Object.keys(monthlyData).sort((a, b) => b.localeCompare(a))

  const totalPayAll = shifts.reduce((sum, s) => sum + calculatePay(s, hourlyRate, nightMultiplier), 0)
  const totalHoursAll = shifts.reduce((sum, s) => sum + calculateHours(s.startTime, s.endTime, s.breakDuration || 0), 0)
  const totalShifts = shifts.length

  return (
    <div style={{
      backgroundColor: "#0a0d14", minHeight: "100vh", color: "white",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", paddingBottom: "90px"
    }}>

      {/* Header */}
      <div style={{ padding: "28px 20px 0" }}>
        <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Overview</p>
        <h1 style={{ fontSize: "32px", fontWeight: "800", background: "linear-gradient(135deg, #fff 60%, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Salary
        </h1>
      </div>

      {/* Summary Card */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
          borderRadius: "20px", padding: "24px", position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(59,130,246,0.25)"
        }}>
          <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "140px", height: "140px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "8px" }}>Total Earnings</p>
          <p style={{ fontSize: "40px", fontWeight: "800", color: "white", marginBottom: "20px", letterSpacing: "-1px" }}>
            ₪ {totalPayAll.toFixed(2)}
          </p>
          <div style={{ display: "flex", gap: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Total Hours</p>
              <p style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>{totalHoursAll.toFixed(1)}h</p>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Shifts</p>
              <p style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>{totalShifts}</p>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>Rate</p>
              <p style={{ color: "white", fontWeight: "700", fontSize: "16px" }}>₪{hourlyRate}/hr</p>
            </div>
            {/* ✅ Night rate badge */}
            <div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", marginBottom: "4px" }}>🌙 Night</p>
              <p style={{ color: "#93C5FD", fontWeight: "700", fontSize: "16px" }}>{Math.round(nightMultiplier * 100)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div style={{ padding: "28px 20px 0" }}>
        <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px" }}>
          Monthly Breakdown
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#4B5563" }}>Loading...</div>
        ) : sortedMonths.length === 0 ? (
          <div style={{ backgroundColor: "#111827", borderRadius: "16px", padding: "40px", border: "1px solid #1f2937", textAlign: "center" }}>
            <p style={{ color: "#4B5563", fontSize: "15px" }}>No shifts yet</p>
            <p onClick={() => router.push("/ShiftManagerApp/Tabs/AddShift")}
              style={{ color: "#3B82F6", cursor: "pointer", fontWeight: "600", marginTop: "8px" }}>
              Add your first shift →
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sortedMonths.map(month => {
              const mShifts = monthlyData[month]
              const mHours = mShifts.reduce((sum, s) => sum + calculateHours(s.startTime, s.endTime, s.breakDuration || 0), 0)
              const mPay   = mShifts.reduce((sum, s) => sum + calculatePay(s, hourlyRate, nightMultiplier), 0)
              const isOpen = selectedMonth === month

              return (
                <div key={month}>
                  <div onClick={() => setSelectedMonth(isOpen ? null : month)} style={{
                    backgroundColor: isOpen ? "#111827" : "#0f1520",
                    borderRadius: isOpen ? "16px 16px 0 0" : "16px",
                    padding: "18px 20px",
                    border: `1px solid ${isOpen ? "#1d4ed8" : "#1f2937"}`,
                    borderBottom: isOpen ? "none" : undefined,
                    cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.2s"
                  }}>
                    <div>
                      <p style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>{formatMonth(month)}</p>
                      <p style={{ color: "#4B5563", fontSize: "12px" }}>{mShifts.length} shifts · {mHours.toFixed(1)}h</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: "#3B82F6", fontWeight: "800", fontSize: "18px" }}>₪{mPay.toFixed(0)}</p>
                      <p style={{ color: "#4B5563", fontSize: "11px", marginTop: "2px" }}>{isOpen ? "▲ Hide" : "▼ Details"}</p>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{
                      backgroundColor: "#111827", borderRadius: "0 0 16px 16px",
                      border: "1px solid #1d4ed8", borderTop: "1px solid #1f2937", overflow: "hidden"
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", backgroundColor: "#1f2937", borderBottom: "1px solid #1f2937" }}>
                        {[
                          { label: "Hours", value: `${mHours.toFixed(1)}h` },
                          { label: "Shifts", value: mShifts.length },
                          { label: "Avg/Shift", value: `₪${(mPay / mShifts.length).toFixed(0)}` }
                        ].map(stat => (
                          <div key={stat.label} style={{ backgroundColor: "#0f1520", padding: "14px", textAlign: "center" }}>
                            <p style={{ color: "#4B5563", fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>{stat.label}</p>
                            <p style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {mShifts.map(shift => {
                          const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
                          const pay   = calculatePay(shift, hourlyRate, nightMultiplier)
                          const color = SHIFT_TYPE_COLORS[shift.shiftType] || "#10B981"
                          const isNight = shift.shiftType === "night"
                          return (
                            <div key={shift.id} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "12px 14px", backgroundColor: "#0a0d14",
                              borderRadius: "10px", borderLeft: `3px solid ${color}`
                            }}>
                              <div>
                                <p style={{ fontWeight: "600", fontSize: "13px" }}>
                                  {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </p>
                                <p style={{ color: "#4B5563", fontSize: "11px", marginTop: "2px" }}>
                                  {shift.startTime} – {shift.endTime} · {hours.toFixed(1)}h
                                  {/* Night Shift Indicator */}
                                  {isNight && <span style={{ color: "#3B82F6", marginLeft: "6px" }}>🌙 ×{nightMultiplier}</span>}
                                </p>
                              </div>
                              <p style={{ color: isNight ? "#93C5FD" : "#3B82F6", fontWeight: "700", fontSize: "14px" }}>
                                ₪{pay.toFixed(2)}
                              </p>
                            </div>
                          )
                        })}

                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "14px 14px", marginTop: "4px",
                          background: "linear-gradient(135deg, #1d4ed820, #1e3a8a20)",
                          borderRadius: "10px", border: "1px solid #1d4ed840"
                        }}>
                          <p style={{ fontWeight: "700", fontSize: "14px", color: "#93C5FD" }}>Month Total</p>
                          <p style={{ color: "#60A5FA", fontWeight: "800", fontSize: "16px" }}>₪{mPay.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0a0d14",
        display: "flex", justifyContent: "space-around", padding: "10px 0 16px", borderTop: "1px solid #1f2937"
      }}>
        {tabs.map((item, index) => (
          <div key={index} onClick={() => router.push(item.path)} style={{ textAlign: "center", cursor: "pointer", padding: "4px 12px" }}>
            <div style={{ color: item.label === "Salary" ? "#3B82F6" : "#374151", marginBottom: "3px" }}>{item.icon}</div>
            <p style={{ fontSize: "10px", color: item.label === "Salary" ? "#3B82F6" : "#374151", fontWeight: item.label === "Salary" ? "600" : "400" }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}