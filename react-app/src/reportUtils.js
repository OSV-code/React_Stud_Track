import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'
import { openWhatsAppShare } from './whatsappUtils'

function attendancePercentFor(studentId, attendanceRecords) {
  const records = attendanceRecords.filter((record) => record.student_id === studentId)
  const total = records.length
  const present = records.filter((record) => record.status === 'Present' || record.status === 'Late').length
  return total > 0 ? Math.round((present / total) * 100) : 0
}

function attendanceStatsFor(studentId, attendanceRecords) {
  const records = attendanceRecords.filter((record) => record.student_id === studentId)
  const total = records.length
  const present = records.filter((record) => record.status === 'Present').length
  const late = records.filter((record) => record.status === 'Late').length
  const absent = records.filter((record) => record.status === 'Absent').length
  const percent = total > 0 ? Math.round(((present + late) / total) * 100) : 0
  return { total, present, late, absent, percent }
}

function marksStatsFor(studentId, marksRecords) {
  const records = marksRecords.filter((record) => record.student_id === studentId)
  const totalPercent = records.reduce((sum, record) => sum + (record.score / record.total_marks) * 100, 0)
  const average = records.length > 0 ? Math.round(totalPercent / records.length) : 0
  return { records, average }
}

function normalizeExamType(examType) {
  return String(examType || '').trim().toLowerCase()
}

function filterMarksByExamTypes(marksRecords, examTypes = []) {
  if (!Array.isArray(examTypes) || examTypes.length === 0) return []

  const allowedExamTypes = new Set(examTypes.map(normalizeExamType))
  return marksRecords.filter((record) => allowedExamTypes.has(normalizeExamType(record.exam_type)))
}

function parseDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function getDateRangeArray(startDate, endDate) {
  const dates = []
  let current = parseDateString(startDate)
  const end = parseDateString(endDate)
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

function formatDateLabel(dateStr) {
  const date = parseDateString(dateStr)
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(date)
}

const STATUS_CODE = {
  Present: 'P',
  Absent: 'Ab',
  Late: 'L'
}

export function downloadClassPdfReport(students, attendanceRecords, classFilter) {
  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(16)
  doc.text(
    classFilter && classFilter !== 'all' ? `Teacher Intelligence Report - Class ${classFilter}` : 'Teacher Intelligence Report',
    14,
    15
  )

  let y = 25
  const leftMargin = 14
  const lineHeight = 6
  const checkPage = () => {
    if (y > 270) {
      doc.addPage()
      y = 15
    }
  }

  students.forEach((student) => {
    checkPage()
    const attendancePercent = attendancePercentFor(student.id, attendanceRecords)

    doc.setFontSize(12)
    doc.text(`${student.name} (Roll: ${student.rollNo})`, leftMargin, y)
    y += lineHeight

    doc.setFontSize(10)
    doc.text(`Class: ${student.className} | Attendance: ${attendancePercent}%`, leftMargin, y)
    y += lineHeight

    doc.text(`Father: ${student.fatherName || 'N/A'} | Mother: ${student.motherName || 'N/A'}`, leftMargin, y)
    y += lineHeight

    doc.text(`Phone: ${student.parentPhone || 'N/A'} | Address: ${student.address || 'N/A'}`, leftMargin, y)
    y += lineHeight

    doc.text(`DOB: ${student.dob || 'N/A'} | Blood Group: ${student.bloodGroup || 'N/A'}`, leftMargin, y)
    y += lineHeight

    doc.text(`Admission No: ${student.admissionNo || 'N/A'} | Aadhar: ${student.aadharNumber || 'N/A'}`, leftMargin, y)
    y += lineHeight

    doc.text(`Saral Portal: ${student.saralPortalNumber || 'N/A'}`, leftMargin, y)
    y += lineHeight * 1.5
  })

  doc.save(classFilter && classFilter !== 'all' ? `students-report-class-${classFilter}.pdf` : 'students-report.pdf')
}

export function downloadClassExcelReport(students, attendanceRecords, classFilter) {
  const rows = students.map((student) => ({
    name: student.name,
    rollNo: student.rollNo,
    className: student.className,
    fatherName: student.fatherName,
    motherName: student.motherName,
    parentPhone: student.parentPhone,
    address: student.address,
    dob: student.dob,
    bloodGroup: student.bloodGroup,
    admissionNo: student.admissionNo,
    aadharNumber: student.aadharNumber,
    saralPortalNumber: student.saralPortalNumber,
    attendancePercent: `${attendancePercentFor(student.id, attendanceRecords)}%`
  }))

  const workbook = XLSX.utils.book_new()
  const groupedByClass = {}
  rows.forEach((row) => {
    const key = row.className || 'Unassigned'
    if (!groupedByClass[key]) groupedByClass[key] = []
    groupedByClass[key].push(row)
  })

  if (Object.keys(groupedByClass).length === 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([]), 'Students')
  } else {
    for (const [className, classRows] of Object.entries(groupedByClass)) {
      const worksheet = XLSX.utils.json_to_sheet(classRows)
      XLSX.utils.book_append_sheet(workbook, worksheet, `Class ${className}`.slice(0, 31))
    }
  }

  XLSX.writeFile(workbook, classFilter && classFilter !== 'all' ? `students_class_${classFilter}.xlsx` : 'students.xlsx')
}

