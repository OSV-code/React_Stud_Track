  import jsPDF from 'jspdf'
  import * as XLSX from 'xlsx-js-style'
  import { supabase } from './supabaseClient'
  import { openWhatsAppShare } from './whatsappUtils'

  function loadImageAsDataUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => reject(new Error('Unable to load student photo'))
      img.src = url
    })
  }

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
  // ---- Added: shared visual helpers for the redesigned student report PDF ----
  const REPORT_COLORS = {
    header: [30, 58, 95],
    headerText: [255, 255, 255],
    section: [222, 235, 246],
    sectionText: [30, 58, 95],
    tableHeader: [30, 58, 95],
    tableHeaderText: [255, 255, 255],
    rowAlt: [244, 247, 251],
    border: [190, 197, 209],
    text: [45, 45, 45],
    muted: [110, 118, 130]
  }

  const REPORT_MARGIN = 10
  const REPORT_PAGE_BOTTOM = 278

  function drawReportPageBorder(doc) {
    doc.setDrawColor(...REPORT_COLORS.header)
    doc.setLineWidth(0.6)
    doc.rect(REPORT_MARGIN - 2, REPORT_MARGIN - 2, 210 - (REPORT_MARGIN - 2) * 2, 297 - (REPORT_MARGIN - 2) * 2)
    doc.setLineWidth(0.2)
    doc.setDrawColor(...REPORT_COLORS.border)
    doc.rect(REPORT_MARGIN, REPORT_MARGIN, 210 - REPORT_MARGIN * 2, 297 - REPORT_MARGIN * 2)
  }

  function ensureReportSpace(doc, y, neededHeight) {
    if (y + neededHeight <= REPORT_PAGE_BOTTOM) return y
    doc.addPage()
    drawReportPageBorder(doc)
    return REPORT_MARGIN + 10
  }

  function drawReportSectionHeader(doc, title, y) {
    y = ensureReportSpace(doc, y, 12)
    doc.setFillColor(...REPORT_COLORS.section)
    doc.rect(REPORT_MARGIN + 2, y, 210 - (REPORT_MARGIN + 2) * 2, 8, 'F')
    doc.setTextColor(...REPORT_COLORS.sectionText)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, REPORT_MARGIN + 5, y + 5.5)
    doc.setTextColor(...REPORT_COLORS.text)
    doc.setFont('helvetica', 'normal')
    return y + 12
  }

  function drawReportTable(doc, { headers, rows, colWidths, startY, startX = REPORT_MARGIN + 2 }) {
    const headerHeight = 8
    let y = startY
    const tableWidth = colWidths.reduce((sum, w) => sum + w, 0)

    const drawHeaderRow = () => {
      doc.setFillColor(...REPORT_COLORS.tableHeader)
      doc.rect(startX, y, tableWidth, headerHeight, 'F')
      doc.setTextColor(...REPORT_COLORS.tableHeaderText)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      let x = startX
      headers.forEach((label, i) => {
        doc.text(String(label), x + 2, y + 5.5)
        x += colWidths[i]
      })
      doc.setTextColor(...REPORT_COLORS.text)
      doc.setFont('helvetica', 'normal')
      y += headerHeight
    }

    y = ensureReportSpace(doc, y, headerHeight + 6)
    drawHeaderRow()

    rows.forEach((row, rowIndex) => {
      const rowHeight = 7
      if (y + rowHeight > REPORT_PAGE_BOTTOM) {
        doc.addPage()
        drawReportPageBorder(doc)
        y = REPORT_MARGIN + 10
        drawHeaderRow()
      }

      if (rowIndex % 2 === 1) {
        doc.setFillColor(...REPORT_COLORS.rowAlt)
        doc.rect(startX, y, tableWidth, rowHeight, 'F')
      }

      doc.setDrawColor(...REPORT_COLORS.border)
      doc.setLineWidth(0.1)
      doc.rect(startX, y, tableWidth, rowHeight)

      doc.setFontSize(9)
      let x = startX
      row.forEach((cell, i) => {
        doc.text(String(cell), x + 2, y + 4.8)
        x += colWidths[i]
      })

      y += rowHeight
    })

    doc.setDrawColor(...REPORT_COLORS.border)
    doc.setLineWidth(0.2)
    doc.rect(startX, startY, tableWidth, y - startY)

    return y + 6
  }
  // ---- End of added visual helpers ----


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
  function compareByRollNo(a, b) {
  const rollA = Number(String(a.rollNo).trim())
  const rollB = Number(String(b.rollNo).trim())
  if (!Number.isNaN(rollA) && !Number.isNaN(rollB)) {
    return rollA - rollB
  }
  return String(a.rollNo).localeCompare(String(b.rollNo))
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

  async function buildStudentReportDoc(student, attendanceRecords, marksRecords = [], notesRecords = [], behaviorRecords = [], options = {}) {
    const doc = new jsPDF()

    drawReportPageBorder(doc)

    // Header band
    const headerHeight = 30
    doc.setFillColor(...REPORT_COLORS.header)
    doc.rect(REPORT_MARGIN, REPORT_MARGIN, 210 - REPORT_MARGIN * 2, headerHeight, 'F')
    doc.setTextColor(...REPORT_COLORS.headerText)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Student Performance Report', 105, REPORT_MARGIN + 13, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Class ${student.className || 'N/A'}  |  Roll No ${student.rollNo || 'N/A'}`, 105, REPORT_MARGIN + 21, { align: 'center' })

    // Photo box, top-right, overlapping the header
    const photoSize = 24
    const photoX = 210 - REPORT_MARGIN - photoSize - 4
    const photoY = REPORT_MARGIN + 3
    doc.setFillColor(255, 255, 255)
    doc.rect(photoX, photoY, photoSize, photoSize, 'F')

    const photoUrl = options.photoUrl
    let photoLoaded = false
    if (photoUrl) {
      try {
        const { dataUrl } = await loadImageAsDataUrl(photoUrl)
        doc.addImage(dataUrl, 'JPEG', photoX + 1, photoY + 1, photoSize - 2, photoSize - 2)
        photoLoaded = true
      } catch (err) {
        // Continue without the photo if it can't be loaded.
      }
    }
    if (!photoLoaded) {
      doc.setTextColor(...REPORT_COLORS.muted)
      doc.setFontSize(7)
      doc.text('No Photo', photoX + photoSize / 2, photoY + photoSize / 2 + 1, { align: 'center' })
    }
    doc.setDrawColor(...REPORT_COLORS.border)
    doc.setLineWidth(0.3)
    doc.rect(photoX, photoY, photoSize, photoSize)

    doc.setTextColor(...REPORT_COLORS.text)

    let y = REPORT_MARGIN + headerHeight + 10

    // Student Details section
    y = drawReportSectionHeader(doc, 'Student Details', y)

    const detailPairs = [
      ['Name', student.name || 'N/A', 'Father', student.fatherName || 'N/A'],
      ['Mother', student.motherName || 'N/A', 'Phone', student.parentPhone || 'N/A'],
      ['DOB', student.dob || 'N/A', 'Blood Group', student.bloodGroup || 'N/A'],
      ['Admission No', student.admissionNo || 'N/A', 'Saral Portal', student.saralPortalNumber || 'N/A']
    ]

    doc.setFontSize(10)
    detailPairs.forEach(([label1, value1, label2, value2]) => {
      y = ensureReportSpace(doc, y, 7)
      doc.setFont('helvetica', 'bold')
      doc.text(`${label1}:`, REPORT_MARGIN + 4, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value1), REPORT_MARGIN + 32, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${label2}:`, 110, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(value2), 138, y)
      y += 7
    })

    if (student.address) {
      y = ensureReportSpace(doc, y, 7)
      doc.setFont('helvetica', 'bold')
      doc.text('Address:', REPORT_MARGIN + 4, y)
      doc.setFont('helvetica', 'normal')
      const addressLines = doc.splitTextToSize(String(student.address), 150)
      doc.text(addressLines, REPORT_MARGIN + 32, y)
      y += addressLines.length * 5 + 3
    }
    y += 4

    // Attendance Summary section
    const stats = attendanceStatsFor(student.id, attendanceRecords)
    y = drawReportSectionHeader(doc, 'Attendance Summary', y)
    y = drawReportTable(doc, {
      headers: ['Total Days', 'Present', 'Late', 'Absent', 'Percentage'],
      rows: [[stats.total, stats.present, stats.late, stats.absent, `${stats.percent}%`]],
      colWidths: [36, 36, 36, 36, 36],
      startY: y
    })

    if (stats.late > 0 || stats.absent > 0) {
      doc.setFontSize(9)
      doc.setTextColor(...REPORT_COLORS.muted)
      if (stats.late > 0) {
        y = ensureReportSpace(doc, y, 6)
        doc.text(`* Student observed late attendance (${stats.late} times), needs care.`, REPORT_MARGIN + 4, y)
        y += 6
      }
      if (stats.absent > 0) {
        y = ensureReportSpace(doc, y, 6)
        doc.text(`* Student was absent (${stats.absent} times), needs follow-up.`, REPORT_MARGIN + 4, y)
        y += 6
      }
      doc.setTextColor(...REPORT_COLORS.text)
      y += 2
    }

    // Academic Performance section
    const selectedExamTypes = Array.isArray(options.examTypes) ? options.examTypes : []
    const filteredMarks = filterMarksByExamTypes(marksRecords, selectedExamTypes)
    const marksStats = marksStatsFor(student.id, filteredMarks)

    y = drawReportSectionHeader(doc, 'Academic Performance', y)

    if (selectedExamTypes.length > 0) {
      doc.setFontSize(9)
      doc.setTextColor(...REPORT_COLORS.muted)
      const summaryLines = doc.splitTextToSize(`Exam Types: ${selectedExamTypes.join(', ')}`, 180)
      summaryLines.forEach((line) => {
        y = ensureReportSpace(doc, y, 6)
        doc.text(line, REPORT_MARGIN + 4, y)
        y += 5
      })
      doc.setTextColor(...REPORT_COLORS.text)
      y += 2
    }

    if (marksStats.records.length === 0) {
      const noMarksText = selectedExamTypes.length > 0 ? 'No marks recorded for selected exam types.' : 'No marks recorded yet.'
      y = ensureReportSpace(doc, y, 8)
      doc.setFontSize(10)
      doc.text(noMarksText, REPORT_MARGIN + 4, y)
      y += 10
    } else {
      const markRows = marksStats.records.map((mark) => {
        const percent = Math.round((mark.score / mark.total_marks) * 100)
        return [mark.subject, mark.exam_type, mark.score, mark.total_marks, `${percent}%`, mark.exam_date]
      })
      y = drawReportTable(doc, {
        headers: ['Subject', 'Exam Type', 'Score', 'Total', 'Percent', 'Date'],
        rows: markRows,
        colWidths: [34, 30, 20, 20, 22, 24],
        startY: y
      })

      y = ensureReportSpace(doc, y, 8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(`Average: ${marksStats.average}%`, REPORT_MARGIN + 4, y)
      doc.setFont('helvetica', 'normal')
      y += 8
    }

    // Behavioral Assessment section
    const studentBehavior = behaviorRecords.filter((entry) => entry.student_id === student.id)
    y = drawReportSectionHeader(doc, 'Behavioral Assessment', y)

    if (studentBehavior.length === 0) {
      y = ensureReportSpace(doc, y, 8)
      doc.setFontSize(10)
      doc.text('No behavior records yet.', REPORT_MARGIN + 4, y)
      y += 10
    } else {
      const behaviorRows = studentBehavior.map((entry) => [
        entry.assessment_date,
        `${entry.discipline}/5`,
        `${entry.confidence}/5`,
        `${entry.communication}/5`,
        `${entry.leadership}/5`
      ])
      y = drawReportTable(doc, {
        headers: ['Date', 'Discipline', 'Confidence', 'Communication', 'Leadership'],
        rows: behaviorRows,
        colWidths: [28, 32, 32, 40, 32],
        startY: y
      })
    }

    // Teacher Notes section
    const studentNotes = notesRecords.filter((note) => note.student_id === student.id)
    y = drawReportSectionHeader(doc, 'Teacher Notes', y)

    if (studentNotes.length === 0) {
      y = ensureReportSpace(doc, y, 8)
      doc.setFontSize(10)
      doc.text('No notes recorded yet.', REPORT_MARGIN + 4, y)
    } else {
      doc.setFontSize(10)
      studentNotes.forEach((note) => {
        const lines = doc.splitTextToSize(`${note.note_date}: ${note.note_text}`, 178)
        lines.forEach((line) => {
          y = ensureReportSpace(doc, y, 6)
          doc.text(line, REPORT_MARGIN + 4, y)
          y += 6
        })
      })
    }

    return doc
  }

  export async function downloadStudentPdfReport(
    student,
    attendanceRecords,
    marksRecords = [],
    notesRecords = [],
    behaviorRecords = [],
    options = {}
  ) {
    const doc = await buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords, options)
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

    const doc = await buildStudentReportDoc(student, attendanceRecords, marksRecords, notesRecords, behaviorRecords, options)
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
  // ---- Added: Monthly attendance register for a whole class, matching the
// standard "Sr. No. | Student Name | 1..31" register layout ----

export function downloadClassMonthlyAttendanceExcel(students, attendanceRecords, className, yearMonth) {
  if (!className || className === 'all') {
    throw new Error('Please select a specific class first.')
  }
  if (!yearMonth) {
    throw new Error('Please select a month.')
  }

  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const totalDays = new Date(year, month, 0).getDate()

  const dateStrings = Array.from({ length: totalDays }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    return `${yearStr}-${monthStr}-${day}`
  })

    const classStudents = students
    .filter((student) => student.className === className)
    .sort(compareByRollNo)
  if (classStudents.length === 0) {
    throw new Error(`No students found in Class ${className}.`)
  }

  const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  )

  const titleRows = [
    ['Monthly Attendance Register'],
    [`Class: ${className}`, '', `Month: ${monthLabel}`],
    []
  ]

  const headerRow = ['Sr. No.', 'Student Name', ...Array.from({ length: totalDays }, (_, i) => i + 1)]

  const rows = classStudents.map((student, index) => {
    const studentRecords = attendanceRecords.filter((record) => record.student_id === student.id)
    const recordByDate = new Map(studentRecords.map((record) => [record.attendance_date, record.status]))

    const dayCells = dateStrings.map((dateStr) => {
      const status = recordByDate.get(dateStr)
      return status ? (STATUS_CODE[status] || status) : ''
    })

    return [index + 1, student.name, ...dayCells]
  })

  const sheetData = [...titleRows, headerRow, ...rows]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    ...Array.from({ length: totalDays }, () => ({ wch: 4 }))
  ]

  const titleCellRef = 'A1'
  if (worksheet[titleCellRef]) {
    worksheet[titleCellRef].s = { font: { bold: true, sz: 14 } }
  }

  const lastColIndex = 1 + totalDays
  const lastRowIndex = sheetData.length - 1

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } }
  ]
    // ---- Added: cell borders for the header + data table so grid lines print ----
  const borderStyle = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
  }

  const tableStartRow = titleRows.length // header row index (0-based)
  const tableEndRow = sheetData.length - 1

  for (let r = tableStartRow; r <= tableEndRow; r += 1) {
    for (let c = 0; c <= lastColIndex; c += 1) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: 's', v: '' }
      }
      worksheet[cellRef].s = {
        ...(worksheet[cellRef].s || {}),
        border: borderStyle,
        font: r === tableStartRow ? { bold: true } : worksheet[cellRef].s?.font
      }
    }
  }
  // ---- End of added borders ----

  // ---- Added: page setup so printing shows all day columns on one page ----
  worksheet['!pageSetup'] = {
    orientation: 'landscape',
    fitToWidth: 1,
    fitToHeight: 0,
    scale: 100
  }
  worksheet['!margins'] = {
    left: 0.3,
    right: 0.3,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Attendance Register')

  const lastColLetter = XLSX.utils.encode_col(lastColIndex)
  if (!workbook.Workbook) workbook.Workbook = {}
  if (!workbook.Workbook.Names) workbook.Workbook.Names = []
  workbook.Workbook.Names.push({
    Sheet: 0,
    Name: '_xlnm.Print_Area',
    Ref: `'Monthly Attendance Register'!$A$1:$${lastColLetter}$${lastRowIndex + 1}`
  })
  // ---- End of added page setup ----

  XLSX.writeFile(workbook, `Class_${className}_Attendance_${yearStr}-${monthStr}.xlsx`)
}