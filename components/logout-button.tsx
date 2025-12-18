"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { getActiveSession, stopSession } from "@/lib/services/session-service";
import { clearExtensionAuth } from "@/lib/utils/extension-auth";

export default function LogoutButton() {
  const router = useRouter();
  const { user } = useAuth();

  /**
   * Handle logout - terminate active sessions and clear extension auth
   * Requirements: 7.4 - Terminate any active session and clear extension authentication
   */
  const handleLogout = async () => {
    try {
      // Terminate any active session before logging out
      if (user) {
        const activeSession = await getActiveSession(user.uid);
        if (activeSession) {
          await stopSession(user.uid, activeSession.id);
          console.log("[Flow] Active session terminated on logout");
        }
      }

      // Clear extension auth state
      await clearExtensionAuth();

      // Sign out from Firebase
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still try to sign out even if session termination fails
      try {
        await signOut(auth);
        router.replace("/login");
      } catch {
        // Ignore secondary error
      }
    }
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Logout
    </Button>
  );
}
