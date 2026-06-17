'use client'

import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const LAST_UPDATED = 'June 17, 2026'

const section = { marginBottom: 28 }
const h2 = { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--black)', marginBottom: 10 }
const p = { fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10 }
const ul = { fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10, paddingLeft: 20 }

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: 'var(--light)', padding: '48px 24px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: 'white', borderRadius: 14, border: '1px solid var(--border)', padding: '40px 44px' }}>

          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--black)', marginBottom: 6 }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

          <div style={section}>
            <p style={p}>
              These Terms of Service (&quot;Terms&quot;) govern your use of PrintHub, an online printing and branding
              platform operated by <strong>C-Chu Media Limited</strong> (&quot;C-Chu Media,&quot; &quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;), accessible at printhub.cchumedia.com. By creating an account,
              placing an order, or otherwise using PrintHub, you agree to these Terms. If you do not agree,
              please do not use the platform.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>1. Who We Are</h2>
            <p style={p}>
              C-Chu Media Limited is a printing, branding, and publishing company registered in Nigeria,
              operating from Suite 38, Mazfallah Shopping Complex, Karu, Abuja. PrintHub is our online ordering
              platform for print products and services.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>2. Orders and Pricing</h2>
            <p style={p}>
              Prices displayed on PrintHub are quoted in Nigerian Naira (₦) and reflect the specifications you
              select at the time of order (size, material, quantity, finishing, and any add-ons). Prices may
              change without notice for future orders, but an order already placed and paid for will be honoured
              at the price confirmed at checkout.
            </p>
            <p style={p}>
              We reserve the right to decline or cancel any order — including after payment — if we are unable
              to fulfil it as specified, if the request is unlawful, or if it depicts content we are unable to
              print (see Section 5). Where an order is cancelled by us for these reasons, any payment received
              will be refunded in full.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>3. Custom Print Orders and Refunds</h2>
            <p style={p}>
              Most products on PrintHub are custom-made to your specifications. Because production begins
              promptly after an order is confirmed and paid for, <strong>orders cannot be refunded or
              cancelled once printing has started</strong>, except where the fault lies with us (see below).
            </p>
            <p style={p}>
              Before printing, we review submitted designs for visible production issues (e.g. low resolution,
              incorrect dimensions, missing bleed). If you submit a design and we print it as supplied, you are
              responsible for the accuracy of that design — including spelling, colours, and layout — unless
              the resulting defect is due to an error on our part (e.g. wrong material, wrong size, a printing
              fault not attributable to your file). In that case, we will reprint the order at no additional
              cost, or issue a refund where a reprint is not practical.
            </p>
            <p style={p}>
              If you believe your order arrived defective or incorrect due to our error, contact us within
              48 hours of delivery or pickup with photos of the issue, and we will review and resolve it
              promptly.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>4. Payments</h2>
            <p style={p}>
              We accept payment via Paystack (card, bank transfer, USSD) and direct bank transfer with receipt
              upload. Orders paid via bank transfer are confirmed once payment is verified, typically within a
              few hours during business hours. We do not store your card details — card payments are processed
              securely by Paystack, a licensed payment processor.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>5. Content You Submit</h2>
            <p style={p}>
              You are responsible for ensuring that any design, image, text, or other content you upload or
              request us to create does not infringe on the intellectual property, trademark, or other rights
              of any third party, and does not contain unlawful, defamatory, or harmful content. We reserve the
              right to decline to print any content we reasonably believe violates this Section or any
              applicable law.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>6. Delivery</h2>
            <p style={p}>
              Delivery timelines and fees vary by location and delivery method (pickup, local Abuja delivery,
              or interstate) and are shown at checkout. We make reasonable efforts to meet stated timelines, but
              these are estimates, not guarantees, and may be affected by factors outside our control (logistics
              partner delays, force majeure, incorrect address information provided by you).
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>7. Limitation of Liability</h2>
            <p style={p}>
              To the fullest extent permitted by Nigerian law, C-Chu Media Limited&apos;s liability for any claim
              arising from an order is limited to the amount paid for that order. We are not liable for indirect,
              incidental, or consequential losses, including loss of business, profits, or goodwill, arising from
              the use of our products or services.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>8. Account Responsibility</h2>
            <p style={p}>
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activity that occurs under your account. Notify us immediately if you suspect unauthorised access.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>9. Affiliate Program</h2>
            <p style={p}>
              If you join the C-Chu Media Affiliate Program, separate program-specific terms regarding
              commission rates, payout thresholds, and conduct apply, and are communicated to you upon
              enrolment. We reserve the right to suspend or terminate affiliate accounts found to be in breach
              of fair-use or anti-fraud expectations.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>10. Changes to These Terms</h2>
            <p style={p}>
              We may update these Terms from time to time. Continued use of PrintHub after changes are posted
              constitutes acceptance of the revised Terms. We will update the &quot;Last updated&quot; date above
              when changes are made.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>11. Governing Law</h2>
            <p style={p}>
              These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from
              these Terms or your use of PrintHub will be subject to the exclusive jurisdiction of the courts of
              the Federal Capital Territory, Abuja.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>12. Contact Us</h2>
            <p style={p}>
              Questions about these Terms can be sent to <a href="mailto:info@cchumedia.com" style={{ color: 'var(--red)' }}>info@cchumedia.com</a>,
              via WhatsApp at <a href="https://wa.me/2348052929523" style={{ color: 'var(--red)' }}>+234 805 292 9523</a>,
              or by visiting us at Suite 38, Mazfallah Shopping Complex, Karu, Abuja.
            </p>
          </div>

          <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--gray)' }}>
            See also our <Link href="/privacy" style={{ color: 'var(--red)' }}>Privacy Policy</Link>.
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}