function buildStudentReportDoc(student, attendanceRecords, marksRecords = [], notesRecords = [], behaviorRecords = [], options = {}) {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Student Performance Report', 20, 20)

  doc.setFontSize(14)
  doc.text('Student Details', 20, 35)
  doc.setFontSize(12)
  doc.text(`Name: ${student.name} | Roll No: ${student.rollNo} | Class: ${student.className}`, 20, 45)
  doc.text(`Father: ${student.fatherName || 'N/A'} | Mother: ${student.motherName || 'N/A'}`, 20, 52)
  doc.text(`Phone: ${student.parentPhone || 'N/A'} | Address: ${student.address || 'N/A'} | DOB: ${student.dob || 'N/A'}`, 20, 59)

  let y = 75
  const checkPage = () => {
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  const stats = attendanceStatsFor(student.id, attendanceRecords)

  checkPage()
  doc.setFontSize(14)
  doc.text('Attendance Summary', 20, y)
  y += 8
  doc.setFontSize(12)
  doc.text(
    `Total Days: ${stats.total} | Present: ${stats.present} | Late: ${stats.late} | Absent: ${stats.absent} | Percentage: ${stats.percent}%`,
    20,
    y
  )
  y += 8

  if (stats.late > 0) {
    doc.text(`* Note: Student observed late attendance (${stats.late} times), needs care.`, 20, y)
    y += 7
  }
  if (stats.absent > 0) {
    doc.text(`* Note: Student was absent (${stats.absent} times), needs follow-up.`, 20, y)
    y += 7
  }
  y += 7

  const selectedExamTypes = Array.isArray(options.examTypes) ? options.examTypes : []
  const filteredMarks = filterMarksByExamTypes(marksRecords, selectedExamTypes)
  const marksStats = marksStatsFor(student.id, filteredMarks)

  checkPage()
  doc.setFontSize(14)
  doc.text('Academic Performance', 20, y)
  y += 8
  doc.setFontSize(12)

  if (selectedExamTypes.length > 0) {
    const examTypeSummary = selectedExamTypes.join(', ')
    const summaryLines = doc.splitTextToSize(`Exam Types: ${examTypeSummary}`, 170)
    summaryLines.forEach((line) => {
      checkPage()
      doc.text(line, 20, y)
      y += 7
    })
  }

  if (marksStats.records.length === 0) {
    const noMarksText = selectedExamTypes.length > 0 ? 'No marks recorded for selected exam types.' : 'No marks recorded yet.'
    doc.text(noMarksText, 20, y)
    y += 10
  } else {
    marksStats.records.forEach((mark) => {
      checkPage()
      const percent = Math.round((mark.score / mark.total_marks) * 100)
      doc.text(`${mark.subject} (${mark.exam_type}) - ${mark.score}/${mark.total_marks} (${percent}%) - ${mark.exam_date}`, 20, y)
      y += 7
    })
    checkPage()
    doc.text(`Average: ${marksStats.average}%`, 20, y)
    y += 10
  }

  checkPage()
  doc.setFontSize(14)
  doc.text('Behavioral Assessment', 20, y)
  y += 8
  doc.setFontSize(12)

  const studentBehavior = behaviorRecords.filter((entry) => entry.student_id === student.id)

  if (studentBehavior.length === 0) {
    doc.text('No behavior records yet.', 20, y)
    y += 10
  } else {
    studentBehavior.forEach((entry) => {
      checkPage()
      const lines = doc.splitTextToSize(
        `${entry.assessment_date} - Discipline: ${entry.discipline}/5, Confidence: ${entry.confidence}/5, Communication: ${entry.communication}/5, Leadership: ${entry.leadership}/5`,
        170
      )
      lines.forEach((line) => {
        checkPage()
        doc.text(line, 20, y)
        y += 7
      })
    })
    y += 3
  }

  checkPage()
  doc.setFontSize(14)
  doc.text('Teacher Notes', 20, y)
  y += 8
  doc.setFontSize(12)

  const studentNotes = notesRecords.filter((note) => note.student_id === student.id)

  if (studentNotes.length === 0) {
    doc.text('No notes recorded yet.', 20, y)
  } else {
    studentNotes.forEach((note) => {
      checkPage()
      const lines = doc.splitTextToSize(`${note.note_date}: ${note.note_text}`, 170)
      lines.forEach((line) => {
        checkPage()
        doc.text(line, 20, y)
        y += 7
      })
    })
  }

  return doc
}

export function downloadStudentPdfReport(
  student,
  attendanceRecords,
  marksRecords = [],
  notesRecords = [],
  behaviorRecords = [],
  options = {}
) {
  const doc = buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords, options)
  doc.save(`${student.name.replace(/\s+/g, '_')}_Report.pdf`)
}

