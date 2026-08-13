"use client";

import { useRequireAuth } from "@/lib/auth";
import AwsHeader from "@/components/AwsHeader";
import AwsSidebar from "@/components/AwsSidebar";
import { ToastProvider } from "@/components/Toast";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#232f3e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingSpinner size="lg" message="Authenticating..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <ToastProvider>
      <AwsHeader user={user} />
      <AwsSidebar />
      <main
        style={{
          marginLeft: 220,
          marginTop: 48,
          minHeight: "calc(100vh - 48px)",
          background: "#f2f3f3",
        }}
      >
        {children}
      </main>
    </ToastProvider>
  );
}
