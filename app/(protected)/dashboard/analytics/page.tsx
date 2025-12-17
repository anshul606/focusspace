"use client";

import ProtectedRoute from "@/components/protected-route";
import LogoutButton from "@/components/logout-button";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">FocusSpace Analytics</h1>
        </div>
      </div>
    </ProtectedRoute>
  );
}
