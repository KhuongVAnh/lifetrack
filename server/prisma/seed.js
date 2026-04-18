import { PrismaClient, UserRole, DeviceStatus, AccessRole, AccessStatus, ChatRole } from "@prisma/client";
import { hashPass } from "../services/authService.js";

const prisma = new PrismaClient();

async function main() {
    const j = (v) => JSON.stringify(v);

    // Xóa dữ liệu theo thứ tự để tránh lỗi FK
    await prisma.alert.deleteMany();
    await prisma.reading.deleteMany();
    await prisma.device.deleteMany();
    await prisma.report.deleteMany();
    await prisma.chatLog.deleteMany();
    await prisma.accessPermission.deleteMany();
    await prisma.medicalHistory.deleteMany();
    await prisma.user.deleteMany();

    // Hash password mẫu
    const pwPatient = await hashPass("123456");
    const pwDoctor = await hashPass("123456");
    const pwFamily = await hashPass("123456");
    const pwAdmin = await hashPass("123456");

    // 1) Tạo 4 users (bệnh nhân, bác sĩ, gia đình, admin)
    const patient = await prisma.user.create({
        data: {
            name: "Nguyen Van A",
            email: "patient@example.com",
            password_hash: pwPatient,
            role: UserRole.BENH_NHAN,
            is_active: true,
        },
    });

    const doctor = await prisma.user.create({
        data: {
            name: "BS. Tran Thi B",
            email: "doctor@example.com",
            password_hash: pwDoctor,
            role: UserRole.BAC_SI,
            is_active: true,
        },
    });

    const family = await prisma.user.create({
        data: {
            name: "Le Van C",
            email: "family@example.com",
            password_hash: pwFamily,
            role: UserRole.GIA_DINH,
            is_active: true,
        },
    });

    const admin = await prisma.user.create({
        data: {
            name: "Quan tri vien",
            email: "admin@example.com",
            password_hash: pwAdmin,
            role: UserRole.ADMIN,
            is_active: true,
        },
    });

    // 2) Device cho bệnh nhân
    const device = await prisma.device.create({
        data: {
            user_id: patient.user_id,
            serial_number: "SN-ECG-0001",
            status: DeviceStatus.DANG_HOAT_DONG,
        },
    });

    // 3) Readings cho device
    const reading1 = await prisma.reading.create({
        data: {
            device_id: device.device_id,
            heart_rate: 78,
            ecg_signal: [0.01, 0.02, 0.05, 0.01, -0.02, 0.03, 0.06],
            abnormal_detected: false,
            ai_result: "Normal sinus rhythm",
        },
    });

    const reading2 = await prisma.reading.create({
        data: {
            device_id: device.device_id,
            heart_rate: 120,
            ecg_signal: [0.02, 0.08, 0.15, 0.05, -0.04, 0.1, 0.2],
            abnormal_detected: true,
            ai_result: "Tachycardia suspected",
        },
    });

    // 4) Alerts (cả 2 alert đều gắn với reading)
    await prisma.alert.createMany({
        data: [
            {
                user_id: patient.user_id,
                reading_id: reading2.reading_id,
                alert_type: "ABNORMAL_ECG",
                message: "Phat hien tin hieu ECG bat thuong. Vui long kiem tra lai.",
                resolved: false,
            },
            {
                user_id: patient.user_id,
                reading_id: reading1.reading_id,
                alert_type: "DEVICE_INFO",
                message: "Thiết bị đã kết nối và đang hoạt động bình thường.",
                resolved: true,
            },
        ],
    });

    // 5) Report: bệnh nhân có report do bác sĩ tạo/duyệt
    await prisma.report.create({
        data: {
            user_id: patient.user_id,
            doctor_id: doctor.user_id,
            summary: "Benh nhan co dau hieu nhip nhanh thoang qua. Khuyen nghi theo doi them 7 ngay.",
        },
    });

    // 6) ChatLog: log hội thoại giữa bệnh nhân và bot
    await prisma.chatLog.createMany({
        data: [
            {
                user_id: patient.user_id,
                role: ChatRole.user,
                message: "Minh thay hoi hoi hop, co sao khong?",
            },
            {
                user_id: patient.user_id,
                role: ChatRole.bot,
                message: "Bạn nên nghỉ ngơi, đo lại nhịp tim. Nếu nhịp cao kéo dài hoặc chóng mặt, hãy liên hệ bác sĩ.",
            },
        ],
    });

    // 7) AccessPermission: bệnh nhân chia sẻ cho bác sĩ + gia đình
    await prisma.accessPermission.createMany({
        data: [
            {
                patient_id: patient.user_id,
                viewer_id: doctor.user_id,
                role: AccessRole.BAC_SI,
                status: AccessStatus.accepted,
            },
            {
                patient_id: patient.user_id,
                viewer_id: family.user_id,
                role: AccessRole.GIA_DINH,
                status: AccessStatus.pending,
            },
        ],
    });

    // 8) MedicalHistory: 1 record có ai_diagnosis, 1 record có doctor_diagnosis
    await prisma.medicalHistory.createMany({
        data: [
            {
                user_id: patient.user_id,
                doctor_id: null,
                ai_diagnosis: "Kha nang nhip nhanh xoang, can loai tru yeu to stress/caffeine.",
                symptoms: j(["hoi hop", "tim dap nhanh"]),
                medication: j([]),
                condition: j({ status: "theo doi", level: "nhe" }),
                notes: j([
                    "Han che caffeine",
                    "Ngu du giac",
                    "Do lai nhip tim neu kho chiu",
                ]),
            },
            {
                user_id: patient.user_id,
                doctor_id: doctor.user_id,
                doctor_diagnosis: "Nhip nhanh xoang do lo au (tam thoi).",
                symptoms: j(["hoi hop", "kho ngu"]),
                medication: j(["Magie", "dieu chinh loi song"]),
                condition: j({ status: "on dinh", followUpDays: 14 }),
                notes: j(["Tai kham sau 2 tuan neu con trieu chung"]),
            },
        ],
    });

    console.log("Seed thanh cong: 4 users (co admin) + du lieu mau cac bang lien quan");
}

main()
    .catch((e) => {
        console.error("Seed loi:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
