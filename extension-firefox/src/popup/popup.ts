/**
 * FocusSpace Extension Popup - Firefox
 */

declare const browser: typeof chrome | undefined;
const browserAPI: typeof chrome =
  typeof browser !== "undefined" ? browser : chrome;

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import {
  FocusSession,
  SessionTodo,
  StoredAuthCredentials,
  FirestoreTimestamp,
} from "../lib/types";

const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

const icons = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  shieldOff: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"/><path d="M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
};

let app: FirebaseApp | null = null;
let currentUserId: string | null = null;
let currentSession: FocusSession | null = null;
let sessionUnsubscribe: Unsubscribe | null = null;
let todosUnsubscribe: Unsubscribe | null = null;
let timerInterval: number | null = null;
let isLoadingSession: boolean = true;
let isLoadingTodos: boolean = false;

const loadingEl = document.getElementById("loading")!;
const loginPromptEl = document.getElementById("login-prompt")!;
const mainContentEl = document.getElementById("main-content")!;
const sessionStatusEl = document.getElementById("session-status")!;
const todoSectionEl = document.getElementById("todo-section")!;
const todoListEl = document.getElementById("todo-list")!;
const newTodoInputEl = document.getElementById(
  "new-todo-input"
) as HTMLInputElement;
const addTodoBtnEl = document.getElementById("add-todo-btn")!;

function initializeFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([AUTH_STORAGE_KEY], (result) => {
      const credentials = result[AUTH_STORAGE_KEY] as
        | StoredAuthCredentials
        | undefined;
      if (credentials && credentials.expiresAt > Date.now()) {
        resolve(credentials);
      } else {
        resolve(null);
      }
    });
  });
}

function showState(state: "loading" | "login" | "main"): void {
  loadingEl.classList.toggle("hidden", state !== "loading");
  loginPromptEl.classList.toggle("hidden", state !== "login");
  mainContentEl.classList.toggle("hidden", state !== "main");
}

