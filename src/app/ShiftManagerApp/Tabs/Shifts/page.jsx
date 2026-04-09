"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AiOutlineHome, AiOutlineCalendar, AiOutlineUnorderedList, AiOutlineDollar, AiOutlineSetting } from "react-icons/ai"
import { BsTrash, BsPencil } from "react-icons/bs"
import { HiPlus } from "react-icons/hi"
import { db, auth } from "@/app/LoginPage/Firebase"
import { collection, getDocs, deleteDoc, doc, query, orderBy, where } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { loadSettings, calculateHours, calculatePay, getShiftTypeColor } from "@/lib/shiftUtils"
import BottomNav from "@/components/BottomNav"

export default function ShiftsScreen() {
  const router = useRouter()
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [hourlyRate, setHourlyRate] = useState(50)
  const [nightMultiplier, setNightMultiplier] = useState(1.25)
  const [currentUser, setCurrentUser] = useState(null)

  const tabs = [
    { icon: <AiOutlineHome size={22}/>, label: "Home", path: "/ShiftManagerApp/Tabs/Home" },
    { icon: <AiOutlineCalendar size={22}/>, label: "Calendar", path: "/ShiftManagerApp/Tabs/Calendar" },
    { icon: <AiOutlineUnorderedList size={22}/>, label: "Shifts", path: "/ShiftManagerApp/Tabs/Shifts" },
    { icon: <AiOutlineDollar size={22}/>, label: "Salary", path: "/ShiftManagerApp/Tabs/Salary" },
    { icon: <AiOutlineSetting size={22}/>, label: "Settings", path: "/ShiftManagerApp/Tabs/Settings" },
  ]

  // Fetch shifts from Firestore for the current user
  const fetchShifts = async (uid) => {
    if (!uid) return
    try {
      const q = query(
        collection(db, "shifts"),
        where("userId", "==", uid),
        orderBy("date", "desc")
      )
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
    refreshSettings()
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        fetchShifts(user.uid)
      } else {
        router.push("/LoginPage")
      }
    })

    const handleFocus = () => {
      refreshSettings()
      if (currentUser) fetchShifts(currentUser.uid)
    }
    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("focus", handleFocus)
      unsub()
    }
  }, [])

  const handleDelete = async (id) => {
    if (!confirm("Delete this shift?")) return
    await deleteDoc(doc(db, "shifts", id))
    fetchShifts(currentUser.uid)
  }

  const handleEdit = (shift) => {
    const params = new URLSearchParams({
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: shift.shiftType,
      breakDuration: String(shift.breakDuration || 0),
      notes: shift.notes || ""
    })
    router.push(`/ShiftManagerApp/Tabs/AddShift?${params.toString()}`)
  }

  const filteredShifts = filter === "all" ? shifts : shifts.filter(s => s.shiftType === filter)

  return (
    <div style={{ backgroundColor: "#0f1117", minHeight: "100vh", color: "white", fontFamily: "'Inter', sans-serif" }}>

      <div style={{ padding: "20px 16px 0px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "700" }}>My Shifts</h1>
          <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "2px" }}>{shifts.length} total shifts</p>
        </div>
        <div onClick={() => router.push("/ShiftManagerApp/Tabs/AddShift")} style={{
          backgroundColor: "#3B82F6", borderRadius: "50%", width: "44px", height: "44px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 4px 15px rgba(59,130,246,0.4)"
        }}>
          <HiPlus size={24} color="white" />
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: "8px", overflowX: "auto" }}>
        {["all", "morning", "evening", "night", "custom"].map(f => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 16px", borderRadius: "20px", cursor: "pointer",
            whiteSpace: "nowrap", fontSize: "13px", fontWeight: "500",
            backgroundColor: filter === f ? "#3B82F6" : "#1c2132",
            color: filter === f ? "white" : "#6b7280",
            border: filter === f ? "none" : "1px solid #2a2f3e",
            textTransform: "capitalize"
          }}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px", paddingBottom: "80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Loading...</div>
        ) : filteredShifts.length === 0 ? (
          <div style={{ backgroundColor: "#1c2132", borderRadius: "12px", padding: "48px", border: "1px solid #2a2f3e", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "16px", marginBottom: "12px" }}>No shifts yet</p>
            <p onClick={() => router.push("/ShiftManagerApp/Tabs/AddShift")}
              style={{ color: "#3B82F6", cursor: "pointer", fontWeight: "600" }}>
              Add your first shift +
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredShifts.map(shift => {
              const color   = getShiftTypeColor(shift.shiftType)
              const h       = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
              const pay     = calculatePay(shift, hourlyRate, nightMultiplier)
              const isNight = shift.shiftType === "night"
              return (
                <div key={shift.id} style={{
                  backgroundColor: "#1c2132", borderRadius: "14px",
                  padding: "16px", border: "1px solid #2a2f3e",
                  borderLeft: `4px solid ${color}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px" }}>
                        {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric"
                        })}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <p style={{ color: "#9ca3af", fontSize: "13px" }}>{shift.startTime} - {shift.endTime}</p>
                        <div style={{ backgroundColor: `${color}25`, padding: "2px 10px", borderRadius: "20px" }}>
                          <span style={{ color, fontSize: "11px", fontWeight: "600", textTransform: "capitalize" }}>{shift.shiftType}</span>
                        </div>
                        {isNight && (
                          <div style={{ backgroundColor: "rgba(59,130,246,0.15)", padding: "2px 8px", borderRadius: "20px" }}>
                            <span style={{ color: "#93C5FD", fontSize: "11px", fontWeight: "600" }}>🌙 ×{nightMultiplier}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #2a2f3e" }}>
                        <p style={{ color: "#6b7280", fontSize: "12px" }}>
                          {h.toFixed(1)}h {shift.breakDuration ? `(${shift.breakDuration}min break)` : ""}
                        </p>
                        <p style={{ color: isNight ? "#93C5FD" : "#3B82F6", fontWeight: "600", fontSize: "13px" }}>
                          ₪ {pay.toFixed(2)}
                        </p>
                      </div>
                      {shift.notes && <p style={{ color: "#6b7280", fontSize: "12px", fontStyle: "italic", marginTop: "6px" }}>{shift.notes}</p>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "12px" }}>
                      <div onClick={() => handleEdit(shift)} style={{
                        backgroundColor: "rgba(59,130,246,0.1)", padding: "8px", borderRadius: "8px", cursor: "pointer"
                      }}>
                        <BsPencil size={15} color="#3B82F6" />
                      </div>
                      <div onClick={() => handleDelete(shift.id)} style={{
                        backgroundColor: "rgba(239,68,68,0.1)", padding: "8px", borderRadius: "8px", cursor: "pointer"
                      }}>
                        <BsTrash size={15} color="#ef4444" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
        {/* Bottom Nav */}
            <BottomNav />
      
    </div>
  )
}