async function downloadPDF(){

    const students =
    await db.students.toArray();
    const attendance = await db.attendance.toArray();

    const reportClass = document.getElementById("reportClassFilter")?.value;
    let filteredStudents = students;
    if(reportClass && reportClass !== "all") {
        filteredStudents = students.filter(s => s.className === reportClass);
    }

    // Add attendance percentage to each student
    const studentDataWithAttendance = filteredStudents.map(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
        const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        return {
            ...student,
            attendancePercent
        };
    });

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);

    doc.text(
        (reportClass && reportClass !== "all") ? `Teacher Intelligence Report - Class ${reportClass}` : "Teacher Intelligence Report",
        14,
        15
    );

    let y = 25;
    const checkPage = () => { if(y > 270) { doc.addPage(); y = 15; } };
    const leftMargin = 14;
    const lineHeight = 6;

    studentDataWithAttendance.forEach(student=>{
        checkPage();
        
        doc.setFontSize(12);
        doc.text(`${student.name} (Roll: ${student.rollNo})`, leftMargin, y);
        y += lineHeight;
        
        doc.setFontSize(10);
        doc.text(`Class: ${student.className} | Attendance: ${student.attendancePercent}%`, leftMargin, y);
        y += lineHeight;
        
        doc.text(`Father: ${student.fatherName || 'N/A'} | Mother: ${student.motherName || 'N/A'}`, leftMargin, y);
        y += lineHeight;
        
        doc.text(`Phone: ${student.parentPhone || 'N/A'} | Address: ${student.address || 'N/A'}`, leftMargin, y);
        y += lineHeight;
        
        doc.text(`DOB: ${student.dob || 'N/A'} | Blood Group: ${student.bloodGroup || 'N/A'}`, leftMargin, y);
        y += lineHeight;
        
        doc.text(`Admission No: ${student.admissionNo || 'N/A'} | Aadhar: ${student.aadharNumber || 'N/A'}`, leftMargin, y);
        y += lineHeight;
        
        doc.text(`Saral Portal: ${student.saralPortalNumber || 'N/A'}`, leftMargin, y);
        y += lineHeight * 1.5;
    });

    doc.save((reportClass && reportClass !== "all") ? `students-report-class-${reportClass}.pdf` : "students-report.pdf");
}