function timestampToDate(timestamp: FirestoreTimestamp | Timestamp): Date {
  if ("toDate" in timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
}

function calculateRemainingSeconds(session: FocusSession): number {
  const startTime = timestampToDate(session.startedAt).getTime();
  const endTime = startTime + session.durationMinutes * 60 * 1000;
  const remaining = Math.max(0, endTime - Date.now());
  return Math.floor(remaining / 1000);
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function calculateProgress(session: FocusSession): number {
  const totalSeconds = session.durationMinutes * 60;
  const remainingSeconds = calculateRemainingSeconds(session);
  const elapsedSeconds = totalSeconds - remainingSeconds;
  return Math.min(100, (elapsedSeconds / totalSeconds) * 100);
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.length > 20 ? url.substring(0, 20) + "..." : url;
  }
}

function renderSessionStatus(): void {
  if (isLoadingSession) {
    sessionStatusEl.innerHTML = `
      <div class="session-loading">
        <div class="loading-spinner"></div>
        <p>Loading session...</p>
      </div>
    `;
    todoSectionEl.classList.add("hidden");
    return;
  }

  if (!currentSession) {
    sessionStatusEl.innerHTML = `
      <div class="no-session">
        <div class="icon">${icons.moon}</div>
        <h3>No Active Session</h3>
        <p>Start a focus session from the web app to begin blocking distractions.</p>
      </div>
    `;
    todoSectionEl.classList.add("hidden");
    return;
  }

  const remainingSeconds = calculateRemainingSeconds(currentSession);
  const progress = calculateProgress(currentSession);
  const modeLabel =
    currentSession.mode === "allowlist" ? "Allowlist" : "Blocklist";
  const modeIcon =
    currentSession.mode === "allowlist" ? icons.shield : icons.shieldOff;

  sessionStatusEl.innerHTML = `
    <div class="session-card">
      <div class="session-header">
        <span class="mode-badge ${currentSession.mode}">
          ${modeIcon} ${modeLabel}
        </span>
        <span class="status-indicator">
          <span class="dot"></span>
          Active
        </span>
      </div>
      
      <div class="timer-display">
        <div class="time" id="timer-value">${formatTime(remainingSeconds)}</div>
        <div class="label">remaining</div>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      
      <div class="session-info">
        <div class="info-row">
          <span class="label">Duration</span>
          <span class="value">${currentSession.durationMinutes} min</span>
        </div>
        <div class="info-row">
          <span class="label">Blocked attempts</span>
          <span class="value">${currentSession.tabSwitchAttempts}</span>
        </div>
      </div>
      
      ${
        currentSession.urls.length > 0
          ? `
        <div class="url-list">
          <h4>${
            currentSession.mode === "allowlist"
              ? "Allowed Sites"
              : "Blocked Sites"
          }</h4>
          <div class="urls">
            ${currentSession.urls
              .slice(0, 5)
              .map((url) => `<span class="url-chip">${truncateUrl(url)}</span>`)
              .join("")}
            ${
              currentSession.urls.length > 5
                ? `<span class="url-chip">+${
                    currentSession.urls.length - 5
                  } more</span>`
                : ""
            }
          </div>
        </div>
      `
          : ""
      }
      
      <div class="web-only-notice">
        ${icons.info} Sessions can only be stopped from the web app
      </div>
    </div>
  `;

  todoSectionEl.classList.remove("hidden");
  startTimerUpdates();
}

function startTimerUpdates(): void {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = window.setInterval(() => {
    if (!currentSession) {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    const timerEl = document.getElementById("timer-value");
    const progressEl = document.querySelector(".progress-fill") as HTMLElement;

    if (timerEl) {
      const remainingSeconds = calculateRemainingSeconds(currentSession);
      timerEl.textContent = formatTime(remainingSeconds);

      if (progressEl) {
        const progress = calculateProgress(currentSession);
        progressEl.style.width = `${progress}%`;
      }

      if (remainingSeconds <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        renderSessionStatus();
      }
    }
  }, 1000);
}

function renderTodos(todos: SessionTodo[]): void {
  if (isLoadingTodos) {
    todoListEl.innerHTML = `
      <div class="todo-loading">
        <div class="loading-spinner small"></div>
        <p>Loading tasks...</p>
      </div>
    `;
    return;
  }

  if (todos.length === 0) {
    todoListEl.innerHTML = `<div class="todo-empty">No tasks yet. Add one below!</div>`;
    return;
  }

  todoListEl.innerHTML = todos
    .map(
      (todo) => `
    <div class="todo-item ${todo.completed ? "completed" : ""}" data-id="${
        todo.id
      }">
      <input type="checkbox" ${todo.completed ? "checked" : ""} data-todo-id="${
        todo.id
      }">
      <span class="todo-text">${escapeHtml(todo.text)}</span>
    </div>
  `
    )
    .join("");

  todoListEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", handleTodoToggle);
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function handleTodoToggle(event: Event): Promise<void> {
  const checkbox = event.target as HTMLInputElement;
  const todoId = checkbox.dataset.todoId;

  if (!todoId || !currentUserId || !currentSession) return;

  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    const todoRef = doc(
      db,
      "users",
      currentUserId,
      "sessions",
      currentSession.id,
      "todos",
      todoId
    );
    const todoDoc = await getDoc(todoRef);

    if (todoDoc.exists()) {
      const currentCompleted = todoDoc.data().completed;
      await updateDoc(todoRef, {
        completed: !currentCompleted,
        completedAt: !currentCompleted ? Timestamp.now() : null,
      });
    }
  } catch (error) {
    console.error("[FocusSpace] Error toggling todo:", error);
    checkbox.checked = !checkbox.checked;
  }
}

async function handleAddTodo(): Promise<void> {
  const text = newTodoInputEl.value.trim();
  if (!text || !currentUserId || !currentSession) return;

  addTodoBtnEl.setAttribute("disabled", "true");

  try {
    const firebaseApp = initializeFirebaseApp();
    const db = getFirestore(firebaseApp);

    const todosRef = collection(
      db,
      "users",
      currentUserId,
      "sessions",
      currentSession.id,
      "todos"
    );

    await addDoc(todosRef, {
      sessionId: currentSession.id,
      userId: currentUserId,
      text,
      completed: false,
      createdAt: Timestamp.now(),
      completedAt: null,
    });

    newTodoInputEl.value = "";
  } catch (error) {
    console.error("[FocusSpace] Error adding todo:", error);
  } finally {
    addTodoBtnEl.removeAttribute("disabled");
  }
}

function setupSessionListener(userId: string): void {
  if (sessionUnsubscribe) sessionUnsubscribe();

  isLoadingSession = true;
  renderSessionStatus();

  const firebaseApp = initializeFirebaseApp();
  const db = getFirestore(firebaseApp);

  const sessionsRef = collection(db, "users", userId, "sessions");
  const q = query(
    sessionsRef,
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1)
  );

  sessionUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      isLoadingSession = false;

      if (snapshot.empty) {
        currentSession = null;
        if (todosUnsubscribe) {
          todosUnsubscribe();
          todosUnsubscribe = null;
        }
      } else {
        const docData = snapshot.docs[0];
        currentSession = { id: docData.id, ...docData.data() } as FocusSession;
        setupTodosListener(userId, currentSession.id);
      }

      renderSessionStatus();
    },
    (error) => {
      console.error("[FocusSpace] Error listening to session:", error);
      isLoadingSession = false;
      currentSession = null;
      renderSessionStatus();
    }
  );
}

function setupTodosListener(userId: string, sessionId: string): void {
  if (todosUnsubscribe) todosUnsubscribe();

  isLoadingTodos = true;
  renderTodos([]);

  const firebaseApp = initializeFirebaseApp();
  const db = getFirestore(firebaseApp);

  const todosRef = collection(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "todos"
  );
  const q = query(todosRef, orderBy("createdAt", "asc"));

  todosUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      isLoadingTodos = false;
      const todos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SessionTodo[];
      renderTodos(todos);
    },
    (error) => {
      console.error("[FocusSpace] Error listening to todos:", error);
      isLoadingTodos = false;
      renderTodos([]);
    }
  );
}

async function initialize(): Promise<void> {
  showState("loading");

  addTodoBtnEl.addEventListener("click", handleAddTodo);
  newTodoInputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleAddTodo();
  });

  const credentials = await getStoredCredentials();

  if (!credentials) {
    showState("login");
    return;
  }

  currentUserId = credentials.uid;
  showState("main");
  setupSessionListener(credentials.uid);
}

document.addEventListener("DOMContentLoaded", initialize);

window.addEventListener("unload", () => {
  if (sessionUnsubscribe) sessionUnsubscribe();
  if (todosUnsubscribe) todosUnsubscribe();
  if (timerInterval) clearInterval(timerInterval);
});
