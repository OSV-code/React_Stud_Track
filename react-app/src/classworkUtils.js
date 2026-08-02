import jsPDF from 'jspdf'
import { openWhatsAppShare } from './whatsappUtils'

function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => reject(new Error('Unable to load classwork photo'))
    img.src = url
  })
}

export async function downloadClassworkPdf(entry, photoUrl) {
  const doc = new jsPDF('p', 'mm', 'a4')

  doc.setFontSize(16)
  doc.text('Classwork Assignment', 14, 15)

  doc.setFontSize(11)
  let y = 30
  doc.text(`Subject: ${entry.subject || 'No Subject'}`, 14, y)
  y += 7
  doc.text(`Date: ${entry.classwork_date}`, 14, y)
  y += 7
  doc.text(`Class: ${entry.className}`, 14, y)
  y += 10

  if (entry.notes) {
    doc.setFontSize(10)
    doc.text('Notes/Instructions:', 14, y)
    y += 6
    const noteLines = doc.splitTextToSize(entry.notes, 180)
    doc.text(noteLines, 14, y)
    y += noteLines.length * 5 + 10
  }

  if (photoUrl) {
    try {
      const { dataUrl, width, height } = await loadImageAsDataUrl(photoUrl)
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      const maxWidth = pageWidth - margin * 2
      const remainingHeight = pageHeight - y - margin
      const maxHeight = Math.min(180, remainingHeight > 0 ? remainingHeight : 180)

      const ratio = width / height
      let imageWidth = maxWidth
      let imageHeight = imageWidth / ratio
      if (imageHeight > maxHeight) {
        imageHeight = maxHeight
        imageWidth = imageHeight * ratio
      }

      let imageY = y
      if (imageHeight > remainingHeight) {
        doc.addPage()
        imageY = margin
      }
      const imageX = margin + (maxWidth - imageWidth) / 2
      doc.addImage(dataUrl, 'JPEG', imageX, imageY, imageWidth, imageHeight)
    } catch (err) {
      doc.setFontSize(10)
      doc.text('Unable to load classwork photo.', 14, y)
    }
  }

  doc.save(`Classwork_${entry.className}_${entry.classwork_date}.pdf`)
}

export function shareClassworkOnWhatsApp(entry) {
  const message =
    `📚 *Classwork Assignment*\n\n` +
    `Subject: ${entry.subject || 'No Subject'}\n` +
    `Date: ${entry.classwork_date}\n` +
    `Class: ${entry.className}\n\n` +
    (entry.notes ? `📝 Notes: ${entry.notes}\n\n` : '') +
    `Please see the attached classwork PDF.\n\n` +
    `- Teacher`

  openWhatsAppShare(message)
}
