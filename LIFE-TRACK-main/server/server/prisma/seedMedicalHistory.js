import { PrismaClient, UserRole } from "@prisma/client"

const prisma = new PrismaClient()

const findUserByRoleOrEmail = async ({ email, role }) => {
  const byEmail = email
    ? await prisma.user.findUnique({ where: { email } })
    : null

  if (byEmail) return byEmail

  return prisma.user.findFirst({
    where: { role },
    orderBy: { user_id: "asc" },
  })
}

async function main() {
  const patient = await findUserByRoleOrEmail({
    email: "patient@example.com",
    role: UserRole.BENH_NHAN,
  })

  const doctor = await findUserByRoleOrEmail({
    email: "doctor@example.com",
    role: UserRole.BAC_SI,
  })

  if (!patient) {
    throw new Error("Không tìm thấy bệnh nhân để seed bệnh sử")
  }

  await prisma.medicalHistory.deleteMany({
    where: { user_id: patient.user_id },
  })

  await prisma.medicalHistory.createMany({
    data: [
      {
        user_id: patient.user_id,
        doctor_id: null,
        ai_diagnosis: "AI ghi nhận nhịp nhanh xoang nhẹ, chưa thấy dấu hiệu nguy hiểm.",
        symptoms: "Hồi hộp, tim đập nhanh khi leo cầu thang.",
        medication: "Chưa dùng thuốc. Uống đủ nước và giảm cà phê.",
        condition: "Theo dõi tại nhà, mức độ nhẹ.",
        notes: "Đo lại nhịp tim nếu cảm giác khó chịu kéo dài quá 5 phút.",
      },
      {
        user_id: patient.user_id,
        doctor_id: null,
        ai_diagnosis: "AI chưa ghi nhận bất thường mới, tiếp tục theo dõi thêm tại nhà.",
        symptoms: "Khó ngủ, mệt nhẹ vào cuối ngày.",
        medication: "Chưa cần thuốc. Nghỉ ngơi điều độ và hạn chế thức khuya.",
        condition: "Tình trạng ổn định, tiếp tục theo dõi thêm trong 1 tuần.",
        notes: "Ưu tiên ngủ trước 23h và tránh nước tăng lực vào buổi tối.",
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor?.user_id || null,
        doctor_diagnosis: "Nhịp nhanh xoang liên quan căng thẳng, chưa cần can thiệp thuốc đặc hiệu.",
        symptoms: "Hồi hộp khi căng thẳng, đôi lúc khó tập trung khi làm việc lâu.",
        medication: "Magie B6, điều chỉnh lối sống và tập thở chậm mỗi ngày.",
        condition: "Theo dõi thêm 14 ngày trước khi tái khám.",
        notes: "Nếu triệu chứng tăng lên hoặc xuất hiện đau ngực thì tái khám sớm hơn.",
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor?.user_id || null,
        doctor_diagnosis: "Tình trạng hiện tại ổn định, tiếp tục theo dõi định kỳ và giữ nhịp sinh hoạt lành mạnh.",
        symptoms: "Thỉnh thoảng hồi hộp, không đau ngực, không khó thở.",
        medication: "Theo dõi tại nhà, duy trì vận động nhẹ và ăn uống đều đặn.",
        condition: "Ổn định, có cải thiện so với lần tái khám trước.",
        notes: "Mang lịch sử bệnh sử khi tái khám và ghi lại thời điểm xuất hiện triệu chứng nếu tái phát.",
      },
    ],
  })

  console.log(`Đã seed 4 bản ghi bệnh sử cho bệnh nhân #${patient.user_id}`)
}

main()
  .catch((error) => {
    console.error("Seed bệnh sử lỗi:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
