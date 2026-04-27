import {
  startOfMonth,
  endOfMonth,
  setDate,
  addMonths,
  subMonths,
  addDays,
  isAfter,
} from 'date-fns';

export interface InvoicePeriod {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function getInvoicePeriod(
  closingDay: number,
  dueDay: number,
  referenceDate: Date = new Date()
): InvoicePeriod {
  // Normalize referenceDate to UTC midnight for consistent comparison
  const refDate = toUtcMidnight(referenceDate);
  const refMonth = startOfMonth(refDate);
  const lastDayOfRefMonth = endOfMonth(refMonth);
  const clampedClosingDay = Math.min(closingDay, lastDayOfRefMonth.getDate());

  // Determine periodEnd:
  // If referenceDate is BEFORE or ON thisMonthClosingDate → this month's closing
  // If referenceDate is AFTER thisMonthClosingDate → next month's closing (period already closed)
  const thisMonthClosingDate = setDate(refMonth, clampedClosingDay);
  const periodEnd = isAfter(refDate, thisMonthClosingDate)
    ? toUtcMidnight(setDate(startOfMonth(addMonths(refMonth, 1)), clampedClosingDay))
    : toUtcMidnight(thisMonthClosingDate);

  // periodStart = closingDay+1 of previous month to periodEnd
  const previousMonthStart = subMonths(periodEnd, 1);
  const previousMonthClosing = setDate(
    endOfMonth(previousMonthStart),
    Math.min(closingDay, endOfMonth(previousMonthStart).getDate())
  );
  const periodStart = toUtcMidnight(addDays(previousMonthClosing, 1));

  // dueDate = dueDay of the month following periodEnd
  const dueMonth = addMonths(periodEnd, 1);
  const clampedDueDay = Math.min(dueDay, endOfMonth(dueMonth).getDate());
  const dueDate = toUtcMidnight(setDate(dueMonth, clampedDueDay));

  return { periodStart, periodEnd, dueDate };
}

export function getAllInvoicePeriods(
  closingDay: number,
  dueDay: number,
  firstDate: Date,
  today: Date = new Date()
): InvoicePeriod[] {
  const periods: InvoicePeriod[] = [];
  let currentRef = new Date(firstDate);

  while (!isAfter(currentRef, today)) {
    const period = getInvoicePeriod(closingDay, dueDay, currentRef);
    periods.push(period);
    currentRef = addMonths(currentRef, 1);
  }

  return periods;
}

export function getInvoicePeriodForDate(
  closingDay: number,
  transactionDate: Date
): Date {
  // Return the periodEnd date for the invoice that contains transactionDate
  const currentPeriod = getInvoicePeriod(closingDay, 15, transactionDate); // dueDay doesn't affect periodEnd
  return currentPeriod.periodEnd;
}
