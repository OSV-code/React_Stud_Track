async function generateAIComment(){

    const studentId =
    Number(document.getElementById("aiStudent").value);

    if(!studentId) {
        alert("Please select a student first.");
        return;
    }

    const student =
    await db.students.get(studentId);

    const marks =
    await db.marks
    .where("studentId")
    .equals(studentId)
    .toArray();

    const attendance =
    await db.attendance
    .where("studentId")
    .equals(studentId)
    .toArray();

    const notes =
    await db.notes
    .where("studentId")
    .equals(studentId)
    .toArray();

    let avg = 0;

    if(marks.length){

        avg =
        marks.reduce((a,b)=>a+b.marks,0)
        / marks.length;
    }

    let attendancePercent = 100;

    if(attendance.length){

        const present =
        attendance.filter(
            a=>a.status==="Present"
        ).length;

        attendancePercent =
        Math.round(
            (present / attendance.length) * 100
        );
    }

    let message = `

    ${student.name} has shown

    ${avg > 70 ? "good" : "moderate"}

    academic performance.

    Attendance is currently

    ${attendancePercent}%.

    `;

    if(avg < 40){

        message +=
        "Additional academic focus is recommended. ";
    }

    if(attendancePercent < 75){

        message +=
        "Regular attendance improvement is needed. ";
    }

    if(notes.length){

        message +=
        `Teacher observations available:
        "${notes[notes.length-1].note}"`;
    }

    document.getElementById("aiOutput")
    .innerText = message;
}