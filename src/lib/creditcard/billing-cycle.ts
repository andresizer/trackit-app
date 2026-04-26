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

export function getInvoicePeriod(
  closingDay: number,
  dueDay: number,
  referenceDate: Date = new Date()
): InvoicePeriod {
  // Clamp closingDay to last day of month
  const refMonth = startOfMonth(referenceDate);
  const lastDayOfRefMonth = endOfMonth(refMonth);
  const clampedClosingDay = Math.min(closingDay, lastDayOfRefMonth.getDate());

  // Determine periodEnd: if referenceDate's day > closingDay, periodEnd is this month's closingDay
  // Otherwise, periodEnd is last month's closingDay
  const thisMonthClosingDate = setDate(refMonth, clampedClosingDay);
  const periodEnd = isAfter(referenceDate, thisMonthClosingDate)
    ? thisMonthClosingDate
    : setDate(endOfMonth(subMonths(refMonth, 1)), Math.min(closingDay, endOfMonth(subMonths(refMonth, 1)).getDate()));

  // periodStart = closingDay+1 of previous month to periodEnd
  const previousMonthStart = subMonths(periodEnd, 1);
  const previousMonthClosing = setDate(
    endOfMonth(previousMonthStart),
    Math.min(closingDay, endOfMonth(previousMonthStart).getDate())
  );
  const periodStart = addDays(previousMonthClosing, 1);

  // dueDate = dueDay of the month following periodEnd
  const dueMonth = addMonths(periodEnd, 1);
  const clampedDueDay = Math.min(dueDay, endOfMonth(dueMonth).getDate());
  const dueDate = setDate(dueMonth, clampedDueDay);

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
