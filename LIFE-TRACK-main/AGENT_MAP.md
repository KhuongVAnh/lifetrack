# Agent Map - Client

Doc nay dung de agent doc dau tien truoc khi sua frontend. Muc tieu la tranh quet toan bo repo khi chi can tim dung file theo nghiep vu.

## Cach tim nhanh

- Neu task nhac den page/man hinh: xem `src/widgets/page-views/` truoc.
- Neu task nhac den API call: xem `src/features/<feature>/api/` hoac `src/shared/api/httpClient.js`.
- Neu task nhac den state realtime/hook: xem `src/features/<feature>/model/`.
- Neu task nhac den component dung lai: xem `src/features/<feature>/ui/` hoac `src/shared/ui/`.
- Neu task nhac den route/menu/layout: xem `src/app/router/`, `src/app/layouts/`, `src/widgets/navigation/`.
- Chi dung `rg --files` toan repo khi can cap nhat file nay hoac khong co mapping phu hop ben duoi.

## Entrypoint va cau hinh

- App root: `src/main.jsx`, `src/app/App.jsx`
- CSS global/Tailwind: `src/index.css`, `tailwind.config.js`
- Router tong: `src/app/router/index.jsx`
- Route benh nhan: `src/app/router/patientRoutes.jsx`
- Route bac si: `src/app/router/doctorRoutes.jsx`
- Auth provider/socket context: `src/app/providers/AuthProvider.jsx`
- HTTP client/base URL/interceptor: `src/shared/api/httpClient.js`
- Shared API export: `src/shared/api/index.js`

## Layout va navigation

- Layout benh nhan: `src/app/layouts/PatientLayout.jsx`
- Layout bac si portal: `src/app/layouts/DoctorPortalLayout.jsx`
- Layout bac si cu: `src/app/layouts/DoctorLayout.jsx`
- Layout community: `src/app/layouts/CommunityLayout.jsx`
- Sidebar/nav config: `src/widgets/navigation/model/navigation.js`
- Sidebar benh nhan: `src/widgets/navigation/ui/PrimarySidebar.jsx`
- Sidebar bac si: `src/widgets/navigation/ui/DoctorSidebar.jsx`
- Header bac si: `src/widgets/navigation/ui/DoctorHeader.jsx`
- Bottom nav mobile: `src/widgets/navigation/ui/BottomNav.jsx`

## Page map

- Dashboard benh nhan: `src/widgets/page-views/DashboardPage.jsx`
- Dang nhap: `src/widgets/page-views/LoginPage.jsx`
- Dat lich: `src/widgets/page-views/AppointmentsPage.jsx`
- Thuoc/nhac thuoc: `src/widgets/page-views/MedicationsPage.jsx`
- Ho so suc khoe list: `src/widgets/page-views/HealthRecordsPage.jsx`
- Ho so suc khoe detail + ECG live benh nhan: `src/widgets/page-views/HealthRecordDetailPage.jsx`
- Bac si cua toi: `src/widgets/page-views/DoctorsMyPage.jsx`
- Tim/thue bac si: `src/widgets/page-views/DoctorsHirePage.jsx`
- Lien he bac si cua benh nhan: `src/widgets/page-views/PatientDoctorContactPage.jsx`
- Dashboard bac si: `src/widgets/page-views/DoctorDashboardPage.jsx`
- Bac si live ECG/monitor: `src/widgets/page-views/DoctorLivePage.jsx`
- Bac si EMR: `src/widgets/page-views/DoctorEmrPage.jsx`
- Bac si patients/quyen: `src/widgets/page-views/DoctorPatientsPage.jsx`
- Bac si lich hen: `src/widgets/page-views/DoctorAppointmentsPage.jsx`
- Bac si messages/direct chat: `src/widgets/page-views/DoctorMessagesPage.jsx`
- Profile bac si public/detail: `src/widgets/page-views/DoctorProfilePage.jsx`
- Profile bac si cua toi: `src/widgets/page-views/DoctorMyProfilePage.jsx`
- Community Q&A: `src/widgets/page-views/CommunityQuestionsPage.jsx`
- Community kien thuc/bai viet: `src/widgets/page-views/CommunityKnowledgePage.jsx`
- Settings: `src/widgets/page-views/SettingsPage.jsx`
- Family EMR workspace: `src/widgets/page-views/family/FamilyEmrWorkspace.jsx`
- PHR shell/overview/history: `src/widgets/page-views/phr/PatientPhrShell.jsx`, `src/widgets/page-views/phr/PhrOverviewPage.jsx`, `src/widgets/page-views/phr/PhrHistoryPage.jsx`

