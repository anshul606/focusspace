/**
 * FocusSpace Extension Popup
 *
 * Requirements:
 * - 2.1: Display remaining session time
 * - 2.3: No stop button (web only)
 * - 5.3: Add Session_Todo items from extension
 * - 5.4: Mark todos as complete and sync
 * - 5.5: Display all Session_Todo items with completion status
 */

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

// Firebase configuration - should match web app
const firebaseConfig = {
  apiKey: "AIzaSyD5iAXgpdcMhHbnQOvM4NHAVZ0m97vox2A",
  authDomain: "focusspace-aaa5a.firebaseapp.com",
  projectId: "focusspace-aaa5a",
  storageBucket: "focusspace-aaa5a.firebasestorage.app",
  messagingSenderId: "356773523134",
  appId: "1:356773523134:web:b48c5ef84412f5975b78ef",
};

// Storage key for auth credentials
const AUTH_STORAGE_KEY = "focusspace_auth_credentials";

// SVG Icons (Lucide-style)
const icons = {
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  shieldOff: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71"/><path d="M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264"/></svg>`,
  listTodo: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
};

// State
let app: FirebaseApp | null = null;
let currentUserId: string | null = null;
let currentSession: FocusSession | null = null;
let sessionUnsubscribe: Unsubscribe | null = null;
let todosUnsubscribe: Unsubscribe | null = null;
let timerInterval: number | null = null;
let isLoadingSession: boolean = true;
let isLoadingTodos: boolean = false;

// DOM Elements
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

/**
 * Initialize Firebase app
 */
function initializeFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Get stored auth credentials from chrome.storage.local
 */
async function getStoredCredentials(): Promise<StoredAuthCredentials | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_STORAGE_KEY], (result) => {
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

/**
 * Show the appropriate UI state
 */
function showState(state: "loading" | "login" | "main"): void {
  loadingEl.classList.toggle("hidden", state !== "loading");
  loginPromptEl.classList.toggle("hidden", state !== "login");
  mainContentEl.classList.toggle("hidden", state !== "main");
}

/**
 * Convert Firestore timestamp to Date
 */
function timestampToDate(timestamp: FirestoreTimestamp | Timestamp): Date {
  if ("toDate" in timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
}

/**
 * Calculate remaining time in seconds
 */
function calculateRemainingSeconds(session: FocusSession): number {
  const startTime = timestampToDate(session.startedAt).getTime();
  const endTime = startTime + session.durationMinutes * 60 * 1000;
  const remaining = Math.max(0, endTime - Date.now());
  return Math.floor(remaining / 1000);
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
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

/**
 * Calculate progress percentage
 */
function calculateProgress(session: FocusSession): number {
  const totalSeconds = session.durationMinutes * 60;
  const remainingSeconds = calculateRemainingSeconds(session);
  const elapsedSeconds = totalSeconds - remainingSeconds;
  return Math.min(100, (elapsedSeconds / totalSeconds) * 100);
}

/**
 * Render the session status section
 */
function renderSessionStatus(): void {
  // Show loading state while fetching session
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
              .map(
                (url) => `
              <span class="url-chip">${truncateUrl(url)}</span>
            `
              )
              .join("")}
            ${
              currentSession.urls.length > 5
                ? `
              <span class="url-chip">+${
                currentSession.urls.length - 5
              } more</span>
            `
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

  // Show todo section when session is active
  todoSectionEl.classList.remove("hidden");

  // Start timer updates
  startTimerUpdates();
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.length > 20 ? url.substring(0, 20) + "..." : url;
  }
}

/**
 * Start timer interval for live updates
 */
function startTimerUpdates(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

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

      // Session expired
      if (remainingSeconds <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        renderSessionStatus();
      }
    }
  }, 1000);
}

/**
 * Render the todo list
 */
function renderTodos(todos: SessionTodo[]): void {
  // Show loading state while fetching todos
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
    todoListEl.innerHTML = `
      <div class="todo-empty">
        No tasks yet. Add one below!
      </div>
    `;
    return;
  }

  todoListEl.innerHTML = todos
    .map(
      (todo) => `
    <div class="todo-item ${todo.completed ? "completed" : ""}" data-id="${
        todo.id
      }">
      <input 
        type="checkbox" 
        ${todo.completed ? "checked" : ""} 
        data-todo-id="${todo.id}"
      >
      <span class="todo-text">${escapeHtml(todo.text)}</span>
    </div>
  `
    )
    .join("");

  // Add event listeners for checkboxes
  todoListEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", handleTodoToggle);
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle todo checkbox toggle
 */
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
    // Revert checkbox state on error
    checkbox.checked = !checkbox.checked;
  }
}

/**
 * Handle adding a new todo
 */
async function handleAddTodo(): Promise<void> {
  const text = newTodoInputEl.value.trim();

  if (!text || !currentUserId || !currentSession) return;

  // Disable button while adding
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

    // Clear input on success
    newTodoInputEl.value = "";
  } catch (error) {
    console.error("[FocusSpace] Error adding todo:", error);
  } finally {
    addTodoBtnEl.removeAttribute("disabled");
  }
}

/**
 * Set up Firebase listener for active session
 */
function setupSessionListener(userId: string): void {
  if (sessionUnsubscribe) {
    sessionUnsubscribe();
  }

  // Show loading state
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
        currentSession = {
          id: docData.id,
          ...docData.data(),
        } as FocusSession;

        // Set up todos listener for this session
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

/**
 * Set up Firebase listener for session todos
 */
function setupTodosListener(userId: string, sessionId: string): void {
  if (todosUnsubscribe) {
    todosUnsubscribe();
  }

  // Show loading state for todos
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

/**
 * Initialize the popup
 */
async function initialize(): Promise<void> {
  showState("loading");

  // Set up event listeners
  addTodoBtnEl.addEventListener("click", handleAddTodo);
  newTodoInputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleAddTodo();
    }
  });

  // Check for stored credentials
  const credentials = await getStoredCredentials();

  if (!credentials) {
    showState("login");
    return;
  }

  currentUserId = credentials.uid;
  showState("main");

  // Set up session listener
  setupSessionListener(credentials.uid);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initialize);

// Clean up on popup close
window.addEventListener("unload", () => {
  if (sessionUnsubscribe) sessionUnsubscribe();
  if (todosUnsubscribe) todosUnsubscribe();
  if (timerInterval) clearInterval(timerInterval);
});
