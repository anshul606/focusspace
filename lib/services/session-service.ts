import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FocusSession, TabSwitchAttempt } from "@/lib/types/session";

/**
 * Input data for creating a new focus session
 */
export interface CreateSessionInput {
  userId: string;
  mode: "allowlist" | "blocklist";
  urls: string[];
  durationMinutes: number;
}

/**
 * Get the sessions collection reference for a user
 */
const getSessionsCollection = (userId: string) =>
  collection(db, "users", userId, "sessions");

/**
 * Creates a new focus session and stores it in Firebase
 * Requirements: 1.5 - Store session data in Firebase and activate immediately
 */
export async function createSession(
  input: CreateSessionInput
): Promise<FocusSession> {
  const { userId, mode, urls, durationMinutes } = input;

  const sessionData = {
    userId,
    mode,
    urls,
    durationMinutes,
    startedAt: Timestamp.now(),
    endedAt: null,
    status: "active" as const,
    tabSwitchAttempts: 0,
  };

  const sessionsRef = getSessionsCollection(userId);
  const docRef = await addDoc(sessionsRef, sessionData);

  return {
    id: docRef.id,
    ...sessionData,
  };
}

/**
 * Gets the currently active session for a user
 * Returns null if no active session exists
 */
export async function getActiveSession(
  userId: string
): Promise<FocusSession | null> {
  const sessionsRef = getSessionsCollection(userId);
  const q = query(
    sessionsRef,
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as FocusSession;
}

/**
 * Gets a session by ID
 */
export async function getSessionById(
  userId: string,
  sessionId: string
): Promise<FocusSession | null> {
  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as FocusSession;
}

/**
 * Stops an active session from the web application
 * Requirements: 2.2 - Terminate session and update Firebase with actual end time
 */
export async function stopSession(
  userId: string,
  sessionId: string
): Promise<FocusSession> {
  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  const now = Timestamp.now();

  await updateDoc(sessionRef, {
    status: "stopped",
    endedAt: now,
  });

  const updated = await getDoc(sessionRef);
  return {
    id: updated.id,
    ...updated.data(),
  } as FocusSession;
}

/**
 * Completes a session when its duration expires
 * Requirements: 2.4 - Automatically end session and update status
 */
export async function completeSession(
  userId: string,
  sessionId: string
): Promise<FocusSession> {
  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  const now = Timestamp.now();

  await updateDoc(sessionRef, {
    status: "completed",
    endedAt: now,
  });

  const updated = await getDoc(sessionRef);
  return {
    id: updated.id,
    ...updated.data(),
  } as FocusSession;
}

/**
 * Gets all sessions for a user (for analytics)
 */
export async function getAllSessions(userId: string): Promise<FocusSession[]> {
  const sessionsRef = getSessionsCollection(userId);
  const q = query(sessionsRef, orderBy("startedAt", "desc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FocusSession[];
}

/**
 * Increments the tab switch attempts counter for a session
 */
export async function incrementTabSwitchAttempts(
  userId: string,
  sessionId: string
): Promise<void> {
  const session = await getSessionById(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  await updateDoc(sessionRef, {
    tabSwitchAttempts: session.tabSwitchAttempts + 1,
  });
}

/**
 * Gets all tab switch attempts for a specific session
 */
export async function getSessionAttempts(
  userId: string,
  sessionId: string
): Promise<TabSwitchAttempt[]> {
  const attemptsRef = collection(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "attempts"
  );
  const q = query(attemptsRef, orderBy("timestamp", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    sessionId,
    userId,
    ...doc.data(),
  })) as TabSwitchAttempt[];
}

/**
 * Gets all tab switch attempts for all sessions of a user
 */
export async function getAllAttempts(
  userId: string
): Promise<Record<string, TabSwitchAttempt[]>> {
  const sessions = await getAllSessions(userId);
  const attemptsBySession: Record<string, TabSwitchAttempt[]> = {};

  for (const session of sessions) {
    const attempts = await getSessionAttempts(userId, session.id);
    attemptsBySession[session.id] = attempts;
  }

  return attemptsBySession;
}

/**
 * Logs a tab switch attempt for a session
 */
export async function logTabSwitchAttempt(
  userId: string,
  sessionId: string,
  attemptedUrl: string
): Promise<TabSwitchAttempt> {
  const attemptsRef = collection(
    db,
    "users",
    userId,
    "sessions",
    sessionId,
    "attempts"
  );

  const attemptData = {
    attemptedUrl,
    timestamp: Timestamp.now(),
  };

  const docRef = await addDoc(attemptsRef, attemptData);

  // Also increment the counter on the session
  await incrementTabSwitchAttempts(userId, sessionId);

  return {
    id: docRef.id,
    sessionId,
    userId,
    ...attemptData,
  };
}

/**
 * Subscribes to real-time updates for the active session
 * Requirements: 6.1 - Update web application display within 2 seconds when session data changes
 * Requirements: 6.2 - Chrome extension receives updates within 2 seconds
 * Returns an unsubscribe function
 */
export function subscribeToActiveSession(
  userId: string,
  callback: (session: FocusSession | null) => void
): Unsubscribe {
  const sessionsRef = getSessionsCollection(userId);
  const q = query(
    sessionsRef,
    where("status", "==", "active"),
    orderBy("startedAt", "desc"),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      callback({
        id: doc.id,
        ...doc.data(),
      } as FocusSession);
    }
  });
}

/**
 * Subscribes to real-time updates for a specific session by ID
 * Returns an unsubscribe function
 */
export function subscribeToSession(
  userId: string,
  sessionId: string,
  callback: (session: FocusSession | null) => void
): Unsubscribe {
  const sessionRef = doc(db, "users", userId, "sessions", sessionId);

  return onSnapshot(sessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
    } else {
      callback({
        id: snapshot.id,
        ...snapshot.data(),
      } as FocusSession);
    }
  });
}

/**
 * Adds a URL to an active session's URL list
 */
export async function addUrlToSession(
  userId: string,
  sessionId: string,
  newUrl: string
): Promise<void> {
  const session = await getSessionById(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  // Don't add duplicates
  if (session.urls.includes(newUrl)) {
    return;
  }

  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  await updateDoc(sessionRef, {
    urls: [...session.urls, newUrl],
  });
}

/**
 * Removes a URL from an active session's URL list
 */
export async function removeUrlFromSession(
  userId: string,
  sessionId: string,
  urlToRemove: string
): Promise<void> {
  const session = await getSessionById(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const sessionRef = doc(db, "users", userId, "sessions", sessionId);
  await updateDoc(sessionRef, {
    urls: session.urls.filter((url) => url !== urlToRemove),
  });
}

/**
 * Deletes all sessions and their attempts for a user
 * Used to clear all analytics data
 */
export async function deleteAllSessions(userId: string): Promise<void> {
  const sessions = await getAllSessions(userId);

  for (const session of sessions) {
    // Delete all attempts for this session
    const attemptsRef = collection(
      db,
      "users",
      userId,
      "sessions",
      session.id,
      "attempts"
    );
    const attemptsSnapshot = await getDocs(attemptsRef);
    for (const attemptDoc of attemptsSnapshot.docs) {
      await deleteDoc(attemptDoc.ref);
    }

    // Delete the session itself
    const sessionRef = doc(db, "users", userId, "sessions", session.id);
    await deleteDoc(sessionRef);
  }
}
