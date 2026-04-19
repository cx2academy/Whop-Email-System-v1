'use client';

import { useSession } from 'next-auth/react';

/**
 * useUser()
 * 
 * Client-side hook to get the current authenticated user.
 * Requires SessionProvider to be present in the tree.
 */
export function useUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}
