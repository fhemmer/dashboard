"use client";

import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Timer } from "../types";

/**
 * Get the current notification permission, returns "default" if not available
 */
function getNotificationPermission(): NotificationPermission {
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission;
  }
  return "default";
}

/**
 * Subscriber for notification permission changes (none available, but needed for useSyncExternalStore)
 */
function subscribeToNotificationPermission(_callback: () => void): () => void {
  // There's no native event for permission changes, so we just return a no-op cleanup
  // The permission will be re-checked when user interacts with the enable button
  return () => {};
}

/**
 * Server snapshot for SSR - always return "default" to avoid hydration mismatch
 */
function getServerSnapshot(): NotificationPermission {
  return "default";
}

/**
 * TimerAlertProvider listens for timer-complete events and triggers
 * audio alerts via Web Audio API and optional browser notifications.
 */
export function TimerAlertProvider() {
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Use useSyncExternalStore to get the permission without causing hydration mismatch
  const initialPermission = useSyncExternalStore(
    subscribeToNotificationPermission,
    getNotificationPermission,
    getServerSnapshot
  );
  
  // Track permission changes from user interaction (requestPermission)
  const [permissionOverride, setPermissionOverride] = useState<NotificationPermission | null>(null);
  
  // Use the override if set, otherwise use the synced initial permission
  const notificationPermission = permissionOverride ?? initialPermission;

  /**
   * Play a simple alarm tone using Web Audio API
   */
  const playAlarmSound = useCallback(() => {
    const context = audioContextRef.current;
    if (!context) return;

    try {
      // Create a simple beep tone (440Hz for 0.5s, repeated 3 times)
      for (let i = 0; i < 3; i++) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = "sine";

        // Envelope for smoother sound
        const startTime = context.currentTime + i * 0.7;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      }
    } catch (error) {
      console.error("Error playing alarm sound:", error);
    }
  }, []);

  useEffect(() => {
    // Initialize Web Audio API
    let audioContext: AudioContext | null = null;
    if (typeof window !== "undefined" && "AudioContext" in window) {
      audioContext = new AudioContext();
      audioContextRef.current = audioContext;
    }

    // Listen for timer completion events
    const handleTimerComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{ timer: Timer }>;
      const timer = customEvent.detail.timer;

      // Play audio if enabled
      if (timer.enableAlarm) {
        playAlarmSound();
      }

      // Show browser notification if permitted (independent of audio setting)
      if (notificationPermission === "granted") {
        new Notification(`Timer Complete: ${timer.name}`, {
          body: "Your timer has finished!",
          tag: `timer-${timer.id}`,
        });
      }
    };

    window.addEventListener("timer-complete", handleTimerComplete);

    return () => {
      window.removeEventListener("timer-complete", handleTimerComplete);
      // Safely close AudioContext if it exists and isn't already closed
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {
          // Ignore errors during cleanup
        });
      }
      audioContextRef.current = null;
    };
  }, [notificationPermission, playAlarmSound]);

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setPermissionOverride(permission);
    }
  };

  // Show notification permission prompt if not yet decided
  if (notificationPermission === "default") {
    return (
      <div className="rounded-lg border bg-muted p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Enable Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get notified when your timers complete
              </p>
            </div>
          </div>
          <Button size="sm" onClick={requestNotificationPermission}>
            Enable
          </Button>
        </div>
      </div>
    );
  }

  // Show status when notifications are enabled
  if (notificationPermission === "granted") {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 mb-4">
        <div className="flex items-center gap-3">
          <BellRing className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">Notifications Enabled</p>
            <p className="text-xs text-green-600/80 dark:text-green-500/80">
              You&apos;ll be notified when timers complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show status when notifications are denied
  if (notificationPermission === "denied") {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 mb-4">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Notifications Blocked</p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">
              Enable notifications in your browser settings to receive alerts
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
