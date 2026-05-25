import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Globe, 
  RotateCcw, 
  Target, 
  HelpCircle, 
  UploadCloud, 
  Trash2, 
  Palette, 
  Eye, 
  Info 
} from 'lucide-react';

// Vector 3D math utility interfaces and helpers
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

function vecNormalize(v: Vector3): Vector3 {
  const len = Math.hypot(v.x, v.y, v.z);
  return len > 0.0001 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
}

function vecCross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function vecAdd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vecScale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vecSub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecDot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Catmull-Rom spline interpolation algorithm for smooth protein backbones
function interpolateCatmullRom(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number): Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
    z: p0.z * f0 + p1.z * f1 + p2.z * f2 + p3.z * f3
  };
}

// Standard CPK element-based colors for atoms / ligands
const ELEMENT_COLORS: Record<string, string> = {
  'C': '#9ca3af',   // Carbon: Slid gray
  'O': '#f87171',   // Oxygen: Red
  'N': '#60a5fa',   // Nitrogen: Blue
  'H': '#f3f4f6',   // Hydrogen: White
  'S': '#fbbf24',   // Sulfur: Yellow
  'P': '#fb923c',   // Phosphorus: Orange
  'CA': '#38bdf8',  // Calcium: Light cyan
  'MG': '#34d399',  // Magnesium: Emerald
  'FE': '#f97316',  // Iron: Orange
  'ZN': '#a78bfa',  // Zinc: Purple
};

interface ProteinAtom {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  isLigand: boolean;
  residueName: string;
  atomName?: string;
  element?: string;
}

// Robust, detailed Backbone Residue coordinates used to build active 3D Ribbon spline
interface BackboneResidue {
  x: number;
  y: number;
  z: number;
  resSeq: number;
  resName: string;
  chainId: string;
  structType: 'helix' | 'sheet' | 'loop';
  bFactor: number; // For glowing thermal factor simulations
}

interface ParsedPDBData {
  backbone: BackboneResidue[];
  ligands: ProteinAtom[];
}

// Complete, robust client-side PDB file parser returning high-fidelity cartoon ribbon parameters
function parsePDB(pdbContent: string): ParsedPDBData {
  const lines = pdbContent.split('\n');
  const backboneAtomsMap = new Map<string, BackboneResidue>();
  const ligands: ProteinAtom[] = [];

  // Parse HELIX and SHEET definitions for micro-precise secondary structures
  const helixRanges: { chainId: string; start: number; end: number }[] = [];
  const sheetRanges: { chainId: string; start: number; end: number }[] = [];

  for (const line of lines) {
    if (line.startsWith('HELIX ')) {
      const chainId = line.substring(19, 20).trim() || 'A';
      const startSeq = parseInt(line.substring(21, 25).trim(), 10);
      const endSeq = parseInt(line.substring(33, 37).trim(), 10);
      if (!isNaN(startSeq) && !isNaN(endSeq)) {
        helixRanges.push({ chainId, start: startSeq, end: endSeq });
      }
    } else if (line.startsWith('SHEET ')) {
      const chainId = line.substring(21, 22).trim() || 'A';
      const startSeq = parseInt(line.substring(22, 26).trim(), 10);
      const endSeq = parseInt(line.substring(33, 37).trim(), 10);
      if (!isNaN(startSeq) && !isNaN(endSeq)) {
        sheetRanges.push({ chainId, start: startSeq, end: endSeq });
      }
    }
  }

  let sumX = 0, sumY = 0, sumZ = 0;
  let count = 0;

  for (const line of lines) {
    if (line.startsWith('ATOM  ') || line.startsWith('HETATM')) {
      if (line.length < 54) continue;

      const isLigand = line.startsWith('HETATM');
      const atomName = line.substring(12, 16).trim();
      const resName = line.substring(17, 20).trim();
      const chainId = line.substring(21, 22).trim() || 'A';
      const resSeqVal = parseInt(line.substring(22, 26).trim(), 10);
      
      const x = parseFloat(line.substring(30, 38).trim());
      const y = parseFloat(line.substring(38, 46).trim());
      const z = parseFloat(line.substring(46, 54).trim());

      // Parse temperature factor / B-factor if available
      let bFactor = 25.0;
      if (line.length >= 66) {
        bFactor = parseFloat(line.substring(60, 66).trim()) || 25.0;
      }

      let element = '';
      if (line.length >= 78) {
        element = line.substring(76, 78).trim().toUpperCase();
      }
      if (!element) {
        element = atomName.replace(/[0-9]/g, '').substring(0, 2).trim().toUpperCase();
        if (element.length > 1 && !['CA', 'FE', 'ZN', 'MG', 'CL', 'MN', 'CU'].includes(element)) {
          element = element.charAt(0);
        }
      }

      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        sumX += x;
        sumY += y;
        sumZ += z;
        count++;

        if (isLigand) {
          // Standard cofactor or heteroatom
          const color = ELEMENT_COLORS[element] || '#d946ef'; // Default bright magenta for ligands
          const rad = element === 'H' ? 6 : 11;
          ligands.push({
            x,
            y,
            z,
            radius: rad,
            color,
            isLigand: true,
            residueName: `${resName}-${resSeqVal}`,
            atomName,
            element
          });
        } else {
          // Normal protein amino-acid residue. Accumulate to map CA (Alpha Carbon) for backbone wireframe
          const key = `${chainId}_${resSeqVal}`;
          
          let structType: 'helix' | 'sheet' | 'loop' = 'loop';
          if (helixRanges.some(h => h.chainId === chainId && resSeqVal >= h.start && resSeqVal <= h.end)) {
            structType = 'helix';
          } else if (sheetRanges.some(s => s.chainId === chainId && resSeqVal >= s.start && resSeqVal <= s.end)) {
            structType = 'sheet';
          } else {
            // Apply a beautiful periodic rolling secondary classifier if pdb records don't contain helices annotations
            if (helixRanges.length === 0 && sheetRanges.length === 0) {
              const cycle = resSeqVal % 34;
              if (cycle >= 4 && cycle <= 16) structType = 'helix';
              else if (cycle >= 21 && cycle <= 26) structType = 'sheet';
            }
          }

          // We prefer Alpha Carbon (CA) as coordinate node. If already filled with CA, do not substitute
          const isCA = atomName === 'CA';
          const existing = backboneAtomsMap.get(key);
          
          if (!existing || isCA) {
            backboneAtomsMap.set(key, {
              x,
              y,
              z,
              resSeq: resSeqVal,
              resName,
              chainId,
              structType,
              bFactor
            });
          }
        }
      }
    }
  }

  // Convert map to sorted coordinates array group
  const backbone = Array.from(backboneAtomsMap.values()).sort((a, b) => {
    if (a.chainId !== b.chainId) return a.chainId.localeCompare(b.chainId);
    return a.resSeq - b.resSeq;
  });

  // Center coordinate vectors to (0,0,0) so the rotations are balanced around camera anchor
  if (count > 0) {
    const avgX = sumX / count;
    const avgY = sumY / count;
    const avgZ = sumZ / count;

    backbone.forEach(atom => {
      atom.x -= avgX;
      atom.y -= avgY;
      atom.z -= avgZ;
    });

    ligands.forEach(atom => {
      atom.x -= avgX;
      atom.y -= avgY;
      atom.z -= avgZ;
    });
  }

  return { backbone, ligands };
}

