async function loadAlerts(){

    const allAlerts = await db.alerts.toArray();
    
    // Always keep Dashboard top count updated
    const alertCountEl = document.getElementById("alertCount");
    if (alertCountEl) alertCountEl.innerText = allAlerts.length;

    // Only show specific student's alerts in the Alerts section
    const selectEl = document.getElementById("alertsStudent");
    const list = document.getElementById("alertsList");
    if (!list) return;

    list.innerHTML="";

    if (!selectEl || !selectEl.value) return; // Wait until a student is selected
    
    const studentId = Number(selectEl.value);
    const alerts = await db.alerts.where("studentId").equals(studentId).toArray();

    alerts.reverse().forEach(alert=>{

        list.innerHTML += `

        <div class="alert-item">

            <b>${alert.type}</b><br>

            ${alert.message}<br>

            <small>${alert.createdAt}</small>

        </div>
        `;
    });
}