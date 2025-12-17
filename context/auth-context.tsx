"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  syncAuthToExtension,
  clearExtensionAuth,
  refreshExtensionAuth,
} from "@/lib/utils/extension-auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Token refresh interval (45 minutes - before the 1 hour expiry)
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Clear any existing refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      if (firebaseUser) {
        // Sync auth credentials to Chrome extension
        // Requirements: 7.2 - Provide authentication credentials to the Chrome extension
        await syncAuthToExtension(firebaseUser);

        // Set up periodic token refresh for extension
        refreshIntervalRef.current = setInterval(async () => {
          if (firebaseUser) {
            await refreshExtensionAuth(firebaseUser);
          }
        }, TOKEN_REFRESH_INTERVAL);
      } else {
        // User logged out - clear extension auth
        // Requirements: 7.4 - Clear extension authentication on logout
        await clearExtensionAuth();
      }
    });

    return () => {
      unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
