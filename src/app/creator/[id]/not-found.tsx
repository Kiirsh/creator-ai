import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <div className="rounded-3xl border border-white/10 bg-neutral-950 p-10 text-white">
        <h1 className="text-2xl font-semibold">Creator not found</h1>
        <p className="mt-2 text-white/70">
          We couldn’t find that profile. It might have been removed or the URL is incorrect.
        </p>
        <div className="mt-6">
          <Link href="/creators" className="rounded-full border px-5 py-3">
            Back to creators
          </Link>
        </div>
      </div>
    </main>
  );
}