## Feature map

- Realtime ECG:
  - Chart chuan ECG: `src/features/realtime-monitor/ui/RealtimeEcgChart.jsx`
  - Modal chi tiet reading/canh bao: `src/features/realtime-monitor/ui/ReadingDetailModal.jsx`
  - Hook stream realtime: `src/features/realtime-monitor/model/useRealtimeEcgStream.js`
  - Hook history/detail reading: `src/features/realtime-monitor/model/useReadingsMonitor.js`
  - API readings/normalize signal: `src/features/realtime-monitor/api/ecgApi.js`
  - Helper format/AI overlay/tone: `src/features/realtime-monitor/lib/ecgMonitor.js`
- Warning readings/canh bao ECG:
  - Modal danh sach canh bao bac si: `src/features/warning-readings/ui/DoctorAlertsModal.jsx`
  - Hook canh bao: `src/features/warning-readings/model/useWarningReadings.js`
  - API alerts: `src/features/warning-readings/api/alertApi.js`
- Doctor portal/EMR:
  - API doctor portal: `src/features/doctor-portal/api/doctorPortalApi.js`
  - Normalize doctor portal data: `src/features/doctor-portal/lib/doctorPortal.js`
  - Doctor EMR API wrapper: `src/features/doctor-emr/api/emrApi.js`
  - Shared EMR panels: `src/features/emr/ui/SharedEmrPanels.jsx`
  - EMR view model helpers: `src/features/emr/lib/emrViewModel.js`
- PHR:
  - API: `src/features/phr/api/phrApi.js`
  - Overview content: `src/features/phr/ui/PhrOverviewContent.jsx`
  - Visit modals: `src/features/phr/ui/PhrVisitFormModal.jsx`, `src/features/phr/ui/PhrVisitDetailModal.jsx`
  - Mock/model helpers: `src/features/phr/mocks/phrMockData.js`, `src/features/phr/lib/phrOverviewModel.js`
- Appointments:
  - API: `src/features/appointments/api/appointmentsApi.js`
  - Mocks: `src/features/appointments/mocks/appointmentsData.js`
- Medications:
  - API: `src/features/medications/api/medicationsApi.js`
- Doctors:
  - Doctor profile API: `src/features/doctors/api/doctorProfileApi.js`
  - Doctor hire API: `src/features/doctors/api/doctorHireApi.js`
  - Doctor profile helpers: `src/features/doctors/lib/doctorProfile.js`
  - Mocks: `src/features/doctors/mocks/doctorsData.js`
- Direct chat/AI chat:
  - Direct chat hook: `src/features/direct-chat/model/useDirectChat.js`
  - Direct chat API: `src/features/direct-chat/api/chatApi.js`
  - Chat helpers: `src/features/direct-chat/lib/chat.js`
  - Floating AI widget: `src/features/ai-chat/ui/FloatingAiChatWidget.jsx`
  - AI chat API/storage: `src/features/ai-chat/api/aiChatApi.js`, `src/features/ai-chat/lib/storage.js`
- Community:
  - API: `src/features/community/api/communityApi.js`
  - Mocks: `src/features/community/mocks/communityData.js`
- Family:
  - API: `src/features/family/api/familyApi.js`
- Auth/user:
  - Auth API: `src/features/auth/api/authApi.js`
  - User model/avatar/role helpers: `src/entities/user/model/user.js`, `src/entities/user/index.js`
- Settings:
  - Mocks/data: `src/features/settings/mocks/settingsData.js`
- Health records legacy/mock:
  - Mock health records: `src/features/health-records/mocks/healthRecordsData.js`

## Shared UI va assets

- Image fallback: `src/shared/ui/ImageWithFallback.jsx`
- Rating stars: `src/shared/ui/RatingStars.jsx`
- Sparkline: `src/shared/ui/StatSparkline.jsx`
- Mock fixtures lon: `src/shared/mocks/appFixtures.js`
- Avatar benh nhan: `public/assets/avatars/patients/`
- Avatar bac si: `public/assets/avatars/doctors/`

## Quy tac sua frontend

- Sua page truoc, chi tach component khi co lap lai ro rang hoac file qua dai.
- Neu doi API contract, cap nhat file API trong `src/features/*/api/` va doi backend tuong ung.
- Neu doi ECG, uu tien `RealtimeEcgChart.jsx`; cac page chi truyen props.
- Neu doi route/menu, cap nhat ca router va navigation model.
- Sau khi sua component/page, chay `npm run build` de bat loi JSX/import.