export function downloadJsonBackup(students, attendanceRecords) {
  const backup = { students, attendance: attendanceRecords }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'teacher-backup.json'
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareStudentReportOnWhatsApp(
  student,
  attendanceRecords,
  marksRecords = [],
  notesRecords = [],
  behaviorRecords = [],
  options = {}
) {
  const selectedExamTypes = Array.isArray(options.examTypes) ? options.examTypes : []
  const filteredMarks = filterMarksByExamTypes(marksRecords, selectedExamTypes)
  const marksStats = marksStatsFor(student.id, filteredMarks)
  const marksLine = marksStats.records.length > 0 ? `Average Marks: ${marksStats.average}%\n` : ''
  const examTypeLine = selectedExamTypes.length > 0 ? `Exam Types: ${selectedExamTypes.join(', ')}\n` : ''

  const message =
    `📋 *Student Performance Report*\n\n` +
    `Student Name: ${student.name}\n` +
    `Roll No: ${student.rollNo}\n` +
    `Class: ${student.className}\n` +
    `Father: ${student.fatherName || 'N/A'}\n` +
    `Mother: ${student.motherName || 'N/A'}\n` +
    examTypeLine +
    marksLine +
    `\nPlease see the attached student performance report.\n\n` +
    `- Teacher`

  const doc = buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords, options)
  const fileName = `${student.name.replace(/\s+/g, '_')}_Report.pdf`
  const pdfFile = new File([doc.output('blob')], fileName, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], text: message, title: 'Student Performance Report' })
      return
    } catch (err) {
      if (err && err.name === 'AbortError') return
    }
  }

  // Fallback for browsers that can't attach files to a share sheet (older iOS Safari, desktop, etc.)
  doc.save(fileName)
  openWhatsAppShare(message)
  window.alert('The PDF has been downloaded. Please attach it manually in WhatsApp before sending.')
}

// ---- Added: Student attendance statement for a custom date range ----
// Produces a "bank statement" style record: one row per day in the range,
// with a P / Ab / L code (or '-' if unmarked), plus student details header
// and a summary block at the end.

