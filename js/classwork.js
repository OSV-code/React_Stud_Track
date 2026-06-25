async function saveClasswork(){
    const photoInput = document.getElementById("classworkPhoto");
    const dateInput = document.getElementById("classworkDate");
    const classInput = document.getElementById("classworkClassFilter");
    const subjectInput = document.getElementById("classworkSubject");
    const notesInput = document.getElementById("classworkNotes");

    if(!photoInput.files.length) {
        alert("Please select a photo");
        return;
    }

    if(!dateInput.value) {
        alert("Please select a date");
        return;
    }

    if(!classInput.value) {
        alert("Please select a class");
        return;
    }

    // Read image file as base64
    const file = photoInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        const photoData = e.target.result;

        const classwork = {
            date: new Date(dateInput.value + 'T00:00:00').toLocaleDateString(),
            className: classInput.value,
            subject: subjectInput.value || "No Subject",
            photoData: photoData,
            notes: notesInput.value,
            createdAt: new Date().toISOString()
        };

        await db.classwork.add(classwork);

        alert("Classwork Saved Successfully!");

        // Clear form
        photoInput.value = "";
        dateInput.value = "";
        subjectInput.value = "";
        notesInput.value = "";

        // Reload gallery
        loadClassworkEntries();
    };

    reader.readAsDataURL(file);
}

async function loadClassworkEntries(){
    const classFilter = document.getElementById("classworkClassFilter")?.value || "";
    const entries = await db.classwork.toArray();

    let filteredEntries = entries;
    if(classFilter && classFilter !== "all") {
        filteredEntries = entries.filter(c => c.className === classFilter);
    }

    // Sort by date descending (newest first)
    filteredEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderClassworkGallery(filteredEntries);
}

function renderClassworkGallery(entries){
    const gallery = document.getElementById("classworkGallery");
    gallery.innerHTML = "";

    if(entries.length === 0) {
        gallery.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #aaa;'>No classwork entries yet</p>";
        return;
    }

    entries.forEach(classwork => {
        const card = document.createElement("div");
        card.style.cssText = "border: 1px solid #444; border-radius: 8px; padding: 10px; background: #1a1a1a; position: relative;";

        card.innerHTML = `
            <img src="${classwork.photoData}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
            <h4 style="margin: 8px 0; font-size: 14px;">${classwork.subject}</h4>
            <p style="font-size: 12px; color: #aaa; margin: 5px 0;">
                📅 ${classwork.date} | 📚 Class: ${classwork.className}
            </p>
            ${classwork.notes ? `<p style="font-size: 12px; color: #bbb; margin: 5px 0; font-style: italic;">"${classwork.notes}"</p>` : ''}
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="generateClassworkPDF(${classwork.id})" style="flex: 1; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    📥 Download PDF
                </button>
                <button onclick="shareClassworkOnWhatsApp(${classwork.id})" style="flex: 1; padding: 8px; background: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    💬 Share on WhatsApp
                </button>
                <button onclick="deleteClasswork(${classwork.id})" style="flex: 1; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    🗑️ Delete
                </button>
            </div>
        `;

        gallery.appendChild(card);
    });
}

async function generateClassworkPDF(classworkId){
    const classwork = await db.classwork.get(classworkId);
    if(!classwork) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    // Title
    doc.setFontSize(16);
    doc.text("Classwork Assignment", 14, 15);

    // Details
    doc.setFontSize(11);
    let y = 30;

    doc.text(`Subject: ${classwork.subject}`, 14, y);
    y += 7;

    doc.text(`Date: ${classwork.date}`, 14, y);
    y += 7;

    doc.text(`Class: ${classwork.className}`, 14, y);
    y += 10;

    if(classwork.notes) {
        doc.setFontSize(10);
        doc.text("Notes/Instructions:", 14, y);
        y += 6;
        const noteLines = doc.splitTextToSize(classwork.notes, 180);
        doc.text(noteLines, 14, y);
        y += noteLines.length * 5 + 10;
    }

    // Add image
    doc.setFontSize(10);
    doc.text("Classwork Photo:", 14, y);
    y += 8;

    try {
        const img = new Image();
        img.onload = function() {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            const maxWidth = pageWidth - margin * 2;
            const remainingHeight = pageHeight - y - margin;
            const maxHeight = Math.min(180, remainingHeight);

            const ratio = img.width / img.height;
            let imageWidth = maxWidth;
            let imageHeight = imageWidth / ratio;

            if (imageHeight > maxHeight) {
                imageHeight = maxHeight;
                imageWidth = imageHeight * ratio;
            }

            let imageX = margin + (maxWidth - imageWidth) / 2;
            let imageY = y;

            if (imageHeight > remainingHeight) {
                doc.addPage();
                imageY = margin;
            }

            const imageType = classwork.photoData.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(classwork.photoData, imageType, imageX, imageY, imageWidth, imageHeight);
            doc.save(`Classwork_${classwork.className}_${classwork.date.replace(/\//g, '-')}.pdf`);
        };
        img.src = classwork.photoData;
    } catch(e) {
        doc.text("Unable to load image", 14, y);
        doc.save(`Classwork_${classwork.className}_${classwork.date.replace(/\//g, '-')}.pdf`);
    }
}

async function shareClassworkOnWhatsApp(classworkId){
    const classwork = await db.classwork.get(classworkId);
    if(!classwork) return;

    // First, trigger PDF download
    generateClassworkPDF(classworkId);

    // Prepare WhatsApp message
    const message = `📚 *Classwork Assignment*\n\n` +
        `Subject: ${classwork.subject}\n` +
        `Date: ${classwork.date}\n` +
        `Class: ${classwork.className}\n\n` +
        (classwork.notes ? `📝 Notes: ${classwork.notes}\n\n` : '') +
        `Please see the attached classwork pdf.\n\n` +
        `- Teacher`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp
    // For WhatsApp Web - opens default chat interface
    // User will need to search and select the parent manually
    window.open(`https://web.whatsapp.com/send?text=${encodedMessage}`, '_blank');

    alert("PDF has been generated. WhatsApp will open - please search and select the parent to share with.");
}

async function deleteClasswork(classworkId){
    if(confirm("Are you sure you want to delete this classwork?")) {
        await db.classwork.delete(classworkId);
        alert("Classwork deleted");
        loadClassworkEntries();
    }
}

async function filterClassworkByClass(){
    loadClassworkEntries();
}

// Initialize - Load classwork entries when page loads
async function initializeClasswork(){
    const students = await db.students.toArray();
    const classSet = new Set(students.map(s => s.className));
    const classes = Array.from(classSet).sort();

    const classFilter = document.getElementById("classworkClassFilter");
    if(classFilter) {
        classFilter.innerHTML = '<option value="" disabled selected>Select Class First</option><option value="all">All Classes</option>';
        classes.forEach(c => {
            classFilter.innerHTML += `<option value="${c}">Class: ${c}</option>`;
        });
    }

    loadClassworkEntries();
}

// Call on page load
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClasswork);
} else {
    initializeClasswork();
}

