import React from "react";
import type { DeliberationsPayload } from "@/lib/deliberations/types";
import { PrintButton } from "./PrintButton";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <div className="text-white/60">—</div>;
  return (
    <ul className="space-y-1 text-white/85">
      {items.map((x, i) => (
        <li key={i}>• {x}</li>
      ))}
    </ul>
  );
}

export function DeliberationsDoc({ data }: { data: DeliberationsPayload }) {
  const FN = data.student.firstName;
  const LN = data.student.lastName;

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-black/20 backdrop-blur p-6 text-white/90 print:bg-white print:text-black print:border-black/10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-white/70 uppercase tracking-[0.22em] text-sm print:text-black/70">
              Deliberations
            </div>
            <h1 className="text-3xl font-semibold">ARD Annual Meeting</h1>
            <div className="text-white/75 print:text-black/70">
              For <span className="font-semibold">{FN} {LN}</span>
            </div>
            <div className="text-white/60 print:text-black/60">({fmtDate(data.meetingDate)})</div>
          </div>

          <div className="print:hidden">
            <PrintButton />
          </div>
        </header>

        <section className="mt-6 space-y-2">
          <h2 className="text-xl font-semibold">Welcome!</h2>
          <div className="text-white/85 print:text-black/80">Introduction</div>
          <div className="text-white/85 print:text-black/80">
            {FN} meets the criteria of {data.eligibilityStatement}.
          </div>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-xl font-semibold">Committee Members</h2>
          <ul className="space-y-1 text-white/85 print:text-black/80">
            {data.committee.map((m, idx) => (
              <li key={`${m.role}-${idx}`}>{m.name}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-xl font-semibold">Statement of Confidentiality & Meeting Norms</h2>
          <p className="text-white/80 print:text-black/80">
            According to state and federal law, all information concerning a student with disabilities is confidential and may not be discussed
            with anyone except those who have a legitimate educational interest in the student.
          </p>
          <p className="text-white/80 print:text-black/80">
            All information discussed during this ARD meeting will be kept confidential. To facilitate a collaborative environment, participants will
            conduct themselves in a courteous manner. This expectation must be followed to work together to develop an appropriate educational plan.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Most Recent Evaluation Summary</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Date of Full Individual Initial Evaluation (FIE)
              </div>
              <div className="mt-1">{fmtDate(data.mostRecent.fieInitialDate)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Due Date of Review of Existing Data (REED)
              </div>
              <div className="mt-1">{fmtDate(data.mostRecent.reedDueDate)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
            <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
              Requests for new testing
            </div>
            <div className="mt-1 whitespace-pre-wrap">{data.mostRecent.requestsNewTesting ?? "—"}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
            <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
              Conclusion
            </div>
            <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.evaluationConclusion ?? "—"}</div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">PLAAFP Snapshot</h2>

          {data.mostRecent.staarSummary ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">STAAR</div>
              <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.staarSummary}</div>
            </div>
          ) : null}

          {data.mostRecent.mapSummary ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">NWEA MAP</div>
              <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.mapSummary}</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 whitespace-pre-wrap print:border-black/10 print:bg-transparent">
            {data.mostRecent.plaafpNarrative ?? "—"}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Teacher Needs</div>
              <div className="mt-2"><BulletList items={data.mostRecent.teacherNeeds} /></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Teacher Feedback</div>
              <div className="mt-2"><BulletList items={data.mostRecent.teacherFeedback} /></div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Goals</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
            <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Previous Goal</div>
            <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.previousGoal ?? "—"}</div>

            <div className="mt-4 text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Progress</div>
            <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.progressNotes ?? "—"}</div>

            <div className="mt-4 text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">New Goal</div>
            <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.newGoal ?? "—"}</div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Academic Placement</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
            <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">ELA</div>
            <div className="mt-1">{data.mostRecent.placementEla ?? "—"}</div>

            <div className="mt-4 text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Other Classes</div>
            <div className="mt-1">{data.mostRecent.placementOther ?? "—"}</div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Accommodations</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Prior Year Used/Provided
              </div>
              <div className="mt-2"><BulletList items={data.mostRecent.accommodationsPrior} /></div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Current Accommodations Used
              </div>
              <div className="mt-2"><BulletList items={data.mostRecent.accommodationsCurrent} /></div>
            </div>
          </div>

          {data.mostRecent.accommodationsNotes ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">Notes</div>
              <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.accommodationsNotes}</div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Transition Plan</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent space-y-4">
            <div>
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Education & Professional Career Goal
              </div>
              <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.transitionEduGoal ?? "—"}</div>
            </div>
            <div>
              <div className="text-white/70 uppercase tracking-[0.22em] text-xs print:text-black/60">
                Career Goal
              </div>
              <div className="mt-2 whitespace-pre-wrap">{data.mostRecent.transitionCareerGoal ?? "—"}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xl font-semibold">Sources Used</h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:border-black/10 print:bg-transparent">
            <div className="text-white/70 text-sm print:text-black/60">
              The system selects the most recent dated document(s) for each section.
            </div>
            <ul className="mt-2 space-y-1 text-white/80 print:text-black/80">
              {data.sources.map((s) => (
                <li key={s.id}>
                  • {s.docType} | {fmtDate(s.docDate)} | id: <span className="font-mono">{s.id}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-8 text-white/60 text-sm print:text-black/60">
          Thank you for your time. 💫
        </footer>
      </div>
    </main>
  );
}
