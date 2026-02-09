"use client";

import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  return (
    <GalaxyShell>
      <div className="page w-full max-w-4xl mx-auto">
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
              <h1 className="heroTitle text-3xl md:text-4xl">Privacy Policy</h1>
              <div className="cardMeta mt-2 text-white/70">Your Data, Your Trust</div>
            </div>
          </div>
        </div>

        <GXCard className="rounded-2xl popCard popCard--deep space-y-6">
          <p className="text-white/60 text-sm">Last Updated: February 5, 2026</p>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Our Commitment to Privacy</h2>
            <p className="text-white/80 leading-relaxed">
              SpEdGalexii was created by a special education professional who understands the 
              sacred responsibility of protecting student information. We are committed to 
              maintaining the highest standards of data privacy and security in compliance with 
              <strong> FERPA (Family Educational Rights and Privacy Act)</strong> and all 
              applicable federal and state regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Information We Process</h2>
            <div className="text-white/80 leading-relaxed space-y-2">
              <p>SpEdGalexii processes the following types of educational records that you upload:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Individualized Education Programs (IEPs)</li>
                <li>Full Individual Evaluations (FIEs)</li>
                <li>Review of Existing Evaluation Data (REEDs)</li>
                <li>Testing accommodation records</li>
                <li>Progress monitoring data</li>
                <li>Related educational documents</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">How We Protect Your Data</h2>
            <div className="text-white/80 leading-relaxed space-y-3">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Local Processing</h3>
                <p>All document analysis occurs locally on your device or secure server session. 
                   Student data is NOT transmitted to external AI services or third-party processors.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">No Permanent Storage</h3>
                <p>Uploaded documents are processed in temporary memory and are NOT permanently 
                   stored on our servers. Files are automatically purged after your session ends.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Encryption</h3>
                <p>All data transmission uses TLS 1.3 encryption. Your connection to SpEdGalexii 
                   is secured with HTTPS.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">Access Control</h3>
                <p>Only authorized district personnel with legitimate educational interest should 
                   use this tool. We recommend using your district's SSO or authentication system.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">FERPA Compliance</h2>
            <div className="text-white/80 leading-relaxed space-y-2">
              <p>SpEdGalexii is designed to support FERPA compliance:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>We act as a "school official" with legitimate educational interest under FERPA</li>
                <li>We do not use student data for any purpose other than providing audit services</li>
                <li>We do not sell, share, or disclose student information to third parties</li>
                <li>We maintain audit logs for accountability</li>
                <li>We support your district's data governance policies</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">District Responsibility</h2>
            <p className="text-white/80 leading-relaxed">
              As the educational agency, your district remains the custodian of all student records. 
              Use of SpEdGalexii should be authorized by your district's special education director 
              or data privacy officer. Users are responsible for ensuring they have proper authorization 
              to access and process the student records they upload.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Cookies & Analytics</h2>
            <p className="text-white/80 leading-relaxed">
              SpEdGalexii uses minimal, essential cookies for session management only. We do NOT 
              use tracking cookies, advertising cookies, or third-party analytics that could 
              compromise student privacy. Any usage analytics are aggregated and anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Children's Privacy</h2>
            <p className="text-white/80 leading-relaxed">
              SpEdGalexii is a professional tool for educators, not for direct student use. 
              We comply with COPPA (Children's Online Privacy Protection Act) by design - 
              students do not create accounts or directly interact with our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Data Requests & Contact</h2>
            <p className="text-white/80 leading-relaxed">
              For questions about our privacy practices, data handling, or to report a concern:
            </p>
            <div className="mt-3 bg-white/5 rounded-lg p-4">
              <p className="text-white font-semibold">Email: admin@SpEdGalexii.com</p>
              <p className="text-white/60 text-sm mt-1">Response within 24-48 business hours</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Policy Updates</h2>
            <p className="text-white/80 leading-relaxed">
              We may update this Privacy Policy to reflect changes in our practices or legal 
              requirements. Material changes will be communicated via the platform. Continued 
              use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10">
            <p className="text-white/60 text-sm text-center">
              SpEdGalexii • Built by Educators, for Educators<br />
              Protecting student privacy is not just policy—it's our mission.
            </p>
          </div>
        </GXCard>
      </div>
    </GalaxyShell>
  );
}
