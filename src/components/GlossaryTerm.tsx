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
  },
  "flux balance analysis": {
    title: "Flux Balance Analysis (FBA)",
    definition: "A core mathematical modeling method in systems biology to calculate the flow of cellular metabolites through a genome-scale metabolic network, solving the steady-state S • v = 0 equation under specified environmental bounds.",
    category: "Metabolic Modeling",
    usageContext: "Underpins our active B. subtilis central carbon optimization solver."
  }
};

interface GlossaryTermProps {
  term: keyof typeof glossaryTerms;
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
  id?: string;
}

import { createPortal } from 'react-dom';

export const GlossaryContext = React.createContext<{
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
} | null>(null);

export const GlossaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTooltipId, setActiveTooltipId] = React.useState<string | null>(null);
  return (
    <GlossaryContext.Provider value={{ activeTooltipId, setActiveTooltipId }}>
      {children}
    </GlossaryContext.Provider>
  );
};

export const GlossaryTerm: React.FC<GlossaryTermProps> = ({ 
  term, 
  children, 
  theme = 'dark',
  id,
}) => {
  const detail = glossaryTerms[term];
  const context = React.useContext(GlossaryContext);
  
  const [localActiveId, setLocalActiveId] = React.useState<string | null>(null);
  const activeTooltipId = context ? context.activeTooltipId : localActiveId;
  const setActiveTooltipId = context ? context.setActiveTooltipId : setLocalActiveId;

  const selfId = id || term;
  const isOpen = activeTooltipId === selfId;

  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [openUpward, setOpenUpward] = React.useState<boolean>(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  if (!detail) {
    return <span className="font-medium">{children || term}</span>;
  }

  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updateCoords = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          const isUpward = spaceBelow < 230;
          setOpenUpward(isUpward);

          const tooltipWidth = 288; // w-72 matches 18rem
          let leftVal = rect.left + rect.width / 2 - tooltipWidth / 2;

          if (leftVal < 12) {
            leftVal = 12;
          }
          if (leftVal + tooltipWidth > window.innerWidth - 12) {
            leftVal = window.innerWidth - tooltipWidth - 12;
          }

          const topVal = isUpward ? rect.top - 8 : rect.bottom + 8;
          setCoords({ top: topVal, left: leftVal });
        }
      };

      updateCoords();
      window.addEventListener('resize', updateCoords, { capture: true, passive: true });
      window.addEventListener('scroll', updateCoords, { capture: true, passive: true });
      return () => {
        window.removeEventListener('resize', updateCoords, { capture: true });
        window.removeEventListener('scroll', updateCoords, { capture: true });
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      const handleOutsideClick = (event: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          const target = event.target as HTMLElement;
          if (target && target.closest('.glossary-portal-tooltip')) {
            return;
          }
          setActiveTooltipId(null);
        }
      };
      const timer = setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [isOpen, setActiveTooltipId]);

  const isLightTheme = theme === 'light';

  const tooltipElement = isOpen && coords && (
    <div 
      className="glossary-portal-tooltip font-sans"
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: openUpward ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
        width: '18rem',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`p-4 rounded-xl text-xs leading-relaxed shadow-2xl border ${
        isLightTheme
          ? 'bg-white border-indigo-950/20 text-slate-900 shadow-md'
          : 'bg-slate-950 border-slate-800 text-slate-50'
      }`}>
        <span className="block font-bold uppercase tracking-wider text-[10px] mb-2 flex justify-between items-center">
          <span className={isLightTheme ? 'text-indigo-900 font-extrabold' : 'text-indigo-300 dark:text-indigo-300'}>
            {detail.category || 'Term Explanation'}
          </span>
          <button 
            onClick={() => setActiveTooltipId(null)}
            className={`font-black text-[10px] px-2 py-0.5 rounded border transition-colors ${
              isLightTheme 
                ? 'text-slate-900 border-slate-350 bg-slate-50 hover:text-red-650 hover:bg-red-50 hover:border-red-200' 
                : 'text-slate-50 border-slate-700 bg-slate-900 hover:text-white hover:border-slate-500'
            }`}
          >
            CLOSE
          </button>
        </span>
        <strong className={`block text-xs font-black mb-1.5 uppercase ${isLightTheme ? 'text-slate-900' : 'text-slate-50 dark:text-slate-50'}`}>
          {detail.title}
        </strong>
        <span className={`block font-sans text-[11.5px] leading-relaxed ${isLightTheme ? 'text-slate-850 font-medium' : 'text-slate-300'}`}>
          {detail.definition}
        </span>
        
        {detail.usageContext && (
          <span className={`block mt-2.5 pt-2 border-t border-dashed ${
            isLightTheme ? 'border-indigo-900/15 text-indigo-900 font-semibold' : 'border-slate-800 text-indigo-300'
          } text-[9px] font-mono leading-tight`}>
            IMPLEMENTATION: {detail.usageContext}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <span 
      ref={triggerRef}
      className="relative inline-block text-slate-900 dark:text-slate-50" 
      id={`glossary-trigger-${term.replace(/[^a-zA-Z0-9]/g, '-')}`}
    >
      <span 
        onClick={(e) => {
          e.stopPropagation();
          setActiveTooltipId(activeTooltipId === selfId ? null : selfId);
        }}
        className={`cursor-pointer border-b border-dashed font-semibold transition-colors duration-200 select-none ${
          isLightTheme 
            ? 'border-indigo-900/40 text-slate-900 hover:text-indigo-900 hover:bg-slate-100 rounded px-1' 
            : 'border-indigo-300/40 text-slate-50 hover:text-indigo-300 hover:bg-slate-900 rounded px-1'
        }`}
        title="Click to view definition"
      >
        {children || term}
      </span>
      {typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
    </span>
  );
};

export default GlossaryTerm;
