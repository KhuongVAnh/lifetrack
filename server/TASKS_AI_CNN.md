# TASK PLAN: Tích Hợp CNN ECG Vào Backend Node (In-Process)

## Header Điều Hướng Nhanh
- Tên kế hoạch: `AI CNN Integration - Replace mockAIClassifier`
- Owner: `Local team (Bạn + Agents)`
- Trạng thái tổng: `In Progress`
- Ngày bắt đầu: `2026-02-25`
- Cập nhật gần nhất: `2026-02-25`
- Quy tắc tick task:
- `[ ]` chưa làm
- `[x]` đã xong
- `[-]` cancelled (giữ task, ghi lý do)

## Project Context Snapshot
- Backend stack hiện tại: `Express + Prisma + Socket.IO`.
- File tích hợp chính: `server/controllers/readingController.js`.
- Luồng AI giả hiện tại:
- Hàm `mockAIClassifier(ecgSignal)`.
- Được dùng trong `createFakeReading` và `receiveTelemetry`.
- Logic alert hiện tại:
- Sau khi có `ai_result`, hệ thống set `abnormal_detected`.
- Nếu bất thường, tạo `alert`, emit socket `alert`, tạo notification.
- Ràng buộc không được phá:
- Socket event hiện có: `reading-update`, `alert`, `fake-reading`.
- Notification service hiện có trong `server/services/notificationService`.
- Contract API hiện có không đổi ở phase này.

## Mục tiêu & Phạm vi
- Mục tiêu:
- Thay `mockAIClassifier` bằng CNN thật chạy trực tiếp trong Node server.
- Đảm bảo độ trễ thấp, không phát sinh HTTP call sang service khác.
- In scope:
- Chuẩn hóa train/export artifacts.
- Tạo service infer `ecgCnnService`.
- Wiring vào `readingController`.
- Fallback + logs + test parity Python/Node.
- Out of scope:
- Tạo server Python riêng.
- Thay API frontend.
- Thay schema Prisma.

## Decision Lock
- Runtime infer: `@tensorflow/tfjs` (pure JS, khong native binding).
- Inference granularity: theo từng `reading` telemetry.
- Rule abnormal: `N` và `Q` bình thường; class còn lại bất thường.
- Không thay endpoint public.
- Không đổi response contract của các route reading hiện có.

## Task Board

### P0 - Chuẩn hóa train/export artifacts
- [x] `P0-T01` Fix data leakage trong train notebook.
- Mục đích: scaler chỉ `fit` trên train set.
- File chạm tới: notebook/train script ngoài repo hoặc tài liệu model.
- Input/Output expected: train script mới sinh scaler hợp lệ.
- Tiêu chí done: xác nhận code không `fit_transform` trên toàn bộ data trước split.
- Depends on: none.

- [x] `P0-T02` Export model sang TFJS format.
- Mục đích: Node load được model trực tiếp.
- File chạm tới: Python export script.
- Input/Output expected: `server/model_CNN/ecg_tfjs/model.json` + shard `.bin`.
- Tiêu chí done: file artifact tồn tại và load được bằng test script.
- Depends on: `P0-T01`.

- [x] `P0-T03` Export `preprocess_config.json`.
- Mục đích: khóa đồng nhất preprocessing train/infer.
- File chạm tới: Python export script.
- Input/Output expected: JSON gồm `fs`, `half_window`, `segment_len`, `lowcut`, `highcut`, `filter_order`, `rpeak_min_distance_sec`, `rpeak_min_height`, `classes`, `scaler_mean`, `scaler_scale`.
- Tiêu chí done: đủ key bắt buộc, parse được ở Node.
- Depends on: `P0-T01`.

- [x] `P0-T04` Export `label_map.json`.
- Mục đích: map class model sang text `ai_result` hệ thống.
- File chạm tới: Python export script.
- Input/Output expected: map AAMI class -> label hiển thị.
- Tiêu chí done: map đủ class model.
- Depends on: `P0-T03`.

