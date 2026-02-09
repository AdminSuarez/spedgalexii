"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import { CheckCircle, Rocket } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <GalaxyShell>
      <div className="page w-full">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="heroIconWrap">
                <Image
                  src="/brand/galexii-logo-round.png"
                  alt="SpEdGalexii"
                  width={120}
                  height={120}
                  priority
                  className="heroIcon rounded-full bg-black"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-2 shadow-lg shadow-emerald-500/50">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <h1 className="heroTitle text-emerald-300">Welcome Aboard!</h1>
          
          <p className="cardBody mt-4 text-white/80">
            Your subscription is now active. You have full access to SpEdGalexii's 
            tracking and compliance tools.
          </p>

          <GXCard className="mt-8 rounded-3xl popCard popCard--emerald">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Rocket className="h-6 w-6 text-emerald-300" />
              <span className="cardTitle text-white">What's Next?</span>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-violet-300 font-bold">1</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Start Tracking</div>
                  <p className="text-sm text-white/70">
                    Head to Trackers to log your first service minutes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <span className="text-cyan-300 font-bold">2</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Run an Audit</div>
                  <p className="text-sm text-white/70">
                    Use Accommodations Galexii to verify compliance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-amber-300 font-bold">3</span>
                </div>
                <div>
                  <div className="font-semibold text-white">Export Reports</div>
                  <p className="text-sm text-white/70">
                    Download Excel files for your records
                  </p>
                </div>
              </div>
            </div>
          </GXCard>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/trackers" className="ctaBtn ctaBtn--violet">
              Go to Trackers
            </Link>
            <Link href="/" className="ctaBtn ctaBtn--solar">
              Orbit Hub
            </Link>
          </div>

          {sessionId && (
            <p className="mt-6 text-xs text-white/40">
              Session ID: {sessionId}
            </p>
          )}
        </div>
      </div>
    </GalaxyShell>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <GalaxyShell>
        <div className="page w-full">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-pulse text-white/50">Loading...</div>
          </div>
        </div>
      </GalaxyShell>
    }>
      <SuccessContent />
    </Suspense>
  );
}
