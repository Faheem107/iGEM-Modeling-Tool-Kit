import React from 'react';

export interface TermDetail {
  title: string;
  definition: string;
  category?: string;
  usageContext?: string;
}

export const glossaryTerms: Record<string, TermDetail> = {
  "gamma-PGA": {
    title: "Poly-γ-Glutamic Acid (γ-PGA)",
    definition: "An eco-friendly, highly sticky, water-soluble bio-glue secreted by Bacillus subtilis. It networks desert sand grains together into a resilient polymer crust that locks in moisture and withstands heavy desert windstorms.",
    category: "Biopolymer",
    usageContext: "Secreted by our bacteria to bind soil particles."
  },
  "Bacillus subtilis": {
    title: "Bacillus subtilis",
    definition: "A harmless, environmentally safe, and robust soil bacterium. We utilize or model its cellular pathways to turn starting glutamate and glucose feeds into eco-friendly sand-stabilizing polymer nets.",
    category: "Microorganism",
    usageContext: "The cellular factory producing our structural glue."
  },
  "Shear Modulus": {
    title: "Shear Modulus (G)",
    definition: "A physical measure of solid stiffness or shear stiffness. Higher values represent a tighter, more rigid bio-polymer cement lattice that resists heavy shear forces and desert sand erosion.",
    category: "Biophysics",
    usageContext: "Outputs from calcium cross-linking determine this sand crust stiffness."
  },
  "Aeolian Transport": {
    title: "Aeolian Transport",
    definition: "The physical process by which wind forces lift, transport, and erode sand grains. Modulating soil cohesion targets preventing this transport from triggering dust storms.",
    category: "Geodynamics",
    usageContext: "Wind tunnel simulation tests boundaries of this sand movement."
  },
  "Saltation": {
    title: "Saltation sand transport",
    definition: "A dominant wind erosion mechanism where loose sand grains bounce repeatedly across the ground under wind shear, kicking up larger clouds of airborne particulate dust as they collide.",
    category: "Wind Mechanics",
    usageContext: "Bouncing kinetics simulated on the untreated sand bed side."
  },
  "Cross-linking": {
    title: "Ionic Cross-Linking",
    definition: "The chemical integration of multiple polymer threads using charged mineral ions (like calcium Ca²⁺). These minerals form strong chemical bridges that elevate flexible liquid gels into hard, rigid structural binders.",
    category: "Biochemistry",
    usageContext: "Tuning mineral salt density triggers stronger ionic connections."
  },
  "k_cat": {
    title: "Catalytic Turnover Speed (k_cat)",
    definition: "The maximum metabolic velocity of an enzyme. It represents the number of glutamate feeding molecules a single enzyme complex can synthesize into gamma-PGA threads every second.",
    category: "Enzyme Kinetics",
    usageContext: "Adjusted in the metabolic model dashboard to evaluate final yields."
  },
  "GGT": {
    title: "Gamma-glutamyltransferase (GGT)",
    definition: "An enzyme that naturally decommissions/degrades gamma-PGA. Knocking out the gene encoding GGT stops self-digestion of the bio-glue, allowing the bacterial culture to accumulate massive, stable yields.",
    category: "Genetics",
    usageContext: "Knocking out the GGT pathway triggers a massive boost in biopolymer yield."
  },
  "pgcA": {
    title: "pgcA Biosynthesis Gene",
    definition: "An enzyme that routes glucose into bacterial cell walls. Modulating or knocking out pgcA channels precursors away from standard cellular expansion directly into sand-stabilizing polymer synthesis.",
    category: "Genetics",
    usageContext: "Calibrating cellular resource routing between growth and secrete output."
  },
  "Stochastic Growth CA": {
    title: "Stochastic Cellular Automata",
    definition: "A grid-based computer model where virtual cells expand dynamically into neighboring spaces based on local probabilities, nutrient availability, and biological survival rules.",
    category: "Computation",
    usageContext: "Simulated in the 4th phase of environmental containment checks."
  },
  "Arid Apoptosis": {
    title: "Arid Apoptosis (Environmental Killswitch)",
    definition: "An engineered genetic safety containment circuit where dehydration triggers rapid biochemical self-destruction (apoptosis), ensuring our bacteria never wild-spread beyond treated irrigation sectors.",
    category: "Biocontainment",
    usageContext: "Simulated in Phase 4 parameters to ensure absolute biological compliance."
  },
  "Saturation": {
    title: "Polymer Saturation Score (θ)",
    definition: "The fraction of available chemical binding nodes on the gamma-PGA chains currently locked in place by mineral cross-linking. Max saturation creates maximum physical soil hardening.",
    category: "Chemical Physics",
    usageContext: "Measured dynamically in the cross-linking biophysics dashboard."
  },
  "PDB File": {
    title: "Protein Data Bank Coordinates (.pdb)",
    definition: "A structured crystallographic file format detailing the precise 3D arrangement of every single atom inside an enzyme complex, allowing high-resolution ribbon diagnostics.",
    category: "Structural Biology",
    usageContext: "Upload any custom RCSB .pdb file to map secondary structures."
  }
};

