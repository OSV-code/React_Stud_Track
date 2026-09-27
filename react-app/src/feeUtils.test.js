import { describe, it, expect } from 'vitest'
import { calculateRemaining, calculateTotalPaid, calculateFeeStatus, getFeeReminder, FEE_STATUS } from './feeUtils'

describe('calculateRemaining', () => {
  it('subtracts total paid from total fee', () => {
    expect(calculateRemaining(20000, 5000)).toBe(15000)
  })

  it('handles multiple payments summed beforehand', () => {
    const totalPaid = calculateTotalPaid([{ amount: 5000 }, { amount: 5000 }])
    expect(totalPaid).toBe(10000)
    expect(calculateRemaining(20000, totalPaid)).toBe(10000)
  })

  it('never goes below zero', () => {
    expect(calculateRemaining(20000, 25000)).toBe(0)
  })
})

describe('calculateFeeStatus', () => {
  it('is PAID when fully paid', () => {
    const status = calculateFeeStatus({ totalFee: 20000, totalPaid: 20000, nextDueDate: '2026-10-10' })
    expect(status).toBe(FEE_STATUS.PAID)
  })

  it('is PENDING when nothing paid yet and not overdue', () => {
    const status = calculateFeeStatus({
      totalFee: 20000,
      totalPaid: 0,
      nextDueDate: '2026-10-10',
      today: new Date('2026-09-27')
    })
    expect(status).toBe(FEE_STATUS.PENDING)
  })

  it('is PARTIALLY_PAID when some payment made but balance remains', () => {
    const status = calculateFeeStatus({
      totalFee: 20000,
      totalPaid: 5000,
      nextDueDate: '2026-10-10',
      today: new Date('2026-09-27')
    })
    expect(status).toBe(FEE_STATUS.PARTIALLY_PAID)
  })

  it('is OVERDUE when due date passed and balance remains', () => {
    const status = calculateFeeStatus({
      totalFee: 20000,
      totalPaid: 5000,
      nextDueDate: '2026-10-10',
      today: new Date('2026-10-11')
    })
    expect(status).toBe(FEE_STATUS.OVERDUE)
  })
})

describe('getFeeReminder', () => {
  it('flags upcoming reminder within 10 days', () => {
    const reminder = getFeeReminder({
      studentName: 'Amit Sharma',
      nextInstallmentAmount: 5000,
      nextDueDate: '2026-10-10',
      remaining: 15000,
      today: new Date('2026-10-02')
    })
    expect(reminder.level).toBe('upcoming')
  })

  it('flags due today', () => {
    const reminder = getFeeReminder({
      studentName: 'Amit Sharma',
      nextInstallmentAmount: 5000,
      nextDueDate: '2026-10-10',
      remaining: 15000,
      today: new Date('2026-10-10')
    })
    expect(reminder.level).toBe('due_today')
  })

  it('flags overdue when due date passed and unpaid', () => {
    const reminder = getFeeReminder({
      studentName: 'Sneha Joshi',
      nextInstallmentAmount: 5000,
      nextDueDate: '2026-09-25',
      remaining: 10000,
      today: new Date('2026-09-27')
    })
    expect(reminder.level).toBe('overdue')
  })

  it('returns null when nothing is remaining', () => {
    const reminder = getFeeReminder({
      studentName: 'Rahul Patil',
      nextInstallmentAmount: 5000,
      nextDueDate: '2026-10-10',
      remaining: 0,
      today: new Date('2026-10-10')
    })
    expect(reminder).toBeNull()
  })
})
