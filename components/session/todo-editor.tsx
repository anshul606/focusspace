"use client";

import { useState } from "react";
import { Plus, X, CheckCircle2, Circle, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isValidTodoText } from "@/lib/utils/url-validation";

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoEditorProps {
  todos: TodoItem[];
  onTodosChange: (todos: TodoItem[]) => void;
}

export function TodoEditor({ todos, onTodosChange }: TodoEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddTodo = () => {
    const trimmedText = inputValue.trim();

    if (!trimmedText) {
      setError("Please enter a task");
      return;
    }

    if (!isValidTodoText(trimmedText)) {
      setError("Task must be between 1 and 500 characters");
      return;
    }

    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      text: trimmedText,
      completed: false,
    };

    onTodosChange([...todos, newTodo]);
    setInputValue("");
    setError(null);
  };

  const handleRemoveTodo = (id: string) => {
    onTodosChange(todos.filter((todo) => todo.id !== id));
  };

  const handleToggleTodo = (id: string) => {
    onTodosChange(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTodo();
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
              What do you want to accomplish?
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
        {/* Add Todo Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a task to focus on..."
            className="flex-1 bg-zinc-900/50 border-zinc-800 focus:border-violet-500/50 focus:ring-violet-500/20"
            aria-invalid={!!error}
          />
          <Button
            type="button"
            onClick={handleAddTodo}
            size="icon"
            className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Todo List */}
        {todos.length > 0 ? (
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
                  className="shrink-0"
                >
                  {todo.completed ? (
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
                  onClick={() => handleRemoveTodo(todo.id)}
                  className="rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 transition-all"
                  aria-label={`Remove ${todo.text}`}
                >
                  <X className="size-4 text-zinc-500 hover:text-red-400" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-center">
            <ListTodo className="mx-auto size-10 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 mb-1">No tasks yet</p>
            <p className="text-xs text-zinc-600">
              Add tasks to track your progress during the session
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
