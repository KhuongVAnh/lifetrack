# Tài liệu Hướng dẫn Hệ thống Thiết kế (Design System)

## 1. Tổng quan & Creative North Star: "Sự An Tâm Tĩnh Lặng" (The Serene Guardian)

Hệ thống thiết kế này không chỉ là một bộ quy tắc giao diện; nó là một cam kết về sự tin cậy và minh bạch dành cho sức khỏe. Creative North Star của chúng ta là **"Sự An Tâm Tĩnh Lặng"**. 

Thay vì sử dụng các lưới (grid) cứng nhắc và các đường kẻ phân cách truyền thống, hệ thống này tập trung vào sự chuyển tiếp mềm mại, phân cấp thị giác bằng các mảng màu tinh tế và khoảng trắng hào phóng. Đối với người lớn tuổi, sự rõ ràng không đến từ việc làm mọi thứ to hơn, mà đến từ việc loại bỏ "tiếng ồn" thị giác. Chúng ta tạo ra một trải nghiệm mang tính "biên tập cao cấp" (high-end editorial) – nơi thông tin y tế được trình bày như một tạp chí sức khỏe sang trọng, chứ không phải một bảng tính khô khan.

**Nguyên tắc cốt lõi:**
*   **Bất đối xứng có ý đồ:** Sử dụng khoảng trắng lớn để dẫn dắt mắt người dùng vào các thông số sức khỏe quan trọng.
*   **Xếp lớp (Layering):** Tạo chiều sâu bằng các lớp "kính mờ" (Glassmorphism) thay vì bóng đổ đen đậm.
*   **Tiếng Việt làm trọng tâm:** Tận dụng độ cao của dấu câu trong tiếng Việt để điều chỉnh khoảng cách dòng (line-height), đảm bảo sự dễ đọc tuyệt đối.

---

## 2. Màu sắc (Colors) & Hệ thống Bề mặt

Hệ thống sử dụng bảng màu Material Design 3 đã được tinh chỉnh để tạo cảm giác y tế hiện đại nhưng vẫn ấm áp.

