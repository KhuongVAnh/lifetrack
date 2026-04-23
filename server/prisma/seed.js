const {
  PrismaClient,
  UserRole,
  DeviceStatus,
  AccessRole,
  AccessStatus,
  ChatRole,
  DoctorHireStatus,
  NotificationType,
} = require("@prisma/client")
const { hashPass } = require("../services/authService")

const prisma = new PrismaClient()

const toDate = (value) => new Date(value)

const buildConversationKey = (leftUserId, rightUserId) => {
  const left = Number(leftUserId)
  const right = Number(rightUserId)
  return left < right ? `${left}_${right}` : `${right}_${left}`
}

async function main() {
  // Xóa dữ liệu theo thứ tự an toàn để tránh lỗi khóa ngoại khi seed lại nhiều lần.
  await prisma.notificationRecipient.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.directMessage.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.reading.deleteMany()
  await prisma.device.deleteMany()
  await prisma.report.deleteMany()
  await prisma.chatLog.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.doctorTimeOff.deleteMany()
  await prisma.doctorAvailability.deleteMany()
  await prisma.doctorReview.deleteMany()
  await prisma.doctorHire.deleteMany()
  await prisma.doctorProfileExperience.deleteMany()
  await prisma.doctorProfileResearch.deleteMany()
  await prisma.doctorProfileEducation.deleteMany()
  await prisma.doctorProfile.deleteMany()
  await prisma.accessPermission.deleteMany()
  await prisma.medicationLog.deleteMany()
  await prisma.medication.deleteMany()
  await prisma.medicationPlan.deleteMany()
  await prisma.medicalVisit.deleteMany()
  await prisma.phrOverview.deleteMany()
  await prisma.user.deleteMany()

  const commonPasswordHash = await hashPass("123456")

  // ========== Tạo gia đình 4 thành viên ==========
  const primaryPatient = await prisma.user.create({
    data: {
      name: "Nguyễn Văn An",
      email: "patient@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BENH_NHAN,
      is_active: true,
      created_at: toDate("2025-11-10T08:00:00.000Z"),
    },
  })

  const spouse = await prisma.user.create({
    data: {
      name: "Nguyễn Thị Linh",
      email: "spouse@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BENH_NHAN,
      is_active: true,
      created_at: toDate("2025-11-15T10:30:00.000Z"),
    },
  })

  const child = await prisma.user.create({
    data: {
      name: "Nguyễn Minh Anh",
      email: "child@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BENH_NHAN,
      is_active: true,
      created_at: toDate("2025-12-01T09:00:00.000Z"),
    },
  })

  const familyMember = await prisma.user.create({
    data: {
      name: "Lê Thị Hạnh",
      email: "family@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.GIA_DINH,
      is_active: true,
      created_at: toDate("2025-11-12T03:15:00.000Z"),
    },
  })

  // ========== Tạo 2 bác sĩ cho gia đình ==========
  const doctor1 = await prisma.user.create({
    data: {
      name: "BS. Trần Thị Mai",
      email: "doctor1@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 350000,
      created_at: toDate("2025-10-22T02:30:00.000Z"),
    },
  })

  const doctor2 = await prisma.user.create({
    data: {
      name: "BS. Phạm Đình Hùng",
      email: "doctor2@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 400000,
      created_at: toDate("2025-10-15T08:00:00.000Z"),
    },
  })

  const doctor3 = await prisma.user.create({
    data: {
      name: "BS. Nguyễn Thùy Chi",
      email: "doctor3@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 300000,
      created_at: toDate("2025-10-05T07:30:00.000Z"),
    },
  })

  const doctor4 = await prisma.user.create({
    data: {
      name: "BS. Lê Minh Tâm",
      email: "doctor4@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 450000,
      created_at: toDate("2025-10-02T03:20:00.000Z"),
    },
  })

  const doctor5 = await prisma.user.create({
    data: {
      name: "BS. Phạm Minh Ngọc",
      email: "doctor5@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 380000,
      created_at: toDate("2025-09-28T09:10:00.000Z"),
    },
  })

  const doctor6 = await prisma.user.create({
    data: {
      name: "BS. Lâm Đức Huy",
      email: "doctor6@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      consultation_fee: 420000,
      created_at: toDate("2025-09-20T04:45:00.000Z"),
    },
  })

  // Hồ sơ bác sĩ 1: Tim mạch
  const doctor1Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor1.user_id,
      specialty: "Tim mạch",
      title: "BS.CKII Tim mạch - Theo dõi từ xa",
      hospital: "Trung tâm Tim mạch LifeTrack",
      location: "TP.HCM · Khám trực tuyến",
      bio: "Chuyên theo dõi tăng huyết áp, rối loạn nhịp và phục hồi sau biến cố tim mạch. Tập trung mô hình chăm sóc liên tục từ dữ liệu ECG, triệu chứng hằng ngày và điều chỉnh lối sống tại nhà.",
      avatar_url: "/assets/avatars/doctors/doctor-vu-thanh-mai.svg",
      experience_years: 12,
      public_contact_email: "bs.mai@lifetrack.vn",
      hire_price: 1200000,
      is_listed: true,
    },
  })

  // Hồ sơ bác sĩ 2: Nội khoa tổng quát
  const doctor2Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor2.user_id,
      specialty: "Nội khoa tổng quát",
      title: "ThS.BS Nội khoa - Quản lý bệnh mạn tính",
      hospital: "Bệnh viện Đại học Y Dược",
      location: "TP.HCM · Khám trực tuyến",
      bio: "Tập trung quản lý đái tháo đường, rối loạn mỡ máu, tăng huyết áp và các vấn đề nội khoa thường gặp. Ưu tiên kế hoạch điều trị thực tế, dễ theo dõi và phối hợp tốt với lịch tái khám định kỳ.",
      avatar_url: "/assets/avatars/doctors/doctor-tran-quoc-anh.svg",
      experience_years: 10,
      public_contact_email: "bs.hung@lifetrack.vn",
      hire_price: 1000000,
      is_listed: true,
    },
  })

  const doctor3Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor3.user_id,
      specialty: "Nội tiết",
      title: "BS Nội tiết - Theo dõi chuyển hóa",
      hospital: "Phòng khám Nội tiết LifeTrack",
      location: "Hà Nội · Khám trực tuyến",
      bio: "Theo dõi đái tháo đường, tiền đái tháo đường, tuyến giáp và các rối loạn chuyển hóa với kế hoạch điều trị bám sát sinh hoạt hằng ngày.",
      avatar_url: "/assets/avatars/doctors/doctor-nguyen-thuy-chi.svg",
      experience_years: 9,
      public_contact_email: "bs.chi@lifetrack.vn",
      hire_price: 950000,
      is_listed: true,
    },
  })

  const doctor4Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor4.user_id,
      specialty: "Thần kinh",
      title: "BS Thần kinh - Đau đầu và rối loạn giấc ngủ",
      hospital: "Trung tâm Thần kinh Sài Gòn",
      location: "TP.HCM · Khám trực tuyến",
      bio: "Tư vấn đau đầu mạn tính, chóng mặt, mất ngủ và theo dõi các biểu hiện thần kinh chức năng qua mô hình khám định kỳ.",
      avatar_url: "/assets/avatars/doctors/doctor-le-minh-tam.svg",
      experience_years: 11,
      public_contact_email: "bs.tam@lifetrack.vn",
      hire_price: 1350000,
      is_listed: true,
    },
  })

  const doctor5Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor5.user_id,
      specialty: "Hô hấp",
      title: "BS Hô hấp - Theo dõi hen và COPD",
      hospital: "Bệnh viện Phổi Trung ương",
      location: "Hà Nội · Khám trực tuyến",
      bio: "Đồng hành với bệnh nhân hen phế quản, COPD và các vấn đề hô hấp tái diễn, ưu tiên kiểm soát triệu chứng và theo dõi dài hạn.",
      avatar_url: "/assets/avatars/doctors/doctor-pham-minh-ngoc.svg",
      experience_years: 8,
      public_contact_email: "bs.ngoc@lifetrack.vn",
      hire_price: 1100000,
      is_listed: true,
    },
  })

  const doctor6Profile = await prisma.doctorProfile.create({
    data: {
      doctor_id: doctor6.user_id,
      specialty: "Dinh dưỡng lâm sàng",
      title: "BS Dinh dưỡng - Quản lý cân nặng và bệnh mạn tính",
      hospital: "Trung tâm Dinh dưỡng MedCare",
      location: "Đà Nẵng · Khám trực tuyến",
      bio: "Thiết kế lộ trình dinh dưỡng cá nhân hóa cho bệnh nhân thừa cân, rối loạn mỡ máu, tiền đái tháo đường và phục hồi thể trạng sau điều trị.",
      avatar_url: "/assets/avatars/doctors/doctor-lam-duc-huy.svg",
      experience_years: 7,
      public_contact_email: "bs.huy@lifetrack.vn",
      hire_price: 900000,
      is_listed: true,
    },
  })

  await prisma.doctorProfileEducation.createMany({
    data: [
      {
        profile_id: doctor1Profile.profile_id,
        title: "Bác sĩ Chuyên khoa II Tim mạch",
        organization: "Đại học Y Dược TP.HCM",
        year_label: "2016",
        display_order: 0,
      },
      {
        profile_id: doctor1Profile.profile_id,
        title: "Chứng chỉ Siêu âm tim nâng cao",
        organization: "Bệnh viện Chợ Rẫy",
        year_label: "2018",
        display_order: 1,
      },
      {
        profile_id: doctor1Profile.profile_id,
        title: "Đào tạo theo dõi ECG từ xa",
        organization: "Hội Tim mạch học Việt Nam",
        year_label: "2022",
        display_order: 2,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Thạc sĩ Nội khoa",
        organization: "Đại học Y Hà Nội",
        year_label: "2017",
        display_order: 0,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Chứng chỉ Quản lý bệnh mạn tính",
        organization: "Bệnh viện Đại học Y Dược",
        year_label: "2019",
        display_order: 1,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Đào tạo Dinh dưỡng lâm sàng",
        organization: "Trường Đại học Y khoa Phạm Ngọc Thạch",
        year_label: "2021",
        display_order: 2,
      },
      {
        profile_id: doctor3Profile.profile_id,
        title: "Bác sĩ Nội trú Nội tiết",
        organization: "Đại học Y Hà Nội",
        year_label: "2016",
        display_order: 0,
      },
      {
        profile_id: doctor3Profile.profile_id,
        title: "Chứng chỉ Quản lý đái tháo đường",
        organization: "Bệnh viện Nội tiết Trung ương",
        year_label: "2019",
        display_order: 1,
      },
      {
        profile_id: doctor4Profile.profile_id,
        title: "Thạc sĩ Thần kinh học",
        organization: "Đại học Y Dược TP.HCM",
        year_label: "2015",
        display_order: 0,
      },
      {
        profile_id: doctor4Profile.profile_id,
        title: "Đào tạo Y học giấc ngủ",
        organization: "Bệnh viện Đại học Y Dược",
        year_label: "2020",
        display_order: 1,
      },
      {
        profile_id: doctor5Profile.profile_id,
        title: "Bác sĩ Chuyên khoa I Hô hấp",
        organization: "Đại học Y Hà Nội",
        year_label: "2018",
        display_order: 0,
      },
      {
        profile_id: doctor5Profile.profile_id,
        title: "Chứng chỉ Quản lý hen phế quản",
        organization: "Bệnh viện Phổi Trung ương",
        year_label: "2021",
        display_order: 1,
      },
      {
        profile_id: doctor6Profile.profile_id,
        title: "Bác sĩ đa khoa",
        organization: "Đại học Y Dược Huế",
        year_label: "2017",
        display_order: 0,
      },
      {
        profile_id: doctor6Profile.profile_id,
        title: "Chứng chỉ Dinh dưỡng lâm sàng",
        organization: "Viện Dinh dưỡng Quốc gia",
        year_label: "2022",
        display_order: 1,
      },
    ],
  })

  await prisma.doctorProfileResearch.createMany({
    data: [
      {
        profile_id: doctor1Profile.profile_id,
        title: "Theo dõi ngoại tâm thu bằng dữ liệu ECG đeo liên tục ở bệnh nhân ngoại trú",
        source: "Tạp chí Tim mạch học Việt Nam",
        published_year: 2023,
        display_order: 0,
      },
      {
        profile_id: doctor1Profile.profile_id,
        title: "Ứng dụng cảnh báo sớm trong quản lý tăng huyết áp từ xa",
        source: "Hội nghị Tim mạch Toàn quốc",
        published_year: 2024,
        display_order: 1,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Mô hình theo dõi đường huyết và tuân thủ điều trị ở bệnh nhân nội khoa mạn tính",
        source: "Tạp chí Y học Thực hành",
        published_year: 2022,
        display_order: 0,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Tối ưu tái khám ngoại trú cho bệnh nhân tăng huyết áp và rối loạn lipid máu",
        source: "Hội nghị Nội khoa miền Nam",
        published_year: 2024,
        display_order: 1,
      },
      {
        profile_id: doctor3Profile.profile_id,
        title: "Theo dõi HbA1c và hành vi dùng thuốc trong chăm sóc từ xa",
        source: "Tạp chí Nội tiết và Chuyển hóa",
        published_year: 2023,
        display_order: 0,
      },
      {
        profile_id: doctor4Profile.profile_id,
        title: "Đặc điểm đau đầu mạn tính ở nhóm bệnh nhân làm việc cường độ cao",
        source: "Hội nghị Thần kinh học Việt Nam",
        published_year: 2022,
        display_order: 0,
      },
      {
        profile_id: doctor5Profile.profile_id,
        title: "Cải thiện tuân thủ điều trị hen ở bệnh nhân ngoại trú bằng nhắc theo dõi số hóa",
        source: "Tạp chí Hô hấp Việt Nam",
        published_year: 2024,
        display_order: 0,
      },
      {
        profile_id: doctor6Profile.profile_id,
        title: "Tác động của can thiệp dinh dưỡng cá nhân hóa trên nhóm tiền đái tháo đường",
        source: "Tạp chí Dinh dưỡng cộng đồng",
        published_year: 2023,
        display_order: 0,
      },
    ],
  })

  await prisma.doctorProfileExperience.createMany({
    data: [
      {
        profile_id: doctor1Profile.profile_id,
        title: "Bác sĩ điều trị Tim mạch",
        organization: "Bệnh viện Nhân dân 115",
        time_label: "2014 - 2018",
        display_order: 0,
      },
      {
        profile_id: doctor1Profile.profile_id,
        title: "Phụ trách phòng khám Rối loạn nhịp",
        organization: "Trung tâm Tim mạch khu vực",
        time_label: "2018 - 2022",
        display_order: 1,
      },
      {
        profile_id: doctor1Profile.profile_id,
        title: "Bác sĩ đồng hành tim mạch từ xa",
        organization: "LifeTrack Care",
        time_label: "2022 - nay",
        display_order: 2,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Bác sĩ Nội trú Nội khoa",
        organization: "Bệnh viện Đại học Y Dược",
        time_label: "2015 - 2018",
        display_order: 0,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Bác sĩ điều trị Nội tổng quát",
        organization: "Bệnh viện Quận 1",
        time_label: "2018 - 2021",
        display_order: 1,
      },
      {
        profile_id: doctor2Profile.profile_id,
        title: "Bác sĩ quản lý bệnh mạn tính",
        organization: "Phòng khám phối hợp LifeTrack",
        time_label: "2021 - nay",
        display_order: 2,
      },
      {
        profile_id: doctor3Profile.profile_id,
        title: "Bác sĩ Nội tiết",
        organization: "Bệnh viện Nội tiết Trung ương",
        time_label: "2017 - 2021",
        display_order: 0,
      },
      {
        profile_id: doctor3Profile.profile_id,
        title: "Bác sĩ tư vấn chuyển hóa từ xa",
        organization: "LifeTrack Care",
        time_label: "2021 - nay",
        display_order: 1,
      },
      {
        profile_id: doctor4Profile.profile_id,
        title: "Bác sĩ điều trị Thần kinh",
        organization: "Bệnh viện Nhân dân Gia Định",
        time_label: "2015 - 2019",
        display_order: 0,
      },
      {
        profile_id: doctor4Profile.profile_id,
        title: "Phụ trách phòng khám đau đầu",
        organization: "Trung tâm Thần kinh Sài Gòn",
        time_label: "2019 - nay",
        display_order: 1,
      },
      {
        profile_id: doctor5Profile.profile_id,
        title: "Bác sĩ Hô hấp",
        organization: "Bệnh viện Phổi Trung ương",
        time_label: "2018 - 2022",
        display_order: 0,
      },
      {
        profile_id: doctor5Profile.profile_id,
        title: "Bác sĩ theo dõi hô hấp mạn tính",
        organization: "Mạng lưới LifeTrack",
        time_label: "2022 - nay",
        display_order: 1,
      },
      {
        profile_id: doctor6Profile.profile_id,
        title: "Bác sĩ tư vấn dinh dưỡng bệnh lý",
        organization: "Viện Dinh dưỡng Quốc gia",
        time_label: "2019 - 2023",
        display_order: 0,
      },
      {
        profile_id: doctor6Profile.profile_id,
        title: "Bác sĩ đồng hành dinh dưỡng trực tuyến",
        organization: "MedCare x LifeTrack",
        time_label: "2023 - nay",
        display_order: 1,
      },
    ],
  })

  // Lịch rảnh bác sĩ 1
  await prisma.doctorAvailability.createMany({
    data: [
      { doctor_id: doctor1.user_id, day_of_week: 1, start_time: "08:00", end_time: "11:00", slot_minutes: 30 },
      { doctor_id: doctor1.user_id, day_of_week: 2, start_time: "14:00", end_time: "17:00", slot_minutes: 30 },
      { doctor_id: doctor1.user_id, day_of_week: 3, start_time: "08:00", end_time: "11:00", slot_minutes: 30 },
      { doctor_id: doctor1.user_id, day_of_week: 4, start_time: "14:00", end_time: "17:00", slot_minutes: 30 },
      { doctor_id: doctor1.user_id, day_of_week: 5, start_time: "08:00", end_time: "11:00", slot_minutes: 30 },
    ],
  })

  // Lịch rảnh bác sĩ 2
  await prisma.doctorAvailability.createMany({
    data: [
      { doctor_id: doctor2.user_id, day_of_week: 1, start_time: "09:00", end_time: "12:00", slot_minutes: 45 },
      { doctor_id: doctor2.user_id, day_of_week: 2, start_time: "15:00", end_time: "18:00", slot_minutes: 45 },
      { doctor_id: doctor2.user_id, day_of_week: 3, start_time: "09:00", end_time: "12:00", slot_minutes: 45 },
      { doctor_id: doctor2.user_id, day_of_week: 5, start_time: "15:00", end_time: "18:00", slot_minutes: 45 },
      { doctor_id: doctor2.user_id, day_of_week: 6, start_time: "10:00", end_time: "13:00", slot_minutes: 45 },
    ],
  })

  await prisma.doctorAvailability.createMany({
    data: [
      { doctor_id: doctor3.user_id, day_of_week: 1, start_time: "18:00", end_time: "21:00", slot_minutes: 30 },
      { doctor_id: doctor3.user_id, day_of_week: 3, start_time: "18:00", end_time: "21:00", slot_minutes: 30 },
      { doctor_id: doctor3.user_id, day_of_week: 6, start_time: "08:00", end_time: "11:00", slot_minutes: 30 },
      { doctor_id: doctor4.user_id, day_of_week: 2, start_time: "19:00", end_time: "22:00", slot_minutes: 45 },
      { doctor_id: doctor4.user_id, day_of_week: 4, start_time: "19:00", end_time: "22:00", slot_minutes: 45 },
      { doctor_id: doctor4.user_id, day_of_week: 6, start_time: "14:00", end_time: "17:00", slot_minutes: 45 },
      { doctor_id: doctor5.user_id, day_of_week: 1, start_time: "07:30", end_time: "10:30", slot_minutes: 30 },
      { doctor_id: doctor5.user_id, day_of_week: 4, start_time: "13:30", end_time: "16:30", slot_minutes: 30 },
      { doctor_id: doctor5.user_id, day_of_week: 5, start_time: "07:30", end_time: "10:30", slot_minutes: 30 },
      { doctor_id: doctor6.user_id, day_of_week: 2, start_time: "08:00", end_time: "11:00", slot_minutes: 60 },
      { doctor_id: doctor6.user_id, day_of_week: 5, start_time: "14:00", end_time: "17:00", slot_minutes: 60 },
      { doctor_id: doctor6.user_id, day_of_week: 0, start_time: "09:00", end_time: "11:00", slot_minutes: 60 },
    ],
  })

  // Sử dụng alias cho consistency
  const patient = primaryPatient
  const doctor = doctor1
  const family = familyMember

  const admin = await prisma.user.create({
    data: {
      name: "Quản trị viên hệ thống",
      email: "admin@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.ADMIN,
      is_active: true,
      created_at: toDate("2025-09-01T01:00:00.000Z"),
    },
  })

  const device = await prisma.device.create({
    data: {
      user_id: patient.user_id,
      serial_number: "SN-ECG-0001",
      status: DeviceStatus.DANG_HOAT_DONG,
      created_at: toDate("2025-11-15T07:00:00.000Z"),
    },
  })

  // Thiết bị thứ hai cho vợ
  const device2 = await prisma.device.create({
    data: {
      user_id: spouse.user_id,
      serial_number: "SN-ECG-0002",
      status: DeviceStatus.DANG_HOAT_DONG,
      created_at: toDate("2025-11-20T09:00:00.000Z"),
    },
  })

  // Seed một chuỗi reading theo thời gian để mô phỏng hành trình theo dõi thực tế nhiều tháng.
  const seededReadings = []
  const readingInputs = [
    // Patient - Reading baseline
    {
      deviceId: device.device_id,
      key: "reading_baseline",
      timestamp: "2025-11-18T01:20:00.000Z",
      heart_rate: 72,
      ecg_signal: [0.01, 0.02, 0.03, 0.02, 0.01, 0.0, -0.01, 0.0, 0.03, 0.07, 0.12, 0.05, -0.02, 0.01, 0.02, 0.01],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2025-11-18T01:20:08.000Z",
    },
    // Patient - Reading stress
    {
      deviceId: device.device_id,
      key: "reading_stress",
      timestamp: "2025-12-06T13:45:00.000Z",
      heart_rate: 96,
      ecg_signal: [0.02, 0.03, 0.02, 0.04, 0.08, 0.14, 0.18, 0.09, 0.01, -0.03, 0.02, 0.06, 0.1, 0.04, 0.01, 0.0],
      abnormal_detected: false,
      ai_result: "Nhịp nhanh xoang nhẹ",
      ai_status: "DONE",
      ai_completed_at: "2025-12-06T13:45:09.000Z",
    },
    // Patient - Reading PVC
    {
      deviceId: device.device_id,
      key: "reading_pvc",
      timestamp: "2026-01-14T04:10:00.000Z",
      heart_rate: 104,
      ecg_signal: [0.01, 0.04, 0.09, 0.16, 0.07, -0.05, 0.03, 0.11, 0.19, 0.06, -0.08, 0.02, 0.13, 0.22, 0.08, -0.04],
      abnormal_detected: true,
      ai_result: "Ngoại tâm thu thất rải rác",
      ai_status: "DONE",
      ai_completed_at: "2026-01-14T04:10:10.000Z",
    },
    // Patient - Reading followup
    {
      deviceId: device.device_id,
      key: "reading_followup",
      timestamp: "2026-03-22T02:25:00.000Z",
      heart_rate: 78,
      ecg_signal: [0.0, 0.01, 0.03, 0.08, 0.12, 0.05, 0.0, -0.01, 0.01, 0.05, 0.11, 0.04, 0.0, -0.02, 0.01, 0.03],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2026-03-22T02:25:06.000Z",
    },
    // Patient - Recent reading April 2026
    {
      deviceId: device.device_id,
      key: "reading_apr_2026",
      timestamp: "2026-04-15T08:30:00.000Z",
      heart_rate: 75,
      ecg_signal: [0.01, 0.02, 0.03, 0.05, 0.08, 0.06, 0.02, 0.0, 0.01, 0.04, 0.09, 0.05, 0.01, -0.01, 0.02, 0.02],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2026-04-15T08:35:00.000Z",
    },
    // Spouse - Reading normal
    {
      deviceId: device2.device_id,
      key: "reading_spouse_normal1",
      timestamp: "2025-12-01T07:15:00.000Z",
      heart_rate: 68,
      ecg_signal: [0.0, 0.01, 0.02, 0.04, 0.07, 0.05, 0.02, 0.0, -0.01, 0.02, 0.06, 0.04, 0.01, 0.0, 0.01, 0.01],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2025-12-01T07:20:00.000Z",
    },
    // Spouse - Reading with mild irregularity
    {
      deviceId: device2.device_id,
      key: "reading_spouse_irregular",
      timestamp: "2026-01-25T14:40:00.000Z",
      heart_rate: 88,
      ecg_signal: [0.01, 0.03, 0.05, 0.08, 0.09, 0.06, 0.02, 0.01, 0.02, 0.05, 0.1, 0.06, 0.02, 0.0, 0.01, 0.02],
      abnormal_detected: false,
      ai_result: "Nhịp nhanh xoang nhẹ",
      ai_status: "DONE",
      ai_completed_at: "2026-01-25T14:45:00.000Z",
    },
    // Spouse - Recent reading
    {
      deviceId: device2.device_id,
      key: "reading_spouse_apr_2026",
      timestamp: "2026-04-18T09:00:00.000Z",
      heart_rate: 72,
      ecg_signal: [0.0, 0.02, 0.03, 0.05, 0.07, 0.05, 0.02, 0.0, 0.01, 0.04, 0.08, 0.04, 0.01, -0.01, 0.01, 0.02],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2026-04-18T09:05:00.000Z",
    },
  ]

  for (const readingInput of readingInputs) {
    const createdReading = await prisma.reading.create({
      data: {
        device_id: readingInput.deviceId,
        timestamp: toDate(readingInput.timestamp),
        heart_rate: readingInput.heart_rate,
        ecg_signal: readingInput.ecg_signal,
        abnormal_detected: readingInput.abnormal_detected,
        ai_result: readingInput.ai_result,
        ai_status: readingInput.ai_status,
        ai_completed_at: toDate(readingInput.ai_completed_at),
      },
    })

    seededReadings.push({
      key: readingInput.key,
      ...createdReading,
    })
  }

  const readingMap = Object.fromEntries(seededReadings.map((item) => [item.key, item]))

  const pvcAlert = await prisma.alert.create({
    data: {
      user_id: patient.user_id,
      reading_id: readingMap.reading_pvc.reading_id,
      alert_type: "PVC",
      message: "Phát hiện ngoại tâm thu thất rải rác. Bệnh nhân cần nghỉ ngơi, tránh chất kích thích và theo dõi thêm.",
      segment_start_sample: 120,
      segment_end_sample: 168,
      resolved: false,
      timestamp: toDate("2026-01-14T04:10:12.000Z"),
    },
  })

  await prisma.alert.createMany({
    data: [
      {
        user_id: patient.user_id,
        reading_id: readingMap.reading_stress.reading_id,
        alert_type: "TACHYCARDIA",
        message: "Nhịp tim tăng cao thoáng qua sau căng thẳng và uống cà phê, nên theo dõi thêm tại nhà.",
        segment_start_sample: 64,
        segment_end_sample: 110,
        resolved: true,
        timestamp: toDate("2025-12-06T13:45:12.000Z"),
      },
      {
        user_id: patient.user_id,
        reading_id: readingMap.reading_followup.reading_id,
        alert_type: "FOLLOW_UP",
        message: "Tín hiệu ECG lần tái khám ổn định hơn, tiếp tục duy trì lối sống hiện tại.",
        segment_start_sample: null,
        segment_end_sample: null,
        resolved: true,
        timestamp: toDate("2026-03-22T02:25:08.000Z"),
      },
      {
        user_id: spouse.user_id,
        reading_id: readingMap.reading_spouse_irregular.reading_id,
        alert_type: "TACHYCARDIA",
        message: "Phát hiện nhịp tim tăng nhẹ. Bạn nên giảm căng thẳng và uống đủ nước.",
        segment_start_sample: 80,
        segment_end_sample: 120,
        resolved: true,
        timestamp: toDate("2026-01-25T14:50:00.000Z"),
      },
    ],
  })

  // Reports cho patient
  await prisma.report.createMany({
    data: [
      {
        user_id: patient.user_id,
        doctor_id: doctor1.user_id,
        summary: "Đợt khám tháng 01/2026 ghi nhận ngoại tâm thu thất rải rác, chưa có chỉ định nhập viện. Khuyến nghị giảm cà phê, ngủ đúng giờ và tái khám sau 2 tuần.",
        created_at: toDate("2026-01-15T03:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor1.user_id,
        summary: "Tái khám tháng 03/2026 cho thấy tần suất hồi hộp giảm rõ, Holter không ghi nhận cơn nguy hiểm kéo dài. Tiếp tục theo dõi định kỳ mỗi 3 tháng.",
        created_at: toDate("2026-03-22T04:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor2.user_id,
        summary: "Khám sức khỏe tổng quát 04/2026: chỉ số huyết áp bình thường (120/80), cholesterol nâng cao. Cần kiểm tra máu định kỳ.",
        created_at: toDate("2026-04-20T02:00:00.000Z"),
      },
    ],
  })

  // Reports cho spouse
  await prisma.report.createMany({
    data: [
      {
        user_id: spouse.user_id,
        doctor_id: doctor2.user_id,
        summary: "Khám sức khỏe tổng quát 12/2025: huyết áp bình thường, không phát hiện bất thường. Tiếp tục duy trì lối sống lành mạnh.",
        created_at: toDate("2025-12-05T10:00:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        doctor_id: doctor1.user_id,
        summary: "Khám ECG tháng 01/2026: nhịp tim tăng nhẹ do stress công việc. Khuyến cáo giảm căng thẳng, tập thể dục đều đặn.",
        created_at: toDate("2026-02-01T08:30:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        doctor_id: doctor2.user_id,
        summary: "Tái khám 04/2026: tình trạng sức khỏe ổn định. Kết quả xét nghiệm máu trong bình thường. Tiếp tục tái khám sau 6 tháng.",
        created_at: toDate("2026-04-22T14:00:00.000Z"),
      },
    ],
  })

  await prisma.chatLog.createMany({
    data: [
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi hay thấy hồi hộp vào cuối buổi chiều, có cần đi cấp cứu không?",
        timestamp: toDate("2026-01-14T04:20:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Nếu chỉ hồi hộp thoáng qua và không kèm đau ngực, khó thở hay ngất thì bạn có thể nghỉ ngơi, đo lại nhịp tim và theo dõi. Nếu triệu chứng kéo dài hoặc nặng lên, hãy đi khám sớm.",
        timestamp: toDate("2026-01-14T04:20:10.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi đã giảm cà phê một tuần nay, nhịp tim có vẻ ổn hơn.",
        timestamp: toDate("2026-03-22T05:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Đó là tín hiệu tích cực. Bạn nên tiếp tục ngủ đủ giấc, hạn chế chất kích thích và ghi lại thời điểm xuất hiện triệu chứng để bác sĩ dễ đánh giá khi tái khám.",
        timestamp: toDate("2026-03-22T05:00:12.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Có thể lạc nhịp là do căng thẳng công việc không?",
        timestamp: toDate("2026-04-10T07:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Đúng vậy, căng thẳng là một trong những nguyên nhân chính gây lạc nhịp. Bạn nên thực hành các kỹ thuật thả lỏng như yoga, meditation, hoặc đơn giản là đi bộ buổi sáng.",
        timestamp: toDate("2026-04-10T07:35:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Hôm nay nhịp tim 78, có ổn không bác sĩ?",
        timestamp: toDate("2026-04-18T10:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Nhịp tim 78 lần/phút là hoàn toàn bình thường. Tiếp tục duy trì chế độ ăn uống lành mạnh và tập thể dục đều đặn.",
        timestamp: toDate("2026-04-18T10:05:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.user,
        message: "Tôi vừa mới cài app này, có ghi chép tất cả dữ liệu y tế không?",
        timestamp: toDate("2025-12-10T14:30:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.bot,
        message: "Ứng dụng này giúp bạn quản lý toàn bộ dữ liệu sức khỏe: kết quả xét nghiệm, chẩn đoán, thuốc đang dùng và lịch hẹn khám. Tất cả đều được bảo mật và chỉ bạn và bác sĩ có thể xem.",
        timestamp: toDate("2025-12-10T14:35:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.user,
        message: "Tôi đang ngủ không đủ giấc vì công việc. Điều này có ảnh hưởng đến nhịp tim không?",
        timestamp: toDate("2026-01-22T23:00:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.bot,
        message: "Thiếu ngủ có thể làm tăng nhịp tim và gây rối loạn nhịp. Hãy cố gắng ngủ đủ 7-8 tiếng mỗi đêm. Nếu khó ngủ, hãy tắt các thiết bị điện tử 1 giờ trước khi đi ngủ.",
        timestamp: toDate("2026-01-22T23:10:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.user,
        message: "Kết quả ECG hôm qua bình thường phải không?",
        timestamp: toDate("2026-04-20T08:00:00.000Z"),
      },
      {
        user_id: spouse.user_id,
        role: ChatRole.bot,
        message: "Vâng, kết quả ECG của bạn hôm qua bình thường. Huyết áp và nhịp tim đều ổn định. Tiếp tục duy trì lối sống hiện tại.",
        timestamp: toDate("2026-04-20T08:10:00.000Z"),
      },
    ],
  })

  // ========== Quyền truy cập gia đình ==========
  await prisma.accessPermission.createMany({
    data: [
      {
        patient_id: patient.user_id,
        viewer_id: family.user_id,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
        created_at: toDate("2025-11-17T08:30:00.000Z"),
      },
      {
        patient_id: spouse.user_id,
        viewer_id: family.user_id,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
        created_at: toDate("2025-11-18T10:00:00.000Z"),
      },
      {
        patient_id: child.user_id,
        viewer_id: family.user_id,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
        created_at: toDate("2025-11-20T14:30:00.000Z"),
      },
    ],
  })

  // ========== Gia đình thuê 2 bác sĩ ==========
  // Bác sĩ 1 - Tim mạch (được thuê bởi patient chính)
  const patientDoctor1Hire = await prisma.doctorHire.create({
    data: {
      patient_id: patient.user_id,
      doctor_id: doctor1.user_id,
      status: DoctorHireStatus.ACTIVE,
      price_snapshot: 1200000,
      can_view_ehr: true,
      can_view_medications: true,
      can_view_ecg: true,
      requested_at: toDate("2025-11-16T08:00:00.000Z"),
      approved_at: toDate("2025-11-16T09:00:00.000Z"),
    },
  })

  // Bác sĩ 2 - Nội khoa (được thuê bởi cả patient chính và vợ)
  const patientDoctor2Hire = await prisma.doctorHire.create({
    data: {
      patient_id: patient.user_id,
      doctor_id: doctor2.user_id,
      status: DoctorHireStatus.ACTIVE,
      price_snapshot: 1000000,
      can_view_ehr: true,
      can_view_medications: true,
      can_view_ecg: false,
      requested_at: toDate("2025-11-20T10:00:00.000Z"),
      approved_at: toDate("2025-11-20T11:30:00.000Z"),
    },
  })

  const spouseDoctor2Hire = await prisma.doctorHire.create({
    data: {
      patient_id: spouse.user_id,
      doctor_id: doctor2.user_id,
      status: DoctorHireStatus.ACTIVE,
      price_snapshot: 1000000,
      can_view_ehr: true,
      can_view_medications: true,
      can_view_ecg: false,
      requested_at: toDate("2025-11-22T09:00:00.000Z"),
      approved_at: toDate("2025-11-22T10:00:00.000Z"),
    },
  })

  // Bác sĩ 1 cũng được vợ thuê
  const spouseDoctor1Hire = await prisma.doctorHire.create({
    data: {
      patient_id: spouse.user_id,
      doctor_id: doctor1.user_id,
      status: DoctorHireStatus.ACTIVE,
      price_snapshot: 1200000,
      can_view_ehr: true,
      can_view_medications: false,
      can_view_ecg: true,
      requested_at: toDate("2025-11-21T08:00:00.000Z"),
      approved_at: toDate("2025-11-21T09:00:00.000Z"),
    },
  })

  await prisma.doctorReview.createMany({
    data: [
      {
        doctor_id: doctor1.user_id,
        patient_id: patient.user_id,
        source_hire_id: patientDoctor1Hire.hire_id,
        rating: 5,
        comment: "Bác sĩ giải thích kết quả ECG rất rõ ràng, phản hồi nhanh khi tôi có cơn hồi hộp về đêm và giúp tôi yên tâm hơn khi theo dõi tại nhà.",
        is_visible: true,
        created_at: toDate("2026-02-02T08:00:00.000Z"),
      },
      {
        doctor_id: doctor1.user_id,
        patient_id: spouse.user_id,
        source_hire_id: spouseDoctor1Hire.hire_id,
        rating: 4,
        comment: "Theo dõi sát, tư vấn kỹ về chế độ sinh hoạt và nhịp tim. Tôi mong lịch online buổi tối có thêm vài khung giờ nữa.",
        is_visible: true,
        created_at: toDate("2026-03-11T10:30:00.000Z"),
      },
      {
        doctor_id: doctor2.user_id,
        patient_id: patient.user_id,
        source_hire_id: patientDoctor2Hire.hire_id,
        rating: 5,
        comment: "Bác sĩ nội khoa tư vấn rất thực tế, giúp tôi sắp xếp thuốc và lịch tái khám gọn gàng hơn. Phù hợp cho theo dõi bệnh mạn tính lâu dài.",
        is_visible: true,
        created_at: toDate("2026-02-18T09:15:00.000Z"),
      },
      {
        doctor_id: doctor2.user_id,
        patient_id: spouse.user_id,
        source_hire_id: spouseDoctor2Hire.hire_id,
        rating: 4,
        comment: "Khám tổng quát cẩn thận và giải thích dễ hiểu. Sau buổi khám tôi biết rõ nên theo dõi chỉ số nào trong các lần tái khám tiếp theo.",
        is_visible: true,
        created_at: toDate("2026-04-22T07:45:00.000Z"),
      },
    ],
  })

  // Direct messages giữa patient và doctor1
  const conversationKey1 = buildConversationKey(patient.user_id, doctor1.user_id)
  await prisma.directMessage.createMany({
    data: [
      {
        conversation_key: conversationKey1,
        sender_id: patient.user_id,
        receiver_id: doctor1.user_id,
        message: "Bác sĩ ơi, tối qua em lại có cơn hồi hộp khoảng 7 phút sau khi làm việc khuya.",
        is_read: true,
        created_at: toDate("2026-01-14T04:40:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
        message: "Em nghỉ ngơi, tránh cà phê hôm nay và đo lại nhịp tim lúc ngồi yên. Nếu có đau ngực hoặc khó thở thì đi khám ngay.",
        is_read: true,
        created_at: toDate("2026-01-14T04:48:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: patient.user_id,
        receiver_id: doctor1.user_id,
        message: "Dạ, em đã ngủ tốt hơn rồi. Cơn hồi hộp ít hơn so với trước.",
        is_read: true,
        created_at: toDate("2026-02-20T09:30:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
        message: "Tốt lắm. Hôm nay em có thể gửi cho bác sĩ kết quả ECG để bác sĩ xem chi tiết được không?",
        is_read: true,
        created_at: toDate("2026-02-20T10:00:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: patient.user_id,
        receiver_id: doctor1.user_id,
        message: "Vâng bác sĩ. Em vừa mới gửi lên hệ thống, bác sĩ xem được không ạ?",
        is_read: true,
        created_at: toDate("2026-02-20T10:15:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
        message: "Em tiếp tục giữ nếp sinh hoạt hiện tại và nhắn lại nếu triệu chứng tăng lên nhé. Đặt lịch tái khám trong 3 tuần nữa.",
        is_read: true,
        created_at: toDate("2026-02-20T10:45:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: patient.user_id,
        receiver_id: doctor1.user_id,
        message: "Kết quả tái khám hôm nay ổn hơn nhiều. Tình trạng em đã cải thiện rồi phải không bác sĩ?",
        is_read: true,
        created_at: toDate("2026-03-22T05:10:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
        message: "Đúng rồi em. Tần suất hồi hộp đã giảm rõ rệt. Tiếp tục duy trì các công việc bác sĩ đã khuyến cáo.",
        is_read: true,
        created_at: toDate("2026-03-22T05:20:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: patient.user_id,
        receiver_id: doctor1.user_id,
        message: "Em có thể tập thể dục nặng hơn một chút không bác sĩ? Em muốn chạy bộ.",
        is_read: true,
        created_at: toDate("2026-04-08T07:00:00.000Z"),
      },
      {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
        message: "Em có thể chạy bộ nhẹ nhàng 20-30 phút mỗi ngày. Hãy bắt đầu từ tốc độ chậm và tăng dần. Nếu có cảm thấy hồi hộp thì dừng lại ngay.",
        is_read: true,
        created_at: toDate("2026-04-08T08:00:00.000Z"),
      },
    ],
  })

  // Direct messages giữa spouse và doctor2
  const conversationKey2 = buildConversationKey(spouse.user_id, doctor2.user_id)
  await prisma.directMessage.createMany({
    data: [
      {
        conversation_key: conversationKey2,
        sender_id: spouse.user_id,
        receiver_id: doctor2.user_id,
        message: "Bác sĩ ơi, em vừa khám xong. Có cần theo dõi gì thêm không ạ?",
        is_read: true,
        created_at: toDate("2025-12-05T11:00:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: doctor2.user_id,
        receiver_id: spouse.user_id,
        message: "Kết quả khám của chị rất ổn định. Chị hãy tiếp tục duy trì lối sống lành mạnh như hiện tại.",
        is_read: true,
        created_at: toDate("2025-12-05T11:30:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: spouse.user_id,
        receiver_id: doctor2.user_id,
        message: "Công việc bận rộn quá. Em bắt đầu thấy mệt và tim đập nhanh hơn bình thường.",
        is_read: true,
        created_at: toDate("2026-01-25T18:00:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: doctor2.user_id,
        receiver_id: spouse.user_id,
        message: "Căng thẳng công việc có thể gây ra tình trạng đó. Em nên cố gắng thư giãn vào buổi tối, tập yoga hoặc thiền.",
        is_read: true,
        created_at: toDate("2026-01-25T18:30:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: spouse.user_id,
        receiver_id: doctor2.user_id,
        message: "Em đã thử yoga. Cảm thấy thoải mái hơn. ECG hôm nay có ổn không ạ?",
        is_read: true,
        created_at: toDate("2026-02-10T10:00:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: doctor2.user_id,
        receiver_id: spouse.user_id,
        message: "Rất tốt! ECG hôm nay bình thường, nhịp tim ổn định. Tiếp tục duy trì các hoạt động thư giãn.",
        is_read: true,
        created_at: toDate("2026-02-10T10:30:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: spouse.user_id,
        receiver_id: doctor2.user_id,
        message: "Tái khám ngày hôm nay được không ạ? Em muốn kiểm tra lại chỉ số máu.",
        is_read: true,
        created_at: toDate("2026-04-20T09:00:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: doctor2.user_id,
        receiver_id: spouse.user_id,
        message: "Được chứ. Chiều nay 15h chị đến phòng khám được không?",
        is_read: true,
        created_at: toDate("2026-04-20T09:30:00.000Z"),
      },
      {
        conversation_key: conversationKey2,
        sender_id: spouse.user_id,
        receiver_id: doctor2.user_id,
        message: "Dạ, em đến được. Cảm ơn bác sĩ.",
        is_read: true,
        created_at: toDate("2026-04-20T14:00:00.000Z"),
      },
    ],
  })

  // Direct messages giữa patient và doctor2
  const conversationKey3 = buildConversationKey(patient.user_id, doctor2.user_id)
  await prisma.directMessage.createMany({
    data: [
      {
        conversation_key: conversationKey3,
        sender_id: patient.user_id,
        receiver_id: doctor2.user_id,
        message: "Bác sĩ ơi, em muốn khám sức khỏe tổng quát, có đặt được lịch hôm nay không?",
        is_read: true,
        created_at: toDate("2026-04-15T08:00:00.000Z"),
      },
      {
        conversation_key: conversationKey3,
        sender_id: doctor2.user_id,
        receiver_id: patient.user_id,
        message: "Được. Chiều nay 14h có slot, em có thể tới được không?",
        is_read: true,
        created_at: toDate("2026-04-15T08:30:00.000Z"),
      },
      {
        conversation_key: conversationKey3,
        sender_id: patient.user_id,
        receiver_id: doctor2.user_id,
        message: "Dạ, em tới được. Cảm ơn bác sĩ.",
        is_read: true,
        created_at: toDate("2026-04-15T13:30:00.000Z"),
      },
      {
        conversation_key: conversationKey3,
        sender_id: doctor2.user_id,
        receiver_id: patient.user_id,
        message: "Kết quả khám hôm nay cho thấy cholesterol hơi nâng cao. Em cần điều chỉnh chế độ ăn uống.",
        is_read: true,
        created_at: toDate("2026-04-20T16:00:00.000Z"),
      },
      {
        conversation_key: conversationKey3,
        sender_id: patient.user_id,
        receiver_id: doctor2.user_id,
        message: "Dạ, em hiểu. Em sẽ giảm ăn đồ chiên xào và tăng rau xanh.",
        is_read: true,
        created_at: toDate("2026-04-20T16:30:00.000Z"),
      },
    ],
  })

  // Direct messages giữa spouse và doctor1
  const conversationKey4 = buildConversationKey(spouse.user_id, doctor1.user_id)
  await prisma.directMessage.createMany({
    data: [
      {
        conversation_key: conversationKey4,
        sender_id: spouse.user_id,
        receiver_id: doctor1.user_id,
        message: "Bác sĩ ơi, em vừa cài app và muốn kiểm tra lại ECG được không?",
        is_read: true,
        created_at: toDate("2025-11-25T08:00:00.000Z"),
      },
      {
        conversation_key: conversationKey4,
        sender_id: doctor1.user_id,
        receiver_id: spouse.user_id,
        message: "Chắc chắn được. Hãy kết nối thiết bị ECG và gửi bản ghi lên ứng dụng.",
        is_read: true,
        created_at: toDate("2025-11-25T08:30:00.000Z"),
      },
      {
        conversation_key: conversationKey4,
        sender_id: spouse.user_id,
        receiver_id: doctor1.user_id,
        message: "Bác sĩ ơi, nhịp tim em tăng lên 88 lần/phút. Có bất thường gì không?",
        is_read: true,
        created_at: toDate("2026-01-26T09:00:00.000Z"),
      },
      {
        conversation_key: conversationKey4,
        sender_id: doctor1.user_id,
        receiver_id: spouse.user_id,
        message: "Nhịp tim 88 do căng thẳng công việc thôi. Không có bất thường. Hãy giảm stress và tập luyện tập thể dục.",
        is_read: true,
        created_at: toDate("2026-01-26T09:30:00.000Z"),
      },
    ],
  })

  const latestDirectMessage = await prisma.directMessage.findFirst({
    where: {
      conversation_key: conversationKey1,
      sender_id: doctor1.user_id,
      receiver_id: patient.user_id,
    },
    orderBy: { created_at: "desc" },
  })

  const alertNotification = await prisma.notification.create({
    data: {
      type: NotificationType.ALERT,
      title: "Cảnh báo ECG",
      message: "Phát hiện ngoại tâm thu thất rải rác trên bản ghi ngày 14/01/2026.",
      actor_id: doctor1.user_id,
      entity_type: "alert",
      entity_id: pvcAlert.alert_id,
      payload: {
        user_id: patient.user_id,
        reading_id: readingMap.reading_pvc.reading_id,
        ai_result_summary: "Ngoại tâm thu thất rải rác",
      },
      created_at: toDate("2026-01-14T04:12:00.000Z"),
    },
  })

  const messageNotification = await prisma.notification.create({
    data: {
      type: NotificationType.DIRECT_MESSAGE,
      title: "Tin nhắn mới",
      message: latestDirectMessage?.message || "Bác sĩ vừa gửi tin nhắn mới.",
      actor_id: doctor1.user_id,
      entity_type: "direct_message",
      entity_id: latestDirectMessage?.message_id || null,
      payload: {
        conversation_key: conversationKey1,
        sender_id: doctor1.user_id,
        receiver_id: patient.user_id,
      },
      created_at: toDate("2026-03-22T05:10:05.000Z"),
    },
  })

  await prisma.notificationRecipient.createMany({
    data: [
      {
        notification_id: alertNotification.notification_id,
        user_id: patient.user_id,
        is_read: false,
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: alertNotification.notification_id,
        user_id: doctor1.user_id,
        is_read: true,
        read_at: toDate("2026-01-14T04:20:00.000Z"),
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: alertNotification.notification_id,
        user_id: family.user_id,
        is_read: false,
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: messageNotification.notification_id,
        user_id: patient.user_id,
        is_read: false,
        created_at: toDate("2026-03-22T05:10:05.000Z"),
      },
    ],
  })

  // Tạo các kế hoạch uống thuốc cho bệnh nhân chính
  const medicationPlan1 = await prisma.medicationPlan.create({
    data: {
      user_id: patient.user_id,
      doctor_id: doctor1.user_id,
      title: "Kế hoạch uống thuốc - Tăng huyết áp và rối loạn nhịp",
      start_date: toDate("2026-04-18T00:00:00.000Z"),
      end_date: toDate("2026-07-18T00:00:00.000Z"),
      notes: "Uống thuốc đều đặn mỗi sáng, giảm ăn mặn và tập thể dục nhẹ",
      is_active: true,
    },
  })

  const medicationPlan2 = await prisma.medicationPlan.create({
    data: {
      user_id: patient.user_id,
      doctor_id: doctor2.user_id,
      title: "Kế hoạch uống thuốc - Viêm loét dạ dày",
      start_date: toDate("2026-05-15T00:00:00.000Z"),
      end_date: toDate("2026-06-12T00:00:00.000Z"),
      notes: "Uống thuốc trước ăn, kiêng chua cay, chia nhỏ bữa ăn",
      is_active: true,
    },
  })

  const medicationPlan3 = await prisma.medicationPlan.create({
    data: {
      user_id: patient.user_id,
      doctor_id: doctor2.user_id,
      title: "Kế hoạch uống thuốc - Rối loạn lipid máu",
      start_date: toDate("2026-04-02T00:00:00.000Z"),
      end_date: null,
      notes: "Uống thuốc dài hạn, theo dõi chỉ số mỡ máu định kỳ",
      is_active: true,
    },
  })

  // Kế hoạch uống thuốc cho vợ
  const medicationPlan4 = await prisma.medicationPlan.create({
    data: {
      user_id: spouse.user_id,
      doctor_id: doctor1.user_id,
      title: "Kế hoạch uống thuốc - Dự phòng tim mạch",
      start_date: toDate("2026-01-01T00:00:00.000Z"),
      end_date: null,
      notes: "Tập yoga đều đặn, uống thuốc mỗi sáng, kiểm tra huyết áp định kỳ",
      is_active: true,
    },
  })

  // Thêm thuốc vào kế hoạch 1: Tăng huyết áp
  const med1_1 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan1.plan_id,
      name: "Amlodipine",
      dosage: "5mg",
      times: ["08:00"],
      type: "Thuốc hạ huyết áp",
      description: "Giảm huyết áp bằng cách làm giãn mạch máu, giúp tim bơm máu dễ dàng hơn",
    },
  })

  const med1_2 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan1.plan_id,
      name: "Bisoprolol",
      dosage: "2.5mg",
      times: ["08:00"],
      type: "Thuốc chẹn beta",
      description: "Giảm nhịp tim và sức co bóp của tim, giúp kiểm soát huyết áp và ngăn ngừa đau tim",
    },
  })

  // Thêm thuốc vào kế hoạch 2: Viêm loét dạ dày
  const med2_1 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan2.plan_id,
      name: "Omeprazole",
      dosage: "20mg",
      times: ["07:30"],
      type: "Thuốc ức chế bơm proton",
      description: "Giảm sản xuất axit dạ dày, giúp chữa lành vết loét và giảm triệu chứng ợ nóng",
    },
  })

  const med2_2 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan2.plan_id,
      name: "Clarithromycin",
      dosage: "500mg",
      times: ["08:00", "20:00"],
      type: "Thuốc kháng sinh",
      description: "Tiêu diệt vi khuẩn Helicobacter pylori gây loét dạ dày",
    },
  })

  const med2_3 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan2.plan_id,
      name: "Amoxicillin",
      dosage: "1g",
      times: ["08:00", "20:00"],
      type: "Thuốc kháng sinh",
      description: "Tiêu diệt vi khuẩn gây nhiễm trùng, thường dùng kết hợp trong điều trị loét dạ dày",
    },
  })

  // Thêm thuốc vào kế hoạch 3: Rối loạn lipid máu
  const med3_1 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan3.plan_id,
      name: "Rosuvastatin",
      dosage: "10mg",
      times: ["21:00"],
      type: "Thuốc statin",
      description: "Giảm cholesterol xấu (LDL) và triglyceride, tăng cholesterol tốt (HDL) trong máu",
    },
  })

  const med3_2 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan3.plan_id,
      name: "Fenofibrate",
      dosage: "160mg",
      times: ["08:00"],
      type: "Thuốc giảm triglyceride",
      description: "Giảm mức triglyceride và cholesterol xấu, giúp cải thiện hồ sơ lipid máu",
    },
  })

  // Thêm thuốc vào kế hoạch 4: Dự phòng tim mạch (cho vợ)
  const med4_1 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan4.plan_id,
      name: "Aspirin",
      dosage: "75mg",
      times: ["08:00"],
      type: "Thuốc chống đông máu",
      description: "Ngăn ngừa hình thành cục máu đông, giảm nguy cơ đột quỵ và nhồi máu cơ tim",
    },
  })

  const med4_2 = await prisma.medication.create({
    data: {
      plan_id: medicationPlan4.plan_id,
      name: "Atorvastatin",
      dosage: "10mg",
      times: ["21:00"],
      type: "Thuốc statin",
      description: "Giảm cholesterol và triglyceride, bảo vệ mạch máu và tim mạch",
    },
  })

  // Tạo nhật ký thuốc (MedicationLog) cho các ngày gần đây
  const today = new Date("2026-03-22")
  const medicationLogEntries = []

  // Logs cho Amlodipine và Bisoprolol (kế hoạch 1)
  for (let i = -7; i <= 0; i++) {
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() + i)
    logDate.setHours(8, 0, 0, 0)

    medicationLogEntries.push(
      {
        user_id: patient.user_id,
        medication_id: med1_1.medication_id,
        scheduled_time: new Date(logDate),
        taken_at: i < 0 ? new Date(logDate.getTime() + Math.random() * 3600000) : null,
        status: i < 0 ? (Math.random() > 0.15 ? "TAKEN" : "MISSED") : "PENDING",
      },
      {
        user_id: patient.user_id,
        medication_id: med1_2.medication_id,
        scheduled_time: new Date(logDate),
        taken_at: i < 0 ? new Date(logDate.getTime() + Math.random() * 3600000) : null,
        status: i < 0 ? (Math.random() > 0.15 ? "TAKEN" : "MISSED") : "PENDING",
      }
    )
  }

  // Logs cho Omeprazole (kế hoạch 2)
  for (let i = -5; i <= 0; i++) {
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() + i)
    logDate.setHours(7, 30, 0, 0)

    medicationLogEntries.push({
      user_id: patient.user_id,
      medication_id: med2_1.medication_id,
      scheduled_time: new Date(logDate),
      taken_at: i < 0 ? new Date(logDate.getTime() + Math.random() * 3600000) : null,
      status: i < 0 ? "TAKEN" : "PENDING",
    })
  }

  // Logs cho Rosuvastatin (kế hoạch 3)
  for (let i = -10; i <= 0; i++) {
    const logDate = new Date(today)
    logDate.setDate(logDate.getDate() + i)
    logDate.setHours(21, 0, 0, 0)

    medicationLogEntries.push({
      user_id: patient.user_id,
      medication_id: med3_1.medication_id,
      scheduled_time: new Date(logDate),
      taken_at: i < 0 ? new Date(logDate.getTime() + Math.random() * 3600000) : null,
      status: i < 0 ? (Math.random() > 0.1 ? "TAKEN" : "MISSED") : "PENDING",
    })
  }

  await prisma.medicationLog.createMany({
    data: medicationLogEntries,
    skipDuplicates: true,
  })

  // PhrOverview giả lập chung
  await prisma.phrOverview.create({
    data: {
      user_id: patient.user_id,
      personal_info: { fullName: "Nguyễn Văn An", dob: "1990-01-01", gender: "Nam", bloodType: "O+", phone: "0901234567" },
      vitals: { height: 170, weight: 65, bmi: 22.5, heartRate: 75, bloodPressure: "120/80" },
      medical_history: { personal: ["Viêm loét dạ dày"], family: [], allergies: ["Hải sản"], lifestyle: { smoking: "Không", alcohol: "Thỉnh thoảng", exercise: "Ít" } },
      clinical_results: { conclusion: { healthClass: "Loại II", advice: "Ăn uống điều độ, tránh thức khuya." } }
    }
  })

  // Bệnh sử theo đúng chuẩn Hồ sơ Sức khỏe (PHR) với các lần khám thực tế tại cơ sở y tế
  await prisma.medicalVisit.createMany({
    data: [
      {
        user_id: patient.user_id,
        facility: "Bệnh viện Chợ Rẫy",
        doctor_name: "BS. Nguyễn Văn Minh",
        diagnosis: "Tăng huyết áp vô căn (I10)",
        diagnosis_details: "Tăng huyết áp vô căn (nguyen phát). Rối loạn nhịp xoang nhẹ.",
        reason: "Thấy hồi hộp, tim đập nhanh.",
        tests: [
          { id: "att-1", name: "Ket_qua_xet_nghiem.pdf", type: "pdf", url: "#" },
          { id: "att-2", name: "ECG_Record.jpg", type: "image", url: "#" }
        ],
        prescription: [
          { name: "Amlodipine", dosage: "5mg", quantity: 30, usage: "Sáng 1 viên" },
          { name: "Bisoprolol", dosage: "2.5mg", quantity: 30, usage: "Sáng 1 viên" }
        ],
        advice: "Giảm ăn mặn, tập thể dục nhẹ nhàng. Đo huyết áp mỗi sáng.",
        appointment: "18/05/2026",
        visit_date: toDate("2026-04-18T08:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        facility: "Bệnh viện Đại học Y Dược",
        doctor_name: "BS. Lê Hữu Trí",
        diagnosis: "Viêm loét dạ dày - tá tràng",
        diagnosis_details: "Viêm loét hang vị dạ dày mức độ vừa, không có vi khuẩn HP.",
        reason: "Đau rát vùng thượng vị, ợ hơi nhiều, thỉnh thoảng buồn nôn.",
        tests: [
          { id: "att-3", name: "Noi_soi_da_day.pdf", type: "pdf", url: "#" }
        ],
        prescription: [
          { name: "Omeprazole", dosage: "20mg", quantity: 14, usage: "Sáng 1 viên trước ăn 30p" },
          { name: "Clarithromycin", dosage: "500mg", quantity: 28, usage: "Sáng 1 viên, tối 1 viên" },
          { name: "Amoxicillin", dosage: "1g", quantity: 28, usage: "Sáng 1 viên, tối 1 viên" }
        ],
        advice: "Kiêng chua cay, không thức khuya, chia nhỏ bữa ăn. Uống thuốc đúng giờ.",
        appointment: "15/06/2026",
        visit_date: toDate("2026-05-15T09:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        facility: "Phòng khám Đa khoa Tâm Anh",
        doctor_name: "BS. Trần Thị Thu",
        diagnosis: "Rối loạn lipid máu",
        diagnosis_details: "Tăng mỡ máu hỗn hợp (Cholesterol và Triglyceride nâng cao).",
        reason: "Khám sức khỏe tổng quát định kỳ do công ty tổ chức.",
        tests: [
          { id: "att-4", name: "MRI_Ket_qua.jpg", type: "image", url: "#" },
          { id: "att-5", name: "Mau_Tong_Quat.pdf", type: "pdf", url: "#" }
        ],
        prescription: [
          { name: "Rosuvastatin", dosage: "10mg", quantity: 30, usage: "Tối 1 viên" },
          { name: "Fenofibrate", dosage: "160mg", quantity: 30, usage: "Sáng 1 viên sau ăn" }
        ],
        advice: "Hạn chế đồ chiên xào, mỡ nội tạng. Tăng cường ăn rau xanh và tập cardio 30p/ngày.",
        appointment: "02/05/2026",
        visit_date: toDate("2026-04-02T14:45:00.000Z"),
      }
    ],
  })

  // Tạo lịch hẹn khám cho các thành viên gia đình
  await prisma.appointment.createMany({
    data: [
      // Lịch hẹn cho bệnh nhân chính với doctor1
      {
        patient_id: patient.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-05-18T00:00:00.000Z"),
        start_time: toDate("2026-05-18T08:00:00.000Z"),
        end_time: toDate("2026-05-18T08:30:00.000Z"),
        reason: "Tái khám sau 1 tháng điều trị",
        type: "OFFLINE",
        status: "COMPLETED",
        doctor_note: "Kết quả khám tốt, tiếp tục điều trị",
      },
      {
        patient_id: patient.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-06-15T00:00:00.000Z"),
        start_time: toDate("2026-06-15T09:00:00.000Z"),
        end_time: toDate("2026-06-15T09:30:00.000Z"),
        reason: "Tái khám kiểm tra huyết áp",
        type: "OFFLINE",
        status: "APPROVED",
        doctor_note: "Khám định kỳ hàng tháng",
      },
      {
        patient_id: patient.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-07-20T00:00:00.000Z"),
        start_time: toDate("2026-07-20T08:30:00.000Z"),
        end_time: toDate("2026-07-20T09:00:00.000Z"),
        reason: "Kiểm tra ECG định kỳ",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Mang theo kết quả ECG nhà",
      },
      {
        patient_id: patient.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-08-10T00:00:00.000Z"),
        start_time: toDate("2026-08-10T14:00:00.000Z"),
        end_time: toDate("2026-08-10T14:45:00.000Z"),
        reason: "Tái khám sau 3 tháng điều trị",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Mang theo hóa đơn thuốc",
      },
      {
        patient_id: patient.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2027-01-15T00:00:00.000Z"),
        start_time: toDate("2027-01-15T08:00:00.000Z"),
        end_time: toDate("2027-01-15T08:45:00.000Z"),
        reason: "Tái khám cuối năm",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Kiểm tra toàn diện sau 6 tháng",
      },

      // Lịch hẹn cho bệnh nhân chính với doctor2
      {
        patient_id: patient.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-05-20T00:00:00.000Z"),
        start_time: toDate("2026-05-20T09:00:00.000Z"),
        end_time: toDate("2026-05-20T09:45:00.000Z"),
        reason: "Khám sức khỏe tổng quát",
        type: "OFFLINE",
        status: "COMPLETED",
        doctor_note: "Kết quả xét nghiệm ổn, tiếp tục theo dõi",
      },
      {
        patient_id: patient.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-07-15T00:00:00.000Z"),
        start_time: toDate("2026-07-15T10:00:00.000Z"),
        end_time: toDate("2026-07-15T10:45:00.000Z"),
        reason: "Kiểm tra cholesterol",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Làm thêm xét nghiệm mỡ máu",
      },

      // Lịch hẹn cho vợ với doctor1
      {
        patient_id: spouse.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-05-22T00:00:00.000Z"),
        start_time: toDate("2026-05-22T10:00:00.000Z"),
        end_time: toDate("2026-05-22T10:30:00.000Z"),
        reason: "Kiểm tra sức khỏe tim mạch",
        type: "OFFLINE",
        status: "COMPLETED",
        doctor_note: "Kết quả bình thường, tiếp tục theo dõi",
      },
      {
        patient_id: spouse.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2026-07-10T00:00:00.000Z"),
        start_time: toDate("2026-07-10T11:00:00.000Z"),
        end_time: toDate("2026-07-10T11:30:00.000Z"),
        reason: "Tái khám giữa năm",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Kiểm tra huyết áp và nhịp tim",
      },
      {
        patient_id: spouse.user_id,
        doctor_id: doctor1.user_id,
        appointment_date: toDate("2027-02-05T00:00:00.000Z"),
        start_time: toDate("2027-02-05T09:30:00.000Z"),
        end_time: toDate("2027-02-05T10:00:00.000Z"),
        reason: "Tái khám định kỳ",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Khám toàn diện định kỳ",
      },

      // Lịch hẹn cho vợ với doctor2
      {
        patient_id: spouse.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-04-20T00:00:00.000Z"),
        start_time: toDate("2026-04-20T15:00:00.000Z"),
        end_time: toDate("2026-04-20T15:45:00.000Z"),
        reason: "Khám sức khỏe tổng quát",
        type: "OFFLINE",
        status: "COMPLETED",
        doctor_note: "Xét nghiệm máu bình thường",
      },
      {
        patient_id: spouse.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-06-25T00:00:00.000Z"),
        start_time: toDate("2026-06-25T16:00:00.000Z"),
        end_time: toDate("2026-06-25T16:45:00.000Z"),
        reason: "Tái khám theo dõi",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Theo dõi huyết áp và mỡ máu",
      },
      {
        patient_id: spouse.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-09-10T00:00:00.000Z"),
        start_time: toDate("2026-09-10T14:30:00.000Z"),
        end_time: toDate("2026-09-10T15:15:00.000Z"),
        reason: "Khám cuối quý III",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Kiểm tra sức khỏe toàn diện",
      },

      // Lịch hẹn cho con với doctor2
      {
        patient_id: child.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2026-06-01T00:00:00.000Z"),
        start_time: toDate("2026-06-01T10:00:00.000Z"),
        end_time: toDate("2026-06-01T10:30:00.000Z"),
        reason: "Khám sức khỏe định kỳ",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Khám sức khỏe hàng năm",
      },
      {
        patient_id: child.user_id,
        doctor_id: doctor2.user_id,
        appointment_date: toDate("2027-03-15T00:00:00.000Z"),
        start_time: toDate("2027-03-15T11:00:00.000Z"),
        end_time: toDate("2027-03-15T11:30:00.000Z"),
        reason: "Tái khám sức khỏe",
        type: "OFFLINE",
        status: "PENDING",
        doctor_note: "Khám toàn diện định kỳ",
      },
    ],
  })

  console.log(
    "Seed thành công: 4 người dùng gia đình, 6 bác sĩ có hồ sơ chi tiết, trong đó 4 bác sĩ chưa được thuê, 4 đánh giá bác sĩ, 1 thiết bị ECG, 8 reading ECG, 4 alert, 6 báo cáo y tế, 16 chat AI, 4 quyền truy cập gia đình, 24+ direct message, 2 notification, 3 bệnh sử, 4 kế hoạch uống thuốc, 10 loại thuốc và 100+ bản ghi nhắc thuốc, 13 lịch hẹn khám."
  )
  console.log(
    `Tài khoản mẫu: ${patient.email} (bệnh nhân), ${spouse.email} (vợ), ${child.email} (con), ${family.email} (gia đình), ${doctor1.email}, ${doctor2.email}, ${doctor3.email}, ${doctor4.email}, ${doctor5.email}, ${doctor6.email} (các bác sĩ), ${admin.email} (admin) | mật khẩu chung: 123456`
  )
}

main()
  .catch((error) => {
    console.error("Seed lỗi:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
