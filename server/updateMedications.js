const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateMedications() {
  // Update medications with type and description
  const updates = [
    { name: 'Amlodipine', type: 'Thuốc hạ huyết áp', description: 'Giảm huyết áp bằng cách làm giãn mạch máu, giúp tim bơm máu dễ dàng hơn' },
    { name: 'Bisoprolol', type: 'Thuốc chẹn beta', description: 'Giảm nhịp tim và sức co bóp của tim, giúp kiểm soát huyết áp và ngăn ngừa đau tim' },
    { name: 'Omeprazole', type: 'Thuốc ức chế bơm proton', description: 'Giảm sản xuất axit dạ dày, giúp chữa lành vết loét và giảm triệu chứng ợ nóng' },
    { name: 'Clarithromycin', type: 'Thuốc kháng sinh', description: 'Tiêu diệt vi khuẩn Helicobacter pylori gây loét dạ dày' },
    { name: 'Amoxicillin', type: 'Thuốc kháng sinh', description: 'Tiêu diệt vi khuẩn gây nhiễm trùng, thường dùng kết hợp trong điều trị loét dạ dày' },
    { name: 'Rosuvastatin', type: 'Thuốc statin', description: 'Giảm cholesterol xấu (LDL) và triglyceride, tăng cholesterol tốt (HDL) trong máu' },
    { name: 'Fenofibrate', type: 'Thuốc giảm triglyceride', description: 'Giảm mức triglyceride và cholesterol xấu, giúp cải thiện hồ sơ lipid máu' },
    { name: 'Aspirin', type: 'Thuốc chống đông máu', description: 'Ngăn ngừa hình thành cục máu đông, giảm nguy cơ đột quỵ và nhồi máu cơ tim' },
    { name: 'Atorvastatin', type: 'Thuốc statin', description: 'Giảm cholesterol và triglyceride, bảo vệ mạch máu và tim mạch' },
  ];

  for (const update of updates) {
    await prisma.medication.updateMany({
      where: { name: update.name },
      data: { type: update.type, description: update.description },
    });
  }

  console.log('✅ Updated medications with type and description');
}

updateMedications()
  .catch(console.error)
  .finally(() => prisma.$disconnect());