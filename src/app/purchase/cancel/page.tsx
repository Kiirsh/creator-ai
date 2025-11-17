// src/app/purchase/cancel/page.tsx
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PurchaseCancelPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white">Payment Cancelled</h1>
        
        <p className="text-white/70 text-lg">
          Your payment was cancelled. No charges have been made to your account.
        </p>
        
        <div className="space-y-3 pt-4">
          <Link 
            href="/creators"
            className="inline-block rounded-full bg-white text-black px-6 py-3 font-medium hover:bg-white/90 transition-colors"
          >
            Browse Creators
          </Link>
          
          <div>
            <Link 
              href="/dashboard"
              className="text-white/60 hover:text-white transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
