"use client"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { calculateHours, calculatePay } from "@/lib/shiftUtils"

const formatMonth = (key) => {
  const [year, month] = key.split("-")
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default function ExportExcel({ monthKey, shifts, hourlyRate, nightMultiplier }) {
  const handleExport = () => {
    const monthName = formatMonth(monthKey)

    const rows = shifts.map(shift => {
      const hours = calculateHours(shift.startTime, shift.endTime, shift.breakDuration || 0)
      const pay = calculatePay(shift, hourlyRate, nightMultiplier)
      return {
        "Date": new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric"
        }),
        "Shift Type": shift.shiftType,
        "Start": shift.startTime,
        "End": shift.endTime,
        "Break (min)": shift.breakDuration || 0,
        "Hours": parseFloat(hours.toFixed(2)),
        "Rate (₪)": hourlyRate,
        "Multiplier": shift.shiftType === "night" ? nightMultiplier : 1,
        "Pay (₪)": parseFloat(pay.toFixed(2)),
        "Notes": shift.notes || "",
      }
    })

    // Summary row
    const totalHours = shifts.reduce((sum, s) => sum + calculateHours(s.startTime, s.endTime, s.breakDuration || 0), 0)
    const totalPay = shifts.reduce((sum, s) => sum + calculatePay(s, hourlyRate, nightMultiplier), 0)
    rows.push({})
    rows.push({
      "Date": "TOTAL",
      "Shift Type": `${shifts.length} shifts`,
      "Start": "",
      "End": "",
      "Break (min)": "",
      "Hours": parseFloat(totalHours.toFixed(2)),
      "Rate (₪)": "",
      "Multiplier": "",
      "Pay (₪)": parseFloat(totalPay.toFixed(2)),
      "Notes": "",
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, monthName)
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([buffer], { type: "application/octet-stream" })
    saveAs(blob, `Salary_${monthKey}.xlsx`)
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); handleExport() }}
      style={{
        backgroundColor: "rgba(16,185,129,0.15)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "10px", padding: "8px 12px",
        display: "flex", alignItems: "center", gap: "6px",
        cursor: "pointer",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
        <polyline points="7,10 12,15 17,10" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={{ color: "#10B981", fontSize: "12px", fontWeight: "600" }}>Excel</span>
    </div>
  )
}