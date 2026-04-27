export interface InvoicePeriod {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function getInvoicePeriod(
  closingDay: number,
  dueDay: number,
  referenceDate: Date = new Date()
): InvoicePeriod {
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth(); // 0-indexed
  const refDay = referenceDate.getUTCDate();

  const clampedClosing = Math.min(closingDay, daysInMonth(refYear, refMonth));

  // Se refDay <= closingDay: período fecha ESTE mês
  // Se refDay > closingDay: período fecha NO MÊS QUE VEM
  let endYear: number, endMonth: number, endDay: number;
  if (refDay <= clampedClosing) {
    endYear = refYear;
    endMonth = refMonth;
    endDay = clampedClosing;
  } else {
    const nextRawMonth = refMonth + 1;
    endMonth = nextRawMonth > 11 ? 0 : nextRawMonth;
    endYear = nextRawMonth > 11 ? refYear + 1 : refYear;
    endDay = Math.min(closingDay, daysInMonth(endYear, endMonth));
  }
  const periodEnd = utc(endYear, endMonth, endDay);

  // Fechamento anterior: mesmo closingDay, mês anterior ao periodEnd
  const prevRawMonth = endMonth - 1;
  const prevMonth = prevRawMonth < 0 ? 11 : prevRawMonth;
  const prevYear = prevRawMonth < 0 ? endYear - 1 : endYear;
  const prevClosingDay = Math.min(closingDay, daysInMonth(prevYear, prevMonth));
  const prevClosing = utc(prevYear, prevMonth, prevClosingDay);

  // periodStart = dia seguinte ao fechamento anterior
  const periodStart = new Date(prevClosing.getTime() + 86_400_000);

  // dueDate = dueDay do mês seguinte ao periodEnd
  const dueRawMonth = endMonth + 1;
  const dueMonth = dueRawMonth > 11 ? 0 : dueRawMonth;
  const dueYear = dueRawMonth > 11 ? endYear + 1 : endYear;
  const dueDate = utc(dueYear, dueMonth, Math.min(dueDay, daysInMonth(dueYear, dueMonth)));

  return { periodStart, periodEnd, dueDate };
}

export function getAllInvoicePeriods(
  closingDay: number,
  dueDay: number,
  firstDate: Date,
  today: Date = new Date()
): InvoicePeriod[] {
  const periods: InvoicePeriod[] = [];
  let refYear = firstDate.getUTCFullYear();
  let refMonth = firstDate.getUTCMonth();

  while (true) {
    const refDate = utc(refYear, refMonth, 1);
    if (refDate > today) break;
    const period = getInvoicePeriod(closingDay, dueDay, refDate);
    periods.push(period);
    refMonth++;
    if (refMonth > 11) { refMonth = 0; refYear++; }
  }

  return periods;
}

export function getInvoicePeriodForDate(
  closingDay: number,
  transactionDate: Date
): Date {
  const period = getInvoicePeriod(closingDay, 1, transactionDate);
  return period.periodEnd;
}
