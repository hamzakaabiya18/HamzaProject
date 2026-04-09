'use client'
import { useRouter, usePathname } from "next/navigation"
import {
  AiOutlineHome,
  AiOutlineCalendar,
  AiOutlineUnorderedList,
  AiOutlineDollar,
  AiOutlineSetting,
} from "react-icons/ai"

const tabs = [
  { icon: <AiOutlineHome size={22} />,          label: "Home",     path: "/ShiftManagerApp/Tabs/Home" },
  { icon: <AiOutlineCalendar size={22} />,      label: "Calendar", path: "/ShiftManagerApp/Tabs/Calendar" },
  { icon: <AiOutlineUnorderedList size={22} />, label: "Shifts",   path: "/ShiftManagerApp/Tabs/Shifts" },
  { icon: <AiOutlineDollar size={22} />,        label: "Salary",   path: "/ShiftManagerApp/Tabs/Salary" },
  { icon: <AiOutlineSetting size={22} />,       label: "Settings", path: "/ShiftManagerApp/Tabs/Settings" },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#1c2132",
      display: "flex",
      justifyContent: "space-around",
      padding: "10px 0 14px",
      borderTop: "1px solid #2a2f3e",
      zIndex: 100,
    }}>
      {tabs.map((item, index) => {
        const isActive = pathname === item.path
        return (
          <div
            key={index}
            onClick={() => router.push(item.path)}
            style={{
              textAlign: "center",
              cursor: "pointer",
              padding: "4px 12px",
            }}
          >
            <div style={{
              color: isActive ? "#3B82F6" : "#6b7280",
              marginBottom: "3px",
            }}>
              {item.icon}
            </div>
            <p style={{
              fontSize: "10px",
              color: isActive ? "#3B82F6" : "#6b7280",
              fontWeight: isActive ? "600" : "400",
            }}>
              {item.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}