async function exportExcel(){

    const students =
    await db.students.toArray();
    const attendance = await db.attendance.toArray();

    const reportClass = document.getElementById("reportClassFilter")?.value;
    let filteredStudents = students;
    if(reportClass && reportClass !== "all") {
        filteredStudents = students.filter(s => s.className === reportClass);
    }

    // Add attendance percentage to each student
    const studentDataWithAttendance = filteredStudents.map(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
        const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        // Return only desired fields, excluding parentName
        return {
            id: student.id,
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
            attendancePercent: `${attendancePercent}%`
        };
    });

    const workbook =
    XLSX.utils.book_new();

    const groupedStudents = {};
    studentDataWithAttendance.forEach(student => {
        if(!groupedStudents[student.className]) groupedStudents[student.className] = [];
        groupedStudents[student.className].push(student);
    });

    // Generate a dedicated Excel Sheet tab for each class
    for (const [className, classStudents] of Object.entries(groupedStudents)) {
        const worksheet = XLSX.utils.json_to_sheet(classStudents);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Class ${className}`);
    }
    
    if (Object.keys(groupedStudents).length === 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([]), "Students");
    }

    XLSX.writeFile(
        workbook,
        (reportClass && reportClass !== "all") ? `students_class_${reportClass}.xlsx` : "students.xlsx"
    );
}

async function downloadStudentReport(studentId){
    const student = await db.students.get(studentId);
    if(!student) return;

    const marks = await db.marks.where("studentId").equals(studentId).toArray();
    const attendance = await db.attendance.where("studentId").equals(studentId).toArray();
    const notes = await db.notes.where("studentId").equals(studentId).toArray();
    const behavior = await db.behavior.where("studentId").equals(studentId).toArray();
    const homework = await db.homework.where("studentId").equals(studentId).toArray();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Student Performance Report", 20, 20);

    doc.setFontSize(14);
    doc.text("Student Details", 20, 35);
    doc.setFontSize(12);
    doc.text(`Name: ${student.name} | Roll No: ${student.rollNo} | Class: ${student.className}`, 20, 45);
    doc.text(`Father: ${student.fatherName || 'N/A'} | Mother: ${student.motherName || 'N/A'}`, 20, 52);
    doc.text(`Phone: ${student.parentPhone} | Address: ${student.address || 'N/A'} | DOB: ${student.dob || 'N/A'}`, 20, 59);

    let y = 75;
    const checkPage = () => { if(y > 270) { doc.addPage(); y = 20; } };

    // Attendance
    const totalAttendance = attendance.length;
    const present = attendance.filter(a => a.status === "Present").length;
    const late = attendance.filter(a => a.status === "Late").length;
    const absent = attendance.filter(a => a.status === "Absent").length;
    
    // Late is technically attended, so it counts towards percentage
    const attendancePercent = totalAttendance ? Math.round(((present + late) / totalAttendance) * 100) : 0;

    checkPage();
    doc.setFontSize(14);
    doc.text("Attendance Summary", 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Total Days: ${totalAttendance} | Present: ${present} | Late: ${late} | Absent: ${absent} | Percentage: ${attendancePercent}%`, 20, y);
    y += 8;
    
    if (late > 0) {
        doc.text(`* Note: Student observed late attendance (${late} times), needs care.`, 20, y);
        y += 7;
    }
    if (absent > 0) {
        doc.text(`* Note: Student was absent (${absent} times), needs follow-up.`, 20, y);
        y += 7;
    }
    y += 7;

    // Academic Performance
    checkPage();
    doc.setFontSize(14);
    doc.text("Academic Performance", 20, y);
    y += 8;
    doc.setFontSize(12);
    if (marks.length === 0) {
        doc.text("No marks recorded yet.", 20, y);
        y += 10;
    } else {
        marks.forEach(m => {
            checkPage();
            doc.text(`${m.subject} (${m.examType}): ${m.marks} / ${m.totalMarks}`, 20, y);
            y += 7;
        });
        y += 5;
    }

    // Behavior
    checkPage();
    doc.setFontSize(14);
    doc.text("Behavioral Assessment", 20, y);
    y += 8;
    doc.setFontSize(12);
    if (behavior.length === 0) {
        doc.text("No behavior records yet.", 20, y);
        y += 10;
    } else {
        const b = behavior[behavior.length - 1]; // Latest behavior
        doc.text(`Discipline: ${b.discipline} | Confidence: ${b.confidence}`, 20, y);
        y += 7;
        doc.text(`Communication: ${b.communication} | Leadership: ${b.leadership}`, 20, y);
        y += 10;
    }

    // Homework
    checkPage();
    doc.setFontSize(14);
    doc.text("Daily Homework Details", 20, y);
    y += 8;
    doc.setFontSize(12);
    if (homework.length === 0) {
        doc.text("No homework records yet.", 20, y);
        y += 10;
    } else {
        homework.slice(-10).forEach(h => {
            checkPage();
            const statusText = h.status === "Completed" ? "Submitted before due date" :
                               h.status === "Partially Completed" ? "Submitted but incomplete" :
                               h.status === "Not Submitted" ? "Missing" :
                               h.status === "Late Submission" ? "Submitted after due date" : h.status;
            doc.text(`${h.date}: ${h.subject} | Due: ${h.dueDate || 'N/A'} (${statusText})`, 20, y);
            y += 7;
        });
        y += 5;
    }

    // Teacher Notes
    checkPage();
    doc.setFontSize(14);
    doc.text("Teacher Notes", 20, y);
    y += 8;
    doc.setFontSize(12);
    notes.slice(-3).forEach(n => {
        checkPage();
        doc.text(`- ${n.note}`, 20, y);
        y += 7;
    });

    doc.save(`${student.name.replace(/\s+/g, '_')}_Report.pdf`);
}