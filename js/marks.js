async function saveMarks(){

    const data = {

        studentId:
        Number(document.getElementById("marksStudent").value),

        subject:
        document.getElementById("subject").value,

        examType:
        document.getElementById("examType").value,

        marks:
        Number(document.getElementById("marks").value),

        totalMarks:
        Number(document.getElementById("totalMarks").value)
    };

    if(!data.studentId) {
        alert("Please select a student first.");
        return;
    }

    await db.marks.add(data);

    alert("Marks Saved");

    checkMarksAlert(data.studentId);
}

async function checkMarksAlert(studentId){

    const marks =
    await db.marks
    .where("studentId")
    .equals(studentId)
    .toArray();

    const avg =
    marks.reduce((a,b)=>a+b.marks,0)
    / marks.length;

    if(avg < 40){

        await db.alerts.add({

            studentId,

            type:"Academic",

            message: "Low academic performance detected. Needs attention.",

            createdAt:
            new Date().toLocaleString()
        });

        loadAlerts();
    } else if (avg >= 75) {
        await db.alerts.add({
            studentId,
            type: "Academic Excellence",
            message: "Excellent academic performance detected!",

            createdAt:
            new Date().toLocaleString()
        });

        loadAlerts();
    }
}