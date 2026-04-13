"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase";

export default function AnalyticsInit() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}