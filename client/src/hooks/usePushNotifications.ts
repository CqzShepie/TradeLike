import { useCallback, useEffect, useState } from "react";
import { apiClient, getToken } from "../services/apiClient";

type PushState = "unsupported" | "default" | "granted" | "denied" | "enabled" | "error";

const publicPaths = ["/", "/login", "/signup", "/register", "/accept-staff-invite", "/accept-company-staff-invite", "/company-invite"];

export function usePushNotifications({ autoPrompt = false }: { autoPrompt?: boolean } = {}) {
  const [state, setState] = useState<PushState>(() => getInitialState());
  const [error, setError] = useState("");

  const enable = useCallback(async () => {
    setError("");

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw-push.ts");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true });
      }

      const payload = subscription.toJSON();
      await apiClient.post("/push/subscribe", {
        endpoint: payload.endpoint,
        p256dh: payload.keys?.p256dh,
        auth: payload.keys?.auth,
      });
      setState("enabled");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unable to enable push notifications.");
    }
  }, []);

  useEffect(() => {
    if (!autoPrompt || !getToken() || isPublicPath(window.location.pathname)) {
      return;
    }

    if (Notification.permission === "default") {
      void enable();
    }
  }, [autoPrompt, enable]);

  return {
    state,
    error,
    enable,
    supported: state !== "unsupported",
  };
}

function getInitialState(): PushState {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function isPublicPath(pathname: string) {
  return publicPaths.some(path => pathname === path || pathname.startsWith(`${path}?`));
}
