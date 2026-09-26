import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Student } from '../src/models/Student.js';
import { Payment } from '../src/models/Payment.js';
import { Admin } from '../src/models/Admin.js';
import { Settings } from '../src/models/Settings.js';

const PEOPLE = [
  ['Aarav Sharma', 'Male'], ['Ananya Malhotra', 'Female'], ['Vivaan Patel', 'Male'],
  ['Diya Kapoor', 'Female'], ['Aditya Verma', 'Male'], ['Aadhya Bansal', 'Female'],
  ['Vihaan Kumar', 'Male'], ['Saanvi Agarwal', 'Female'], ['Arjun Singh', 'Male'],
  ['Pari Sharma', 'Female'], ['Sai Reddy', 'Male'], ['Anika Patel', 'Female'],
  ['Reyansh Gupta', 'Male'], ['Navya Verma', 'Female'], ['Ayaan Nair', 'Male'],
  ['Myra Kumar', 'Female'], ['Krishna Iyer', 'Male'], ['Sara Singh', 'Female'],
  ['Ishaan Joshi', 'Male'], ['Riya Reddy', 'Female'], ['Rohan Mehta', 'Male'],
  ['Priya Gupta', 'Female'], ['Kabir Shah', 'Male'], ['Neha Nair', 'Female'],
  ['Yash Rao', 'Male'], ['Pooja Iyer', 'Female'], ['Dev Das', 'Male'],
  ['Sneha Joshi', 'Female'], ['Harsh Bose', 'Male'], ['Kavya Mehta', 'Female'],
  ['Nikhil Chopra', 'Male'], ['Meera Shah', 'Female'], ['Tanvi Rao', 'Female'],
  ['Isha Das', 'Female'], ['Nisha Bose', 'Female'], ['Aditi Chopra', 'Female']
];

const METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Other'];
const STREETS = ['MG Road', 'Nehru Nagar', 'Gandhi Street', 'Park Avenue', 'Green Park', 'Sector 12'];
const CITIES = ['Pune', 'Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Chennai', 'Kolkata'];
const GUARDIAN_FIRST = ['Rajesh', 'Suresh', 'Mahesh', 'Anil', 'Sunil', 'Vijay', 'Ramesh'];

const pad = (n) => String(n).padStart(3, '0');
const addMonths = (ym, d) => {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const dateIn = (ym, day) => new Date(`${ym}-${String(day).padStart(2, '0')}T00:00:00.000Z`);

async function main() {
  console.log('🌱 Seeding…');
  await connectMongo();

  await Promise.all([
    Student.deleteMany({}),
    Payment.deleteMany({}),
    Admin.deleteMany({}),
    Settings.deleteMany({})
  ]);

  await Admin.create({
    name: 'Narugopal Adhikary',
    email: 'narugopaladhikary2@gmail.com',
    password: await bcrypt.hash('Admin@1234', 10),
    phone: '9876543210',
    role: 'ADMIN'
  });

  await Settings.create({
    _id: 'singleton',
    instituteName: 'Nexora Computer Academy',
    academicSession: '2026-2027',
    class11MonthlyFee: 4000,
    class12MonthlyFee: 5000
  });

  const now = new Date();
  const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let paySeq = 1;

  for (let i = 0; i < PEOPLE.length; i++) {
    const [name, gender] = PEOPLE[i];
    const isC11 = i < 18;
    const cls = isC11 ? 'Class 11' : 'Class 12';
    const monthlyFee = isC11 ? 4000 : 5000;
    const id = `STU${pad(i + 1)}`;
    const lastName = name.split(' ')[1];

    const monthsEnrolled = 2 + (i % 6);
    const startMonth = addMonths(nowMonth, -monthsEnrolled);

    await Student.create({
      _id: id,
      name, gender, cls, monthlyFee, startMonth,
      mobile: `9${String(100000000 + i * 12345).slice(-9)}`,
      address: `${10 + i}, ${STREETS[i % STREETS.length]}, ${CITIES[i % CITIES.length]}`,
      guardianName: `${GUARDIAN_FIRST[i % GUARDIAN_FIRST.length]} ${lastName}`,
      guardianMobile: `8${String(100000000 + i * 54321).slice(-9)}`,
      admissionDate: dateIn(startMonth, 5 + (i % 15)),
      notes: i % 7 === 0 ? 'Scholarship applicant — verified documents.' : null
    });

    const scenario = i % 5;
    let fullyPaid = 0, partialIdx = -1, partialAmount = 0;

    if (scenario === 0) fullyPaid = monthsEnrolled;
    else if (scenario === 1 && monthsEnrolled >= 2) {
      fullyPaid = monthsEnrolled - 1;
      partialIdx = fullyPaid;
      partialAmount = Math.round(monthlyFee * 0.5 / 100) * 100;
    } else if (scenario === 2) fullyPaid = Math.max(1, Math.floor(monthsEnrolled / 2));
    else if (scenario === 3) fullyPaid = Math.min(monthsEnrolled, 1);

    for (let k = 0; k < fullyPaid; k++) {
      const targetMonth = addMonths(startMonth, k);
      await Payment.create({
        _id: `PAY${pad(paySeq++)}`,
        studentId: id,
        amount: monthlyFee,
        paymentDate: dateIn(targetMonth, 5 + (k * 3) % 20),
        forMonth: targetMonth,
        method: METHODS[(i + k) % METHODS.length],
        notes: `Monthly fee – ${targetMonth}`
      });
    }

    if (partialIdx >= 0 && partialAmount > 0) {
      const targetMonth = addMonths(startMonth, partialIdx);
      await Payment.create({
        _id: `PAY${pad(paySeq++)}`,
        studentId: id,
        amount: partialAmount,
        paymentDate: dateIn(targetMonth, 15),
        forMonth: targetMonth,
        method: METHODS[(i + 1) % METHODS.length],
        notes: `Partial payment – ${targetMonth}`
      });
    }
  }

  console.log(`   ✓ Admin: admin@edufee.local / Admin@1234`);
  console.log(`   ✓ ${await Student.countDocuments()} students`);
  console.log(`   ✓ ${await Payment.countDocuments()} payments`);
  console.log('✅ Seed complete');

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });