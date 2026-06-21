async function saveBehavior(){

    const data = {

        studentId:
        Number(document.getElementById("behaviorStudent").value),

        discipline:
        document.getElementById("discipline").value,

        confidence:
        document.getElementById("confidence").value,

        communication:
        document.getElementById("communication").value,

        leadership:
        document.getElementById("leadership").value,

        createdAt:
        new Date().toLocaleString()
    };

    if(!data.studentId) {
        alert("Please select a student first.");
        return;
    }

    await db.behavior.add(data);

    alert("Behavior Saved");
}