export function downloadStudentAttendanceRangeExcel(student, attendanceRecords, startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error('Please select both From and To dates.')
  }
  if (startDate > endDate) {
    throw new Error('From date must be before To date.')
  }

  const dateList = getDateRangeArray(startDate, endDate)
  const studentRecords = attendanceRecords.filter((record) => record.student_id === student.id)
  const recordByDate = new Map(studentRecords.map((record) => [record.attendance_date, record.status]))

  const headerRows = [
    ['Student Attendance Statement'],
    [],
    ['Name', student.name],
    ['Roll No', student.rollNo],
    ['Class', student.className],
    ['Father Name', student.fatherName || 'N/A'],
    ['Mother Name', student.motherName || 'N/A'],
    ['Phone', student.parentPhone || 'N/A'],
    ['Admission No', student.admissionNo || 'N/A'],
    ['Period', `${startDate} to ${endDate}`],
    []
  ]

  const tableHeader = ['Date', 'Day', 'Status']
  let present = 0
  let absent = 0
  let late = 0
  let marked = 0

  const tableRows = dateList.map((dateStr) => {
    const status = recordByDate.get(dateStr)
    if (status) {
      marked += 1
      if (status === 'Present') present += 1
      else if (status === 'Absent') absent += 1
      else if (status === 'Late') late += 1
    }
    const code = status ? (STATUS_CODE[status] || status) : '-'
    return [dateStr, formatDateLabel(dateStr), code]
  })

  const percent = marked > 0 ? Math.round(((present + late) / marked) * 100) : 0

  const summaryRows = [
    [],
    ['Summary'],
    ['Total Days in Range', dateList.length],
    ['Days Marked', marked],
    ['Present', present],
    ['Absent', absent],
    ['Late', late],
    ['Attendance %', `${percent}%`]
  ]

  const sheetData = [...headerRows, tableHeader, ...tableRows, ...summaryRows]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  worksheet['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')

  const safeName = student.name.replace(/\s+/g, '_')
  XLSX.writeFile(workbook, `${safeName}_Attendance_${startDate}_to_${endDate}.xlsx`)
}

export function downloadStudentAttendanceRangePdf(student, attendanceRecords, startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error('Please select both From and To dates.')
  }
  if (startDate > endDate) {
    throw new Error('From date must be before To date.')
  }

  const dateList = getDateRangeArray(startDate, endDate)
  const studentRecords = attendanceRecords.filter((record) => record.student_id === student.id)
  const recordByDate = new Map(studentRecords.map((record) => [record.attendance_date, record.status]))

  const doc = new jsPDF('p', 'mm', 'a4')
  doc.setFontSize(16)
  doc.text('Student Attendance Statement', 14, 15)

  doc.setFontSize(11)
  let y = 25
  doc.text(`Name: ${student.name}   Roll No: ${student.rollNo}   Class: ${student.className}`, 14, y)
  y += 6
  doc.text(`Father: ${student.fatherName || 'N/A'}   Phone: ${student.parentPhone || 'N/A'}`, 14, y)
  y += 6
  doc.text(`Period: ${startDate} to ${endDate}`, 14, y)
  y += 10

  doc.setFontSize(10)
  doc.text('Date', 14, y)
  doc.text('Day', 60, y)
  doc.text('Status', 100, y)
  y += 4
  doc.line(14, y, 140, y)
  y += 6

  let present = 0
  let absent = 0
  let late = 0
  let marked = 0

  dateList.forEach((dateStr) => {
    if (y > 280) {
      doc.addPage()
      y = 15
    }
    const status = recordByDate.get(dateStr)
    if (status) {
      marked += 1
      if (status === 'Present') present += 1
      else if (status === 'Absent') absent += 1
      else if (status === 'Late') late += 1
    }
    const code = status ? (STATUS_CODE[status] || status) : '-'
    doc.text(dateStr, 14, y)
    doc.text(formatDateLabel(dateStr), 60, y)
    doc.text(code, 100, y)
    y += 6
  })

  const percent = marked > 0 ? Math.round(((present + late) / marked) * 100) : 0
  y += 6
  if (y > 270) {
    doc.addPage()
    y = 15
  }
  doc.setFontSize(11)
  doc.text(
    `Total: ${dateList.length} | Marked: ${marked} | Present: ${present} | Absent: ${absent} | Late: ${late} | Attendance: ${percent}%`,
    14,
    y
  )

  const safeName = student.name.replace(/\s+/g, '_')
  doc.save(`${safeName}_Attendance_${startDate}_to_${endDate}.pdf`)
}