- [x] `P0-T05` Validate sample infer trong Python trước khi tích hợp Node (test model đã upload lên với python, dùng để kiểm thử, đối chiếu khi chạy trên nodejs).
- Mục đích: đóng băng baseline trước parity test.
- File chạm tới: `server/model_CNN/scripts/p0_t05_generate_baseline.py`, `server/model_CNN/baseline_p0_t05.json`, `server/model_CNN/baseline_p0_t05.csv`.
- Input/Output expected: beat-level baseline theo pipeline signal concat -> slice -> peak detect -> segment.
- Tiêu chí done: lưu kết quả baseline dùng cho P5 (đã rerun beat-level, 150 rows).
- Depends on: `P0-T02`, `P0-T03`, `P0-T04`.

### P1 - Dependencies + model assets vào server
- [x] `P1-T01` Add dependency `@tensorflow/tfjs`.
- Mục đích: bật infer trực tiếp trong Node.
- File chạm tới: `server/package.json`, `server/package-lock.json`.
- Input/Output expected: dependency cài thành công.
- Tiêu chí done: `npm install` thành công và `require('@tensorflow/tfjs')` chạy được.
- Depends on: `P0-T02`.

- [x] `P1-T02` Chuẩn hóa thư mục model trong server.
- Mục đích: agent khác biết nơi đặt model/config.
- File chạm tới: `server/model_CNN/ecg_tfjs/*`, `server/model_CNN/ecg/preprocess_config.json`, `server/model_CNN/ecg/label_map.json`.
- Input/Output expected: cấu trúc thư mục thống nhất.
- Tiêu chí done: path được tài liệu hóa và truy cập được.
- Depends on: `P0-T02`, `P0-T03`, `P0-T04`.

- [x] `P1-T03` Bổ sung env keys cho đường dẫn model/config.
- Mục đích: không hardcode path trong code.
- File chạm tới: `server/.env`, `server/.env.example`.
- Input/Output expected: `AI_MODEL_PATH`, `AI_PREPROCESS_CONFIG_PATH`, `AI_LABEL_MAP_PATH`, `AI_ENABLE`.
- Tiêu chí done: app đọc được env ở local.
- Depends on: `P1-T02`.

### P2 - Tạo ecgCnnService (load/warmup/predict)
- [x] `P2-T01` Tạo skeleton `server/services/ecgCnnService.js`.
- Mục đích: tách logic infer khỏi controller.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: export `initModel`, `predictFromReading`.
- Tiêu chí done: file service được import không lỗi.
- Depends on: `P1-T01`, `P1-T03`.

- [x] `P2-T02` Implement `initModel()` và warmup.
- Mục đích: load model 1 lần, giảm cold-start.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: model + config + label map loaded.
- Tiêu chí done: log `AI model loaded` khi boot.
- Depends on: `P2-T01`.

- [x] `P2-T03` Implement preprocessing.
- Mục đích: replicate pipeline train.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: bandpass, peak detect, segment 125, z-score.
- Tiêu chí done: input bất kỳ được normalize thành tensor đúng shape.
- Depends on: `P2-T02`.

- [x] `P2-T04` Implement postprocessing + decision rule.
- Mục đích: tạo kết quả reading-level từ nhiều beat.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: `label`, `confidence`, `abnormal_detected`, `beat_count`.
- Tiêu chí done: rule `N,Q bình thường` chạy đúng.
- Depends on: `P2-T03`.

### P3 - Tích hợp vào readingController
- [x] `P3-T01` Thay `mockAIClassifier` trong `createFakeReading`.
- Mục đích: fake reading dùng AI thật.
- File chạm tới: `server/controllers/readingController.js`.
- Input/Output expected: `ai_result` lấy từ `ecgCnnService`.
- Tiêu chí done: route fake hoạt động, không crash.
- Depends on: `P2-T04`.

- [x] `P3-T02` Thay `mockAIClassifier` trong `receiveTelemetry`.
- Mục đích: telemetry thật dùng AI thật.
- File chạm tới: `server/controllers/readingController.js`.
- Input/Output expected: `abnormal_detected` set theo model.
- Tiêu chí done: luồng tạo alert giữ nguyên contract.
- Depends on: `P2-T04`.

- [x] `P3-T03` Dọn code mock cũ.
- Mục đích: tránh nhầm lẫn giữa AI fake và AI thật.
- File chạm tới: `server/controllers/readingController.js`.
- Input/Output expected: bỏ hoặc giữ mock theo cờ fallback rõ ràng.
- Tiêu chí done: không còn đường gọi mặc định vào random mock.
- Depends on: `P3-T01`, `P3-T02`.

