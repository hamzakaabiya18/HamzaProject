"use client"
import { useEffect, useState } from "react"
import "./style.css"
import { auth, database } from "./Firebase"
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { ref, set } from "firebase/database"

export default function Registration() {

  const [panelActive, setPanelActive] = useState(false)
  const [user, setUser] = useState(null)

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsub()
  }, [])

  const handleSignOut = async () => {
    await signOut(auth)
    localStorage.removeItem("userName")
    alert("User signed out!")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return alert("Please fill email & password")
    try {
      setLoading(true)
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword)

      // ✅ عند تسجيل الدخول نقرأ الاسم من Firebase ونحفظه
      const displayName = userCredential.user.displayName
      if (displayName) localStorage.setItem("userName", displayName)

      window.location.href = "/ShiftManagerApp/Tabs/Home"
    } catch (err) {
      alert(err?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regEmail || !regPassword) return alert("Please fill: email, password")
    try {
      setLoading(true)

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword)

      // Save display name in Firebase Auth profile     
      await updateProfile(userCredential.user, {
        displayName: regName
      })

      // Save display name in localStorage for later use
      localStorage.setItem("userName", regName)

      // Save user info in Realtime Database
      await set(ref(database, "users/" + userCredential.user.uid), {
        fullName: regName,
        email: regEmail,
      })

      alert("Account created successfully!")
      setPanelActive(false)
    } catch (err) {
      alert(err?.message || "Register failed")
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div className="page">
        <div className="auth-wrapper" style={{ maxWidth: 650, minHeight: 350 }}>
          <div style={{ width: "100%", padding: 40, textAlign: "center" }}>
            <h1 style={{ marginBottom: 10 }}>Welcome</h1>
            <p style={{ marginTop: 10, marginBottom: 25 }}>
              You are logged in as <b>{user.email}</b>
            </p>
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
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
            <input
              type="text"
              placeholder="Full Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />
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
            <input
              type="email"
              placeholder="Email Address or Username"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <a href="#" onClick={(e) => e.preventDefault()}>Forgot your password?</a>
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Sign In"}
            </button>
            <div className="mobile-switch">
              <p>Don&apos;t have an account?</p>
              <button type="button" onClick={() => setPanelActive(true)}>Sign Up</button>
            </div>
          </form>
        </div>

        {/* SLIDE PANEL */}
        <div className="slide-panel-wrapper">
          <div className="slide-panel">
            <div className="panel-content panel-content-left">
              <b><h2>Welcome Back!</h2></b>
              <p>Stay connected by logging in with your credentials and continue your experience</p>
              <button className="transparent-btn" type="button" onClick={() => setPanelActive(false)}>Sign In</button>
            </div>
            <div className="panel-content panel-content-right">
              <b><h2>Hey There!</h2></b>
              <p>Begin your amazing journey by creating an account with us today</p>
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