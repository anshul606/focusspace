import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SessionTodo } from "@/lib/types/session";

/**
 * Input data for creating a new todo item
 */
export interface CreateTodoInput {
  userId: string;
  sessionId: string;
  text: string;
}

/**
 * Get the todos collection reference for a session
 */
const getTodosCollection = (userId: string, sessionId: string) =>
  collection(db, "users", userId, "sessions", sessionId, "todos");

/**
 * Adds a new todo item to a session
 * Requirements: 5.1 - Provide interface to add Session_Todo items
 * Requirements: 5.2 - Sync item to Firebase
 */
export async function addTodo(input: CreateTodoInput): Promise<SessionTodo> {
  const { userId, sessionId, text } = input;

  const todoData = {
    sessionId,
    userId,
    text,
    completed: false,
    createdAt: Timestamp.now(),
    completedAt: null,
  };

  const todosRef = getTodosCollection(userId, sessionId);
  const docRef = await addDoc(todosRef, todoData);

  return {
    id: docRef.id,
    ...todoData,
  };
}

/**
 * Toggles the completion status of a todo item
 * Requirements: 5.4 - Update completion status in Firebase and sync across platforms
 */
export async function toggleTodo(
  userId: string,
  sessionId: string,
  todoId: string
): Promise<SessionTodo> {
  const todoRef = doc(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "todos",
    todoId
  );
  const snapshot = await getDoc(todoRef);

  if (!snapshot.exists()) {
    throw new Error("Todo not found");
  }

  const currentData = snapshot.data();
  const newCompleted = !currentData.completed;

  await updateDoc(todoRef, {
    completed: newCompleted,
    completedAt: newCompleted ? Timestamp.now() : null,
  });

  const updated = await getDoc(todoRef);
  return {
    id: updated.id,
    ...updated.data(),
  } as SessionTodo;
}

/**
 * Gets all todos for a session
 */
export async function getTodos(
  userId: string,
  sessionId: string
): Promise<SessionTodo[]> {
  const todosRef = getTodosCollection(userId, sessionId);
  const q = query(todosRef, orderBy("createdAt", "asc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SessionTodo[];
}

/**
 * Gets a single todo by ID
 */
export async function getTodoById(
  userId: string,
  sessionId: string,
  todoId: string
): Promise<SessionTodo | null> {
  const todoRef = doc(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "todos",
    todoId
  );
  const snapshot = await getDoc(todoRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as SessionTodo;
}

/**
 * Deletes a todo item
 */
export async function deleteTodo(
  userId: string,
  sessionId: string,
  todoId: string
): Promise<void> {
  const todoRef = doc(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "todos",
    todoId
  );
  await deleteDoc(todoRef);
}

/**
 * Subscribes to real-time updates for todos in a session
 * Returns an unsubscribe function
 */
export function subscribeTodos(
  userId: string,
  sessionId: string,
  callback: (todos: SessionTodo[]) => void
): Unsubscribe {
  const todosRef = getTodosCollection(userId, sessionId);
  const q = query(todosRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const todos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SessionTodo[];
    callback(todos);
  });
}
