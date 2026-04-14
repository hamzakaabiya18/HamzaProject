"use client"
import { useEffect, useState } from "react"
import "./style.css"
import { db, auth } from "@/app/LoginPage/Firebase"
import { doc, setDoc } from "firebase/firestore"
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"

export default function Registration() {
  const [panelActive, setPanelActive] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        window.location.replace("/ShiftManagerApp/Tabs/Home")
      } else {
        setAuthChecked(true)
      }
    })
    return () => unsub()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return alert("Please fill email & password")
    try {
      setLoading(true)
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword)
      window.location.replace("/ShiftManagerApp/Tabs/Home")
    } catch (err) {
      setLoading(false)
      alert(err?.message || "Login failed")
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regEmail || !regPassword) return alert("Please fill: email, password")
    if (!regName.trim()) return alert("Please enter your full name")
    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword)
      const uid = userCredential.user.uid

      // Save name in Firestore using uid as document ID
      // This works with ALL languages: Arabic, Hebrew, English
      await setDoc(doc(db, "users", uid), {
        uid: uid,
        fullName: regName.trim(),
        email: regEmail,
        createdAt: new Date().toISOString()
      })

      // Try to save in Firebase Auth too (may not work with Arabic/Hebrew)
      try {
        await updateProfile(userCredential.user, { displayName: regName.trim() })
      } catch (e) {
        console.log("displayName update failed, using Firestore instead")
      }

      window.location.replace("/ShiftManagerApp/Tabs/Home")
    } catch (err) {
      setLoading(false)
      alert(err?.message || "Register failed")
    }
  }

  if (!authChecked) {
    return (
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className={`auth-wrapper ${panelActive ? "panel-active" : ""}`}>

        {/* REGISTER */}
        <div className="auth-form-box register-form-box">
          <form onSubmit={handleRegister}>
            <h1>Create Account</h1>
            <div className="social-links">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <b className="fab fa-facebook-f">f</b>
              </a>
              <a href="https://accounts.google.com" target="_blank" rel="noopener noreferrer" aria-label="Gmail">
                <b className="fab fa-google">g</b>
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <b className="fab fa-linkedin-in">in</b>
              </a>
            </div>
            <span>or use your email for registration</span>
            <input type="text"
             placeholder="Full Name"
              value={regName}
               onChange={(e) => setRegName(e.target.value)} /> //

            <input type="email" placeholder="Email Address" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Sign Up"}
            </button>
            <div className="mobile-switch">
              <p>Already have an account?</p>
              <button type="button" onClick={() => setPanelActive(false)}>Sign In</button>
            </div>
          </form>
        </div>

        {/* LOGIN */}
        <div className="auth-form-box login-form-box">
          <form onSubmit={handleLogin}>
            <h1>Sign In</h1>
            <div className="social-links">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <b className="fab fa-facebook-f">f</b>
              </a>
              <a href="https://accounts.google.com" target="_blank" rel="noopener noreferrer" aria-label="Gmail">
                <b className="fab fa-google">g</b>
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <b className="fab fa-linkedin-in">in</b>
              </a>
            </div>
            <span>Use your account</span>
            <input type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
            <a href="#" onClick={(e) => e.preventDefault()}>Don't have an account? Click Sign Up</a>
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Sign In"}
            </button>
            <div className="mobile-switch">
              <button type="button" onClick={() => setPanelActive(true)}>Sign Up</button>
            </div>
          </form>
        </div>

        {/* SLIDE PANEL */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            <div className="panel-content panel-content-left">
              <h2><b>Hey There!</b></h2>
              <p>Join workers who manage their shifts smarter. Sign up and take control of your work life today.</p>
              <button className="transparent-btn" type="button" onClick={() => setPanelActive(false)}>Sign In</button>
            </div>
            <div className="panel-content panel-content-right">
              <h2><b>Welcome Back!</b></h2>
              <p>Your shifts are waiting. Track hours · Calculate salary. Stay on top of your schedule. Don't have an account? Click below</p>
              <button className="transparent-btn" type="button" onClick={() => setPanelActive(true)}>Sign Up</button>
            </div>
          </div>
        </div>

      </div>
      <p className="made-by">
        <b>made by<strong> hamza_abo_said</strong></b>
      </p>
    </div>
  )
}