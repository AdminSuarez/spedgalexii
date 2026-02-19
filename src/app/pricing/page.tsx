"use client";

import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import { Check } from "lucide-react";

type PlanTier = {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  priceId?: string; // Stripe Price ID - set after creating in Stripe Dashboard
};

const PLANS: PlanTier[] = [
  {
    id: "iep-monthly",
    name: "Per IEP Monthly",
    description: "Track 1 student with full access",
    price: 9.99,
    interval: "month",
    features: [
      "1 Student IEP tracking",
      "Daily service minute logs",
      "A/B Day block schedule support",
      "Export to Excel",
      "Goal progress tracking",
      "Accommodation audits",
    ],
    priceId: "price_XXXXX", // Replace with actual Stripe Price ID
  },
  {
    id: "iep-yearly",
    name: "Per IEP Yearly",
    description: "Track 1 student, save 20%",
    price: 95.88, // ~$7.99/mo
    interval: "year",
    popular: true,
    features: [
      "Everything in Monthly",
      "1 Student IEP tracking",
      "Save 20% vs monthly",
      "Priority support",
      "Annual compliance reports",
    ],
    priceId: "price_YYYYY", // Replace with actual Stripe Price ID
  },
  {
    id: "school-year",
    name: "School Year Bundle",
    description: "Your full caseload, one teacher",
    price: 199.99,
    interval: "year",
    features: [
      "Unlimited students (1 teacher)",
      "Your entire caseload covered",
      "Aug–May school year access",
      "Bulk export & reporting",
      "Priority support",
      "Early access to new features",
    ],
    priceId: "price_ZZZZZ", // Replace with actual Stripe Price ID
  },
];

function PricingCard({ plan }: { plan: PlanTier }) {
  const handleSubscribe = async () => {
    // TODO: Call your API route to create Stripe Checkout session
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: plan.priceId }),
    });
    
    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  };

  // Card variant based on plan
  const cardVariant = plan.popular ? "popCard--solar" : plan.id === "school-year" ? "popCard--cyan" : "popCard--violet";

  return (
    <GXCard 
      variant="plain" 
      interactive={false} 
      className={`popCard ${cardVariant} min-w-0 flex flex-col h-full relative overflow-hidden`}
    >

      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg z-10">
          Most Popular
        </div>
      )}

      <div className="uiLabel text-white/70 relative z-1">{plan.interval === "month" ? "Monthly" : "Annual"}</div>
      
      <h3 className="cardTitle mt-2 text-white relative z-1">{plan.name}</h3>
      
      <p className="cardBody mt-2 text-white/70 relative z-1">{plan.description}</p>

      <div className="mt-4 flex items-baseline gap-1 relative z-1">
        <span className="text-4xl font-bold text-white">${plan.price}</span>
        <span className="text-white/60">/{plan.interval}</span>
      </div>

      <ul className="mt-6 space-y-3 flex-1 relative z-1">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-white/80">
            <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSubscribe}
        className={`mt-6 w-full ctaBtn relative z-1 ${plan.popular ? "ctaBtn--solar" : "ctaBtn--violet"}`}
      >
        Get Started
      </button>
    </GXCard>
  );
}

export default function PricingPage() {
  return (
    <GalaxyShell>
      <div className="page w-full">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="flex justify-center mb-6">
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
          </div>

          <h1 className="heroTitle">Choose Your Plan</h1>
          
          <p className="cardBody mt-4 max-w-2xl mx-auto text-white/80">
            Powerful IEP tracking tools for special education professionals. 
            Start tracking service minutes, goals, and compliance today.
          </p>

          <p className="cardMeta mt-3 text-teal-300/80 italic">
            "Every minute documented is a minute defended."
          </p>
        </div>

        {/* Pricing Cards Section */}
        <div className="popCard popCard--violet rounded-3xl p-6 md:p-8 max-w-5xl mx-auto relative z-1">
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>

        {/* Time Savings Banner */}
        <GXCard className="mt-8 rounded-3xl popCard popCard--emerald max-w-3xl mx-auto text-center relative z-1">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div>
              <div className="text-5xl font-bold text-emerald-300">4-6 hrs</div>
              <div className="text-white/70 text-sm">saved per IEP</div>
            </div>
            <div className="hidden md:block w-px h-16 bg-white/20" />
            <div className="text-left max-w-md">
              <div className="cardTitle text-white">Your Time Back</div>
              <p className="cardBody mt-1 text-white/70">
                Automated tracking, instant audits, and one-click exports mean less paperwork 
                and more time for what matters — your students.
              </p>
            </div>
          </div>
        </GXCard>

        {/* FAQ / Info Section */}
        <GXCard className="mt-10 rounded-3xl popCard popCard--cyan max-w-3xl mx-auto relative z-1">
          <div className="uiLabel text-white/70">Questions?</div>
          <h2 className="moduleTitle mt-2">Frequently Asked</h2>

          <div className="mt-6 space-y-4">
            <div>
              <div className="cardTitle text-white text-lg">What counts as 1 IEP?</div>
              <p className="cardBody mt-1 text-white/70">
                Each student you track counts as 1 IEP. The Per IEP plans are perfect for 
                paraprofessionals or specialists working with specific students.
              </p>
            </div>

            <div>
              <div className="cardTitle text-white text-lg">What's included in School Year Bundle?</div>
              <p className="cardBody mt-1 text-white/70">
                Unlimited students for one case manager/teacher. Perfect for full caseloads. 
                Covers August through May of the school year.
              </p>
            </div>

            <div>
              <div className="cardTitle text-white text-lg">Can I upgrade later?</div>
              <p className="cardBody mt-1 text-white/70">
                Yes! You can upgrade anytime. We'll prorate your existing subscription.
              </p>
            </div>

            <div>
              <div className="cardTitle text-white text-lg">Is my data secure?</div>
              <p className="cardBody mt-1 text-white/70">
                Absolutely. We use industry-standard encryption and never share student data. 
                FERPA-compliant practices throughout.
              </p>
            </div>
          </div>
        </GXCard>
      </div>
    </GalaxyShell>
  );
}
