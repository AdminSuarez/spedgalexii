"use client";

import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import Image from "next/image";

export default function AboutPage() {
  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6 max-w-4xl mx-auto">
        {/* Hero Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
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
            <div className="min-w-0 heroAura">
              <h1 className="heroTitle text-3xl md:text-4xl">About SpEdGalexii</h1>
              <div className="cardMeta mt-2 text-white/70">Built by Educators, for Educators</div>
            </div>
          </div>
        </div>

        {/* Origin Story */}
        <GXCard className="rounded-2xl popCard popCard--violet mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">The Story Behind SpEdGalexii</h2>
          <div className="text-white/80 leading-relaxed space-y-4">
            <p>
              SpEdGalexii was born from the trenches of special education—from late nights reviewing 
              IEPs, from the frustration of finding compliance gaps during audits, and from the 
              deep desire to give every student the services they deserve.
            </p>
            <p>
              As a special education professional in Texas, I've lived the reality of managing 
              caseloads, writing IEPs, coordinating ARD meetings, and ensuring compliance—all while 
              trying to actually <em>teach</em> and connect with students. I've seen how easy it is 
              for things to slip through the cracks when you're juggling 30+ students, each with 
              unique needs and mountains of documentation.
            </p>
            <p>
              SpEdGalexii is my answer to a question I asked myself countless times: 
              <strong className="text-white"> "What if we had a tool that could catch what we miss?"</strong>
            </p>
            <p>
              Not to replace us—never to replace us—but to augment our expertise. To be the 
              second set of eyes that finds the FIE area missing from the IEP. To catch the 
              accommodation mismatch before STAAR testing. To ensure every student gets 
              exactly what their IEP promises.
            </p>
          </div>
        </GXCard>

        {/* Mission */}
        <GXCard className="rounded-2xl popCard popCard--deep mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <div className="text-xl text-white/90 leading-relaxed italic border-l-4 border-fuchsia-500 pl-4">
            "To empower special education professionals with intelligent tools that ensure 
            every student receives compliant, comprehensive, and individualized services—
            so educators can focus on what matters most: teaching and connecting with students."
          </div>
        </GXCard>

        {/* Vision */}
        <GXCard className="rounded-2xl popCard popCard--solar mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
          <div className="text-white/80 leading-relaxed space-y-4">
            <p>
              We envision a future where:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span><strong className="text-white">Zero compliance gaps</strong> slip through the cracks—every FIE finding has a corresponding IEP goal, every accommodation is properly documented in TestHound.</span>
              </li>
              <li className="flex items-start gap-3">
                <span><strong className="text-white">Educators save hours</strong> of manual data cross-referencing, freeing them to spend that time with students.</span>
              </li>
              <li className="flex items-start gap-3">
                <span><strong className="text-white">Every student</strong>—regardless of their case manager's workload—receives the full benefit of their IEP.</span>
              </li>
              <li className="flex items-start gap-3">
                <span><strong className="text-white">ARD meetings become proactive</strong> planning sessions, not reactive problem-solving sessions.</span>
              </li>
              <li className="flex items-start gap-3">
                <span><strong className="text-white">Special education becomes sustainable</strong>—reducing burnout and keeping experienced educators in the field.</span>
              </li>
            </ul>
          </div>
        </GXCard>

        {/* Values */}
        <GXCard className="rounded-2xl popCard popCard--ember mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Privacy First</h3>
              <p className="text-white/70 text-sm">Student data is sacred. We protect it like it's our own children's information—because for many of us, it once was.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Accuracy Matters</h3>
              <p className="text-white/70 text-sm">We'd rather flag something for human review than miss a compliance issue. False positives are better than missed violations.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Educator-Centered</h3>
              <p className="text-white/70 text-sm">Every feature is designed by someone who's been in your shoes, understands your pain points, and respects your expertise.</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Student Outcomes</h3>
              <p className="text-white/70 text-sm">Ultimately, compliance serves students. Better compliance = better services = better outcomes.</p>
            </div>
          </div>
        </GXCard>

        {/* The Name */}
        <GXCard className="rounded-2xl popCard popCard--violet mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Why "Galexii"?</h2>
          <div className="text-white/80 leading-relaxed space-y-4">
            <p>
              The name combines <strong className="text-white">Galaxy</strong> + <strong className="text-white">IEP (Individualized Education Program)</strong>—
              symbolizing the vast universe of student needs and the individualized approach 
              required to serve each one.
            </p>
            <p>
              Like stars in a galaxy, each student shines uniquely. Our job is to help you 
              see the whole constellation—the patterns, the connections, the areas that need attention—
              so you can help each star reach its full brightness.
            </p>
            <p className="text-white/60 italic">
              Plus, space themes are cool.
            </p>
          </div>
        </GXCard>

        {/* Creator */}
        <GXCard className="rounded-2xl popCard popCard--deep">
          <h2 className="text-2xl font-bold text-white mb-4">About the Creator</h2>
          <div className="text-white/80 leading-relaxed space-y-4">
            <p>
              SpEdGalexii was created by <strong className="text-white">Shelley Suarez</strong>, 
              a passionate special education professional dedicated to improving outcomes for 
              students with disabilities and supporting the educators who serve them.
            </p>
            <p>
              With years of experience in the special education trenches—writing IEPs, 
              conducting evaluations, leading ARD meetings, and yes, dealing with compliance 
              audits—Shelley built SpEdGalexii to be the tool she wished existed.
            </p>
            <div className="bg-white/5 rounded-lg p-4 mt-4">
              <p className="text-white/90 italic">
                "Every late night I spent manually cross-referencing documents, I thought: 
                'There has to be a better way.' SpEdGalexii is that better way."
              </p>
              <p className="text-white/60 text-sm mt-2">— Shelley Suarez, Creator of SpEdGalexii</p>
            </div>
          </div>
        </GXCard>

        {/* Footer */}
        <div className="mt-8 text-center text-white/50 text-sm">
          <p>SpEdGalexii • Austin, Texas • Made with care for Special Education</p>
        </div>
      </div>
    </GalaxyShell>
  );
}
