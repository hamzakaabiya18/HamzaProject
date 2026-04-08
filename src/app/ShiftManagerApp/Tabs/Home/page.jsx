"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AiOutlineHome, AiOutlineCalendar, AiOutlineUnorderedList, AiOutlineDollar, AiOutlineSetting } from "react-icons/ai"
import { BsPencilSquare } from "react-icons/bs"
import { HiTrendingUp, HiPlus, HiChevronRight } from "react-icons/hi"
import { MdOutlineAttachMoney, MdOutlineCalendarMonth } from "react-icons/md"
import { db, auth } from "@/app/LoginPage/Firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts"

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

const getShiftTypeColor = (type) => {
  const colors = { morning: "#F59E0B", evening: "#8B5CF6", night: "#3B82F6", custom: "#10B981" }
  return colors[type] || "#10B981"
}

const calculateHours = (start, end, breakMin = 0) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  let h = eh - sh + (em - sm) / 60
  if (h < 0) h += 24
  return Math.max(0, h - breakMin / 60)
}

const calculatePay = (shift, hourlyRate, nightMultiplier) => {
  const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
  const multiplier = shift.shiftType === "night" ? nightMultiplier : 1
  return hours * hourlyRate * multiplier
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: "#1c2132", border: "1px solid #2a2f3e",
        borderRadius: "12px", padding: "12px 16px", fontSize: "13px"
      }}>
        <p style={{ color: "#9ca3af", marginBottom: "6px", fontWeight: "600" }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color, marginBottom: "3px" }}>
            {entry.name === "Hours" ? `⏱ ${entry.value}h` : `₪ ${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: "#1c2132", border: "1px solid #2a2f3e",
        borderRadius: "10px", padding: "10px 14px", fontSize: "13px"
      }}>
        <p style={{ color: payload[0].payload.color, fontWeight: "700" }}>{payload[0].name}</p>
        <p style={{ color: "white" }}>{payload[0].value} shifts ({payload[0].payload.percent}%)</p>
      </div>
    )
  }
  return null
}

export default function HomeScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("Home")
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hourlyRate, setHourlyRate] = useState(50)
  const [nightMultiplier, setNightMultiplier] = useState(1.25)
  const [showPie, setShowPie] = useState(false)
  // ✅ اسم المستخدم
  const [userName, setUserName] = useState("")

  const fetchShifts = async () => {
    try {
      const q = query(collection(db, "shifts"), orderBy("date", "desc"))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setShifts(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const refreshSettings = () => {
    const s = loadSettings()
    setHourlyRate(s.hourlyRate)
    setNightMultiplier(s.nightMultiplier)
  }

  useEffect(() => {
    fetchShifts()
    refreshSettings()

    // ✅ يقرأ الاسم من localStorage أولاً
    const savedName = localStorage.getItem("userName")
    if (savedName) {
      setUserName(savedName)
    } else {
      // إذا مو موجود يقرأ من Firebase Auth
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user?.displayName) {
          setUserName(user.displayName)
          localStorage.setItem("userName", user.displayName)
        } else if (user?.email) {
          setUserName(user.email)
        }
      })
      return () => unsub()
    }

    const handleFocus = () => {
      fetchShifts()
      refreshSettings()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const now = new Date()
  const today = now.toISOString().split("T")[0]
  const todayShift = shifts.find(s => s.date === today)

  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0]
  const endOfWeekStr = new Date(startOfWeek.getTime() + 6 * 86400000).toISOString().split("T")[0]
  const weekShifts = shifts.filter(s => s.date >= startOfWeekStr && s.date <= endOfWeekStr)
  const weekHours = weekShifts.reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime, s.breakDuration || 0), 0)
  const weekPay   = weekShifts.reduce((acc, s) => acc + calculatePay(s, hourlyRate, nightMultiplier), 0)

  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const monthShifts = shifts.filter(s => s.date.startsWith(monthStr))
  const monthHours = monthShifts.reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime, s.breakDuration || 0), 0)
  const monthPay   = monthShifts.reduce((acc, s) => acc + calculatePay(s, hourlyRate, nightMultiplier), 0)

  const nextWeekStr = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]
  const upcomingShifts = shifts
    .filter(s => s.date >= today && s.date <= nextWeekStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const chartData = (() => {
    const grouped = {}
    shifts
      .filter(s => {
        const diff = (new Date() - new Date(s.date + "T00:00:00")) / (1000 * 60 * 60 * 24)
        return diff >= -30 && diff <= 30
      })
      .forEach(s => {
        const rawDate = s.date
        const label = new Date(rawDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (!grouped[rawDate]) grouped[rawDate] = { date: label, Hours: 0, Pay: 0, rawDate }
        const h = parseFloat(calculateHours(s.startTime, s.endTime, s.breakDuration || 0).toFixed(1))
        const p = parseFloat(calculatePay(s, hourlyRate, nightMultiplier).toFixed(0))
        grouped[rawDate].Hours = parseFloat((grouped[rawDate].Hours + h).toFixed(1))
        grouped[rawDate].Pay   = parseFloat((grouped[rawDate].Pay + p).toFixed(0))
      })
    return Object.values(grouped).sort((a, b) => a.rawDate.localeCompare(b.rawDate))
  })()

  const shiftTypeCounts = { morning: 0, evening: 0, night: 0, custom: 0 }
  shifts.forEach(s => { if (shiftTypeCounts[s.shiftType] !== undefined) shiftTypeCounts[s.shiftType]++ })
  const total = shifts.length || 1
  const pieData = [
    { name: "Morning", value: shiftTypeCounts.morning, color: "#F59E0B", percent: Math.round(shiftTypeCounts.morning / total * 100) },
    { name: "Evening", value: shiftTypeCounts.evening, color: "#8B5CF6", percent: Math.round(shiftTypeCounts.evening / total * 100) },
    { name: "Night",   value: shiftTypeCounts.night,   color: "#3B82F6", percent: Math.round(shiftTypeCounts.night / total * 100) },
    { name: "Custom",  value: shiftTypeCounts.custom,  color: "#10B981", percent: Math.round(shiftTypeCounts.custom / total * 100) },
  ].filter(d => d.value > 0)

  const tabs = [
    { icon: <AiOutlineHome size={22}/>, label: "Home", path: "/ShiftManagerApp/Tabs/Home" },
    { icon: <AiOutlineCalendar size={22}/>, label: "Calendar", path: "/ShiftManagerApp/Tabs/Calendar" },
    { icon: <AiOutlineUnorderedList size={22}/>, label: "Shifts", path: "/ShiftManagerApp/Tabs/Shifts" },
    { icon: <AiOutlineDollar size={22}/>, label: "Salary", path: "/ShiftManagerApp/Tabs/Salary" },
    { icon: <AiOutlineSetting size={22}/>, label: "Settings", path: "/ShiftManagerApp/Tabs/Settings" },
  ]

  return (
    <div style={{ backgroundColor: "#0f1117", minHeight: "100vh", color: "white", paddingBottom: "100px", fontFamily: "'Inter', sans-serif", overflowY: "auto" }}>

      {/* Header */}
      <div style={{ padding: "24px 16px 0px" }}>
        <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "4px" }}>Welcome back,</p>
        {/* ✅ الاسم الكامل من localStorage */}
        <h1 style={{ fontSize: "30px", fontWeight: "700", color: "white", marginBottom: "4px", textAlign: "right" }}>
          {userName || "..."}
        </h1>
        <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div style={{ padding: "0px 16px" }}>

        {/* Today's Shift */}
        {loading ? (
          <div style={{ backgroundColor: "#1c2132", borderRadius: "20px", padding: "20px", marginBottom: "16px", textAlign: "center" }}>
            <p style={{ color: "#6b7280" }}>Loading...</p>
          </div>
        ) : todayShift ? (
          <div onClick={() => router.push("/ShiftManagerApp/Tabs/Shifts")} style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #1d4ed8 100%)",
            borderRadius: "20px", padding: "20px", marginBottom: "16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3)", cursor: "pointer"
          }}>
            <div>
              <p style={{ fontSize: "13px", opacity: 0.85, marginBottom: "6px" }}>Today's Shift</p>
              <h2 style={{ fontSize: "30px", fontWeight: "800", marginBottom: "4px" }}>{todayShift.startTime} - {todayShift.endTime}</h2>
              <p style={{ fontSize: "14px", opacity: 0.85, textTransform: "capitalize" }}>
                {todayShift.shiftType} Shift{todayShift.breakDuration ? ` · ${todayShift.breakDuration}min break` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "20px", fontWeight: "800", marginBottom: "4px" }}>
                ₪{calculatePay(todayShift, hourlyRate, nightMultiplier).toFixed(0)}
              </p>
              {todayShift.shiftType === "night" && (
                <p style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px" }}>🌙 ×{nightMultiplier}</p>
              )}
              <div style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: "8px", borderRadius: "10px", display: "inline-flex" }}>
                <BsPencilSquare size={16} color="white" />
              </div>
            </div>
          </div>
        ) : (
          <div onClick={() => router.push("/ShiftManagerApp/Tabs/AddShift")} style={{
            backgroundColor: "#1c2132", borderRadius: "20px", padding: "20px", marginBottom: "16px",
            border: "2px dashed #2a2f3e", textAlign: "center", cursor: "pointer"
          }}>
            <HiPlus size={32} color="#3B82F6" style={{ margin: "0 auto 8px" }} />
            <p style={{ color: "#3B82F6", fontWeight: "600" }}>No shift today — tap to add one</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, backgroundColor: "#1c2132", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e" }}>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>This Week</p>
            <h3 style={{ fontSize: "26px", fontWeight: "700", color: "white", marginBottom: "4px" }}>{weekHours.toFixed(1)}h</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <HiTrendingUp size={13} color="#10b981" />
              <p style={{ color: "#9ca3af", fontSize: "12px" }}>{weekShifts.length} shifts</p>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: "#1c2132", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e" }}>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>Week Pay</p>
            <h3 style={{ fontSize: "22px", fontWeight: "700", color: "white", marginBottom: "4px" }}>₪ {weekPay.toFixed(2)}</h3>
            <p style={{ color: "#9ca3af", fontSize: "12px" }}>estimated</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, backgroundColor: "#1c2132", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e" }}>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>This Month</p>
            <h3 style={{ fontSize: "26px", fontWeight: "700", color: "white", marginBottom: "4px" }}>{monthHours.toFixed(1)}h</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <HiTrendingUp size={13} color="#10b981" />
              <p style={{ color: "#9ca3af", fontSize: "12px" }}>{monthShifts.length} shifts</p>
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: "#1c2132", borderRadius: "16px", padding: "16px", border: "1px solid #2a2f3e" }}>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "6px" }}>Month Pay</p>
            <h3 style={{ fontSize: "22px", fontWeight: "700", color: "white", marginBottom: "4px" }}>₪ {monthPay.toFixed(2)}</h3>
            <p style={{ color: "#9ca3af", fontSize: "12px" }}>estimated</p>
          </div>
        </div>

        {/* Area Chart */}
        <div style={{ backgroundColor: "#1c2132", borderRadius: "20px", padding: "20px", marginBottom: "16px", border: "1px solid #2a2f3e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white" }}>📊 Earnings Overview</h3>
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>Last 30 days</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "12px", color: "#9ca3af", paddingTop: "12px" }} iconType="circle" />
                <Area type="natural" dataKey="Hours" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorHours)" dot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Area type="natural" dataKey="Pay" stroke="#10B981" strokeWidth={2.5} fill="url(#colorPay)" dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "#6b7280", fontSize: "14px" }}>No data yet — add shifts to see your chart</p>
            </div>
          )}
          <div onClick={() => setShowPie(!showPie)} style={{
            marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", cursor: "pointer", padding: "10px",
            backgroundColor: "#0f1117", borderRadius: "12px", border: "1px solid #2a2f3e"
          }}>
            <span style={{ fontSize: "16px" }}>{showPie ? "🔼" : "⏬"}</span>
            <p style={{ color: "#9ca3af", fontSize: "13px", fontWeight: "600" }}>
              {showPie ? "Hide Shift Breakdown" : "Show Shift Breakdown"}
            </p>
          </div>
        </div>

        {/* Pie Chart */}
        {showPie && (
          <div style={{ backgroundColor: "#1c2132", borderRadius: "20px", padding: "20px", marginBottom: "20px", border: "1px solid #2a2f3e" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "white", marginBottom: "4px" }}>🥧 Shift Breakdown</h3>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "16px" }}>Distribution by shift type</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                  {pieData.map((entry, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#0f1117", borderRadius: "10px", padding: "10px 12px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{entry.name}</p>
                        <p style={{ fontSize: "11px", color: "#6b7280" }}>{entry.value} shifts · {entry.percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <p style={{ color: "#6b7280", fontSize: "14px" }}>No shift data yet</p>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Shifts */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600" }}>Upcoming Shifts</h3>
          <span onClick={() => router.push("/ShiftManagerApp/Tabs/Shifts")} style={{ color: "#3B82F6", fontSize: "14px", cursor: "pointer", fontWeight: "500" }}>View All</span>
        </div>

        {upcomingShifts.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {upcomingShifts.map((shift) => {
              const shiftColor = getShiftTypeColor(shift.shiftType)
              const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
              const pay   = calculatePay(shift, hourlyRate, nightMultiplier)
              const isNight = shift.shiftType === "night"
              return (
                <div key={shift.id} onClick={() => router.push("/ShiftManagerApp/Tabs/Shifts")} style={{
                  backgroundColor: "#1c2132", borderRadius: "12px", padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: "12px",
                  border: "1px solid #2a2f3e", cursor: "pointer"
                }}>
                  <div style={{ width: "4px", height: "36px", backgroundColor: shiftColor, borderRadius: "4px" }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "3px" }}>
                      {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p style={{ color: "#9ca3af", fontSize: "12px" }}>
                      {shift.startTime} - {shift.endTime} · {hours.toFixed(1)}h
                      {isNight && <span style={{ color: "#3B82F6", marginLeft: "6px" }}>🌙 ×{nightMultiplier}</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ backgroundColor: `${shiftColor}25`, padding: "4px 10px", borderRadius: "12px", marginBottom: "4px" }}>
                      <span style={{ color: shiftColor, fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>{shift.shiftType}</span>
                    </div>
                    <p style={{ color: isNight ? "#93C5FD" : "#3B82F6", fontSize: "12px", fontWeight: "600" }}>
                      ₪{pay.toFixed(0)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ backgroundColor: "#1c2132", borderRadius: "12px", padding: "24px", border: "1px solid #2a2f3e", textAlign: "center", marginBottom: "20px" }}>
            <p style={{ color: "#6b7280" }}>No upcoming shifts</p>
          </div>
        )}

        {/* Quick Actions */}
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>Quick Actions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div onClick={() => router.push("/ShiftManagerApp/Tabs/AddShift")} style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #1d4ed8 100%)",
            borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", cursor: "pointer", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <HiPlus size={24} color="white" />
              <p style={{ fontWeight: "600", fontSize: "16px" }}>Add New Shift</p>
            </div>
            <HiChevronRight size={20} color="white" />
          </div>
          <div onClick={() => router.push("/ShiftManagerApp/Tabs/Salary")} style={{
            backgroundColor: "#1c2132", borderRadius: "12px", padding: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid #2a2f3e", cursor: "pointer"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <MdOutlineAttachMoney size={24} color="#3B82F6" />
              <p style={{ fontWeight: "600", fontSize: "15px" }}>View Salary Slips</p>
            </div>
            <HiChevronRight size={20} color="#6b7280" />
          </div>
          <div onClick={() => router.push("/ShiftManagerApp/Tabs/Calendar")} style={{
            backgroundColor: "#1c2132", borderRadius: "12px", padding: "16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid #2a2f3e", cursor: "pointer"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <MdOutlineCalendarMonth size={24} color="#3B82F6" />
              <p style={{ fontWeight: "600", fontSize: "15px" }}>View Calendar</p>
            </div>
            <HiChevronRight size={20} color="#6b7280" />
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1c2132",
        display: "flex", justifyContent: "space-around", padding: "10px 0 14px", borderTop: "1px solid #2a2f3e"
      }}>
        {tabs.map((item, index) => (
          <div key={index} onClick={() => { setActiveTab(item.label); router.push(item.path) }}
            style={{ textAlign: "center", cursor: "pointer", padding: "4px 12px" }}>
            <div style={{ color: activeTab === item.label ? "#3B82F6" : "#6b7280", marginBottom: "3px" }}>{item.icon}</div>
            <p style={{ fontSize: "10px", color: activeTab === item.label ? "#3B82F6" : "#6b7280", fontWeight: activeTab === item.label ? "600" : "400" }}>{item.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}