- [x] `P3-T04` Mở rộng output infer theo multi-segment bất thường.
- Mục đích: trả về danh sách segment dự đoán + nhóm bất thường liên tiếp cùng lớp.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: thêm `segment_predictions`, `abnormal_groups`, `ai_result_summary`.
- Tiêu chí done: reading toàn N/Q trả `Normal`, reading có bất thường trả đúng nhóm segment.
- Depends on: `P2-T04`.

- [x] `P3-T05` Tạo grouped alert + emit event alert dạng gộp theo reading.
- Mục đích: tránh spam nhiều event khi một reading có nhiều segment bất thường.
- File chạm tới: `server/controllers/readingController.js`, `server/controllers/alertController.js`.
- Input/Output expected: 1 reading có thể tạo nhiều alert DB, nhưng realtime emit 1 payload gộp.
- Tiêu chí done: payload `alert` có `abnormal_count`, `ai_result_summary`, `alerts[]`.
- Depends on: `P3-T04`.

- [x] `P3-T06` Bổ sung cột vị trí segment trong bảng alert.
- Mục đích: lưu được `start/end` sample index của cảnh báo bất thường.
- File chạm tới: `server/prisma/schema.prisma`, `server/prisma/migrations/*`.
- Input/Output expected: có `segment_start_sample`, `segment_end_sample` nullable trong Alert.
- Tiêu chí done: schema + migration SQL đã được tạo.
- Depends on: `P3-T05`.

### P4 - Fallback + logging + guardrails
- [x] `P4-T01` Thêm fallback nếu AI infer lỗi.
- Mục đích: không làm fail nghiệp vụ chính.
- File chạm tới: `server/services/ecgCnnService.js`, `server/controllers/readingController.js`.
- Input/Output expected: fallback label mặc định + log warning.
- Tiêu chí done: simulate lỗi model nhưng API vẫn response hợp lệ.
- Depends on: `P3-T02`.

- [x] `P4-T02` Structured log cho AI latency và lỗi.
- Mục đích: theo dõi hiệu năng và tỉ lệ fallback.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: log fields `ai_infer_ms`, `fallback_reason`.
- Tiêu chí done: có log trên mỗi infer path.
- Depends on: `P4-T01`.

- [x] `P4-T03` Guardrails dữ liệu đầu vào.
- Mục đích: chống crash khi `ecg_signal` sai định dạng.
- File chạm tới: `server/services/ecgCnnService.js`.
- Input/Output expected: validate và sanitize input.
- Tiêu chí done: input null/string malformed không làm văng process.
- Depends on: `P2-T03`.

### P5 - Test parity Python vs Node + regression
- [x] `P5-T01` Golden set parity test.
- Mục đích: đảm bảo kết quả Node gần với baseline Python.
- File chạm tới: test script hoặc docs local.
- Input/Output expected: bảng so sánh label/confidence.
- Tiêu chí done: parity đạt ngưỡng chấp nhận đã định.
- Depends on: `P4-T03`.

- [x] `P5-T02` Regression test alert/socket/notification.
- Mục đích: đảm bảo realtime không vỡ.
- File chạm tới: test checklist/manual test docs.
- Input/Output expected: alert emit đúng, notification đúng.
- Tiêu chí done: không có broadcast sai user, không sai contract event.
- Depends on: `P3-T02`.

- [x] `P5-T03` Frontend sanity check.
- Mục đích: xác nhận UI đọc được `ai_result` mới.
- File chạm tới: manual checklist.
- Input/Output expected: dashboard hiển thị cảnh báo bình thường.
- Tiêu chí done: không crash màn Patient/Doctor/Family.
- Depends on: `P5-T02`.

- [x] `P5-T04` Regression multi-alert cho cùng một reading.
- Mục đích: xác nhận flow mới tạo nhiều alert con nhưng emit/notification vẫn gộp một sự kiện.
- File chạm tới: checklist/manual test docs.
- Input/Output expected: DB có nhiều alert theo segment group, socket `alert` chỉ một payload gộp.
- Tiêu chí done: đúng số lượng alert DB, UI nhận đúng message tổng hợp.
- Depends on: `P3-T05`.

### P6 - Performance + rollout
- [ ] `P6-T01` Benchmark infer latency local.
- Mục đích: đo p50/p95.
- File chạm tới: benchmark script local hoặc note.
- Input/Output expected: số liệu latency theo payload size.
- Tiêu chí done: đáp ứng ngưỡng phản hồi hệ thống mong muốn.
- Depends on: `P5-T01`.