// Generate a gorgeous default synthetic folded protein structure with Helix, Sheets and Loop coils
const generateSyntheticProtein = (): ParsedPDBData => {
  const backbone: BackboneResidue[] = [];
  const totalResidues = 120;
  
  for (let i = 0; i < totalResidues; i++) {
    let x = 0, y = 0, z = 0;
    
    // Smooth globular structure generation with ample space and breathing room in-between
    if (i < 30) {
      // Helix 1: Elegant, spacious vertical spiral
      const theta = i * 0.95;
      const r = 5.5;
      x = -18 + r * Math.sin(theta);
      y = -35 + i * 2.2;
      z = r * Math.cos(theta);
    } else if (i < 45) {
      // Loop 1: connecting bridge
      const t = (i - 30) / 15;
      x = -18 * (1 - t) + t * 0;
      y = 31 * (1 - t) + t * 25;
      z = (1 - t) * 0 + t * 15;
    } else if (i < 60) {
      // Sheet 1: Pleated diagonal sheet strand
      const idx = i - 45;
      x = idx * 2.4;
      y = 25 - idx * 1.6;
      z = 15 + (idx % 2 === 0 ? 1.5 : -1.5);
    } else if (i < 75) {
      // Loop 2: connecting bridge 2
      const t = (i - 60) / 15;
      x = 36 * (1 - t) + t * 18;
      y = 1 * (1 - t) + t * -40;
      z = 15 * (1 - t) + t * -10;
    } else if (i < 105) {
      // Helix 2: Second elegant spiral
      const theta = (i - 75) * 0.95;
      const r = 5.5;
      x = 18 + r * Math.sin(theta);
      y = -40 + (i - 75) * 2.2;
      z = -10 + r * Math.cos(theta);
    } else {
      // Loop 3: terminal tail looping back
      const t = (i - 105) / 15;
      x = 18 * (1 - t) + t * -5;
      y = 26 * (1 - t) + t * 35;
      z = -10 * (1 - t) + t * -30;
    }
    
    // Biological micro distortions (subtle high-fidelity waves)
    x += Math.sin(i * 1.5) * 0.45;
    y += Math.cos(i * 1.1) * 0.45;
    z += Math.sin(i * 2.0) * 0.45;

    const isHelix = (i < 30) || (i >= 75 && i < 105);
    const isSheet = (i >= 45 && i < 60);
    const structType = isHelix ? 'helix' : (isSheet ? 'sheet' : 'loop');

    backbone.push({
      x,
      y,
      z,
      resSeq: i + 1,
      resName: isHelix ? 'ALA' : (isSheet ? 'ILE' : 'PRO'),
      chainId: 'A',
      structType,
      bFactor: 15 + Math.sin(i * 0.08) * 30
    });
  }

  // Centering coordinates
  let sumX = 0, sumY = 0, sumZ = 0;
  backbone.forEach(a => { sumX += a.x; sumY += a.y; sumZ += a.z; });
  const avgX = sumX / backbone.length;
  const avgY = sumY / backbone.length;
  const avgZ = sumZ / backbone.length;
  backbone.forEach(a => {
    a.x -= avgX;
    a.y -= avgY;
    a.z -= avgZ;
  });

  // No synthetic ligands (huge balls) are returned by default to keep structure simple and pristine
  const ligands: ProteinAtom[] = [];

  return { backbone, ligands };
};

