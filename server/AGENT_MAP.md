# Agent Map - Server

Doc nay dung de agent doc dau tien truoc khi sua backend. Muc tieu la tim dung route/controller/service/schema ma khong can quet toan bo folder.

## Cach tim nhanh

- Neu task nhac den endpoint: xem `server.js` de biet prefix `/api/...`, sau do vao `routes/<domain>.js`.
- Neu task nhac den request/response/quyen/DB query: xem controller tuong ung trong `controllers/`.
- Neu task nhac den logic dung lai, realtime, notification, AI, schedule, MQTT: xem `services/`.
- Neu task nhac den bang/cot/quan he: xem `prisma/schema.prisma`, migration lien quan trong `prisma/migrations/`, seed trong `prisma/seed.js`.
- Neu task nhac den auth/role: xem `middleware/auth.js`, `controllers/authController.js`, `services/authService.js`, `utils/enumMappings.js`.
- Chi dung `rg --files` toan backend khi cap nhat file nay hoac khong co mapping phu hop ben duoi.

## Entrypoint va cau hinh

- Server Express/Socket/MQTT/bootstrap routes: `server.js`
- Prisma singleton: `prismaClient.js`
- Prisma schema: `prisma/schema.prisma`
- Seed du lieu mau: `prisma/seed.js`
- DB config cu/legacy: `config/database.js`
- Auth middleware: `middleware/auth.js`
- Package scripts: `package.json`

## Route prefix map

- `/api/auth`: `routes/auth.js` -> `controllers/authController.js`
- `/api/users`: `routes/users.js` -> `controllers/userController.js`
- `/api/devices`: `routes/devices.js` -> `controllers/deviceController.js`
- `/api/readings`: `routes/readings.js` -> `controllers/readingController.js`
- `/api/alerts`: `routes/alerts.js` -> `controllers/alertController.js`
- `/api/notifications`: `routes/notifications.js` -> `controllers/notificationController.js`
- `/api/reports`: `routes/reports.js` -> `controllers/reportController.js`
- `/api/chat`: `routes/chat.js` -> `controllers/chatController.js`
- `/api/access`: `routes/access.js` -> `controllers/accessController.js`
- `/api/phr`: `routes/phr.js` -> `controllers/phrController.js`
- `/api/doctor`: `routes/doctorRoutes.js` -> `controllers/doctorController.js`
- `/api/doctor-portal`: `routes/doctorPortal.js` -> `controllers/doctorPortalController.js`
- `/api/doctors`: `routes/doctors.js` -> `controllers/doctorProfileController.js`
- `/api/doctor-hires`: `routes/doctorHires.js` -> `controllers/doctorHireController.js`
- `/api/family`: `routes/familyRoutes.js` -> `controllers/familyController.js`
- `/api/appointments`: `routes/appointments.js` -> `controllers/appointmentController.js`
- `/api/medications`: `routes/medications.js` -> `controllers/medicationController.js`
- `/api/community`: `routes/community.js` -> `controllers/communityController.js`
- `/test`: `routes/routesServer.js` test/dev readings view.

## Domain map

- Auth/dang nhap/token:
  - Routes/controller: `routes/auth.js`, `controllers/authController.js`
  - Hash/JWT helper: `services/authService.js`
  - Middleware role/token: `middleware/auth.js`
- User/admin:
  - Routes/controller: `routes/users.js`, `controllers/userController.js`
  - Role enum mapping: `utils/enumMappings.js`
- Device:
  - Routes/controller: `routes/devices.js`, `controllers/deviceController.js`
- ECG readings/realtime:
  - Routes/controller: `routes/readings.js`, `controllers/readingController.js`
  - Ingest telemetry chung HTTP/MQTT: `services/telemetryIngestService.js`
  - Fake/mock reading data: `services/fakeReadingDataService.js`
  - Runtime cache recipients/devices: `services/telemetryRuntimeCacheService.js`
  - MQTT connection/publish/snapshot: `services/mqttTelemetryService.js`
  - Socket setup: `services/socketService.js`
  - Socket emit helpers: `services/socketEmitService.js`
  - EJS reading view: `views/readings.ejs`
