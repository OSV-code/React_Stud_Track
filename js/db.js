const db = new Dexie("TeacherIntelligenceDB");

db.version(2).stores({

    students: `
        ++id,
        name,
        rollNo,
        className,
        parentName,
        parentPhone,
        address,
        dob,
        bloodGroup,
        admissionNo
    `,

    attendance: `
        ++id,
        studentId,
        date,
        status
    `,

    marks: `
        ++id,
        studentId,
        subject,
        examType,
        marks,
        totalMarks
    `,

    notes: `
        ++id,
        studentId,
        note,
        createdAt
    `,

    behavior: `
        ++id,
        studentId,
        discipline,
        confidence,
        communication,
        leadership,
        createdAt
    `,

    alerts: `
        ++id,
        studentId,
        type,
        message,
        createdAt
    `,

    homework: `
        ++id,
        studentId,
        date,
        subject,
        status
    `
});