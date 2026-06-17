'use client'

import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const LAST_UPDATED = 'June 17, 2026'

const section = { marginBottom: 28 }
const h2 = { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--black)', marginBottom: 10 }
const h3 = { fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, color: 'var(--black)', marginTop: 16, marginBottom: 8 }
const p = { fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10 }

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main style={{ background: 'var(--light)', padding: '48px 24px', minHeight: '70vh' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: 'white', borderRadius: 14, border: '1px solid var(--border)', padding: '40px 44px' }}>

          <h1 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 28, color: 'var(--black)', marginBottom: 6 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 32 }}>Last updated: {LAST_UPDATED}</p>

          <div style={section}>
            <p style={p}>
              This Privacy Policy explains how <strong>C-Chu Media Limited</strong> (&quot;C-Chu Media,&quot;
              &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects your personal
              information when you use PrintHub (printhub.cchumedia.com). We process personal data in line with
              the Nigeria Data Protection Act 2023 and its associated regulations.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>1. Information We Collect</h2>
            <h3 style={h3}>Information you provide directly</h3>
            <p style={p}>
              Name, email address, phone number, delivery address, and (for affiliates) bank details for
              commission payouts. We also collect any design files, briefs, or links you submit for your print
              orders.
            </p>
            <h3 style={h3}>Information collected automatically</h3>
            <p style={p}>
              Basic technical information such as your browser type and general usage of the site, used to
              keep PrintHub functioning correctly and to understand how the platform is used.
            </p>
            <h3 style={h3}>Payment information</h3>
            <p style={p}>
              When you pay via Paystack, your card or bank details are collected and processed directly by
              Paystack, not by us — we receive only a confirmation of payment and a reference number. If you
              pay via bank transfer, we receive the receipt you upload to confirm your payment.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>2. How We Use Your Information</h2>
            <p style={p}>We use your information to:</p>
            <ul style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10, paddingLeft: 20 }}>
              <li>Process and fulfil your orders, including production, delivery, and customer support</li>
              <li>Send order confirmations, status updates, and receipts</li>
              <li>Operate the affiliate program, including tracking referrals and processing payouts</li>
              <li>
                Send you marketing communications about new products, promotions, and offers via email or
                WhatsApp
              </li>
              <li>Improve PrintHub and resolve technical issues</li>
              <li>Comply with legal and tax obligations</li>
            </ul>
            <p style={p}>
              <strong>On marketing communications:</strong> by default, customers who place an order may
              receive occasional marketing messages from us. You can opt out of marketing emails at any time
              using the unsubscribe link included in those emails, or by contacting us directly using the
              details in Section 7 to request removal from marketing communications. Opting out of marketing
              does not affect order-related notifications (confirmations, delivery updates), which we send as
              part of fulfilling your order.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>3. Who We Share Your Information With</h2>
            <p style={p}>We share information only as needed to operate PrintHub, with:</p>
            <ul style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10, paddingLeft: 20 }}>
              <li><strong>Paystack</strong> — to process card and bank payments</li>
              <li><strong>Supabase</strong> — our database and file storage provider, which hosts your account and order data</li>
              <li><strong>Resend</strong> — our email delivery provider, used to send order and account emails</li>
              <li><strong>Delivery/logistics partners</strong> — to fulfil interstate or local deliveries</li>
            </ul>
            <p style={p}>
              We do not sell your personal information to third parties. We may disclose information where
              required by law or to protect our legal rights.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>4. Data Storage and Security</h2>
            <p style={p}>
              Your data is stored using Supabase, with infrastructure located outside Nigeria. We take
              reasonable technical and organisational measures to protect your information, including secure
              authentication and access controls. No system is completely secure, and we cannot guarantee
              absolute security of data transmitted to us.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>5. Data Retention</h2>
            <p style={p}>
              We retain your account and order information for as long as your account is active and as
              needed to comply with our legal and tax obligations. You may request deletion of your account
              and associated personal data at any time, subject to records we are legally required to keep
              (e.g. transaction records for tax purposes).
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>6. Your Rights</h2>
            <p style={p}>Under applicable Nigerian data protection law, you have the right to:</p>
            <ul style={{ fontSize: 14, color: 'var(--dark)', lineHeight: 1.75, marginBottom: 10, paddingLeft: 20 }}>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data, subject to legal retention requirements</li>
              <li>Object to or opt out of marketing communications</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p style={p}>To exercise any of these rights, contact us using the details in Section 7.</p>
          </div>

          <div style={section}>
            <h2 style={h2}>7. Contact Us</h2>
            <p style={p}>
              For privacy-related questions or requests, contact us at{' '}
              <a href="mailto:info@cchumedia.com" style={{ color: 'var(--red)' }}>info@cchumedia.com</a>,
              via WhatsApp at <a href="https://wa.me/2348052929523" style={{ color: 'var(--red)' }}>+234 805 292 9523</a>,
              or by visiting Suite 38, Mazfallah Shopping Complex, Karu, Abuja.
            </p>
          </div>

          <div style={section}>
            <h2 style={h2}>8. Changes to This Policy</h2>
            <p style={p}>
              We may update this Privacy Policy from time to time to reflect changes in our practices or
              applicable law. We will update the &quot;Last updated&quot; date above when changes are made.
              Significant changes will be communicated via the platform or by email where appropriate.
            </p>
          </div>

          <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--gray)' }}>
            See also our <Link href="/terms" style={{ color: 'var(--red)' }}>Terms of Service</Link>.
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}