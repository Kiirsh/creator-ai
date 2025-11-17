// src/app/creator/[id]/audio/page.tsx
import React from "react";
import { notFound } from "next/navigation";

// Audio purchases are disabled, so surface a 404 to hide the old flow.
export default function AudioPage() {
  notFound();
}
