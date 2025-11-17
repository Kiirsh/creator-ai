// src/components/checkout/BuyRateButton.tsx
"use client";

import Link from "next/link";
import * as React from "react";

type Props = {
  creatorId: string;
  rateId: string;
  className?: string;
  children?: React.ReactNode;
};

export default function BuyRateButton({
  creatorId,
  rateId,
  className,
  children,
}: Props) {
  const href = `/purchase/${encodeURIComponent(
    creatorId
  )}?rate=${encodeURIComponent(rateId)}`;

  return (
    <Link
      href={href}
      aria-label="Go to checkout"
      className={[
        "rounded-full border px-4 py-2 transition",
        "hover:bg-white hover:text-black hover:border-white",
        className || "",
      ].join(" ")}
    >
      {children ?? "Buy this"}
    </Link>
  );
}