interface GlossaryTermProps {
  term: keyof typeof glossaryTerms;
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
}

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ term, children, theme = 'dark' }) => {
  const detail = glossaryTerms[term];
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [openUpward, setOpenUpward] = React.useState<boolean>(false);
  const [alignRight, setAlignRight] = React.useState<boolean>(false);

  if (!detail) {
    return <span className="font-medium">{children || term}</span>;
  }

  const isLightTheme = theme === 'light';

  return (
    <span 
      ref={triggerRef}
      className="relative inline-block" 
      id={`glossary-trigger-${term.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      <span 
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceRight = window.innerWidth - rect.left;
            // Open upward if there's less than 230px space below
            setOpenUpward(spaceBelow < 230);
            // Align to right if there's less than 300px space to the right
            setAlignRight(spaceRight < 300);
          }
          setIsOpen(!isOpen);
        }}
        className={`cursor-pointer border-b border-dashed font-semibold transition-colors duration-200 select-none ${
          isLightTheme 
            ? 'border-amber-700/80 text-amber-950 hover:text-amber-805 hover:bg-amber-100/50 rounded px-1' 
            : 'border-cyan-400/80 text-cyan-200 hover:text-[#fbbf24] hover:bg-cyan-950/30 rounded px-1'
        }`}
        title="Click to view definition"
      >
        {children || term}
      </span>
      
      {isOpen && (
        <span 
          onClick={(e) => e.stopPropagation()}
          className={`absolute w-72 p-3.5 rounded-lg text-xs leading-relaxed transition-all duration-300 ease-out z-[200] text-left font-sans block ${
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            alignRight ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          } ${
            isLightTheme
              ? 'bg-white border-2 border-amber-900/40 text-stone-900 shadow-[0_12px_32px_rgba(139,94,26,0.25)]'
              : 'bg-[#0f172a] border-2 border-slate-700 text-slate-100 shadow-2xl'
          }`}
        >
          <span className="block font-bold uppercase tracking-wider text-[10px] mb-2 flex justify-between items-center">
            <span className={isLightTheme ? 'text-indigo-800 font-extrabold' : 'text-indigo-400'}>
              {detail.category || 'Term Explanation'}
            </span>
            <button 
              onClick={() => setIsOpen(false)}
              className={`font-black text-[10px] px-2 py-0.5 rounded border transition-colors ${
                isLightTheme 
                  ? 'text-amber-950 border-amber-950/20 bg-amber-50 hover:text-red-650 hover:bg-red-50 hover:border-red-200' 
                  : 'text-slate-450 border-slate-700 bg-slate-900 hover:text-white hover:border-slate-500'
              }`}
            >
              CLOSE
            </button>
          </span>
          <strong className={`block text-xs font-black mb-1.5 uppercase ${isLightTheme ? 'text-stone-950' : 'text-white'}`}>
            {detail.title}
          </strong>
          <span className={`block font-sans text-[11.5px] leading-relaxed ${isLightTheme ? 'text-stone-850 font-medium' : 'text-slate-300'}`}>
            {detail.definition}
          </span>
          
          {detail.usageContext && (
            <span className={`block mt-2.5 pt-2 border-t border-dashed ${
              isLightTheme ? 'border-amber-900/15 text-amber-900 font-semibold' : 'border-slate-800 text-[#38bdf8]'
            } text-[9px] font-mono leading-tight`}>
              IMPLEMENTATION: {detail.usageContext}
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export default GlossaryTerm;
