import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "../pages/landing/LandingPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { VerifyEmailPage } from "../pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { RoleHomeRedirect } from "../pages/RoleHomeRedirect";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { DemoPage } from "../pages/demo/DemoPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

import { AdminLayout } from "../pages/admin/AdminLayout";
import { AdminOverviewPage } from "../pages/admin/OverviewPage";
import { AdminPipelinePage } from "../pages/admin/PipelinePage";
import { AdminThresholdsPage } from "../pages/admin/ThresholdsPage";
import { AdminCalibrationPage } from "../pages/admin/CalibrationPage";
import { AdminHeatmapPage } from "../pages/admin/HeatmapPage";
import { AdminUsersPage } from "../pages/admin/UsersPage";

import { OfficerLayout } from "../pages/officer/OfficerLayout";
import { OfficerHeatmapPage } from "../pages/officer/HeatmapPage";
import { OfficerTriagePage } from "../pages/officer/TriagePage";
import { OfficerAlertsPage } from "../pages/officer/AlertsPage";
import { OfficerThresholdsPage } from "../pages/officer/ThresholdsPage";

import { VillageHeadLayout } from "../pages/village-head/VillageHeadLayout";
import { VillageHeadOverviewPage } from "../pages/village-head/OverviewPage";
import { VillageHeadResidentsPage } from "../pages/village-head/ResidentsPage";
import { VillageHeadMapPage } from "../pages/village-head/MapPage";

import { ResidentShell } from "../pages/resident/ResidentShell";
import { ResidentHomePage } from "../pages/resident/HomePage";
import { ResidentMapPage } from "../pages/resident/MapPage";
import { ResidentNotificationsPage } from "../pages/resident/NotificationsPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/workspace" element={<RoleHomeRedirect />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<RoleRoute allow={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="pipeline" element={<AdminPipelinePage />} />
            <Route path="thresholds" element={<AdminThresholdsPage />} />
            <Route path="calibration" element={<AdminCalibrationPage />} />
            <Route path="heatmap" element={<AdminHeatmapPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route index element={<Navigate to="heatmap" replace />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allow={["commune_officer"]} />}>
          <Route path="/officer" element={<OfficerLayout />}>
            <Route path="heatmap" element={<OfficerHeatmapPage />} />
            <Route path="triage" element={<OfficerTriagePage />} />
            <Route path="alerts" element={<OfficerAlertsPage />} />
            <Route path="thresholds" element={<OfficerThresholdsPage />} />
            <Route index element={<Navigate to="heatmap" replace />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allow={["village_head"]} />}>
          <Route path="/village-head" element={<VillageHeadLayout />}>
            <Route path="overview" element={<VillageHeadOverviewPage />} />
            <Route path="residents" element={<VillageHeadResidentsPage />} />
            <Route path="map" element={<VillageHeadMapPage />} />
            <Route index element={<Navigate to="map" replace />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allow={["resident"]} />}>
          <Route path="/resident" element={<ResidentShell />}>
            <Route index element={<ResidentHomePage />} />
            <Route path="map" element={<ResidentMapPage />} />
            <Route path="notifications" element={<ResidentNotificationsPage />} />
            <Route path="details" element={<Navigate to="/resident" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
