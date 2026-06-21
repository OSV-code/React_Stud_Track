/* THEME TOGGLE */

const themeToggle =
document.getElementById("themeToggle");

themeToggle.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

    document.body.classList.toggle("light");
});

/* SNOW EFFECT */

const snowContainer =
document.getElementById("snow-container");

for(let i=0;i<60;i++){

    const snow =
    document.createElement("div");

    snow.classList.add("snow");

    snow.style.left =
    Math.random()*100 + "vw";

    snow.style.animationDuration =
    (5 + Math.random()*10) + "s";

    snow.style.opacity =
    Math.random();

    snowContainer.appendChild(snow);
}

/* INIT */

async function initializeApp(){

    // Set default date for attendance to today
    const attDateEl = document.getElementById("attendanceDate");
    if (attDateEl) {
        attDateEl.value = new Date().toISOString().split('T')[0];
    }
    
    const hwDateEl = document.getElementById("homeworkDate");
    if (hwDateEl) {
        hwDateEl.value = new Date().toISOString().split('T')[0];
    }

    await loadStudents();

    await loadAttendanceCount();

    await loadAlerts();
}

/* SECURITY LOCK */

// Change this to a secure Master Admin PIN for your sister
const ADMIN_PIN = "0911"; 
const EXPIRY_DAYS = 20;

function checkLockState() {
    const isUnlocked = localStorage.getItem("isUnlocked") === "true";
    const expiryDate = parseInt(localStorage.getItem("passwordExpiryDate") || "0");
    const now = Date.now();

    if (isUnlocked && now < expiryDate) {
        document.getElementById("lockScreen").style.display = "none";
        document.getElementById("appContent").style.display = "block";
        initializeApp();
    } else {
        if (isUnlocked && now >= expiryDate) {
            localStorage.removeItem("isUnlocked");
            alert("The 20-day application license has expired. Please ask the Admin to renew the PIN.");
        }
        document.getElementById("lockScreen").style.display = "flex";
        document.getElementById("appContent").style.display = "none";
        showTeacherView();
    }
}

function unlockApp() {
    const code = document.getElementById("accessCode").value;
    const savedLocalCode = localStorage.getItem("localAppPassword");
    const expiryDate = parseInt(localStorage.getItem("passwordExpiryDate") || "0");
    const now = Date.now();
    
    const errorEl = document.getElementById("lockError");

    if (!savedLocalCode) {
        errorEl.innerText = "No Teacher PIN set. Ask Admin to set up.";
        errorEl.style.display = "block";
        return;
    }

    if (now >= expiryDate) {
        errorEl.innerText = "PIN Expired! Ask Admin to renew.";
        errorEl.style.display = "block";
        return;
    }

    if (code === savedLocalCode) {
        localStorage.setItem("isUnlocked", "true");
        errorEl.style.display = "none";
        document.getElementById("accessCode").value = "";
        checkLockState();
    } else {
        errorEl.innerText = "Incorrect PIN! Access Denied.";
        errorEl.style.display = "block";
    }
}

function adminSetup() {
    const aCode = document.getElementById("adminCode").value;
    const newLocal = document.getElementById("newLocalCode").value;
    const errorEl = document.getElementById("adminError");

    if (aCode === ADMIN_PIN) {
        if (!newLocal) {
            errorEl.innerText = "Please enter a new Teacher PIN.";
            errorEl.style.display = "block";
            return;
        }
        
        localStorage.setItem("localAppPassword", newLocal);
        
        const expiryTime = Date.now() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        localStorage.setItem("passwordExpiryDate", expiryTime.toString());
        
        localStorage.setItem("isUnlocked", "true");
        errorEl.style.display = "none";
        document.getElementById("adminCode").value = "";
        document.getElementById("newLocalCode").value = "";
        checkLockState();
        alert(`New Teacher PIN set successfully! It will expire in ${EXPIRY_DAYS} days.`);
    } else {
        errorEl.innerText = "Incorrect Admin PIN!";
        errorEl.style.display = "block";
    }
}

function lockApp() {
    localStorage.removeItem("isUnlocked");
    checkLockState();
}

function showAdminView() {
    document.getElementById("teacherLoginView").style.display = "none";
    document.getElementById("adminLoginView").style.display = "flex";
    document.getElementById("adminError").style.display = "none";
    document.getElementById("adminCode").value = "";
    document.getElementById("newLocalCode").value = "";
}

function showTeacherView() {
    document.getElementById("adminLoginView").style.display = "none";
    document.getElementById("teacherLoginView").style.display = "flex";
    document.getElementById("lockError").style.display = "none";
    document.getElementById("accessCode").value = "";
}

checkLockState();

/* ANTI-INSPECT SECURITY MEASURES */
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', event => {
    // Block F12
    if (event.key === 'F12') {
        event.preventDefault();
    }
    // Block Ctrl+Shift+I, J, C and Ctrl+U (Inspect, Console, Source Code)
    if (event.ctrlKey && event.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(event.key)) {
        event.preventDefault();
    }
    if (event.ctrlKey && ['U', 'u'].includes(event.key)) {
        event.preventDefault();
    }
});