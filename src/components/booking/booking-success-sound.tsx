"use client";

import { useEffect } from "react";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notification-sound";

export function BookingSuccessSound() {
  useEffect(() => {
    unlockNotificationSound();
    playNotificationSound();
  }, []);

  return null;
}