- [ ] `P6-T02` Staging rollout.
- Mục đích: kiểm tra thực tế trước production.
- File chạm tới: deployment config.
- Input/Output expected: staging chạy với `AI_ENABLE=true`.
- Tiêu chí done: smoke test pass.
- Depends on: `P6-T01`.

- [ ] `P6-T03` Theo dõi 24-48h và chốt done.
- Mục đích: xác nhận ổn định production.
- File chạm tới: monitoring notes.
- Input/Output expected: fallback rate thấp, không lỗi nghiêm trọng.
- Tiêu chí done: trạng thái tổng chuyển `Done`.
- Depends on: `P6-T02`.

## Runbook Commands
- Cài deps backend:
```bash
cd server
npm install
```
- Chạy backend local:
```bash
cd server
npm run dev
```
- Generate prisma client (nếu cần):
```bash
cd server
npm run prisma:generate
```
- Build/check frontend nhanh (khi regression UI):
```bash
cd client
npm run build
```
- Benchmark infer ngắn (gợi ý):
```bash
cd server
node scripts/benchmark-ai.js
```

## Verification Checklist
- [ ] Model load thành công khi server boot.
- [ ] `predictFromReading` trả label hợp lệ trong `classes`.
- [ ] `abnormal_detected` đúng rule `N,Q bình thường`.
- [ ] Luồng `receiveTelemetry` không crash khi input xấu.
- [ ] Alert chỉ tạo khi `abnormal_detected=true`.
- [ ] Socket emit/notification không đổi contract hiện có.

## Issue Log / Blockers
- Mẫu ghi blocker:
- `Time`: `YYYY-MM-DD HH:mm`
- `Task ID`: `P*-T*`
- `Issue`: mô tả ngắn.
- `Impact`: ảnh hưởng đến timeline/chất lượng.
- `Owner`: ai đang xử lý.
- `Next action`: bước tiếp theo.

