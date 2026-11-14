"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/store/useStore";

/**
 * Once on the client: restore the signed-in session from the browser, then shift
 * the mock database to today's date. Both run after hydration, so the server
 * HTML and the first client render always match.
 *
 * Order matters: zustand's persist saves on every update, so any update made
 * before the session is restored would overwrite it with the signed-out state.
 */
function ClientBootstrap() {
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => {
      useStore.getState().rebaseSeed();
      useStore.setState({ sessionReady: true });
    });
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <ClientBootstrap />
      {children}
      <Toaster theme="light" position="bottom-center" richColors />
    </TooltipProvider>
  );
}
