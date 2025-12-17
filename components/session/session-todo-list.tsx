"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SessionTodo } from "@/lib/types/session";
import {
  addTodo,
  toggleTodo,
  deleteTodo,
  subscribeTodos,
} from "@/lib/services/todo-service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListTodo, Plus, X, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface SessionTodoListProps {
  userId: string;
  sessionId: string;
}

/**
 * Real-time synced todo list for a focus session
 * Requirements: 5.2 - Sync todo items to Firebase
 * Requirements: 5.4 - Update completion status in Firebase
 * Requirements: 5.5 - Display all Session_Todo items with completion status
 */
export function SessionTodoList({ userId, sessionId }: SessionTodoListProps) {
  const [todos, setTodos] = useState<SessionTodo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeTodos(userId, sessionId, (updatedTodos) => {
        setTodos(updatedTodos);
        setIsLoading(false);
        setError(null);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to subscribe to todos:", err);
      setError("Failed to load tasks");
      setIsLoading(false);
      toast.error("Failed to load tasks");
    }
  }, [userId, sessionId]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTodoText.trim();
    if (!text) return;
    setIsAdding(true);
    try {
      await addTodo({ userId, sessionId, text });
      setNewTodoText("");
    } catch (error) {
      console.error("Failed to add todo:", error);
      toast.error("Failed to add task. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTodo = async (todoId: string) => {
    setTogglingIds((prev) => new Set(prev).add(todoId));
    try {
      await toggleTodo(userId, sessionId, todoId);
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      toast.error("Failed to update task. Please try again.");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    setDeletingIds((prev) => new Set(prev).add(todoId));
    try {
      await deleteTodo(userId, sessionId, todoId);
    } catch (error) {
      console.error("Failed to delete todo:", error);
      toast.error("Failed to delete task. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTodo(e);
    }
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/60 shadow-xl shadow-black/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <ListTodo className="size-5 text-violet-400" />
              Session Tasks
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Track your progress during this session
            </CardDescription>
          </div>
          {todos.length > 0 && (
            <div className="text-sm text-zinc-500">
              {completedCount}/{todos.length} done
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="flex gap-2">
          <Input
            type="text"
            placeholder="Add a task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
            className="flex-1 bg-zinc-900/50 border-zinc-800 focus:border-violet-500/50 focus:ring-violet-500/20"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isAdding || !newTodoText.trim()}
            className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </form>

        {/* Todo List */}
        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-center">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-zinc-600" />
          </div>
        ) : todos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center">
            <ListTodo className="mx-auto size-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 mb-1">No tasks yet</p>
            <p className="text-xs text-zinc-600">
              Add tasks to track your progress during the session
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={`group flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  todo.completed
                    ? "border-zinc-800/50 bg-zinc-900/30"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleTodo(todo.id)}
                  disabled={togglingIds.has(todo.id)}
                  className="shrink-0"
                >
                  {togglingIds.has(todo.id) ? (
                    <Loader2 className="size-5 animate-spin text-zinc-500" />
                  ) : todo.completed ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <Circle className="size-5 text-zinc-600 hover:text-violet-400 transition-colors" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    todo.completed
                      ? "line-through text-zinc-600"
                      : "text-zinc-300"
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  disabled={deletingIds.has(todo.id)}
                  className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-all"
                  aria-label={`Remove ${todo.text}`}
                >
                  {deletingIds.has(todo.id) ? (
                    <Loader2 className="size-4 animate-spin text-zinc-500" />
                  ) : (
                    <X className="size-4 text-zinc-500 hover:text-red-400" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
