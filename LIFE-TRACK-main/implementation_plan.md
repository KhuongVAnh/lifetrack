# Kế hoạch triển khai Trang Hồ sơ sức khỏe (PHR) mới

Dựa theo yêu cầu thiết kế UI "Hồ sơ khám sức khỏe tổng quát" thành 2 phần tách biệt và có route riêng, tôi sẽ cấu trúc lại mã nguồn Frontend. Hiện tại, chúng ta sẽ tập trung vào **giao diện (UI)** và dùng **dữ liệu giả (Mock Data)**.

## ⚠️ User Review Required
Vui lòng kiểm tra lại cấu trúc URL (Routing) dưới đây xem đã đúng với mong muốn về "2 route nhỏ" của bạn hay chưa:
- `/patient/phr` (Mặc định): Mở **Phần 1 - Thông tin tổng quan** (Dashboard có thể chỉnh sửa).
- `/patient/phr/history`: Mở **Phần 2 - Lịch sử y tế** (Dạng Timeline / List, click vào sẽ có Popup).

Cấu trúc component `PatientPhrPage.jsx` cũ sẽ bị loại bỏ hoàn toàn và được thay thế bằng một Layout Shell chứa Navbar điều hướng giữa 2 phần này.

---

## Proposed Changes

### `src/router.jsx`
Cập nhật lại phần định tuyến của `phr`.

#### [MODIFY] src/router.jsx
Sẽ đổi cấu trúc của thuộc tính `path: "phr"` thành dạng có `children`:
```jsx
{
  path: "phr",
  element: <PatientPhrShell />, // Thay thế PatientPhrPage cũ 
  children: [
    {
      index: true,
      element: <PhrOverviewPage />, // Phần 1
    },
    {
      path: "history",
      element: <PhrHistoryPage />, // Phần 2
    }
  ]
}
```

---

### UI Components Mới

#### [NEW] `src/pages/phr/PatientPhrShell.jsx`
- Layout chính của trang Hồ sơ sức khỏe.
- Chứa Header (Ví dụ: "Hồ sơ sức khỏe cá nhân") và 2 nút Tabs / Navigation Link: `Tổng quan` & `Lịch sử khám`.
- Sử dụng `<Outlet />` để render Phần 1 hoặc Phần 2 ở bên dưới.

#### [NEW] `src/pages/phr/PhrOverviewPage.jsx`
- Tương ứng với **Phần 1**.
- Chia giao diện thành các Section (Thẻ Card):
  1. Thông tin hành chính & Định danh (Họ tên, CCCD, Nhóm máu, Liên hệ khẩn cấp).
  2. Chỉ số thể lực & Sinh tồn (Có auto tính BMI).
  3. Tiền sử y tế (Cá nhân, gia đình, dị ứng, thói quen).
  4. Lâm sàng & Cận lâm sàng.
- **Tính năng UI:** Có một nút "Chỉnh sửa hồ sơ". Khi nhấn vào, các field text sẽ biến thành `<input>` để người dùng nhập liệu (hiện tại với mock data thì nhấn Lưu sẽ giữ tạm trên state component).

#### [NEW] `src/pages/phr/PhrHistoryPage.jsx`
- Tương ứng với **Phần 2**.
- Hiển thị danh sách các thẻ (Card) dọc theo dạng Timeline.
- Mỗi bản ghi hiển thị rút gọn: Ngày khám, Cơ sở, Bác sĩ, Chẩn đoán.

#### [NEW] `src/components/phr/PhrVisitDetailModal.jsx`
- Tương ứng với hộp thoại Popup (Cấp độ 2 của Phần 2).
- Nhận mock data chi tiết (Lý do khám, KQXN định dạng nút đính kèm PDF/Ảnh, Chẩn đoán xác định, Toa thuốc chi tiết Sáng/Trưa/Chiều/Tối, Chỉ định, Tái khám).
- Popup nổi lên khi click vào Card của `PhrHistoryPage.jsx`.

#### [DELETE] `src/pages/PatientPhrPage.jsx`
- Xóa bỏ file cũ không còn sử dụng. Thay tên export trong router. (Hoặc có thể tái chế file này thành Shell nhưng tên Shell/Layout sẽ tường minh hơn).

---

### Dữ liệu MockData

#### [MODIFY] `src/data/mockData.js`
- Thêm `mockPhrOverview`: Chứa cấu trúc JSON giả lập thông tin hành chính, chỉ số, cận lâm sàng, tiền sử.
- Thêm `mockPhrVisits`: Array chứa 3-4 bản ghi lịch sử khám chữa bệnh kèm chi tiết toa thuốc (sáng, trưa, chiều...) và link ảnh giả lập.

## Verification Plan

### Manual Verification
1. Click vào menu "Hồ sơ sức khỏe" ở Sidebar Frontend.
2. Kiểm tra phần 1 hiển thị ra 4 Box thông tin với Layout Dashboard. Thử click "Chỉnh sửa" xem UI thao tác có mượt không.
3. Chuyển sang Tab "Lịch sử khám", xem Timeline.
4. Click Thử vào một ngày khám, kiểm tra Modal Popup bung ra đầy đủ mục Toa thuốc, File xét nghiệm hay không.
