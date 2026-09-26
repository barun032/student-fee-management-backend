export const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const addMonths = (ym, delta) => {
  if (!ym) return ym;
  const [y, m] = ym.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return ym;
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12 + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
};

export const getMonthsBetween = (startMonth, endMonth) => {
  if (!startMonth || !endMonth) return [];
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  if ([sy, sm, ey, em].some(Number.isNaN)) return [];
  const out = [];
  let y = sy, m = sm, guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard < 400) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
    guard++;
  }
  return out;
};

export const getBillingMonths = (student) => {
  if (!student?.startMonth) return [];
  const lastDue = addMonths(currentMonth(), -1);
  return getMonthsBetween(student.startMonth, lastDue);
};

export const getStudentPaid = (studentId, payments) =>
  payments
    .filter((p) => p.studentId === studentId)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

const getStatus = (totalDue, paid) => {
  if (totalDue <= 0) return 'New';
  if (paid >= totalDue) return 'Paid';
  if (paid > 0) return 'Partially Paid';
  return 'Pending';
};

export const getMonthStatuses = (student, payments) => {
  const billingMonths = getBillingMonths(student);
  if (billingMonths.length === 0) return [];

  const monthlyFee = Number(student.monthlyFee || 0);
  const studentPayments = payments.filter((p) => p.studentId === student.id);

  const paidByMonth = {};
  for (const p of studentPayments) {
    if (p.forMonth) {
      paidByMonth[p.forMonth] = (paidByMonth[p.forMonth] || 0) + Number(p.amount || 0);
    }
  }

  const statuses = billingMonths.map((month) => ({
    month,
    paid: paidByMonth[month] || 0,
    dueDate: `${addMonths(month, 1)}-01`
  }));

  if (monthlyFee <= 0) {
    return statuses.map((s) => ({ ...s, status: 'unpaid' }));
  }

  const totalPaid = studentPayments.reduce((a, p) => a + Number(p.amount || 0), 0);
  const directlyAllocated = statuses.reduce(
    (a, s) => a + Math.min(s.paid, monthlyFee),
    0
  );
  let unassigned = Math.max(0, totalPaid - directlyAllocated);

  for (const s of statuses) {
    if (unassigned <= 0) break;
    const needed = monthlyFee - Math.min(s.paid, monthlyFee);
    if (needed > 0) {
      const alloc = Math.min(needed, unassigned);
      s.paid += alloc;
      unassigned -= alloc;
    }
  }

  return statuses.map((s) => {
    let status = 'unpaid';
    if (s.paid >= monthlyFee) status = 'paid';
    else if (s.paid > 0) status = 'partial';
    return { month: s.month, paid: s.paid, status, dueDate: s.dueDate };
  });
};

export const enrichStudent = (student, payments) => {
  const billingMonths = getBillingMonths(student);
  const monthsDue = billingMonths.length;
  const monthlyFee = Number(student.monthlyFee || 0);
  const totalDue = monthlyFee * monthsDue;
  const paid = getStudentPaid(student.id, payments);
  const remaining = totalDue - paid;
  const status = getStatus(totalDue, paid);
  const progress = totalDue > 0
    ? Math.min(100, Math.round((paid / totalDue) * 100))
    : (paid > 0 ? 100 : 0);

  const monthStatuses = getMonthStatuses(student, payments);
  const monthsPaid = monthStatuses.filter((m) => m.status === 'paid').length;
  const monthsPending = Math.max(0, monthsDue - monthsPaid);
  const overpaid = Math.max(0, paid - totalDue);

  return {
    ...student,
    monthsDue,
    monthsDueList: billingMonths,
    monthStatuses,
    monthsPaid,
    monthsPending,
    monthlyFee,
    totalDue,
    totalFees: totalDue,
    paid,
    remaining,
    overpaid,
    status,
    progress
  };
};

export const enrichStudents = (students, payments) =>
  students.map((s) => enrichStudent(s, payments));

export const computeStats = (enriched) => {
  const totalStudents = enriched.length;
  const class11 = enriched.filter((s) => s.cls === 'Class 11').length;
  const class12 = enriched.filter((s) => s.cls === 'Class 12').length;
  const totalFees = enriched.reduce((s, x) => s + Number(x.totalDue || 0), 0);
  const collected = enriched.reduce((s, x) => s + x.paid, 0);
  const pending = Math.max(0, totalFees - collected);
  const paidCount = enriched.filter((s) => s.status === 'Paid').length;
  const partialCount = enriched.filter((s) => s.status === 'Partially Paid').length;
  const pendingCount = enriched.filter((s) => s.status === 'Pending').length;
  const newCount = enriched.filter((s) => s.status === 'New').length;
  const collectionRate = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;
  const monthlyRecurring = enriched.reduce((s, x) => s + Number(x.monthlyFee || 0), 0);
  const totalMonthsDue = enriched.reduce((s, x) => s + (x.monthsDue || 0), 0);
  const totalMonthsPending = enriched.reduce((s, x) => s + (x.monthsPending || 0), 0);

  return {
    totalStudents, class11, class12,
    totalFees, collected, pending,
    paidCount, partialCount, pendingCount, newCount,
    collectionRate,
    monthlyRecurring,
    totalMonthsDue,
    totalMonthsPending
  };
};