- AI ECG/CNN:
  - Worker infer: `workers/ecgInferenceWorker.js`
  - Queue service: `services/ecgInferenceQueueService.js`
  - Realtime bridge queue -> socket: `services/aiQueueRealtimeBridgeService.js`
  - TFJS infer: `services/ecgCnnService.js`
  - Preprocess: `services/ecgCnnPreprocessService.js`
  - Model config/label map: `services/ecgCnnConfigService.js`, `strings/ecgAiStrings.js`
  - Model files/config: `model_CNN/`
  - Baseline/parity tests: `services/ecgCnnBaselineTestService.js`, `services/ecgCnnPreprocessParityTestService.js`
- Alerts/canh bao:
  - Routes/controller: `routes/alerts.js`, `controllers/alertController.js`
  - Notification/socket dependencies: `services/notificationService.js`, `services/socketEmitService.js`
  - Access recipient logic: `services/patientDoctorAccessService.js`
- Notifications:
  - Routes/controller: `routes/notifications.js`, `controllers/notificationController.js`
  - Create/recipient helper: `services/notificationService.js`
- Direct chat va AI chat:
  - Routes/controller: `routes/chat.js`, `controllers/chatController.js`
  - Direct message notification queue/worker: `services/directMessageNotificationQueueService.js`, `workers/directMessageNotificationWorker.js`
  - Bridge queue -> socket/notification: `services/directMessageNotificationBridgeService.js`
- Doctor portal/EMR bac si:
  - Dashboard/patients/workspace/consultation: `routes/doctorPortal.js`, `controllers/doctorPortalController.js`
  - Legacy doctor medical visits: `routes/doctorRoutes.js`, `controllers/doctorController.js`
  - Access checks: `services/patientDoctorAccessService.js`
- Doctor profile/hire:
  - Public doctor profile/search/review: `routes/doctors.js`, `controllers/doctorProfileController.js`
  - Hire contracts/quyen ECG/EHR/thuoc: `routes/doctorHires.js`, `controllers/doctorHireController.js`
- Access sharing/family permissions:
  - Access permission routes/controller: `routes/access.js`, `controllers/accessController.js`
  - Family workspace: `routes/familyRoutes.js`, `controllers/familyController.js`
  - Shared permission logic: `services/patientDoctorAccessService.js`
- PHR/EHR benh nhan:
  - Routes/controller: `routes/phr.js`, `controllers/phrController.js`
  - DB models: `PhrOverview`, `MedicalVisit`, `Report`, `MedicationPlan` trong `prisma/schema.prisma`
- Appointments:
  - Routes/controller: `routes/appointments.js`, `controllers/appointmentController.js`
  - Slot/time-off logic: `services/appointmentSchedulingService.js`
  - Notification: `services/notificationService.js`
- Medications:
  - Routes/controller: `routes/medications.js`, `controllers/medicationController.js`
  - Schedule/log generation/reminders: `services/medicationScheduleService.js`
  - Cron entry: `services/cronService.js`
- Reports:
  - Routes/controller: `routes/reports.js`, `controllers/reportController.js`
- Community:
  - Routes/controller: `routes/community.js`, `controllers/communityController.js`
  - Upload/cloudinary helper: `services/communityUploadService.js`
- Email:
  - Mail helper: `services/emailService.js`

## Prisma/data map

- Doi schema DB: sua `prisma/schema.prisma`, tao migration moi trong `prisma/migrations/`.
- Doi du lieu demo: sua `prisma/seed.js`.
- Doi enum role/status giua Prisma va UI/API: xem `utils/enumMappings.js`.
- Sau khi doi schema: chay `npm run prisma:generate`.

## Worker va realtime

- Worker AI ECG: `npm run worker:ai` chay `workers/ecgInferenceWorker.js`.
- Worker direct message notification: `npm run worker:dm-notify` chay `workers/directMessageNotificationWorker.js`.
- Cron medication/reminder khoi tao tu `services/cronService.js`.
- Socket rooms/events thuong qua `services/socketService.js` va `services/socketEmitService.js`.
- MQTT ingest duoc noi trong `server.js` va `services/mqttTelemetryService.js`.

## Quy tac sua backend

- Doi endpoint thi sua theo thu tu: route -> controller -> service -> Prisma schema/seed neu can.
- Khong viet truc tiep logic phuc tap trong route; route chi map middleware/controller.
- Neu logic quyen lien quan bac si/gia dinh/benh nhan, uu tien `services/patientDoctorAccessService.js`.
- Neu tao notification, dung `services/notificationService.js` va emit qua socket helper khi can realtime.
- Sau khi sua backend, chay it nhat command lien quan: `npm run prisma:generate` neu doi schema, hoac start/dev endpoint smoke test neu doi runtime.
