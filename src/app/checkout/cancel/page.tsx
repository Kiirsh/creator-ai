// src/app/checkout/cancel/page.tsx
export default function CancelPage() {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6 text-white">
        <h1 className="text-2xl font-semibold">Checkout cancelled</h1>
        <p className="text-white/70">
          No worries—your card wasn’t charged. You can choose another rate or come back later.
        </p>
        <a href="/creators" className="inline-block rounded-full border px-5 py-3">
          Back to creators
        </a>
      </main>
    );
  }
  