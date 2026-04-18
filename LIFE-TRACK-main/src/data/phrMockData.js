export const mockPhrOverview = {
  // 1. Thông tin hành chính
  personalInfo: {
    fullName: "Nguyễn Văn A",
    dob: "15/08/1980",
    gender: "Nam",
    idCard: "079080012345",
    insuranceCard: "DN4791234567890",
    bloodType: "O+",
    phone: "0901234567",
    address: "Quận 1, TP. Hồ Chí Minh",
    emergencyContact: {
      name: "Trần Thị B",
      relation: "Vợ",
      phone: "0912345678"
    }
  },
  // 2. Chỉ số thể lực
  vitals: {
    height: 170, // cm
    weight: 68, // kg
    bmi: 23.5, // Có thể tự tính
    heartRate: 72,
    bloodPressure: "120/80",
    temperature: 36.8,
    respiratoryRate: 16
  },
  // 3. Tiền sử y tế
  medicalHistory: {
    personal: ["Cao huyết áp", "Rối loạn nhịp tim nhẹ"],
    family: ["Bố bị nhồi máu cơ tim"],
    allergies: ["Penicillin", "Phấn hoa"],
    lifestyle: {
      smoking: "Không hút thuốc",
      alcohol: "Thỉnh thoảng (1-2 lần/tháng)",
      exercise: "Vận động nhẹ (đi bộ 30p mỗi ngày)"
    }
  },
  // 4. Kết quả khám (gần nhất)
  clinicalResults: {
    clinical: {
      internal: "Tim mạch ổn định, phổi trong",
      surgical: "Chưa ghi nhận bất thường",
      eyes: "10/10 (không kính)",
      ent: "Bình thường",
      dental: "Sâu răng nhẹ",
      dermatology: "Bình thường"
    },
    subclinical: {
      bloodTest: "Đường huyết ổn định (5.2 mmol/L), mỡ máu hơi cao (Cholesterol 5.8 mmol/L), chức năng gan/thận bình thường.",
      imaging: "X-quang tim phổi: Bóng tim không to. Siêu âm ổ bụng: Gan nhiễm mỡ độ 1.",
      functional: "ECG: Nhịp xoang đều, tần số 72 l/p."
    },
    conclusion: {
      healthClass: "Loại II",
      advice: "Kiểm soát chế độ ăn giảm dầu mỡ, theo dõi huyết áp thường xuyên."
    }
  }
};

export const mockPhrVisits = [
  {
    id: "visit-001",
    date: "18/04/2026",
    facility: "Bệnh viện Chợ Rẫy",
    doctor: "BS. Nguyễn Văn Minh",
    diagnosisName: "Tăng huyết áp vô căn (I10)",
    // Detail data
    reason: "Thấy hồi hộp, tim đập nhanh.",
    attachments: [
      { id: "att-1", name: "Ket_qua_xet_nghiem.pdf", type: "pdf", url: "#" },
      { id: "att-2", name: "ECG_Record.jpg", type: "image", url: "#" }
    ],
    diagnosisDetail: "Tăng huyết áp vô căn (nguyên phát). Rối loạn nhịp xoang nhẹ.",
    prescriptions: [
      { name: "Amlodipine", dosage: "5mg", quantity: 30, usage: "Sáng 1 viên" },
      { name: "Bisoprolol", dosage: "2.5mg", quantity: 30, usage: "Sáng 1 viên" }
    ],
    advice: "Giảm ăn mặn, tập thể dục nhẹ nhàng. Đo huyết áp mỗi sáng.",
    followUp: "18/05/2026"
  },
  {
    id: "visit-002",
    date: "20/12/2025",
    facility: "Phòng khám Đa khoa Tâm Anh",
    doctor: "ThS. BS Phạm Minh Ngọc",
    diagnosisName: "Rối loạn lipid máu",
    reason: "Khám sức khỏe định kỳ doanh nghiệp.",
    attachments: [
      { id: "att-3", name: "Phieu_kham_tong_quat.pdf", type: "pdf", url: "#" }
    ],
    diagnosisDetail: "Mỡ máu cao, gan nhiễm mỡ độ 1.",
    prescriptions: [
      { name: "Rosuvastatin", dosage: "10mg", quantity: 30, usage: "Tối 1 viên" }
    ],
    advice: "Hạn chế đồ chiên xào, nội tạng động vật. Tăng cường rau xanh.",
    followUp: "20/03/2026"
  },
  {
    id: "visit-003",
    date: "15/06/2025",
    facility: "Bệnh viện Đại học Y Dược",
    doctor: "BS. CKII Lê Minh Tâm",
    diagnosisName: "Viêm dạ dày cấp",
    reason: "Đau thượng vị, ợ hơi, buồn nôn.",
    attachments: [],
    diagnosisDetail: "Viêm loét dạ dày tá tràng âm tính HP.",
    prescriptions: [
      { name: "Omeprazole", dosage: "20mg", quantity: 14, usage: "Sáng 1 viên trước ăn 30p" },
      { name: "Phosphalugel", dosage: "Gói", quantity: 20, usage: "Trưa 1 gói, tối 1 gói sau ăn" }
    ],
    advice: "Ăn đúng bữa, tránh đồ chua cay, không thức khuya.",
    followUp: "Kham lai neu ko đớ"
  }
];
