import { GXCard } from "@/components/ui/GXCard";

export default function GXPreviewPage() {
  return (
    <div className="gx-backdrop min-h-screen p-8">
      <div className="cardsGrid mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <GXCard className="popCard popCard--violet">
          <h2 className="cardTitle text-white">Galexii Card</h2>
          <p className="cardBody mt-2 text-white/80">
            Stroke + hover + surface tokens active.
          </p>
          <button className="ctaBtn ctaBtn--violet ctaBtn--auto mt-4 gx-focus">
            Focus test
          </button>
        </GXCard>

        <GXCard variant="plain" className="popCard popCard--violet">
          <h2 className="cardTitle text-white">Plain Variant</h2>
          <p className="cardBody mt-2 text-white/80">
            Same surface styling, no gradient stroke.
          </p>
        </GXCard>
      </div>
    </div>
  );
}