*   **Primary (`#004976`):** Medical Blue – Đại diện cho sự chuyên nghiệp và ổn định.
*   **Secondary (`#1b6d24`):** Health Green – Đại diện cho sự phục hồi và sức sống.
*   **Surface & Background:** Sử dụng dải màu từ `surface-container-lowest` (#ffffff) đến `surface-dim` (#d7dadc).

### Quy tắc "Không đường kẻ" (The No-Line Rule)
Tuyệt đối không sử dụng đường kẻ (border) 1px để phân chia các phần. Ranh giới giữa các khối nội dung phải được định nghĩa bằng:
1.  **Sự thay đổi sắc thái (Tonal shifts):** Một thẻ (card) màu `surface-container-lowest` đặt trên nền `surface-container-low`.
2.  **Khoảng trắng (White space):** Sử dụng các bước nhảy lớn trong hệ thống spacing để tạo ranh giới tự nhiên.

### Hiệu ứng Glassmorphism & Gradient
Để tránh cảm giác "phẳng" rẻ tiền, hãy sử dụng:
*   **Signature Textures:** Sử dụng Gradient tuyến tính nhẹ nhàng từ `primary` sang `primary_container` cho các nút bấm quan trọng nhất để tạo độ khối và chiều sâu.
*   **Frosted Glass:** Các thanh điều hướng hoặc thông báo nổi nên sử dụng màu `surface` với độ mờ (opacity) 80% và hiệu ứng `backdrop-blur(16px)`.

---

## 3. Typography: Hệ thống Chữ viết trực quan

Chúng ta sử dụng **Public Sans** – một font chữ không chân hiện đại, trung tính và cực kỳ dễ đọc ở mọi kích thước.

*   **Display (Lớn):** Dành cho các con số chỉ số sức khỏe (nhịp tim, huyết áp). Sử dụng `display-lg` (3.5rem) để tạo điểm nhấn thị giác mạnh mẽ.
*   **Headline (Tiêu đề):** Sử dụng `headline-lg` (2rem) cho các mục lớn như "Chào buổi sáng, Bác sĩ Minh". Độ tương phản cao giữa tiêu đề và nội dung giúp người lớn tuổi dễ dàng quét thông tin.
*   **Body (Nội dung):** Mặc định sử dụng `body-lg` (1rem) cho tất cả văn bản đọc. Không bao giờ sử dụng cỡ chữ nhỏ hơn 14px cho các thông tin quan trọng.
*   **Ngôn ngữ:** Toàn bộ thuật ngữ phải sử dụng tiếng Việt thuần túy, tránh thuật ngữ kỹ thuật khó hiểu (Ví dụ: Thay vì "Sync data", dùng "Cập nhật dữ liệu").

---

## 4. Chiều sâu & Sự phân lớp (Elevation & Depth)

Chúng ta loại bỏ khái niệm "shadow" (bóng đổ) truyền thống và thay thế bằng **Tonal Layering (Phân lớp sắc thái)**.

*   **Nguyên tắc xếp chồng:** 
    *   Lớp nền: `surface` (#f7fafc)
    *   Lớp nội dung nhóm: `surface-container-low` (#f1f4f6)
    *   Lớp thẻ chi tiết (Card): `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** Nếu cần làm nổi bật một phần tử nổi (Floating Action Button), bóng đổ phải có độ nhòe (blur) cực lớn (30px-40px) và độ đậm chỉ từ 4-6%, sử dụng màu của `on-surface` thay vì màu đen.
*   **Ghost Border:** Nếu bắt buộc phải dùng viền (như trong Input fields), hãy sử dụng màu `outline-variant` với độ trong suốt 20%.

---

## 5. Thành phần (Components)

### Nút bấm (Buttons)
*   **Kích thước:** Chiều cao tối thiểu 56px (Large) để dễ dàng thao tác bằng ngón cái, đặc biệt với người dùng có khớp tay không linh hoạt.
*   **Bo góc:** Sử dụng `rounded-md` (0.75rem) cho cảm giác an toàn, thân thiện. Tránh góc nhọn hoặc bo tròn hoàn toàn (pill-shape) để giữ vẻ chuyên nghiệp.

### Thẻ chỉ số (Health Cards)
*   **Cấu trúc:** Không dùng đường kẻ ngang. Sử dụng `title-lg` cho tên chỉ số và `display-sm` cho giá trị.
*   **Trạng thái:** Dùng màu `error` (#ba1a1a) cho các chỉ số nguy hiểm, nhưng phải đi kèm với icon cảnh báo trực quan, không chỉ dựa vào màu sắc (hỗ trợ người mù màu).

### Trường nhập liệu (Input Fields)
*   **Thiết kế:** Dạng "Filled" với nền `surface-container-high`, bo góc nhẹ. Nhãn (label) luôn hiển thị, không sử dụng placeholder làm nhãn để tránh gây nhầm lẫn khi người dùng bắt đầu gõ.

### Thành phần đặc thù (Medical Context)
*   **Biểu đồ xu hướng:** Sử dụng đường cong mềm mại (spline) thay vì đường gấp khúc để giảm cảm giác căng thẳng.
*   **Timeline thuốc:** Các mốc thời gian dùng thuốc được thiết kế như một chuỗi các hạt ngọc (beads) lớn, dễ nhấn để đánh dấu đã uống.

---

## 6. Những điều Nên & Không nên (Do's & Don'ts)

### Nên (Do):
*   **Ưu tiên độ tương phản:** Đảm bảo văn bản trên nền luôn đạt chuẩn WCAG AA trở lên.
*   **Tăng kích thước vùng chạm:** Mọi nút bấm hoặc liên kết phải có vùng nhận diện cảm ứng tối thiểu 44x44pt.
*   **Sử dụng Icon trực quan:** Các icon y tế (hình trái tim, viên thuốc, nhiệt kế) phải đơn giản, nét vẽ dày đồng nhất.

### Không nên (Don'ts):
*   **Không sử dụng Divider:** Tuyệt đối không dùng các đường kẻ ngang mảnh để chia danh sách. Hãy dùng khoảng cách `1.5rem` hoặc thay đổi nhẹ màu nền của từng dòng.
*   **Không dùng màu tương phản quá gắt:** Tránh dùng màu đỏ tươi hoặc xanh neon gây nhức mắt. Sử dụng bảng màu đã chỉ định để tạo cảm giác an tâm.
*   **Không sử dụng chữ in hoa quá mức:** Chữ in hoa (ALL CAPS) rất khó đọc đối với người lớn tuổi. Chỉ dùng cho các nhãn (label) rất ngắn.

---
**Ghi chú của Giám đốc Sáng tạo:** 
*Hệ thống thiết kế này thành công khi người dùng cảm thấy họ đang tương tác với một người trợ lý y tế tận tâm, chứ không phải một cỗ máy. Hãy để khoảng trắng được "thở", để màu sắc được "vỗ về" và để kiểu chữ "dẫn lối".*