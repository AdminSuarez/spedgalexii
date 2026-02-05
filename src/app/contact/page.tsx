"use client";

import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import Image from "next/image";

export default function ContactPage() {
  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <Image
                src="/brand/galexii-logo-round.png"
                alt="SpEdGalexii"
                width={100}
                height={100}
                priority
                className="heroIcon rounded-full bg-black"
              />
            </div>
            <div className="min-w-0 heroAura">
              <h1 className="heroTitle text-3xl md:text-4xl">Contact & Support</h1>
              <div className="cardMeta mt-2 text-white/70">📬 We're Here to Help</div>
            </div>
          </div>
        </div>

        {/* Main Contact */}
        <GXCard className="rounded-2xl popCard popCard--deep mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">📧 Get in Touch</h2>
          <p className="text-white/80 mb-6">
            Have questions, feedback, or need technical support? We'd love to hear from you!
          </p>
          
          <div className="bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 rounded-xl p-6 border border-white/10">
            <div className="text-center">
              <p className="text-white/60 text-sm uppercase tracking-wider mb-2">Email Us</p>
              <a 
                href="mailto:support@spedgalexii.com"
                className="text-2xl md:text-3xl font-bold text-white hover:text-fuchsia-400 transition-colors"
              >
                support@spedgalexii.com
              </a>
              <p className="text-white/60 mt-3">
                We typically respond within 24-48 business hours
              </p>
            </div>
          </div>
        </GXCard>

        {/* Contact Categories */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <GXCard className="rounded-2xl popCard popCard--ember">
            <h3 className="text-lg font-bold text-white mb-3">🔧 Technical Support</h3>
            <p className="text-white/70 text-sm mb-4">
              Experiencing bugs, upload issues, or unexpected behavior? Let us know!
            </p>
            <div className="text-white/80 text-sm space-y-2">
              <p><strong>Please include:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>What you were trying to do</li>
                <li>What happened instead</li>
                <li>Screenshots if possible</li>
                <li>Browser and device info</li>
              </ul>
            </div>
          </GXCard>

          <GXCard className="rounded-2xl popCard popCard--solar">
            <h3 className="text-lg font-bold text-white mb-3">💡 Feature Requests</h3>
            <p className="text-white/70 text-sm mb-4">
              Have an idea that would make SpEdGalexii even better? We're all ears!
            </p>
            <div className="text-white/80 text-sm space-y-2">
              <p><strong>Tell us about:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>The problem you're trying to solve</li>
                <li>How you'd like it to work</li>
                <li>Who would benefit</li>
              </ul>
            </div>
          </GXCard>

          <GXCard className="rounded-2xl popCard popCard--violet">
            <h3 className="text-lg font-bold text-white mb-3">🏫 District Partnerships</h3>
            <p className="text-white/70 text-sm mb-4">
              Interested in bringing SpEdGalexii to your entire district?
            </p>
            <div className="text-white/80 text-sm space-y-2">
              <p><strong>We can discuss:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Enterprise deployment</li>
                <li>Custom integrations</li>
                <li>Training and onboarding</li>
                <li>Volume licensing</li>
              </ul>
            </div>
          </GXCard>

          <GXCard className="rounded-2xl popCard popCard--deep">
            <h3 className="text-lg font-bold text-white mb-3">🔒 Privacy Concerns</h3>
            <p className="text-white/70 text-sm mb-4">
              Questions about data handling or privacy practices?
            </p>
            <div className="text-white/80 text-sm space-y-2">
              <p><strong>We take privacy seriously:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-white/60">
                <li>Read our <a href="/privacy" className="text-fuchsia-400 hover:underline">Privacy Policy</a></li>
                <li>Request data deletion</li>
                <li>Report security concerns</li>
              </ul>
            </div>
          </GXCard>
        </div>

        {/* Response Times */}
        <GXCard className="rounded-2xl popCard popCard--deep mb-6">
          <h2 className="text-xl font-bold text-white mb-4">⏱️ Response Times</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-3xl mb-2">🟢</p>
              <p className="text-white font-semibold">General Inquiries</p>
              <p className="text-white/60 text-sm">24-48 hours</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-3xl mb-2">🟡</p>
              <p className="text-white font-semibold">Technical Issues</p>
              <p className="text-white/60 text-sm">Same day - 24 hours</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <p className="text-3xl mb-2">🔴</p>
              <p className="text-white font-semibold">Security/Privacy</p>
              <p className="text-white/60 text-sm">Priority - ASAP</p>
            </div>
          </div>
        </GXCard>

        {/* Quick Links */}
        <GXCard className="rounded-2xl popCard popCard--violet">
          <h2 className="text-xl font-bold text-white mb-4">🔗 Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/faq"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              ❓ FAQ
            </a>
            <a
              href="/privacy"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              🔒 Privacy Policy
            </a>
            <a
              href="/about"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              🌟 About Us
            </a>
            <a
              href="/"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              🏠 Orbit Hub
            </a>
          </div>
        </GXCard>

        {/* Footer */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>SpEdGalexii • Built by Educators, for Educators</p>
          <p className="mt-1">Austin, Texas • Made with 💜 for Special Education</p>
        </div>
      </div>
    </GalaxyShell>
  );
}
