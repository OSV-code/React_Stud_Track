async function addStudent(){

    const student = {

        name:
        document.getElementById("studentName").value,

        rollNo:
        document.getElementById("rollNo").value,

        className:
        document.getElementById("studentClass").value,

        parentName:
        document.getElementById("parentName").value,

        parentPhone:
        document.getElementById("parentPhone").value,

        address:
        document.getElementById("address").value,

        dob:
        document.getElementById("dob").value,

        bloodGroup:
        document.getElementById("bloodGroup").value,

        admissionNo:
        document.getElementById("admissionNo").value
    };

    if(!student.name || !student.rollNo){

        alert("Fill mandatory details");

        return;
    }

    await db.students.add(student);

    alert("Student Saved");

    clearStudentForm();

    loadStudents();
}

function clearStudentForm(){

    [
        "studentName",
        "rollNo",
        "studentClass",
        "parentName",
        "parentPhone",
        "address",
        "dob",
        "bloodGroup",
        "admissionNo"
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
                <p><b>Parent:</b> ${student.parentName}</p>
                <p><b>Phone:</b> ${student.parentPhone}</p>
                <button onclick="downloadStudentReport(${student.id})" class="btn-report">
                    Download Full Report
                </button>
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