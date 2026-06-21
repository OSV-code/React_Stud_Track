async function markAttendance(){

    const studentId =
    Number(document.getElementById("attendanceStudent").value);

    if(!studentId) {
        alert("Please select a student first.");
        return;
    }

    const status =
    document.getElementById("attendanceStatus").value;

    const dateInput = document.getElementById("attendanceDate").value;
    const dateStr = dateInput ? new Date(dateInput + 'T00:00:00').toLocaleDateString() : new Date().toLocaleDateString();

    await db.attendance.add({

        studentId,
        status,
        date: dateStr
    });

    alert("Attendance Saved");

    loadAttendanceCount();

    checkAttendanceAlerts(studentId);
}

async function loadAttendanceCount(){

    const today =
    new Date().toLocaleDateString();

    const attendance =
    await db.attendance
    .where("date")
    .equals(today)
    .toArray();

    document.getElementById("attendanceToday")
    .innerText = attendance.length;
}

async function checkAttendanceAlerts(studentId){

    const records =
    await db.attendance
    .where("studentId")
    .equals(studentId)
    .toArray();

    const absentCount =
    records.filter(r=>r.status==="Absent").length;

    if(absentCount >= 3){

        await db.alerts.add({

            studentId,

            type:"Attendance",

            message:
            "Frequent absences detected.",

            createdAt:
            new Date().toLocaleString()
        });

        loadAlerts();
    }
}