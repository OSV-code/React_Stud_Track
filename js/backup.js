async function backupDatabase(){

    const students =
    await db.students.toArray();

    const attendance =
    await db.attendance.toArray();

    const marks =
    await db.marks.toArray();

    const notes =
    await db.notes.toArray();

    const behavior =
    await db.behavior.toArray();

    const alerts =
    await db.alerts.toArray();

    const homework =
    await db.homework.toArray();

    const backup = {

        students,
        attendance,
        marks,
        notes,
        behavior,
        alerts,
        homework
    };

    const blob = new Blob(

        [JSON.stringify(backup,null,2)],

        {
            type:'application/json'
        }
    );

    const url =
    URL.createObjectURL(blob);

    const a =
    document.createElement("a");

    a.href = url;

    a.download =
    "teacher-backup.json";

    a.click();

    URL.revokeObjectURL(url);
}