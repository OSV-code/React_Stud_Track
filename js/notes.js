async function saveNote(){

    const studentId =
    Number(document.getElementById("notesStudent").value);

    if(!studentId) {
        alert("Please select a student first.");
        return;
    }

    const note =
    document.getElementById("teacherNote").value;

    if(!note){

        alert("Write note");

        return;
    }

    await db.notes.add({

        studentId,

        note,

        createdAt:
        new Date().toLocaleString()
    });

    document.getElementById("teacherNote").value="";

    alert("Note Saved");
}