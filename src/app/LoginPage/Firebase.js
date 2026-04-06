






import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDlfCcZbAcgNx-FWuKhzazrLqeCkqXnMRo",
  authDomain: "hamzafirebase.firebaseapp.com",
  projectId: "hamzafirebase",
  storageBucket: "hamzafirebase.firebasestorage.app",
  messagingSenderId: "996678474722",
  appId: "1:996678474722:web:e2e9b138658ed96f0a37bb",
  databaseURL: "https://hamzafirebase-default-rtdb.firebaseio.com"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const database = getDatabase(app)