async function saveStudent(){

    const studentId = document.getElementById("studentId").value;

    const student = {

        name:
        document.getElementById("studentName").value,

        rollNo:
        document.getElementById("rollNo").value,

        className:
        document.getElementById("studentClass").value,

        fatherName:
        document.getElementById("fatherName").value,

        motherName:
        document.getElementById("motherName").value,

        parentPhone:
        document.getElementById("parentPhone").value,

        address:
        document.getElementById("address").value,

        dob:
        document.getElementById("dob").value,

        bloodGroup:
        document.getElementById("bloodGroup").value,

        admissionNo:
        document.getElementById("admissionNo").value,

        aadharNumber:
        document.getElementById("aadharNumber").value,

        saralPortalNumber:
        document.getElementById("saralPortalNumber").value
    };

    if(!student.name || !student.rollNo){

        alert("Fill mandatory details");

        return;
    }

    if(studentId) {
        await db.students.update(parseInt(studentId), student);
        alert("Student Updated");
    } else {
        await db.students.add(student);
        alert("Student Saved");
    }

    clearStudentForm();
    cancelEdit();
    loadStudents();
}

async function editStudent(studentId) {
    const student = await db.students.get(studentId);
    if(!student) return;

    document.getElementById("studentId").value = studentId;
    document.getElementById("studentName").value = student.name;
    document.getElementById("rollNo").value = student.rollNo;
    document.getElementById("studentClass").value = student.className;
    document.getElementById("fatherName").value = student.fatherName || "";
    document.getElementById("motherName").value = student.motherName || "";
    document.getElementById("parentPhone").value = student.parentPhone || "";
    document.getElementById("address").value = student.address || "";
    document.getElementById("dob").value = student.dob || "";
    document.getElementById("bloodGroup").value = student.bloodGroup || "";
    document.getElementById("admissionNo").value = student.admissionNo || "";
    document.getElementById("aadharNumber").value = student.aadharNumber || "";
    document.getElementById("saralPortalNumber").value = student.saralPortalNumber || "";

    document.getElementById("studentFormTitle").innerText = "Edit Student";
    document.getElementById("saveBtn").innerText = "Update Student";
    document.getElementById("cancelBtn").style.display = "block";

    document.querySelector(".module").scrollIntoView({behavior: "smooth"});
}

function cancelEdit() {
    clearStudentForm();
    document.getElementById("studentId").value = "";
    document.getElementById("studentFormTitle").innerText = "Add Student";
    document.getElementById("saveBtn").innerText = "Save Student";
    document.getElementById("cancelBtn").style.display = "none";
}

async function deleteStudent(studentId) {
    if(confirm("Are you sure you want to delete this student?")) {
        await db.students.delete(studentId);
        alert("Student Deleted");
        loadStudents();
    }
}

async function shareStudentReportOnWhatsApp(studentId) {
    const student = await db.students.get(studentId);
    if(!student) return;

    // First, generate and download the PDF
    downloadStudentReport(studentId);

    // Prepare WhatsApp message
    const message = `📋 *Student Performance Report*\n\n` +
        `Student Name: ${student.name}\n` +
        `Roll No: ${student.rollNo}\n` +
        `Class: ${student.className}\n` +
        `Father: ${student.fatherName || 'N/A'}\n` +
        `Mother: ${student.motherName || 'N/A'}\n\n` +
        `Please see the attached student performance report.\n\n` +
        `- Teacher`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp
    window.open(`https://web.whatsapp.com/send?text=${encodedMessage}`, '_blank');

    alert("PDF has been generated. WhatsApp will open - please search and select the parent to share with.");
}

function clearStudentForm(){

    [
        "studentName",
        "rollNo",
        "studentClass",
        "fatherName",
        "motherName",
        "parentPhone",
        "address",
        "dob",
        "bloodGroup",
        "admissionNo",
        "aadharNumber",
        "saralPortalNumber"
    ].forEach(id=>{

        document.getElementById(id).value="";
    });
}

async function loadStudents(){

    const students =
    await db.students.toArray();

    // Get unique classes to populate the filter dropdowns
    const classSet = new Set(students.map(s => s.className));
    const classes = Array.from(classSet).sort();

    // Update class options for the filters
    const classFilters = [
        "attendanceClassFilter", "reportClassFilter", "studentClassFilter",
        "marksClassFilter", "notesClassFilter", "behaviorClassFilter",
        "alertsClassFilter", "chartClassFilter", "aiClassFilter",
        "homeworkClassFilter"
    ];
    classFilters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const currentVal = el.value;
            el.innerHTML = '<option value="" disabled selected>Select Class First</option><option value="all">All Classes</option>';
            classes.forEach(c => {
                el.innerHTML += `<option value="${c}">Class: ${c}</option>`;
            });
            if(currentVal) el.value = currentVal; // Restore selection if any
        }
    });

    document.getElementById("totalStudents")
    .innerText = students.length;

    // Render the interactive list cards
    renderStudentCards();

    // Apply initial filter to all sections to clear them out cleanly
    const filterSections = [
        {class: 'attendanceClassFilter', list: 'attendanceStudentList'},
        {class: 'marksClassFilter', list: 'marksStudentList'},
        {class: 'notesClassFilter', list: 'notesStudentList'},
        {class: 'behaviorClassFilter', list: 'behaviorStudentList'},
        {class: 'alertsClassFilter', list: 'alertsStudentList'},
        {class: 'chartClassFilter', list: 'chartStudentList'},
        {class: 'aiClassFilter', list: 'aiStudentList'},
        {class: 'homeworkClassFilter', list: 'homeworkStudentList'}
    ];
    
    filterSections.forEach(f => filterStudentDropdown(f.class, f.list));
}

