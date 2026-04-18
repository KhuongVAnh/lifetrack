# Hoàn thành tái cấu trúc Trang Hồ sơ Sức khỏe (PHR)

Theo yêu cầu, toàn bộ trang Hồ sơ sức khỏe cũ đã được dỡ bỏ và thay thế bằng trải nghiệm mới với **2 trang con (sub-routes)** rõ ràng, sử dụng Mock Data do bạn cung cấp.

## Cấu trúc định tuyến mới

Route `/patient/phr` giờ đây được điều khiển bởi một Layout bọc ngoài (`PatientPhrShell`), giúp tách biệt hoàn toàn 2 khối chức năng để giảm tải thông tin trên một màn hình:

- **[Khối 1] Tổng quan sức khỏe (`/patient/phr`):** Cấp độ Dashboard
- **[Khối 2] Lịch sử khám bệnh (`/patient/phr/history`):** Cấp độ Timeline Dòng thời gian

---

## Chi tiết các màn hình

### 1. Màn hình Tổng quan sức khỏe (Dashboard)
Trang tổng quan được thiết kế dạng lưới (Grid) 2 cột, chia lưới thông tin sạch sẽ làm 4 hộp rõ ràng:
1. **Hành chính & Định danh:** Các thông tin cá nhân cơ bản và Liên hệ khẩn cấp nổi bật (màu cam).
2. **Sinh tồn & Thể lực:** Hiện các chỉ số Vitals, **Mục BMI** có logic tự động tính khi chỉnh sửa Chiều cao / Cân nặng.
3. **Tiền sử y tế:** Danh sách dạng mảng.
4. **Lâm sàng & Cận lâm sàng.**

> [!TIP]
> **Chế độ chỉnh sửa thông minh (Edit Mode):** Ở góc trên bên phải có nút **Chỉnh sửa**. Giao diện cho phép người bệnh điền lại các thông số. Các danh sách (như Dị ứng, Bệnh mạn tính) cho phép nhập vào dưới định dạng chuỗi cách nhau bằng dấu phẩy và tự động tách. (Vì đây là Mock Data nên dữ liệu sẽ tạm reset khi bạn tải lại trang).

### 2. Màn hình Lịch sử khám (Timeline)
Trang hiển thị dòng thời gian thăm khám tại các cơ sở y tế với:
- Một dải UI bo góc kéo dọc xuống, đánh dấu mốc thời gian.
- Giao diện Card (Thẻ) với các mục được rút gọn: Tên bệnh viện, Bác sĩ, Ngày khám và Chẩn đoán chính để người bệnh nhìn lướt nhanh chóng.

### 3. Cửa sổ chi tiết lượt khám (Modal Popup)
Khi nhấp vào dòng thời gian của bất kỳ lượt khám nào, một Popup (`PhrVisitDetailModal`) nổi lên với đầy đủ thông tin:
- **Lý do khám / Triệu chứng ban đầu**
- Các file hình ảnh phim / X-quang được đính kèm (sử dụng Material Icon mô phỏng thư viện đính kèm).
- Chẩn đoán xác định của bác sĩ chuyên khoa.
- **Đơn thuốc chia làm nhiều gói thông minh**: Tách biệt thành từng liều lượng, cách dùng, giúp người bệnh không bị nhầm lẫn.
- Lời dặn dò, lịch tái khám được nổi bật rõ.

> [!NOTE]
> Tính năng đã ở trạng thái sẵn sàng để đồng bộ với Database khi bạn cần. Hiện tại nó chạy 100% bằng dữ liệu trong file `src/data/phrMockData.js`.
