"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  MetabolicParams,
  BiophysicsParams,
  AeolianParams,
  CAConfig,
} from "@/src/types";

/**
 * Central simulation orchestrator state, hoisted into a provider so it survives
 * navigation between the portal routes (pipeline ↔ wet-lab ↔ model). The pipeline
 * modules and the wet-lab sandbox share pgaAccum / shearModulus as "universal
 * vitals", so this must live above the route segments.
 */
interface ToolkitState {
  metabolicParams: MetabolicParams;
  setMetabolicParams: React.Dispatch<React.SetStateAction<MetabolicParams>>;
  crosslinkParams: BiophysicsParams;
  setCrosslinkParams: React.Dispatch<React.SetStateAction<BiophysicsParams>>;
  aeolianParams: AeolianParams;
  setAeolianParams: React.Dispatch<React.SetStateAction<AeolianParams>>;
  ecologicalConfig: CAConfig;
  setEcologicalConfig: React.Dispatch<React.SetStateAction<CAConfig>>;
  targetYield: number;
  setTargetYield: React.Dispatch<React.SetStateAction<number>>;
  calibratedKcat: number | null;
  setCalibratedKcat: React.Dispatch<React.SetStateAction<number | null>>;
  pgaAccum: number;
  setPgaAccum: React.Dispatch<React.SetStateAction<number>>;
  shearModulus: number;
  setShearModulus: React.Dispatch<React.SetStateAction<number>>;
  isLinked: boolean;
  setIsLinked: React.Dispatch<React.SetStateAction<boolean>>;
  updatePrecursorFlux: (val: number) => void;
}

const ToolkitContext = createContext<ToolkitState | null>(null);

export function ToolkitProvider({ children }: { children: ReactNode }) {
  const [metabolicParams, setMetabolicParams] = useState<MetabolicParams>({
    alpha_m: 0.12,
    beta_m: 0.02,
    alpha_e: 0.08,
    beta_e: 0.01,
    k_cat: 4.5,
    s_precursor: 2.5,
    k_m: 1.5,
    k_deg: 0.05,
    ggtKnockout: true,
    pgcAKnockout: true,
  });
  const [crosslinkParams, setCrosslinkParams] = useState<BiophysicsParams>({
    ion_conc: 10.0,
    Kd: 4.0,
    rho_polymer: 3.5,
    temperature: 298.15,
    Mx: 350,
    Mn: 25000,
  });
  const [aeolianParams, setAeolianParams] = useState<AeolianParams>({
    sand_diameter: 0.00025,
    wind_velocity: 0.35,
    biofilm_cohesion: 0.0002,
  });
  const [ecologicalConfig, setEcologicalConfig] = useState<CAConfig>({
    gridSize: 50,
    spreadProb: 0.45,
    resourceConsume: 0.12,
    initialInoculation: "center",
    killSwitchDelay: 10,
  });
  const [targetYield, setTargetYield] = useState<number>(120);
  const [calibratedKcat, setCalibratedKcat] = useState<number | null>(null);
  const [pgaAccum, setPgaAccum] = useState<number>(35.0);
  const [shearModulus, setShearModulus] = useState<number>(1450.0);
  const [isLinked, setIsLinked] = useState<boolean>(true);

  const updatePrecursorFlux = useCallback((val: number) => {
    const cleanVal = Math.max(0, val);
    setMetabolicParams((prev) => {
      if (Math.abs(prev.s_precursor - cleanVal) < 0.001) return prev;
      return { ...prev, s_precursor: Number(cleanVal.toFixed(4)) };
    });
  }, []);

  return (
    <ToolkitContext.Provider
      value={{
        metabolicParams,
        setMetabolicParams,
        crosslinkParams,
        setCrosslinkParams,
        aeolianParams,
        setAeolianParams,
        ecologicalConfig,
        setEcologicalConfig,
        targetYield,
        setTargetYield,
        calibratedKcat,
        setCalibratedKcat,
        pgaAccum,
        setPgaAccum,
        shearModulus,
        setShearModulus,
        isLinked,
        setIsLinked,
        updatePrecursorFlux,
      }}
    >
      {children}
    </ToolkitContext.Provider>
  );
}

export function useToolkit(): ToolkitState {
  const ctx = useContext(ToolkitContext);
  if (!ctx)
    throw new Error("useToolkit must be used within a ToolkitProvider");
  return ctx;
}
