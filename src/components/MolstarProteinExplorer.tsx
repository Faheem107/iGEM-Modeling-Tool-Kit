"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Dna, Atom } from "lucide-react";
import { Reveal } from "@/components/reveal";

// WebGL viewer is browser-only — load it client-side with no SSR.
const MolstarViewer = dynamic(() => import("@/components/molstar-viewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-dune-ash">
      Preparing 3D viewer…
    </div>
  ),
});

interface Structure {
  id: string;
  label: string;
  sublabel: string;
  file: string;
  prong: 1 | 2;
  description: string;
}

// Real, prong-relevant structures served from /public/pdb.
const STRUCTURES: Structure[] = [
  {
    id: "capB",
    label: "CapB (PgsB)",
    sublabel: "γ-PGA synthase · UniProt P96736 · AlphaFold",
    file: "/pdb/AF-P96736.pdb",
    prong: 1,
    description:
      "The catalytic amide-ligase subunit of the B. subtilis γ-PGA synthase complex (pgsBCA). It builds the poly-γ-glutamate chains that form Prong 1's bio-adhesive matrix.",
  },
  {
    id: "capC",
    label: "CapC (PgsC)",
    sublabel: "γ-PGA biosynthesis · UniProt P96737 · AlphaFold",
    file: "/pdb/AF-P96737.pdb",
    prong: 1,
    description:
      "A small membrane subunit of the γ-PGA synthase complex that supports CapB's catalytic activity during polymer synthesis and export.",
  },
  {
    id: "capA",
    label: "CapA (PgsA)",
    sublabel: "γ-PGA biosynthesis · UniProt P96738 · AlphaFold",
    file: "/pdb/AF-P96738.pdb",
    prong: 1,
    description:
      "The membrane-anchored subunit thought to transport the growing γ-PGA chain across the cell envelope as it is polymerised.",
  },
  {
    id: "ca2",
    label: "Carbonic Anhydrase II",
    sublabel: "CA fold (MICP) · PDB 1CA2 · X-ray 2.0 Å",
    file: "/pdb/1CA2.pdb",
    prong: 2,
    description:
      "The canonical carbonic-anhydrase fold. Prong 2 displays a bacterial CA that catalyses CO₂ + H₂O ⇌ HCO₃⁻ + H⁺, seeding the carbonate that cements sand grains in MICP biomineralisation.",
  },
];

export default function MolstarProteinExplorer({
  isLightMode = false,
  prongs,
}: {
  isLightMode?: boolean;
  prongs?: (1 | 2 | 3)[];
}) {
  const active = (prongs && prongs.length ? prongs : [1, 2]).filter(
    (p): p is 1 | 2 => p === 1 || p === 2,
  );
  const available = useMemo(
    () => STRUCTURES.filter((s) => active.includes(s.prong)),
    [active],
  );
  const [selectedId, setSelectedId] = useState(available[0]?.id ?? "capB");
  const selected =
    available.find((s) => s.id === selectedId) ?? available[0] ?? STRUCTURES[0];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Dna className="w-7 h-7 text-dune-rose" />
          Protein Structure Explorer
        </h2>
        <p className="opacity-70 text-sm mt-1 max-w-2xl">
          Real deposited structures behind the engineered enzymes, rendered in 3-D
          with Mol*. Drag to rotate, scroll to zoom.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Structure selector */}
        <div className="lg:col-span-4 space-y-3">
          {available.map((s) => {
            const isSel = s.id === selected.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-4 rounded-[4px] border transition-colors ${
                  isSel
                    ? "border-dune-orange bg-secondary outline outline-2 outline-dune-orange/30"
                    : "border-border bg-card hover:brightness-95"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Atom
                    className={`w-4 h-4 ${s.prong === 1 ? "text-dune-orange" : "text-dune-teal"}`}
                  />
                  <span className="font-bold text-sm">{s.label}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.12em] opacity-50">
                    Prong {s.prong}
                  </span>
                </div>
                <p className="text-[11px] opacity-60 leading-snug">
                  {s.sublabel}
                </p>
              </button>
            );
          })}
        </div>

        {/* 3D viewer + description */}
        <div className="lg:col-span-8 space-y-4">
          <Reveal className="rounded-[6px] border border-border overflow-hidden bg-card">
            <MolstarViewer
              key={selected.file}
              url={selected.file}
              className="h-[440px] sm:h-[520px] w-full"
            />
          </Reveal>
          <div className="p-4 rounded-[4px] border border-border bg-card">
            <h3 className="font-bold text-sm mb-1">{selected.label}</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              {selected.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
