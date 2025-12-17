import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FocusSession } from "@/lib/types/session";

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
