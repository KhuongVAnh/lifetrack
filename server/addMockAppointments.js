const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Find a doctor and a patient
  const doctor = await prisma.user.findFirst({ where: { role: 'BAC_SI' } });
  const patient = await prisma.user.findFirst({ where: { role: 'BENH_NHAN' } });

  if (!doctor || !patient) {
    console.log('Ensure you have a doctor and a patient in DB.');
    return;
  }

  // Current month (April 2026)
  // Let's create appointments around [Mon-Fri] or specifically randomly
  // Let's just create some specific ones
  
  const mockAppointments = [
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-04-20T00:00:00Z'),
      start_time: new Date('2026-04-20T08:00:00Z'),
      end_time: new Date('2026-04-20T08:30:00Z'),
      status: 'APPROVED',
      type: 'ONLINE',
      reason: 'Khám định kỳ huyết áp hằng tháng.',
      meeting_url: 'https://meet.google.com/abc-xyz-123'
    },
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-04-24T00:00:00Z'), // Today
      start_time: new Date('2026-04-24T09:00:00Z'),
      end_time: new Date('2026-04-24T10:00:00Z'),
      status: 'APPROVED',
      type: 'OFFLINE',
      reason: 'Tư vấn trực tiếp kết quả Holter ECG.',
    },
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-04-24T00:00:00Z'), // Today
      start_time: new Date('2026-04-24T14:30:00Z'),
      end_time: new Date('2026-04-24T15:00:00Z'),
      status: 'PENDING',
      type: 'ONLINE',
      reason: 'Đau tức ngực nhẹ, cần tư vấn.',
    },
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-04-25T00:00:00Z'),
      start_time: new Date('2026-04-25T10:00:00Z'),
      end_time: new Date('2026-04-25T11:00:00Z'),
      status: 'PENDING',
      type: 'OFFLINE',
      reason: 'Đăng ký tái khám siêu âm tim.',
    },
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-05-02T00:00:00Z'),
      start_time: new Date('2026-05-02T13:30:00Z'),
      end_time: new Date('2026-05-02T14:00:00Z'),
      status: 'APPROVED',
      type: 'ONLINE',
      reason: 'Theo dõi chỉ số sau đợt điều trị.',
      meeting_url: 'https://meet.google.com/xyz-abc-456'
    },
    {
      patient_id: patient.user_id,
      doctor_id: doctor.user_id,
      appointment_date: new Date('2026-05-05T00:00:00Z'),
      start_time: new Date('2026-05-05T08:00:00Z'),
      end_time: new Date('2026-05-05T09:00:00Z'),
      status: 'PENDING',
      type: 'OFFLINE',
      reason: 'Cần kiểm tra điện tâm đồ chuyên sâu.',
    }
  ];

  console.log('Seeding fake appointments...');
  
  for (const appointment of mockAppointments) {
    await prisma.appointment.create({
      data: appointment
    });
  }
  
  console.log('Successfully seeded appointments!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
