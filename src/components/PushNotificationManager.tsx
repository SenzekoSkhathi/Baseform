"use client";

import { useEffect, useState } from "react";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

async function subscribeUser(registration: ServiceWorkerRegistration): Promise<boolean> {
  const publicKey = await getVapidPublicKey();
  if (!publicKey) return false;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

async function unsubscribeUser(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

export type PushNotificationManagerProps = {
  /** Render prop — gives the parent full control over the UI. */
  children: (props: {
    permission: PermissionState;
    isLoading: boolean;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
  }) => React.ReactNode;
};

export default function PushNotificationManager({ children }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    setPermission(Notification.permission as PermissionState);
  }, []);

  async function enable() {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === "granted") {
        const reg = await navigator.serviceWorker.ready;
        await subscribeUser(reg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function disable() {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      await unsubscribeUser(reg);
      // Can't programmatically revoke browser permission — guide user to do it manually
    } finally {
      setIsLoading(false);
    }
  }

  return <>{children({ permission, isLoading, enable, disable })}</>;
}
