// src/app/terms/purchase/page.tsx
export const revalidate = 3600;

export default function PurchaseTermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white/90">
      <h1 className="text-3xl font-semibold mb-2">Purchase Terms</h1>
      <p className="text-white/60 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-invert prose-headings:scroll-mt-24">
        <p>
          These Purchase Terms (“<strong>Terms</strong>”) govern your purchase of AI Video and/or AI
          Audio from creators on our platform (“<strong>Platform</strong>”). By clicking purchase,
          you agree to these Terms in addition to our general Terms of Service and Privacy Policy.
          If there is a conflict, these Terms control for purchases.
        </p>

        <h2>1) Scope</h2>
        <p>
          You may purchase (a) <strong>AI Video</strong> (creator likeness in video) and/or
          (b) <strong>AI Audio</strong> (voice-over generated with the creator’s licensed voice
          clone). We route payments via Stripe. Content is delivered as a download link (e.g.,
          MP4/MP3) to the email you provide at checkout.
        </p>

        <h2>2) Who you contract with</h2>
        <p>
          You are purchasing a license to use content created by a third-party creator. We operate
          the Platform and payment rails but are not the producer, editor, or publisher of the
          content. Payments are split: a platform fee and a payout to the creator.
        </p>

        <h2>3) Orders & pricing</h2>
        <ul>
          <li>
            <strong>Video:</strong> priced per rate card set by the creator. Optional add-ons (e.g.,
            brand usage, creator TikTok post) may apply.
          </li>
          <li>
            <strong>AI Audio:</strong> priced per character at the rate set by the creator. Final
            price is computed server-side from your submitted script.
          </li>
          <li>Prices are shown in GBP unless stated otherwise and are exclusive of taxes.</li>
        </ul>

        <h2>4) Delivery</h2>
        <p>
          After payment clears, we notify the creator and generate or fulfil your order. Delivery
          times are estimates only. If creation requires changes to your script or violates these
          Terms, we may cancel and refund (in whole or part) at our discretion.
        </p>

        <h2>5) License to you (what you can do)</h2>
        <p>
          Upon full payment, you receive a non-exclusive, worldwide license to use the delivered
          asset(s) as described below:
        </p>
        <ul>
          <li>
            <strong>Baseline license:</strong> organic posting on your owned channels, websites, and
            presentations, in perpetuity, unchanged, for your brand.
          </li>
          <li>
            <strong>Brand usage / paid ads:</strong> <em>only</em> if you bought the “brand usage”
            add-on (video) or if your order explicitly includes ad rights (audio). Otherwise, paid
            media, whitelisting, boosted posts, and programmatic ads are not permitted.
          </li>
          <li>
            <strong>Resale or sublicensing:</strong> not permitted (except to your media/agency
            vendors solely to place media for you).
          </li>
        </ul>

        <h2>6) Restrictions (what you can’t do)</h2>
        <ul>
          <li>
            No deepfake, impersonation, political, adult, hateful, or unlawful content; no medical
            or financial advice; no claims that the creator personally endorses your brand unless
            expressly stated in writing.
          </li>
          <li>
            Don’t alter the creator’s likeness/voice to mislead, or combine with other models to
            imply statements the creator didn’t make.
          </li>
          <li>
            Don’t re-train, extract, or benchmark any model using the delivered assets or the
            creator’s voice/likeness.
          </li>
        </ul>

        <h2>7) Creator & model compliance</h2>
        <p>
          For AI Audio we use ElevenLabs TTS. The creator has granted us the right to use their
          voice profile for your order. We never expose the underlying voice ID publicly. You agree
          not to attempt to identify, copy, or recreate the voice profile.
        </p>

        <h2>8) Revisions & refunds</h2>
        <ul>
          <li>
            <strong>Video:</strong> revision policy (if any) is stated on the creator’s rate card or
            in your order confirmation.
          </li>
          <li>
            <strong>Audio:</strong> because pricing is per character and generated on demand, orders
            are generally non-refundable once generation starts, except for technical failure or
            material non-conformity to your submitted script.
          </li>
          <li>Chargebacks for delivered work may result in license termination and takedowns.</li>
        </ul>

        <h2>9) Intellectual property</h2>
        <p>
          The creator retains all right, title, and interest in their likeness and voice. You own
          your script and any brand assets you provide. The delivered output is licensed to you as
          described above—not sold. We may store scripts and outputs to operate the service, comply
          with law, and prevent abuse.
        </p>

        <h2>10) Payments, fees & taxes</h2>
        <p>
          Payments are processed by Stripe. You authorize us to charge your payment method for the
          order amount plus platform fees and applicable taxes. You’re responsible for any VAT/GST
          or withholding taxes that apply.
        </p>

        <h2>11) Takedowns & compliance</h2>
        <p>
          We may suspend or remove content that breaches these Terms, our policies, or law. If we do
          so due to your breach, no refund is owed and you must immediately cease use.
        </p>

        <h2>12) Warranties & disclaimers</h2>
        <p>
          Services are provided “as is”. We don’t guarantee any specific performance, campaign
          results, or creator availability. To the maximum extent permitted by law, we disclaim all
          implied warranties (merchantability, fitness, non-infringement).
        </p>

        <h2>13) Liability cap</h2>
        <p>
          Our total liability for a purchase will not exceed the amount you paid for that purchase.
          We are not liable for indirect or consequential losses.
        </p>

        <h2>14) Indemnity</h2>
        <p>
          You will defend and indemnify the Platform and the creator against claims arising from:
          (a) your script, brand assets, or use of the output; (b) your breach of these Terms; or
          (c) ads or claims you make about your products.
        </p>

        <h2>15) Termination</h2>
        <p>
          We may terminate or suspend orders that violate policy. On termination for breach, your
          license to the output ends and you must remove it from all channels.
        </p>

        <h2>16) Governing law</h2>
        <p>
          These Terms are governed by the laws of England and Wales. Courts of England have
          exclusive jurisdiction, except that we may seek injunctive relief in any forum.
        </p>

        <h2>17) Contact</h2>
        <p>
          Questions? Email <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.
        </p>

        <hr />
        <p className="text-xs text-white/50">
          <em>Not legal advice.</em> You should review these terms with counsel for your specific
          business and jurisdictions.
        </p>
      </div>
    </main>
  );
}
