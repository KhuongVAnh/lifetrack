/**
 * Dịch vụ gửi Email (Mock)
 * - Trong môi trường Production, bạn sẽ tích hợp Nodemailer kết hợp với SendGrid, Amazon SES hoặc Gmail SMTP.
 * - Hiện tại, hàm này chỉ log ra console để giả lập việc gửi mail thành công.
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    // TODO: Khởi tạo transporter Nodemailer ở đây khi có thông tin SMTP từ .env
    /*
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({ from: '"LifeTrack" <noreply@lifetrack.com>', to, subject, text, html });
    */

    console.log('\n=======================================');
    console.log(`✉️  [MOCK EMAIL CỦA LIFETRACK ĐÃ ĐƯỢC GỬI]`);
    console.log(`Đến: ${to}`);
    console.log(`Chủ đề: ${subject}`);
    console.log(`Nội dung:\n${text}`);
    console.log('=======================================\n');

    return true;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    return false;
  }
};
