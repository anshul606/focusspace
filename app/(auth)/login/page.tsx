"use client";

import { signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { googleProvider } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

// Favicon helpers
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

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Focus Icon Component
function FocusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const { user, loading } = useAuth();
  const router = useRouter();

  // Apply saved theme if any
  useEffect(() => {
    const mrinaliniTheme = localStorage.getItem("mrinalini-theme");
    const sakuraTheme = localStorage.getItem("sakura-theme");

    if (sakuraTheme === "true") {
      document.documentElement.classList.add("sakura-theme");
      setFavicon(pinkFavicon);
    } else if (mrinaliniTheme === "true") {
      document.documentElement.classList.add("mrinalini-theme");
      setFavicon(tealFavicon);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Checking authentication…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 relative overflow-hidden">
      {/* Background gradient accents for the whole page */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-violet-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-100 h-100 bg-indigo-600/8 rounded-full blur-3xl" />

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950/40 via-zinc-900 to-violet-950/30" />

        {/* Soft glow effects */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="flex items-center gap-3 mb-8">
            <FocusIcon className="w-10 h-10 text-indigo-400" />
            <span className="text-2xl font-semibold text-white tracking-tight">
              FocusSpace
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Study with
            <br />
            <span className="bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              intention.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
            A calm space designed to help you focus, reduce distractions, and
            make every study session count.
          </p>

          {/* Feature hints */}
          <div className="mt-12 space-y-4">
            {[
              {
                text: "Distraction-free study sessions",
                color: "bg-indigo-400",
              },
              { text: "Track your focus time", color: "bg-violet-400" },
              { text: "Build consistent habits", color: "bg-purple-400" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-zinc-400">
                <div className={`w-1.5 h-1.5 rounded-full ${feature.color}`} />
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <FocusIcon className="w-8 h-8 text-indigo-400" />
            <span className="text-xl font-semibold text-white tracking-tight">
              FocusSpace
            </span>
          </div>

          <Card className="border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md shadow-xl shadow-indigo-500/5">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-white">Welcome back</CardTitle>
              <CardDescription className="text-zinc-400">
                One step closer to focused study
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                size="lg"
                className="w-full h-12 bg-zinc-800/50 border-zinc-700 hover:bg-indigo-600/10 hover:border-indigo-500/50 text-white transition-all duration-200"
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continue with Google
              </Button>

              <p className="text-center text-xs text-zinc-600 mt-6">
                By continuing, you agree to our Terms of Service
              </p>
            </CardContent>
          </Card>

          {/* Bottom text */}
          <p className="text-center text-zinc-500 text-sm mt-8">
            Ready to focus?{" "}
            <span className="text-indigo-400">Let&apos;s go.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
