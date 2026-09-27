// Pure calculation/status/reminder logic for the Student Fee Tracking module (V1).
// Kept framework-free and side-effect-free so it can be unit tested directly.

export const FEE_STATUS = {
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PENDING: 'PENDING',
  OVERDUE: 'OVERDUE'
}

export const FEE_STATUS_LABELS = {
  [FEE_STATUS.PAID]: 'Paid',
  [FEE_STATUS.PARTIALLY_PAID]: 'Partially Paid',
  [FEE_STATUS.PENDING]: 'Pending',
  [FEE_STATUS.OVERDUE]: 'Overdue'
}

// Reminder thresholds (days before due date). Kept as named constants so they
// can be tuned in one place instead of being hardcoded throughout the app.
export const UPCOMING_REMINDER_DAYS = 10
export const NEAR_DUE_REMINDER_DAYS = 5

export function calculateTotalPaid(payments) {
  return (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

export function calculateRemaining(totalFee, totalPaid) {
  const remaining = Number(totalFee || 0) - Number(totalPaid || 0)
  return remaining > 0 ? remaining : 0
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysUntil(dueDate, today = new Date()) {
  if (!dueDate) return null
  const due = startOfDay(dueDate)
  const from = startOfDay(today)
  if (Number.isNaN(due.getTime())) return null
  return Math.round((due.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
}

// Determines the fee status for a student given their total fee, total paid so
// far, and the configured next due date. Logic is intentionally simple and
// kept in one place so it can be enhanced later (e.g. per-installment tracking).
export function calculateFeeStatus({ totalFee, totalPaid, nextDueDate, today = new Date() }) {
  const remaining = calculateRemaining(totalFee, totalPaid)

  if (remaining <= 0 && Number(totalFee || 0) > 0) return FEE_STATUS.PAID

  const overdue = nextDueDate && daysUntil(nextDueDate, today) < 0
  if (overdue && remaining > 0) return FEE_STATUS.OVERDUE

  if (Number(totalPaid || 0) > 0 && remaining > 0) return FEE_STATUS.PARTIALLY_PAID

  return FEE_STATUS.PENDING
}

// Returns a reminder descriptor ({ level, message }) for a student's next
// installment, or null if no reminder should be shown right now.
export function getFeeReminder({ studentName, nextInstallmentAmount, nextDueDate, remaining, today = new Date() }) {
  if (!nextDueDate || !(Number(remaining) > 0) || !(Number(nextInstallmentAmount) > 0)) return null

  const diff = daysUntil(nextDueDate, today)
  if (diff === null) return null

  const amountText = formatCurrency(nextInstallmentAmount)

  if (diff < 0) {
    return { level: 'overdue', message: `🔴 ${studentName}'s ${amountText} installment is overdue.` }
  }
  if (diff === 0) {
    return { level: 'due_today', message: `🔴 ${studentName}'s ${amountText} installment is due today.` }
  }
  if (diff <= NEAR_DUE_REMINDER_DAYS) {
    return { level: 'near_due', message: `🟠 ${studentName}'s ${amountText} installment is due in ${diff} days.` }
  }
  if (diff <= UPCOMING_REMINDER_DAYS) {
    return {
      level: 'upcoming',
      message: `🟠 ${studentName}'s ${amountText} fee installment is due on ${formatDate(nextDueDate)}.`
    }
  }
  return null
}

export function formatCurrency(amount) {
  const value = Number(amount || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
