import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
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

function buildStudentReportDoc(student, attendanceRecords, marksRecords = [], notesRecords = [], behaviorRecords = []) {
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

  const marksStats = marksStatsFor(student.id, marksRecords)

  checkPage()
  doc.setFontSize(14)
  doc.text('Academic Performance', 20, y)
  y += 8
  doc.setFontSize(12)

  if (marksStats.records.length === 0) {
    doc.text('No marks recorded yet.', 20, y)
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

export function downloadStudentPdfReport(student, attendanceRecords, marksRecords = [], notesRecords = [], behaviorRecords = []) {
  const doc = buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords)
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

export async function shareStudentReportOnWhatsApp(student, attendanceRecords, marksRecords = [], notesRecords = [], behaviorRecords = []) {
  const marksStats = marksStatsFor(student.id, marksRecords)
  const marksLine = marksStats.records.length > 0 ? `Average Marks: ${marksStats.average}%\n` : ''

  const message =
    `📋 *Student Performance Report*\n\n` +
    `Student Name: ${student.name}\n` +
    `Roll No: ${student.rollNo}\n` +
    `Class: ${student.className}\n` +
    `Father: ${student.fatherName || 'N/A'}\n` +
    `Mother: ${student.motherName || 'N/A'}\n` +
    marksLine +
    `\nPlease see the attached student performance report.\n\n` +
    `- Teacher`

  const doc = buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords)
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
