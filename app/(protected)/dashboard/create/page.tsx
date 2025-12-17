"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles className="size-5 text-indigo-400" />
          </div>
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
