"use client"
import { useState, useEffect } from "react"
import { BsTrash, BsPerson, BsClock, BsBell, BsCalendar3, BsInfoCircle, BsCheckLg, BsMoonStars } from "react-icons/bs"
import { db } from "@/app/LoginPage/Firebase"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { SETTINGS_KEY, defaultSettings, loadSettings, saveSettings } from "@/lib/shiftUtils"
import BottomNav from "@/components/BottomNav"
import { auth } from "@/app/LoginPage/Firebase"
import { collection, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { signOut } from "firebase/auth"

export default function SettingsScreen() {
  const [userName, setUserName] = useState("")
  const [settings, setSettings] = useState(defaultSettings)
  const [hourlyRate, setHourlyRate] = useState("50")
  const [overtimeRate, setOvertimeRate] = useState("1.5")
  const [saved, setSaved] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

 useEffect(() => {
  // Get name from Firestore — works with ALL languages
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserName(userDoc.data().fullName)
        } else if (user.displayName) {
          setUserName(user.displayName)
        }
      } catch (e) {
        if (user.displayName) setUserName(user.displayName)
      }
    }
  })

  const s = loadSettings()
  setSettings(s)
  setHourlyRate(s.hourlyRate.toString())
  setOvertimeRate(s.overtimeRate.toString())
  return () => unsub()
}, [])

  const handleSignOut = async () => {
  if (!confirm("Are you sure you want to sign out?")) return
  await signOut(auth)
  localStorage.removeItem("userName")
  window.location.replace("/LoginPage")
}

  const handleSaveRates = () => {
    const hr = parseFloat(hourlyRate)
    const ot = parseFloat(overtimeRate)
    if (isNaN(hr) || hr <= 0) return alert("Please enter a valid hourly rate greater than 0.")
    if (isNaN(ot) || ot < 1) return alert("Overtime multiplier must be at least 1.0.")
    const updated = { ...settings, hourlyRate: hr, overtimeRate: ot }
    setSettings(updated)
    saveSettings(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    saveSettings(updated)
  }

  // ✅ تغيير نسبة وردية الليل
  const handleNightMultiplier = (val) => {
    const updated = { ...settings, nightMultiplier: val }
    setSettings(updated)
    saveSettings(updated)
  }

  const handleClearAllData = async () => {
    setClearing(true)
    try {
      const snapshot = await getDocs(collection(db, "shifts"))
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, "shifts", d.id))))
      localStorage.removeItem(SETTINGS_KEY)
      setSettings(defaultSettings)
      setHourlyRate("50")
      setOvertimeRate("1.5")
      setShowConfirm(false)
      alert("All data cleared successfully.")
    } catch (e) { alert("Error clearing data.") }
    setClearing(false)
  }

  return (
    <div style={{
      backgroundColor: "#0a0d14", minHeight: "100vh", color: "white",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", paddingBottom: "90px"
    }}>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
        }}>
          <div style={{
            backgroundColor: "#111827", borderRadius: "20px",
            padding: "28px 24px", border: "1px solid #ef444440", maxWidth: "360px", width: "100%"
          }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                backgroundColor: "rgba(239,68,68,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
              }}>
                <BsTrash size={24} color="#ef4444" />
              </div>
              <p style={{ fontWeight: "700", fontSize: "18px", marginBottom: "8px" }}>Clear All Data?</p>
              <p style={{ color: "#6B7280", fontSize: "13px", lineHeight: "1.6" }}>
                This will permanently delete all your shifts and settings. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: "14px", borderRadius: "12px",
                backgroundColor: "#1f2937", border: "1px solid #374151",
                color: "white", fontWeight: "600", cursor: "pointer", fontSize: "14px"
              }}>Cancel</button>
              <button onClick={handleClearAllData} disabled={clearing} style={{
                flex: 1, padding: "14px", borderRadius: "12px",
                backgroundColor: "#ef4444", border: "none",
                color: "white", fontWeight: "700", cursor: "pointer", fontSize: "14px",
                opacity: clearing ? 0.6 : 1
              }}>{clearing ? "Clearing..." : "Clear Everything"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "28px 20px 0" }}>
        <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>
          Preferences
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: "800", background: "linear-gradient(135deg, #fff 60%, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Settings
        </h1>
      </div>

      <div style={{ padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Profile Card */}
        <div style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
          borderRadius: "20px", padding: "20px",
          display: "flex", alignItems: "center", gap: "16px",
          boxShadow: "0 8px 32px rgba(59,130,246,0.2)"
        }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            <BsPerson size={26} color="white" />
          </div>
          <div>
            <p style={{ color: "white", fontWeight: "700", fontSize: "17px" }}>{userName || "..."}</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "2px" }}>Shift Manager</p>
          </div>
        </div>

        {/* Pay Rates */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BsClock size={14} color="#4B5563" />
            <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Pay Rates
            </p>
          </div>
          <div style={{ backgroundColor: "#0f1520", borderRadius: "16px", border: "1px solid #1f2937", overflow: "hidden" }}>

            {/* Hourly Rate */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #1f2937" }}>
              <p style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "10px", fontWeight: "500" }}>Hourly Rate (ILS)</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#3B82F6", fontWeight: "700", fontSize: "18px" }}>₪</span>
                <input
                  type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: "#1f2937", border: "2px solid #374151",
                    borderRadius: "10px", padding: "12px 16px", color: "white",
                    fontSize: "16px", fontWeight: "600", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Overtime Rate */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid #1f2937" }}>
              <p style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>Overtime Multiplier</p>
              <p style={{ color: "#4B5563", fontSize: "11px", marginBottom: "10px" }}>After 40h/month · pay = rate × multiplier</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#F59E0B", fontWeight: "700", fontSize: "18px" }}>×</span>
                <input
                  type="number" value={overtimeRate} onChange={e => setOvertimeRate(e.target.value)} step="0.1"
                  style={{
                    flex: 1, backgroundColor: "#1f2937", border: "2px solid #374151",
                    borderRadius: "10px", padding: "12px 16px", color: "white",
                    fontSize: "16px", fontWeight: "600", outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Save Button */}
            <div style={{ padding: "16px 20px" }}>
              <button onClick={handleSaveRates} style={{
                width: "100%", padding: "14px",
                backgroundColor: saved ? "#10B981" : "#3B82F6",
                border: "none", borderRadius: "12px", color: "white",
                fontWeight: "700", fontSize: "15px", cursor: "pointer",
                transition: "background 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}>
                {saved ? <><BsCheckLg size={16} /> Saved!</> : "Save Rates"}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Night Shift Rate */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BsMoonStars size={14} color="#4B5563" />
            <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Night Shift Rate (Israeli Law)
            </p>
          </div>
          <div style={{ backgroundColor: "#0f1520", borderRadius: "16px", border: "1px solid #1f2937", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937" }}>
              <p style={{ color: "#9CA3AF", fontSize: "12px", marginBottom: "4px", fontWeight: "500" }}>
                Night Shift Multiplier
              </p>
              <p style={{ color: "#4B5563", fontSize: "11px", marginBottom: "14px" }}>
                Applied automatically to all night shifts
              </p>

              {/* Night Multiplier Options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { label: "125%", value: 1.25, desc: "Standard night rate" },
                  { label: "150%", value: 1.50, desc: "Extended night rate" },
                ].map(opt => {
                  const isSelected = settings.nightMultiplier === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleNightMultiplier(opt.value)}
                      style={{
                        padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                        backgroundColor: isSelected ? "rgba(59,130,246,0.15)" : "#1f2937",
                        border: `2px solid ${isSelected ? "#3B82F6" : "#374151"}`,
                        transition: "all 0.2s"
                      }}
                    >
                      <p style={{ fontWeight: "800", fontSize: "20px", color: isSelected ? "#3B82F6" : "white", marginBottom: "4px" }}>
                        {opt.label}
                      </p>
                      <p style={{ fontSize: "11px", color: "#6B7280" }}>{opt.desc}</p>
                    </div>
                  )
                })}
              </div>

              {/* Preview */}
              <div style={{
                marginTop: "14px", padding: "12px 16px",
                backgroundColor: "#131929", borderRadius: "10px",
                border: "1px solid #1f2937",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <p style={{ color: "#6B7280", fontSize: "12px" }}>
                  Example: 8h night shift @ ₪{parseFloat(hourlyRate) || 50}/hr
                </p>
                <p style={{ color: "#3B82F6", fontWeight: "700", fontSize: "13px" }}>
                  ₪{((parseFloat(hourlyRate) || 50) * 8 * settings.nightMultiplier).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sync & Notifications */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BsBell size={14} color="#4B5563" />
            <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Sync & Notifications
            </p>
          </div>
          <div style={{ backgroundColor: "#0f1520", borderRadius: "16px", border: "1px solid #1f2937", overflow: "hidden" }}>
            {[
              { key: "calendarSync", icon: <BsCalendar3 size={16} color="#3B82F6"/>, iconBg: "rgba(59,130,246,0.1)", title: "Google Calendar", sub: "Sync shifts to calendar", border: true },
              { key: "notifications", icon: <BsBell size={16} color="#F59E0B"/>, iconBg: "rgba(245,158,11,0.1)", title: "Notifications", sub: "Shift reminders", border: false },
            ].map(item => (
              <div key={item.key} style={{
                padding: "18px 20px",
                borderBottom: item.border ? "1px solid #1f2937" : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "14px" }}>{item.title}</p>
                    <p style={{ color: "#4B5563", fontSize: "12px", marginTop: "2px" }}>{item.sub}</p>
                  </div>
                </div>
                <div onClick={() => handleToggle(item.key)} style={{
                  width: "48px", height: "26px", borderRadius: "13px",
                  backgroundColor: settings[item.key] ? "#3B82F6" : "#1f2937",
                  border: `2px solid ${settings[item.key] ? "#3B82F6" : "#374151"}`,
                  cursor: "pointer", position: "relative", transition: "all 0.25s", flexShrink: 0
                }}>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "white",
                    position: "absolute", top: "1px",
                    left: settings[item.key] ? "24px" : "1px",
                    transition: "left 0.25s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BsInfoCircle size={14} color="#4B5563" />
            <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>About</p>
          </div>
          <div style={{ backgroundColor: "#0f1520", borderRadius: "16px", border: "1px solid #1f2937", padding: "20px" }}>
            <p style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>Shift Manager</p>
            <p style={{ color: "#4B5563", fontSize: "12px", marginBottom: "12px" }}>Version 1.0.0</p>
            <p style={{ color: "#6B7280", fontSize: "13px", lineHeight: "1.7" }}>
              A shift management app for tracking work hours, scheduling shifts, and calculating salary with overtime support.
            </p>
            <p style={{ color: "#374151", fontSize: "11px", marginTop: "12px" }}>Developed for חמזה אבו סעייד</p>
          </div>
        </div>

        {/* Clear Data */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BsTrash size={14} color="#4B5563" />
            <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>Data</p>
          </div>
          <button onClick={() => setShowConfirm(true)} style={{
            width: "100%", padding: "18px 20px",
            backgroundColor: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "16px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "14px", textAlign: "left"
          }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BsTrash size={18} color="#ef4444" />
            </div>
            <div>
              <p style={{ color: "#ef4444", fontWeight: "700", fontSize: "14px" }}>Clear All Data</p>
              <p style={{ color: "rgba(239,68,68,0.6)", fontSize: "12px", marginTop: "2px" }}>Permanently deletes all shifts & settings</p>
            </div>
          </button>
        </div>
{/* Sign Out */}
<div>
  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#4B5563" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="16,17 21,12 16,7" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="#4B5563" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    <p style={{ color: "#4B5563", fontSize: "12px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase" }}>Account</p>
  </div>
  <button onClick={handleSignOut} style={{
    width: "100%", padding: "18px 20px",
    backgroundColor: "rgba(59,130,246,0.07)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: "16px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: "14px", textAlign: "left"
  }}>
    <div style={{
      width: "40px", height: "40px", borderRadius: "10px",
      backgroundColor: "rgba(59,130,246,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
        <polyline points="16,17 21,12 16,7" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <div>
      <p style={{ color: "#3B82F6", fontWeight: "700", fontSize: "14px" }}>Sign Out</p>
      <p style={{ color: "rgba(59,130,246,0.6)", fontSize: "12px", marginTop: "2px" }}>Log out from your account</p>
    </div>
  </button>
</div>
      </div>
      {/* Bottom Nav */}
      <BottomNav />
    </div>
  )
}