- Nhật ký:
- `2026-02-25 00:00` | `INIT` | `Task plan created` | `No impact` | `local` | `Start P0-T01`.
- `2026-02-25 09:00` | `P0-T02` | `TFJS model exported to server/model_CNN/ecg_tfjs` | `No impact` | `local` | `Start P0-T03`.
- `2026-02-25 09:20` | `P0-T03` | `Created server/model_CNN/ecg/preprocess_config.json` | `No impact` | `local` | `Start P0-T04`.
- `2026-02-25 09:22` | `P0-T04` | `Created server/model_CNN/ecg/label_map.json` | `No impact` | `local` | `Start P0-T05`.
- `2026-02-25 18:40` | `P0-T05` | `Rerun baseline with locked beat-level pipeline; output 150 rows to server/model_CNN/baseline_p0_t05.(json|csv)` | `No impact` | `local` | `Continue P1-T01`.
- `2026-02-25 18:43` | `P1-T01` | `npm install @tensorflow/tfjs-node failed with ENOTCACHED (cache-only registry mode)` | `Blocked runtime install` | `local` | `Unblock npm registry/cache policy and retry install`.
- `2026-02-25 18:45` | `P1-T02` | `Canonical model assets confirmed under server/model_CNN and documented in README` | `No impact` | `local` | `Start P1-T03`.
- `2026-02-25 18:46` | `P1-T03` | `Added AI env keys and updated env loading priority (server/.env first, root .env fallback)` | `No impact` | `local` | `Wait P1-T01 unblock`.
- `2026-02-26 01:29` | `P1-T01` | `Switched runtime to @tensorflow/tfjs (pure JS) and installed successfully` | `Unblocked P1` | `local` | `Move to P2-T01`.
- `2026-02-26 01:41` | `P2-T01` | `Created server/services/ecgCnnService.js skeleton with initModel/getModelState/predictFromReading` | `No impact` | `local` | `Start P2-T02`.
- `2026-02-26 01:42` | `P2-T02` | `Implemented local TFJS model loading (custom IOHandler), Keras3 InputLayer compatibility patch, and warmup` | `No impact` | `local` | `Start P2-T03`.
- `2026-02-26 01:43` | `P2-T03` | `Implemented preprocessing: input parse, bandpass with fili (forward+reverse), peak detect, segment 125, z-score` | `No impact` | `local` | `Start P2-T04`.
- `2026-02-26 01:43` | `P2-T04` | `Implemented postprocess: majority vote, confidence average, abnormal rule N/Q=false, skip fallback rules` | `No impact` | `local` | `Move to P3-T01`.
- `2026-02-26 02:35` | `P3-T01` | `Replaced mock AI in createFakeReading with ecgCnnService inference and safe fallback` | `No impact` | `local` | `Start P3-T02`.
- `2026-02-26 02:36` | `P3-T02` | `Replaced mock AI in receiveTelemetry with ecgCnnService inference and normalized ECG input` | `No impact` | `local` | `Start P3-T03`.
- `2026-02-26 02:37` | `P3-T03` | `Removed mockAIClassifier path and validated controller + baseline test script` | `No impact` | `local` | `Move to P4-T01`.
- `2026-02-26 03:50` | `P3-T04` | `Extended ecgCnnService output with segment predictions, contiguous abnormal groups, and ai_result_summary` | `No impact` | `local` | `Start P3-T05`.
- `2026-02-26 03:51` | `P3-T05` | `Implemented grouped alerts per reading and aggregated alert socket/notification payload` | `No impact` | `local` | `Start P3-T06`.
- `2026-02-26 03:52` | `P3-T06` | `Added Alert schema fields segment_start_sample/segment_end_sample and created SQL migration` | `No impact` | `local` | `Continue P4-T01`.
- `2026-02-26 13:25` | `P4-T01` | `Applied safe fallback in infer flow so AI errors do not fail main reading workflows` | `No impact` | `local` | `Start P4-T02`.
- `2026-02-26 13:31` | `P4-T02` | `Standardized AI logs as JSON line with event/reason/infer_ms/context fields in service and controller` | `No impact` | `local` | `Start P4-T03`.
- `2026-02-26 13:35` | `P4-T03` | `Added input guardrails: sanitize multi-shape payloads, cap samples by AI_MAX_SIGNAL_SAMPLES, skip with reason codes` | `No impact` | `local` | `Move to P5-T01`.
- `2026-02-27 07:05` | `P5-T01` | `Added parity gate script + report output and verified PASS (96.67%, MAE 0.013823)` | `No impact` | `local` | `Start P5-T02`.
- `2026-02-27 07:08` | `P5-T02` | `Added realtime smoke script and socket/notification checklist; verified PASS on abnormal telemetry path` | `No impact` | `local` | `Start P5-T03`.
- `2026-02-27 07:12` | `P5-T03` | `Added frontend sanity checklist and verified client build PASS` | `No impact` | `local` | `Start P5-T04`.
- `2026-02-27 07:11` | `P5-T04` | `Added multi-alert regression script + checklist; verified one reading creates multiple alerts with aggregated notification payload` | `No impact` | `local` | `Move to P6-T01`.

## Handoff Notes
- Last completed task: `P5-T04`.
- Current in-progress: `P6-T01`.
- Next recommended task: `P6-T01`.
- Known risks:
- Rủi ro sai lệch preprocessing giữa Python và Node.
- Rủi ro memory leak nếu không dispose tensor đúng cách.
- Rủi ro input telemetry quá ngắn không đủ peak.
- Rủi ro sai parity nếu chưa thay `scaler_mean/scaler_scale` placeholder bằng giá trị export thật.

## Quy tắc vận hành task-plan
- Mỗi lần hoàn thành task:
- Tick `[x]` ở task tương ứng.
- Thêm 1 dòng vào `Handoff Notes` (timestamp + commit hash local nếu có).
- Khi viết hoặc sửa hàm trong mọi task, bắt buộc thêm 1 comment ngắn ngay trên đầu hàm để mô tả tác dụng của hàm đó.
- Tất cả comment trong code phải dùng tiếng Việt có dấu; nếu 1 hàm có nhiều bước xử lý quan trọng thì thêm comment ngắn cho từng bước.
- Không đổi ID task đã tạo.
- Nếu tách task mới, dùng hậu tố `a/b` (ví dụ `P2-T03a`).
- Nếu task bị hủy, đổi checkbox sang `[-]` và ghi rõ lý do.
- Mọi agent mới bắt buộc đọc `Project Context Snapshot` và `Decision Lock` trước khi code.
