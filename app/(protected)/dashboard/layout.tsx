"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/protected-route";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

// Favicon SVGs for themes
const tealFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;
const pinkFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;

function setFavicon(svgString: string) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedState = getCookie("sidebar_state");
    if (savedState !== null) {
      setDefaultOpen(savedState === "true");
    }

    // Apply saved theme
    const mrinaliniTheme = localStorage.getItem("mrinalini-theme");
    const sakuraTheme = localStorage.getItem("sakura-theme");

    if (sakuraTheme === "true") {
      document.documentElement.classList.add("sakura-theme");
      setFavicon(pinkFavicon);
    } else if (mrinaliniTheme === "true") {
      document.documentElement.classList.add("mrinalini-theme");
      setFavicon(tealFavicon);
    }

    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen w-full bg-zinc-950" />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex min-h-screen w-full bg-zinc-950">
          <AppSidebar />
          <main className="relative flex-1 overflow-hidden">
            {/* Background gradient accents */}
            <div className="pointer-events-none absolute right-0 top-0 size-100 rounded-full bg-violet-600/5 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/4 size-75 rounded-full bg-indigo-600/5 blur-3xl" />

            {/* Header */}
            <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-md">
              <SidebarTrigger className="size-9 text-zinc-400 hover:bg-zinc-800/60 hover:text-white" />
            </div>

            {/* Content */}
            <div className="relative p-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
