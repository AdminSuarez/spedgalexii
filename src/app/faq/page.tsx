"use client";

import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import Image from "next/image";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    category: "General",
    questions: [
      {
        q: "What is SpEdGalexii?",
        a: "SpEdGalexii is an intelligent IEP audit platform designed for special education professionals. It analyzes IEP documents, evaluations, and testing accommodations to identify compliance gaps, generate PLAAFP drafts, score goals against TEA rubrics, and prepare for ARD meetings.",
      },
      {
        q: "Who is SpEdGalexii designed for?",
        a: "SpEdGalexii is built for special education teachers, case managers, diagnosticians, compliance specialists, and district special education administrators. Anyone responsible for IEP compliance and quality can benefit from our tools.",
      },
      {
        q: "Is SpEdGalexii only for Texas?",
        a: "While SpEdGalexii was built with Texas compliance requirements in mind (TEA guidelines, STAAR accommodations, etc.), the core functionality—IEP analysis, goal scoring, compliance tracking—applies to special education nationwide. We plan to expand state-specific features in the future.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    questions: [
      {
        q: "Is my student data safe?",
        a: "Absolutely. Student privacy is our top priority. All document processing occurs locally or in temporary secure sessions. We do NOT permanently store student data, transmit it to third-party AI services, or use it for any purpose other than providing audit services. See our Privacy Policy for complete details.",
      },
      {
        q: "Is SpEdGalexii FERPA compliant?",
        a: "Yes. SpEdGalexii is designed with FERPA compliance in mind. We act as a 'school official' with legitimate educational interest, process only the data you upload, don't share data with third parties, and don't permanently store student records.",
      },
      {
        q: "Do you use AI/ChatGPT to process my documents?",
        a: "SpEdGalexii uses intelligent pattern matching and rule-based analysis—not external AI services like ChatGPT. Your student data never leaves your secure session and is never sent to OpenAI, Google, or any third-party AI provider.",
      },
      {
        q: "Can others see my uploads or results?",
        a: "No. Your session data is isolated and only accessible to you. We don't have shared databases where different users' data could mix. Each session is independent and secure.",
      },
    ],
  },
  {
    category: "Features & Usage",
    questions: [
      {
        q: "What file types can I upload?",
        a: "SpEdGalexii accepts PDF documents (IEPs, FIEs, REEDs, etc.) and CSV files (TestHound exports, roster data). For best results, ensure PDFs are text-based (not scanned images) and CSVs follow standard formatting.",
      },
      {
        q: "What is a 'Deep Dive' analysis?",
        a: "Deep Dive is our comprehensive individual student analysis that examines all uploaded documents for one student, cross-references FIE findings with IEP goals, identifies attention/ADHD indicators, checks compliance timelines, and generates complete ARD preparation materials including PLAAFP drafts and proposed goals.",
      },
      {
        q: "How does the Goals scoring work?",
        a: "Goals are scored against the TEA 4-Component Rubric: Timeframe (specific date), Conditions (circumstances for performance), Behavior (observable/measurable action), and Criterion (how mastery is determined). Each goal receives a score of 0-4 based on which components are present and well-written.",
      },
      {
        q: "What is the Accommodations audit?",
        a: "The Accommodations module compares IEP accommodations against TestHound entries to identify mismatches—accommodations in the IEP but missing from TestHound, or TestHound entries without IEP documentation. This ensures students receive their entitled testing accommodations.",
      },
      {
        q: "Can I generate reports for my whole caseload?",
        a: "Yes! Use the 'Run All' feature on the Orbit Hub to process all your students at once. You can also filter by case manager to generate reports for just your students.",
      },
    ],
  },
  {
    category: "Technical Issues",
    questions: [
      {
        q: "My PDF won't upload. What should I do?",
        a: "Ensure your PDF is under 50MB and is a text-based PDF (not a scanned image). If issues persist, try refreshing the page and uploading again. For continued problems, email admin@SpEdGalexii.com with the error message.",
      },
      {
        q: "The analysis seems wrong or incomplete. Why?",
        a: "SpEdGalexii relies on consistent document formatting. If your district uses unusual IEP formats or non-standard field names, some data may not extract correctly. Please report specific issues to admin@SpEdGalexii.com so we can improve our parsers.",
      },
      {
        q: "How do I report a bug or request a feature?",
        a: "Email admin@SpEdGalexii.com with details about the bug (including screenshots if possible) or your feature request. We actively incorporate educator feedback into our development.",
      },
      {
        q: "Does SpEdGalexii work on mobile devices?",
        a: "SpEdGalexii is optimized for desktop use but should work on tablets. We recommend using a laptop or desktop computer for the best experience, especially when uploading and reviewing multiple documents.",
      },
    ],
  },
  {
    category: "Account & Access",
    questions: [
      {
        q: "Do I need an account to use SpEdGalexii?",
        a: "Currently, SpEdGalexii is available without account creation for authorized district personnel. Future versions may include optional accounts for saving preferences and accessing additional features.",
      },
      {
        q: "Is SpEdGalexii free?",
        a: "SpEdGalexii is currently available at no cost during our beta period. We're committed to keeping core compliance tools accessible to educators. Future premium features may be offered, but essential audit functions will remain available.",
      },
      {
        q: "Can my whole district use SpEdGalexii?",
        a: "Yes! We encourage district-wide adoption. For enterprise features, volume licensing, or integration with your SIS/IEP system, contact admin@SpEdGalexii.com.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(id)) {
      newOpen.delete(id);
    } else {
      newOpen.add(id);
    }
    setOpenItems(newOpen);
  };

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
              <h1 className="heroTitle text-3xl md:text-4xl">FAQ</h1>
              <div className="cardMeta mt-2 text-white/70">Frequently Asked Questions</div>
            </div>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {FAQ_ITEMS.map((category) => (
            <GXCard key={category.category} className="rounded-2xl popCard popCard--deep">
              <h2 className="text-xl font-bold text-white mb-4">
                {category.category}
              </h2>
              
              <div className="space-y-2">
                {category.questions.map((item, idx) => {
                  const itemId = `${category.category}-${idx}`;
                  const isOpen = openItems.has(itemId);
                  
                  return (
                    <div key={itemId} className="border border-white/10 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-white font-medium pr-4">{item.q}</span>
                        <span className="text-white/60 text-xl shrink-0">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-4 py-3 bg-white/2 border-t border-white/10">
                          <p className="text-white/80 leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GXCard>
          ))}
        </div>

        {/* Still Have Questions */}
        <GXCard className="rounded-2xl popCard popCard--ember mt-6">
          <h2 className="text-xl font-bold text-white mb-3">Still Have Questions?</h2>
          <p className="text-white/80 mb-4">
            Can't find what you're looking for? We're here to help!
          </p>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-white font-semibold">Email: admin@SpEdGalexii.com</p>
            <p className="text-white/60 text-sm mt-1">
              We typically respond within 24-48 business hours.
            </p>
          </div>
        </GXCard>

        {/* Footer */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>SpEdGalexii • Built by Educators, for Educators</p>
        </div>
      </div>
    </GalaxyShell>
  );
}
