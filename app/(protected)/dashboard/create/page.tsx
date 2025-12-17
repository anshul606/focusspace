"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Leaf, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "@/context/auth-context";
import {
  SessionForm,
  SessionFormData,
} from "@/components/session/session-form";
import { TodoEditor, TodoItem } from "@/components/session/todo-editor";
import { createSession } from "@/lib/services/session-service";
import { addTodo } from "@/lib/services/todo-service";

export default function CreateSessionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [mrinaliniTheme, setMrinaliniTheme] = useState(false);
  const [showThemeText, setShowThemeText] = useState(false);
  const [themeTextContent, setThemeTextContent] = useState("");
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Favicon SVGs
  const defaultFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;
  const tealFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>`;

  const setFavicon = (svgString: string) => {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  };

  // Check for saved theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("mrinalini-theme");
    if (savedTheme === "true") {
      setMrinaliniTheme(true);
      document.documentElement.classList.add("mrinalini-theme");
      setFavicon(tealFavicon);
    }
  }, []);

  // Handle the secret icon click
  const handleIconClick = () => {
    // Reset click count if too much time passes between clicks
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 2000);

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount === 6) {
      setClickCount(0);

      if (!mrinaliniTheme) {
        // Activate Mrinalini theme
        setMrinaliniTheme(true);
        document.documentElement.classList.add("mrinalini-theme");
        document.documentElement.classList.remove("sakura-theme");
        localStorage.setItem("mrinalini-theme", "true");
        localStorage.setItem("sakura-theme", "false");
        setFavicon(tealFavicon);

        // Show big centered text
        setThemeTextContent("Mrinalini Theme Activated");
        setShowThemeText(true);
        setTimeout(() => setShowThemeText(false), 2500);

        // Show toast
        toast.success("🌿 Mrinalini Theme Activated!", {
          description: "Enjoy the teal vibes 💚",
          duration: 4000,
        });

        // Fire confetti!
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ["#14b8a6", "#0d9488", "#2dd4bf", "#5eead4", "#99f6e4"];

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      } else {
        // Deactivate Mrinalini theme
        setMrinaliniTheme(false);
        document.documentElement.classList.remove("mrinalini-theme");
        localStorage.setItem("mrinalini-theme", "false");
        setFavicon(defaultFavicon);

        // Show big centered text
        setThemeTextContent("Theme Deactivated");
        setShowThemeText(true);
        setTimeout(() => setShowThemeText(false), 2000);

        toast.info("Mrinalini Theme Deactivated", {
          description: "Back to the default look",
          duration: 3000,
        });
      }
    }
  };

  const handleSubmit = async (formData: SessionFormData) => {
    if (!user) {
      toast.error("You must be logged in to create a session");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the session in Firebase
      const session = await createSession({
        userId: user.uid,
        mode: formData.mode,
        urls: formData.urls,
        durationMinutes: formData.durationMinutes,
      });

      // Add todos to the session
      await Promise.all(
        todos.map((todo) =>
          addTodo({
            userId: user.uid,
            sessionId: session.id,
            text: todo.text,
          })
        )
      );

      toast.success("Focus session started! Time to get in the zone.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to start session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Big Theme Activation Text Overlay */}
      {showThemeText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
              {mrinaliniTheme ? (
                <>
                  <Leaf
                    className="size-10 md:size-14 text-teal-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <Star
                    className="size-8 md:size-10 text-teal-300 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                </>
              ) : (
                <>
                  <Sparkles
                    className="size-10 md:size-14 text-indigo-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                </>
              )}
              <h1
                className="text-4xl md:text-6xl font-black tracking-tight text-white animate-in zoom-in-50 duration-500"
                style={{
                  textShadow: mrinaliniTheme
                    ? "0 0 40px rgba(20, 184, 166, 0.8), 0 0 80px rgba(20, 184, 166, 0.5), 0 0 120px rgba(20, 184, 166, 0.3)"
                    : "0 0 40px rgba(129, 140, 248, 0.8), 0 0 80px rgba(129, 140, 248, 0.5)",
                }}
              >
                {themeTextContent}
              </h1>
              {mrinaliniTheme ? (
                <>
                  <Star
                    className="size-8 md:size-10 text-teal-300 animate-bounce"
                    style={{ animationDelay: "100ms" }}
                  />
                  <Leaf
                    className="size-10 md:size-14 text-teal-400 animate-bounce"
                    style={{ animationDelay: "200ms" }}
                  />
                </>
              ) : (
                <>
                  <Sparkles
                    className="size-10 md:size-14 text-indigo-400 animate-bounce"
                    style={{ animationDelay: "100ms" }}
                  />
                </>
              )}
            </div>
            <p className="text-lg text-white/80 font-medium">
              {mrinaliniTheme
                ? "Enjoy the teal vibes 🌿"
                : "Back to default ✨"}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={handleIconClick}
            className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shadow-lg shadow-indigo-500/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Theme toggle easter egg"
          >
            <Sparkles className="size-5 text-indigo-400" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              New Focus Session
            </h1>
            <p className="text-zinc-400 text-sm">
              Set your goals and eliminate distractions
            </p>
          </div>
        </div>
      </div>

      {/* Form Components */}
      <div className="grid gap-6">
        <SessionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        <TodoEditor todos={todos} onTodosChange={setTodos} />
      </div>
    </div>
  );
}