async function renderStudentCards() {
    const students = await db.students.toArray();
    const list = document.getElementById("studentList");
    
    const searchText = (document.getElementById("studentSearch")?.value || "").toLowerCase();
    const filterClass = document.getElementById("studentClassFilter")?.value || "";

    list.innerHTML = "";

    // Keeps screen completely clean until user explicitly selects a class OR types a search
    if (filterClass === "" && searchText === "") return;

    // Filter matching search and class criteria
    const filtered = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchText) || s.rollNo.toLowerCase().includes(searchText);
        const matchesClass = filterClass === "all" || filterClass === "" || s.className === filterClass;
        return matchesSearch && matchesClass;
    });

    // Group matched students by Class
    const grouped = {};
    filtered.forEach(s => {
        if(!grouped[s.className]) grouped[s.className] = [];
        grouped[s.className].push(s);
    });

    // Render out HTML blocks
    for (const [className, classStudents] of Object.entries(grouped)) {
        list.innerHTML += `<h2 style="width: 100%; border-bottom: 2px solid #ccc; margin-top: 20px;">Class: ${className}</h2>`;
        classStudents.forEach(student => {
            list.innerHTML += `
            <div class="student-card">
                <h3>${student.name}</h3>
                <p><b>Roll:</b> ${student.rollNo}</p>
                <p><b>Class:</b> ${student.className}</p>
                <p><b>Father:</b> ${student.fatherName || 'N/A'}</p>
                <p><b>Mother:</b> ${student.motherName || 'N/A'}</p>
                <p><b>Phone:</b> ${student.parentPhone}</p>
                <p><b>Aadhar:</b> ${student.aadharNumber || 'N/A'}</p>
                <p><b>Saral Portal:</b> ${student.saralPortalNumber || 'N/A'}</p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <button onclick="downloadStudentReport(${student.id})" class="btn-report" style="flex: 1; min-width: 120px;">Download Report</button>
                  <button onclick="shareStudentReportOnWhatsApp(${student.id})" style="flex: 1; min-width: 120px; background: #25D366; color: white; padding: 10px; border: none; border-radius: 4px; cursor: pointer;">Share on WA</button>
                  <button onclick="editStudent(${student.id})" style="flex: 1; min-width: 100px; background: #2196F3; color: white; padding: 10px; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                  <button onclick="deleteStudent(${student.id})" style="flex: 1; min-width: 100px; background: #f44336; color: white; padding: 10px; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            </div>
            `;
        });
    }
}

async function filterStudentDropdown(classId, listId) {
    const classFilter = document.getElementById(classId)?.value || "";
    const datalist = document.getElementById(listId);
    
    if(!datalist) return;
    datalist.innerHTML = '';
    
    // Wipe out the text box and the hidden ID when class is changed
    const textInputId = listId.replace('List', 'Text');
    const hiddenId = listId.replace('List', '');
    const textInput = document.getElementById(textInputId);
    const hiddenInput = document.getElementById(hiddenId);

    if (textInput) textInput.value = '';
    if (hiddenInput) {
        hiddenInput.value = '';
        if (hiddenId === 'alertsStudent') loadAlerts();
    }

    if (classFilter === "") return;
    
    const students = await db.students.toArray();
    students.forEach(student => {
        const matchesClass = classFilter === "all" || student.className === classFilter;
        
        if (matchesClass) {
             datalist.innerHTML += `<option data-id="${student.id}" value="${student.name} (Roll: ${student.rollNo})"></option>`;
        }
    });
}

function updateSelectedStudent(textId, hiddenId) {
    const textInput = document.getElementById(textId);
    const hiddenInput = document.getElementById(hiddenId);
    const datalist = document.getElementById(textId.replace('Text', 'List'));
    
    if (!textInput || !hiddenInput || !datalist) return;
    
    hiddenInput.value = ""; // clear hidden tracking first
    
    // Handle when input is manually cleared by user
    if (!textInput.value) {
        if (hiddenId === 'alertsStudent') loadAlerts();
        return;
    }
    
    // Retrieve matching data-id dynamically so the rest of the functions work normally
    const options = datalist.getElementsByTagName('option');
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === textInput.value) {
            hiddenInput.value = options[i].getAttribute('data-id');
            if (hiddenId === 'alertsStudent') loadAlerts();
            break;
        }
    }
}