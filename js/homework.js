async function saveHomework(){

    const studentId =
    Number(document.getElementById("homeworkStudent").value);

    if(!studentId) {
        alert("Please select a student first.");
        return;
    }

    const subject = document.getElementById("homeworkSubject").value;
    const status = document.getElementById("homeworkStatus").value;
    
    const dateInput = document.getElementById("homeworkDate").value;
    const dateStr = dateInput ? new Date(dateInput + 'T00:00:00').toLocaleDateString() : new Date().toLocaleDateString();
    
    const dueDateInput = document.getElementById("homeworkDueDate").value;
    const dueDateStr = dueDateInput ? new Date(dueDateInput + 'T00:00:00').toLocaleDateString() : "";

    if(!subject){
        alert("Please enter the subject.");
        return;
    }

    await db.homework.add({
        studentId,
        date: dateStr,
        dueDate: dueDateStr,
        subject,
        status
    });

    alert("Homework Status Saved");
    
    document.getElementById("homeworkSubject").value = "";
    document.getElementById("homeworkDate").value = "";
    document.getElementById("homeworkDueDate").value = "";
    document.getElementById("homeworkStatus").value = "Completed";
}