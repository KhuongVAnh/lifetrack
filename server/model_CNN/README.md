# Model CNN Assets

Thư mục `server/model_CNN` là nơi chuẩn (canonical) chứa toàn bộ tài nguyên AI ECG để tích hợp vào backend Node.js.

Mục tiêu của thư mục này:
- Tập trung model và config ở một chỗ để tránh nhầm với `server/models` (MVC).
- Dùng chung cho các bước trong task plan `P0` -> `P6`.
- Làm nguồn đối chiếu khi kiểm thử parity Python vs Node.

## Cấu trúc thư mục

```text
server/model_CNN/
  ecg/
    preprocess_config.json
    label_map.json
    readings_with_id.json
  ecg_tfjs/
    model.json
    group1-shard1of1.bin
  scripts/
    p0_t05_generate_baseline.py
  baseline_p0_t05.json
  baseline_p0_t05.csv
```

## Ý nghĩa từng file

- `ecg_tfjs/model.json`, `ecg_tfjs/*.bin`:
  Model CNN đã export sang định dạng TFJS để backend Node có thể load trực tiếp.

- `ecg/preprocess_config.json`:
  Cấu hình tiền xử lý bắt buộc phải đồng nhất giữa train và infer:
  `fs`, bandpass filter, tham số tìm R-peak, `half_window`, `segment_len`, `scaler_mean`, `scaler_scale`, `classes`.

- `ecg/label_map.json`:
  Bản đồ mã nhãn model (ví dụ `N`, `Q`, `S`, `V`, `F`) sang nhãn hiển thị dễ đọc.

- `ecg/readings_with_id.json`:
  Dữ liệu ECG cá nhân để test/infer local.

- `scripts/p0_t05_generate_baseline.py`:
  Script tạo baseline cho task `P0-T05` theo pipeline beat-level đã khóa.

- `baseline_p0_t05.json`, `baseline_p0_t05.csv`:
  Kết quả baseline dùng để đối chiếu khi chạy infer trên Node (`P5 parity test`).

## Luồng P0-T05 (dễ hiểu)

Script baseline chạy theo các bước:
1. Đọc `readings_with_id.json`.
2. Nối toàn bộ `reading` thành một tín hiệu dài.
3. Cắt đoạn tín hiệu để test (`30000:59000`).
4. Lọc bandpass (Butterworth + `filtfilt`).
5. Detect R-peaks bằng `find_peaks`.
6. Cắt segment quanh mỗi peak (125 mẫu).
7. Chuẩn hóa bằng `scaler_mean/scaler_scale` từ config (không fit lại scaler).
8. Predict từng beat, xuất nhãn + confidence.
9. Lưu output ra `baseline_p0_t05.json/csv`.

## Cách chạy nhanh

```bash
python server/model_CNN/scripts/p0_t05_generate_baseline.py
```

Kết quả mong đợi hiện tại:
- Tạo được 150 dòng baseline (theo cấu hình đã chốt).
- Mỗi dòng gồm: `beat_index`, `peak_sample`, `segment_start`, `segment_end`, `label`, `confidence`.

## Lưu ý quan trọng

- Không đặt model AI trong `server/models` (dễ nhầm với mô hình MVC).
- Các biến môi trường AI mặc định đang trỏ về `server/model_CNN/...`.
- Nếu thay đổi `preprocess_config.json`, cần tạo lại baseline để parity test vẫn đáng tin cậy.
