const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

// wa.me is WhatsApp's universal link: on mobile it opens the installed app directly,
// while web.whatsapp.com always loads WhatsApp Web even inside a mobile browser.
export function openWhatsAppShare(message) {
  const encodedMessage = encodeURIComponent(message)
  const url = isMobileDevice()
    ? `https://wa.me/?text=${encodedMessage}`
    : `https://web.whatsapp.com/send?text=${encodedMessage}`

  window.open(url, '_blank', 'noopener,noreferrer')
}