export default function HighFidelityProteinExplorer() {
  const [selectedResidue, setSelectedResidue] = useState<string | null>(null);
  
  // Custom uploaded state
  const [pdbData, setPdbData] = useState<ParsedPDBData | null>(null);
  const [pdbFileName, setPdbFileName] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modern viewer visualization options
  const [colorTheme, setColorTheme] = useState<'rainbow' | 'structure' | 'fluctuation'>('rainbow');
  const [renderStyle, setRenderStyle] = useState<'cartoon' | 'spacefill' | 'trace'>('cartoon');
  const [showLigands, setShowLigands] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core camera & orbital rotation state tracked in a mutable ref to prevent React render glitches
  const camRef = useRef({
    rotX: -0.45,
    rotY: 0.35,
    zoom: 3.2,
    targetZoom: 3.2,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0
  });

  // Get active rendering molecule data
  const currentStructure = useMemo<ParsedPDBData>(() => {
    if (pdbData) return pdbData;
    return generateSyntheticProtein();
  }, [pdbData]);

  // Normalize / scale molecular coordinate offsets dynamically to fit canvas bounds
  const scaleTranslationFactor = useMemo(() => {
    const active = currentStructure.backbone;
    if (active.length === 0) return 1.0;
    const maxDistance = Math.max(...active.map(a => Math.hypot(a.x, a.y, a.z)));
    return maxDistance > 0 ? (120.0 / maxDistance) : 1.0;
  }, [currentStructure]);

  // Identify distinct chain and secondary structure segments for interactive legend selection
  const legendLayers = useMemo(() => {
    if (pdbFileName && currentStructure.backbone.length > 5) {
      // Group by secondary structure or chains
      return [
        {
          id: 'helix',
          label: 'Alpha-Helix (α) Ribbons',
          description: 'Spiraled hydrogen-bonded peptide coils',
          color: '#f87171',
          matches: (res: BackboneResidue) => res.structType === 'helix'
        },
        {
          id: 'sheet',
          label: 'Beta-Pleated (β) Sheets',
          description: 'Flat, aligned structural arrows',
          color: '#facc15',
          matches: (res: BackboneResidue) => res.structType === 'sheet'
        },
        {
          id: 'loop',
          label: 'Coils and Random Loops',
          description: 'Smooth flexible connective loops',
          color: '#10b981',
          matches: (res: BackboneResidue) => res.structType === 'loop'
        }
      ];
    } else {
      // Simulated Bacillus default subunits
      return [
        {
          id: 'helix',
          label: 'Enzymatic Alpha-Helix Coils',
          description: 'Spiraling peptide segments carrying catalytic residues',
          color: '#f87171',
          matches: (res: BackboneResidue) => res.structType === 'helix'
        },
        {
          id: 'sheet',
          label: 'Pleated Beta-Sheet Arrows',
          description: 'High-density protein core strands',
          color: '#facc15',
          matches: (res: BackboneResidue) => res.structType === 'sheet'
        },
        {
          id: 'loop',
          label: 'Active Site Connective Loops',
          description: 'Connective strings folding around docked cofactor ligand',
          color: '#10b981',
          matches: (res: BackboneResidue) => res.structType === 'loop'
        }
      ];
    }
  }, [pdbFileName, currentStructure]);

  const handleLayerClick = (layerId: string) => {
    setSelectedResidue(layerId === selectedResidue ? null : layerId);
  };

  // Safe manual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadPDBFile(file);
  };

  const loadPDBFile = (file: File) => {
    if (!file.name.endsWith('.pdb') && !file.name.endsWith('.txt')) {
      setUploadError('Invalid file format. Please upload a structured .pdb protein file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !content.includes('ATOM')) {
        setUploadError('Error parsing structure. File must contain standard protein "ATOM" records.');
        return;
      }
      try {
        const parsed = parsePDB(content);
        if (parsed.backbone.length === 0) {
          setUploadError('No atomic residue backbone records (CA) found inside file.');
          return;
        }

        setPdbData(parsed);
        setPdbFileName(file.name);
        setSelectedResidue(null);
        setUploadError(null);
      } catch (err) {
        setUploadError('An unexpected parsing limitation occurred with this custom PDB.');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Try another PDB model.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      loadPDBFile(file);
    }
  };

  const handleResetToDefault = () => {
    setPdbData(null);
    setPdbFileName(null);
    setSelectedResidue(null);
    setUploadError(null);
  };

  // Core Render loop inside dynamic Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const cam = camRef.current;

    // Interaction controls
    const handleMouseDown = (e: MouseEvent) => {
      cam.isDragging = true;
      cam.prevMouseX = e.clientX;
      cam.prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!cam.isDragging) return;
      const dx = e.clientX - cam.prevMouseX;
      const dy = e.clientY - cam.prevMouseY;
      
      cam.rotY += dx * 0.0055;
      cam.rotX += dy * 0.0055;

      cam.prevMouseX = e.clientX;
      cam.prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      cam.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.25 : -0.25;
      cam.targetZoom = Math.max(1.0, Math.min(8.5, cam.targetZoom + zoomDelta));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Build the 3D Render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Interpolate zoom
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      // Gentle auto-rotation when idle
      if (!cam.isDragging) {
        cam.rotY += 0.0018;
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Project coordinates relative to 3D center
      const project3D = (px: number, py: number, pz: number) => {
        let rx = px * scaleTranslationFactor;
        let ry = py * scaleTranslationFactor;
        let rz = pz * scaleTranslationFactor;

        // X Rotation
        const y1 = ry * Math.cos(cam.rotX) - rz * Math.sin(cam.rotX);
        const z1 = ry * Math.sin(cam.rotX) + rz * Math.cos(cam.rotX);
        ry = y1;
        rz = z1;

        // Y Rotation
        const x2 = rx * Math.cos(cam.rotY) + rz * Math.sin(cam.rotY);
        const z2 = -rx * Math.sin(cam.rotY) + rz * Math.cos(cam.rotY);
        rx = x2;
        rz = z2;

        const perspective = (rz + 240) / 240;
        return {
          vX: cx + rx * cam.zoom * perspective,
          vY: cy + ry * cam.zoom * perspective,
          depth: rz
        };
      };

      // Vector helper to compute points color based on color theme
      const getThemeColor = (res: BackboneResidue, frac: number) => {
        if (colorTheme === 'rainbow') {
          // Absolute rainbow terminus (N-to-C transition, matches attached cartoon layout)
          const hue = 240 - frac * 240; 
          return `hsl(${hue}, 95%, 48%)`;
        } else if (colorTheme === 'structure') {
          // Helix RED, Sheet GOLD, Loop CYAN/EMERALD
          if (res.structType === 'helix') return '#f87171'; // Warm crimson red
          if (res.structType === 'sheet') return '#facc15'; // Golden amber
          return '#06b6d4'; // Cyan loops
        } else {
          // Fluctuations B-factor (Deep blue to hot neon magenta)
          const norm = Math.min(1.0, Math.max(0.0, (res.bFactor - 10) / 50));
          const hue = 240 - norm * 240;
          return `hsl(${hue}, 98%, 56%)`;
        }
      };

      // Collect all 3D Renderable objects for solid Painter's Algorithm depth-sorting
      interface RenderableSegment {
        depth: number;
        draw: () => void;
      }
      const renderList: RenderableSegment[] = [];

      // ----------------------------------------------------
      // STYLE PASS A: GLOSSY RAINBOW CARTOON RIBBON VIEWPORT
      // ----------------------------------------------------
      if (renderStyle === 'cartoon' || renderStyle === 'trace') {
        const backbone = currentStructure.backbone;
        
        // Group by chain to prevent cartoon bridges crossing disconnected segments
        const chainGroups = new Map<string, BackboneResidue[]>();
        backbone.forEach(res => {
          if (!chainGroups.has(res.chainId)) {
            chainGroups.set(res.chainId, []);
          }
          chainGroups.get(res.chainId)!.push(res);
        });

        chainGroups.forEach((chainArray, chainId) => {
          if (chainArray.length < 2) return;

          // Interpolation factor: draw 8 steps per peptide bond
          const S = 8;
          interface InterpolatedNode {
            pos: Vector3;
            structType: 'helix' | 'sheet' | 'loop';
            isArrowHeadSegment: boolean;
            fraction: number;
            res: BackboneResidue;
          }

          const interp: InterpolatedNode[] = [];
          for (let i = 0; i < chainArray.length - 1; i++) {
            const r0 = chainArray[Math.max(0, i - 1)];
            const r1 = chainArray[i];
            const r2 = chainArray[i + 1];
            const r3 = chainArray[Math.min(chainArray.length - 1, i + 2)];

            const isSheetCurrent = r1.structType === 'sheet';
            const isSheetNext = r2.structType === 'sheet';
            // Mark end of Beta-Sheet runs to render beautiful arrowheads
            const isArrowHead = isSheetCurrent && !isSheetNext;

            for (let s = 0; s < S; s++) {
              const t = s / S;
              const pt = interpolateCatmullRom(r1, r1, r2, r2, t); // Catmull-Rom smooth curve
              const frac = (i + t) / (chainArray.length - 1);

              interp.push({
                pos: pt,
                structType: r1.structType,
                isArrowHeadSegment: isArrowHead,
                fraction: frac,
                res: r1
              });
            }
          }

          const totalNodes = interp.length;
          if (totalNodes < 2) return;

          // Generate stable 3D rotation frame vectors (Parallel Transport) to prevent ribbons twisting
          const tangents: Vector3[] = [];
          for (let idx = 0; idx < totalNodes; idx++) {
            const nextPt = interp[Math.min(totalNodes - 1, idx + 1)].pos;
            const prevPt = interp[Math.max(0, idx - 1)].pos;
            tangents.push(vecNormalize(vecSub(nextPt, prevPt)));
          }

          const frames: { u: Vector3; v: Vector3 }[] = [];
          let norm = { x: 0, y: 1, z: 0 };
          if (Math.abs(vecDot(tangents[0], norm)) > 0.95) {
            norm = { x: 1, y: 0, z: 0 };
          }

          for (let idx = 0; idx < totalNodes; idx++) {
            const t = tangents[idx];
            const dot = vecDot(norm, t);
            let perp = vecSub(norm, vecScale(t, dot));
            const lPerp = Math.hypot(perp.x, perp.y, perp.z);
            if (lPerp > 0.001) {
              perp = vecScale(perp, 1.0 / lPerp);
            } else {
              perp = Math.abs(t.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
            }
            const u = perp;
            const v = vecCross(t, u);
            frames.push({ u, v });
            norm = u;
          }

          // Build ribbon segments coordinates
          for (let idx = 0; idx < totalNodes - 1; idx++) {
            const nA = interp[idx];
            const nB = interp[idx + 1];

            // Width constraints matching PyMOL ribbon diagrams
            // Width constraints matching PyMOL ribbon diagrams
            const wOuterLoop = renderStyle === 'trace' ? 0.35 : 0.65;
            const wSheet = 2.6;
            const wHelix = 1.7;
            const rHelixSpiral = 1.4;

            const getRibbonOffsets = (node: InterpolatedNode, index: number) => {
              const { u, v } = frames[index];
              let leftPt: Vector3;
              let rightPt: Vector3;
              let normalVec: Vector3;

              if (node.structType === 'loop' || renderStyle === 'trace') {
                leftPt = vecSub(node.pos, vecScale(u, wOuterLoop));
                rightPt = vecAdd(node.pos, vecScale(u, wOuterLoop));
                normalVec = v;
              } else if (node.structType === 'sheet') {
                let w = wSheet;
                if (node.isArrowHeadSegment) {
                  // Beautifully taper beta arrowhead to 0 at the end of strand segment sequence
                  let lookAhead = index;
                  while (lookAhead < totalNodes && interp[lookAhead].isArrowHeadSegment) {
                    lookAhead++;
                  }
                  const totalTaperSteps = Math.max(1, lookAhead - index);
                  const progress = 1.0 - (totalTaperSteps / S); // 1 residue arrowhead segments
                  const clampProg = Math.max(0.0, Math.min(1.0, progress));
                  w = wSheet * 1.65 * (1.0 - clampProg);
                }
                leftPt = vecSub(node.pos, vecScale(u, w));
                rightPt = vecAdd(node.pos, vecScale(u, w));
                normalVec = v;
              } else {
                // ALPHA-HELIX (α): beautiful 3D helical spiraling bands winding around backbone cylinder axis
                // Turn frequency: 3.6 residues per turn. Winding angle increases sequentially
                const helixTheta = (index / 24.0) * Math.PI * 2;
                const cosHelix = Math.cos(helixTheta);
                const sinHelix = Math.sin(helixTheta);

                const centerOffset = vecAdd(vecScale(u, cosHelix), vecScale(v, sinHelix));
                const spiraledCenter = vecAdd(node.pos, vecScale(centerOffset, rHelixSpiral));

                // Ribbon plane normal vector rotates sequentially along the helical cylinder tangent
                const bandDirection = vecAdd(vecScale(u, -sinHelix), vecScale(v, cosHelix));

                leftPt = vecSub(spiraledCenter, vecScale(bandDirection, wHelix));
                rightPt = vecAdd(spiraledCenter, vecScale(bandDirection, wHelix));
                normalVec = centerOffset; // Radial lighting normal
              }

              return { leftPt, rightPt, normalVec };
            };

            const r1 = getRibbonOffsets(nA, idx);
            const r2 = getRibbonOffsets(nB, idx + 1);

            // Project 3D points outwards to screen space
            const pA = project3D(r1.leftPt.x, r1.leftPt.y, r1.leftPt.z);
            const pB = project3D(r1.rightPt.x, r1.rightPt.y, r1.rightPt.z);
            const pC = project3D(r2.rightPt.x, r2.rightPt.y, r2.rightPt.z);
            const pD = project3D(r2.leftPt.x, r2.leftPt.y, r2.leftPt.z);

            const segDepth = (pA.depth + pB.depth + pC.depth + pD.depth) / 4;
            const segColor = getThemeColor(nA.res, nA.fraction);

            // Double-sided 3D lighting calculation for cartoon shadows/reflections
            const lightRef = vecNormalize({ x: 0.9, y: 1.1, z: 1.5 });
            const cellIntensity = Math.abs(vecDot(r1.normalVec, lightRef));
            const intensity = 0.54 + 0.46 * cellIntensity;

            // Enact Painter segment wrapper
            renderList.push({
              depth: segDepth,
              draw: () => {
                ctx.beginPath();
                ctx.moveTo(pA.vX, pA.vY);
                ctx.lineTo(pB.vX, pB.vY);
                ctx.lineTo(pC.vX, pC.vY);
                ctx.lineTo(pD.vX, pD.vY);
                ctx.closePath();

                ctx.fillStyle = segColor;
                ctx.fill();

                // Mask 3D shaders translucency matching realistic ambient occlusion
                if (intensity < 0.72) {
                  const shadowAlpha = 0.45 * (1.0 - intensity / 0.72);
                  ctx.fillStyle = `rgba(1, 6, 12, ${shadowAlpha})`;
                  ctx.fill();
                } else {
                  const specularAlpha = 0.38 * (intensity - 0.72) / 0.28;
                  ctx.fillStyle = `rgba(255, 255, 255, ${specularAlpha})`;
                  ctx.fill();
                }

                // Add cell-shaded microborders to pop coils out of depth
                ctx.strokeStyle = '#02060b';
                ctx.lineWidth = renderStyle === 'trace' ? 0.55 : 0.75;
                ctx.stroke();

                // Interactive legend layer highlighters (ambient outline)
                if (selectedResidue && legendLayers.find(l => l.id === selectedResidue)?.matches(nA.res)) {
                  ctx.strokeStyle = '#facc15';
                  ctx.lineWidth = 1.3;
                  ctx.setLineDash([3, 3]);
                  ctx.beginPath();
                  ctx.moveTo(pA.vX, pA.vY);
                  ctx.lineTo(pD.vX, pD.vY);
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
              }
            });
          }
        });
      }

      // ----------------------------------------------------
      // STYLE PASS B: CLASSIC SPACEFILL CELL-SHADED SPHERES
      // ----------------------------------------------------
      if (renderStyle === 'spacefill') {
        const backbone = currentStructure.backbone;
        backbone.forEach((res, index) => {
          const pt = project3D(res.x, res.y, res.z);
          const drawRadius = 14 * cam.zoom * ((pt.depth + 240) / 240) * 0.75;
          const nodeColor = getThemeColor(res, index / backbone.length);

          renderList.push({
            depth: pt.depth,
            draw: () => {
              if (drawRadius <= 0.1 || !isFinite(drawRadius) || !isFinite(pt.vX) || !isFinite(pt.vY)) return;

              ctx.save();
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.clip();

              ctx.fillStyle = nodeColor;
              ctx.fillRect(pt.vX - drawRadius, pt.vY - drawRadius, drawRadius * 2, drawRadius * 2);

              // 3D glossy highlight shader
              const radGrad = ctx.createRadialGradient(
                pt.vX - drawRadius * 0.26, pt.vY - drawRadius * 0.26, drawRadius * 0.05,
                pt.vX, pt.vY, drawRadius
              );
              radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
              radGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
              radGrad.addColorStop(0.85, 'rgba(1, 10, 18, 0.35)');
              radGrad.addColorStop(1, 'rgba(1, 5, 10, 0.7)');
              ctx.fillStyle = radGrad;
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.fill();

              // Highlight reflection crescent
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = drawRadius * 0.12;
              ctx.globalAlpha = 0.45;
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius * 0.8, Math.PI * 1.05, Math.PI * 1.65);
              ctx.stroke();

              ctx.restore();

              // Thin black outline
              ctx.strokeStyle = '#02060b';
              ctx.lineWidth = 0.85;
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.stroke();

              // Interactive highlighted circle
              if (selectedResidue && legendLayers.find(l => l.id === selectedResidue)?.matches(res)) {
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2.0;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(pt.vX, pt.vY, drawRadius + 4.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }
          });
        });
      }

      // ----------------------------------------------------
      // STYLE PASS C: ACTIVE SITE LIGANDS SPACEFILL ATOMS
      // ----------------------------------------------------
      if (showLigands) {
        const ligands = currentStructure.ligands;
        ligands.forEach((lig) => {
          const pt = project3D(lig.x, lig.y, lig.z);
          // Scale ligand radius according to zoom and distance perspective
          const drawRadius = lig.radius * cam.zoom * ((pt.depth + 240) / 240) * 0.72;

          renderList.push({
            depth: pt.depth,
            draw: () => {
              if (drawRadius <= 0.1 || !isFinite(drawRadius) || !isFinite(pt.vX) || !isFinite(pt.vY)) return;

              ctx.save();
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.clip();

              ctx.fillStyle = lig.color;
              ctx.fillRect(pt.vX - drawRadius, pt.vY - drawRadius, drawRadius * 2, drawRadius * 2);

              // Standard CPK lighting gloss reflections
              const grad = ctx.createRadialGradient(
                pt.vX - drawRadius * 0.32, pt.vY - drawRadius * 0.32, drawRadius * 0.05,
                pt.vX, pt.vY, drawRadius
              );
              grad.addColorStop(0, '#ffffff');
              grad.addColorStop(0.3, lig.color);
              grad.addColorStop(0.85, 'rgba(1, 5, 10, 0.6)');
              grad.addColorStop(1, 'rgba(1, 2, 5, 0.82)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.fill();

              ctx.restore();

              // Dark inline border
              ctx.strokeStyle = '#02060b';
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.arc(pt.vX, pt.vY, drawRadius, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
        });
      }

      // Depths occlusion ordering (back-to-front rendering)
      renderList.sort((a, b) => a.depth - b.depth);
      renderList.forEach(seg => seg.draw());

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [currentStructure, colorTheme, renderStyle, showLigands, selectedResidue, scaleTranslationFactor, legendLayers]);

  return (
    <div className="bg-[#06080d] p-6 rounded-xl border border-slate-800 shadow-2xl relative" id="hifi-protein-sandbox border-amber-950/20">
          {/* Dynamic Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
            <Globe className="w-5 h-5 text-indigo-400" />
            3D Crystallographic Protein Imager
          </h2>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {pdbFileName 
              ? `Currently parsing PDB model: ${pdbFileName} (${currentStructure.backbone.length} amino-acid alpha positions mapped)` 
              : "Simulated 3D Enzyme Cartoon Sandbox. Features ribbon helices and beta strands folded dynamically with ample space."
            }
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap bg-[#06080d] p-1 rounded border border-slate-800 text-[10px] font-bold font-mono gap-1.5 items-center">
          <label className="px-2.5 py-1.5 rounded cursor-pointer transition text-indigo-305 hover:bg-indigo-950/30 flex items-center gap-1.5 border border-indigo-900/20 bg-indigo-950/10 hover:text-indigo-200">
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load PDB File</span>
            <input 
              type="file" 
              accept=".pdb,.txt" 
              onChange={handleFileUpload}
              className="hidden" 
            />
          </label>
          {pdbFileName && (
            <button 
              onClick={handleResetToDefault}
              className="px-2.5 py-1.5 rounded cursor-pointer transition text-rose-400 hover:bg-rose-950/20 flex items-center gap-1 border border-rose-900/15"
              title="Reset workspace back to default simulated enzyme structure"
            >
              <Trash2 className="w-3.5 h-3.5" /> Close PDB
            </button>
          )}
          <span className="px-3 py-1.5 rounded text-indigo-400 bg-indigo-950/15 border border-indigo-900/20 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Cartoon Mode Enabled
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: 3D Canvas Visualizer stage */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main 3D Stage viewport container */}
          <div className="bg-[#0a0f18] p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between align-center relative group">
            
            <div className="relative border border-slate-800/60 rounded-lg bg-[#04060b] w-full min-h-[460px] flex items-center justify-center overflow-hidden custom-protein-viewport">
              <canvas 
                ref={canvasRef} 
                width={620} 
                height={420} 
                className="block cursor-grab active:cursor-grabbing max-w-full"
              />

              {uploadError && (
                <div className="absolute top-14 left-3 right-3 py-2 px-3.5 bg-red-950/90 backdrop-blur-md border border-red-800/40 text-red-300 text-[10.5px] rounded-lg font-mono text-left shadow-xl animate-fadeIn flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">⚠️ Warning: {uploadError}</span>
                  <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-200 font-bold px-1 select-none">✕</button>
                </div>
              )}

              {/* Interaction Guide */}
              <div className="absolute top-3 left-3 bg-[#0a0f18]/85 px-3 py-1.5 rounded border border-slate-805 text-[9px] text-[#38bdf8] font-mono uppercase tracking-wider flex items-center gap-1.5 pointer-events-none shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping shrink-0"></span>
                Hold and Drag Left Mouse Button to Rotate • Scroll to Zoom
              </div>

              {/* Watermark sign */}
              <div className="absolute bottom-3 right-3 bg-[#0a0f18]/90 p-2 py-1.5 rounded border border-slate-800/80 text-[10px] text-indigo-400 font-mono flex items-center gap-1.5 pointer-events-none shadow">
                <Sparkles className="w-3.5 h-3.5 text-indigo-455 animate-pulse" />
                <span>3D Spline Ribbon Engine</span>
              </div>
            </div>

            {/* Stage bottom actions controls */}
            <div className="mt-4 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-sans">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Drag to explore folding subunits. Use the right-hand panel to isolate secondary layers.</span>
              </span>
              <button 
                onClick={() => { camRef.current.rotX = -0.45; camRef.current.rotY = 0.35; camRef.current.targetZoom = 3.2; }}
                className="px-2.5 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-[10px] font-mono rounded text-slate-200 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Align Camera
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Visualization controllers, CPK models & Interactive layers selection */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Display & Styling Control Hub */}
          <div className="bg-[#0a0f18] p-5 rounded-xl border border-slate-805 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono pb-2 border-b border-slate-800/85">
              <Palette className="w-4 h-4 text-indigo-400 animate-pulse" />
              Viewer Customization
            </h3>

            {/* Theme Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 font-mono">Color Theme</label>
              <div className="grid grid-cols-3 bg-[#06080d] p-1 rounded border border-slate-800 text-[10px] font-mono gap-1">
                <button 
                  onClick={() => setColorTheme('rainbow')}
                  className={`py-1 rounded cursor-pointer transition text-center ${colorTheme === 'rainbow' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  Rainbow
                </button>
                <button 
                  onClick={() => setColorTheme('structure')}
                  className={`py-1 rounded cursor-pointer transition text-center ${colorTheme === 'structure' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  Secondary
                </button>
                <button 
                  onClick={() => setColorTheme('fluctuation')}
                  className={`py-1 rounded cursor-pointer transition text-center ${colorTheme === 'fluctuation' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  Fluctuation
                </button>
              </div>
            </div>

            {/* Model Styles Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 font-mono">Backbone Style</label>
              <div className="grid grid-cols-3 bg-[#06080d] p-1 rounded border border-slate-800 text-[10px] font-mono gap-1">
                <button 
                  onClick={() => setRenderStyle('cartoon')}
                  className={`py-1 rounded cursor-pointer transition text-center ${renderStyle === 'cartoon' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  3D Ribbon
                </button>
                <button 
                  onClick={() => setRenderStyle('trace')}
                  className={`py-1 rounded cursor-pointer transition text-center ${renderStyle === 'trace' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  Thin Trace
                </button>
                <button 
                  onClick={() => setRenderStyle('spacefill')}
                  className={`py-1 rounded cursor-pointer transition text-center ${renderStyle === 'spacefill' ? 'bg-indigo-905 text-indigo-200 border border-indigo-900/60 font-black' : 'text-slate-500 hover:text-slate-350'}`}
                >
                  Spacefill
                </button>
              </div>
            </div>

            {/* Ligand Toggle Switches */}
            <div className="flex items-center justify-between py-2 border-t border-slate-850/50">
              <div className="text-left">
                <span className="text-[11px] font-black font-mono text-slate-250 block">Docked Active-Site Ligands</span>
                <span className="text-[9px] text-slate-500 block">Show/hide simulated drug or substrate complex models</span>
              </div>
              <button 
                onClick={() => setShowLigands(!showLigands)}
                className={`px-3 py-1 rounded text-[10px] font-mono font-black border transition cursor-pointer ${showLigands ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/40' : 'bg-slate-900 text-slate-600 border-slate-800'}`}
              >
                {showLigands ? 'Visible' : 'Hidden'}
              </button>
            </div>
          </div>

          {/* Interactive Coordinates Highlight Dashboard */}
          <div className="bg-[#0a0f18] p-5 rounded-xl border border-slate-805 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono pb-2 border-b border-slate-800/85">
              <Eye className="w-4 h-4 text-emerald-400 animate-pulse" />
              Secondary Residue Folds
            </h3>

            {/* Dynamic elements lists categories */}
            <div className="space-y-2 font-mono text-xs max-h-[220px] overflow-y-auto pr-1">
              {legendLayers.map((layer) => (
                <div 
                  key={layer.id}
                  onClick={() => handleLayerClick(layer.id)}
                  className={`p-3 rounded border text-left cursor-pointer transition flex items-center justify-between ${
                    selectedResidue === layer.id 
                      ? 'bg-indigo-950/45 border-indigo-500 text-indigo-300' 
                      : 'bg-[#06080d] border-[#101726]/60 text-slate-350 hover:bg-[#06080d]/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border" 
                      style={{ backgroundColor: layer.color, borderColor: 'rgba(0,0,0,0.3)' }}
                    ></span>
                    <div>
                      <span className="font-bold font-sans text-slate-200 block text-[11px]">{layer.label}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 leading-normal">{layer.description}</span>
                    </div>
                  </div>
                  {selectedResidue === layer.id && (
                    <span className="text-[8px] text-indigo-400 bg-indigo-950/50 px-2 py-0.5 border border-indigo-900 rounded font-extrabold select-none shrink-0 self-center">
                      HIGHLIGHT
                    </span>
                  )}
                </div>
              ))}
            </div>

            {selectedResidue && (
              <div className="p-3 bg-indigo-950/15 border border-indigo-900/35 rounded text-[10px] text-indigo-300 font-mono leading-relaxed animate-fadeIn">
                <span className="font-bold block text-[#a5b4fc] text-[11px] mb-1">🔍 Isolation Tracking Active:</span>
                Target coordinates are marked with blinking alignment overlays in the active 3D visualization canvas.
              </div>
            )}

            {!pdbFileName && (
              <div className="p-3 bg-indigo-950/10 border border-slate-800/40 rounded text-[10px] text-slate-450 leading-relaxed font-sans">
                <Info className="w-4 h-4 text-indigo-400 inline-block align-text-bottom mr-1.5 shrink-0" />
                Observe the difference between the <strong>α-helix spiral ribbon path</strong> and <strong>β-pleated sheets</strong> using the display options above.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
