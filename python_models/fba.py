"""
Flux Balance Analysis - NYUAD iGEM 2026 Dunelock toolkit
========================================================
Mirror of src/lib/physics/network.ts, solved here with SciPy's linprog instead of the
two-phase simplex the website runs. Same metabolites, same reactions, same bounds, same
biomass equation, so both tiers must return the same numbers; validate_models.py runs the
two against each other and fails if they disagree by more than 1e-6.

FBA maximises a linear objective c.v subject to the steady-state mass balance S.v = 0 and
flux bounds lb <= v <= ub. Fluxes are in mmol gDCW^-1 h^-1, growth in h^-1.

The biomass equation is derived here from measured macromolecular composition rather than
assumed, and the derivation is checked against an independent elemental analysis: carbon
closes to 96.8% of the 40.6 mmol C/gDCW in the B. subtilis formula CH1.65O0.47N0.22, and
nitrogen to 105% of 8.8 mmol N/gDCW. Nothing in it is a round number chosen for looks.

Constants from src/lib/physics/constants.ts:
  FBA_CALIB      vGlcMax 8.5, vO2Max 20, atpMaintenance 3.3 mmol gDCW^-1 h^-1,
                 poNadh 1.5, poQuinol 1.0 ATP per 2 electrons, fluxToConc 0.18 g/mmol
  BIOMASS_CALIB  protein 0.524, RNA 0.155, DNA 0.026, lipid 0.054, peptidoglycan 0.128,
                 teichoic acid 0.037 g/gDCW; mean residue mass 108.5 g/mol;
                 growth-associated ATP 84 mmol/gDCW, NADPH 12 mmol/gDCW

Composition and growth data: Dauner & Sauer, Biotechnol Prog 17:962 (2001), B. subtilis 168
in glucose minimal medium. Run:  python fba.py
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import linprog

ORANGE, TEAL, ROSE, MAROON, ASH = "#D6884A", "#8FB3AC", "#C28A7C", "#6E1E18", "#8A7E75"
plt.rcParams.update({
    "figure.figsize": (7.2, 4.3), "font.size": 11, "figure.dpi": 130,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": ASH, "axes.grid": True, "grid.color": "#E7D8C4",
    "grid.linewidth": 0.8, "axes.titleweight": "bold", "figure.facecolor": "#FBF7F0",
    "axes.facecolor": "#FBF7F0",
})

INF = 1000.0

# --- FBA_CALIB ---------------------------------------------------------------------------
V_GLC_MAX = 8.5      # mmol gDCW^-1 h^-1, glucose uptake capacity
V_O2_MAX = 20.0      # mmol gDCW^-1 h^-1, oxygen transfer capacity
ATP_MAINT = 3.3      # mmol gDCW^-1 h^-1, non-growth associated maintenance
PO_NADH = 1.5        # ATP per NADH oxidised
PO_QUINOL = 1.0      # ATP per quinol oxidised (succinate dehydrogenase route)
FLUX_TO_CONC = 0.18  # g per mmol glucose, for the yield calculation

# =========================================================================================
# 1. Biomass equation from macromolecular composition
# =========================================================================================
# g per gDCW. The residual (ash, soluble pool, polyamines) is not drawn from carbon precursors
# and is carried by the ATP term instead.
COMP = dict(protein=0.524, rna=0.155, dna=0.026, lipid=0.054,
            peptidoglycan=0.128, teichoic=0.037)
RESIDUE_MASS = 108.5   # g/mol, mole-fraction average peptide residue, water removed
GROWTH_ATP = 84.0      # mmol gDCW^-1, polymerisation and turnover work
GROWTH_NADPH = 12.0    # mmol gDCW^-1, biosynthetic reduction

# Representative amino acid mole fractions of the B. subtilis proteome.
AA_FRACTION = {
    "Ala": 0.078, "Arg": 0.049, "Asn": 0.040, "Asp": 0.053, "Cys": 0.008, "Gln": 0.039,
    "Glu": 0.079, "Gly": 0.074, "His": 0.023, "Ile": 0.069, "Leu": 0.096, "Lys": 0.069,
    "Met": 0.026, "Phe": 0.044, "Pro": 0.036, "Ser": 0.058, "Thr": 0.057, "Trp": 0.010,
    "Tyr": 0.033, "Val": 0.069,
}

# Carbon skeletons drawn per residue. This is moles of precursor per residue, not a share
# of one precursor: valine needs two pyruvates and leucine needs two plus an acetyl-CoA, so
# the numbers do not sum to one. Aromatic residues need two PEP and one
# erythrose-4-phosphate, and the core network does not carry E4P, so it is charged as the
# half F6P plus half GAP the transketolase reactions would supply.
AA_PRECURSOR = {
    "Ala": {"PYR": 1},
    "Val": {"PYR": 2},
    "Leu": {"PYR": 2, "ACCOA": 1},
    "Ser": {"GAP": 1},
    "Gly": {"GAP": 1},
    "Cys": {"GAP": 1},
    "Asp": {"OAA": 1},
    "Asn": {"OAA": 1},
    "Thr": {"OAA": 1},
    "Met": {"OAA": 1},
    "Lys": {"OAA": 1, "PYR": 1},
    "Ile": {"OAA": 1, "PYR": 1},
    "Glu": {"AKG": 1},
    "Gln": {"AKG": 1},
    "Pro": {"AKG": 1},
    "Arg": {"AKG": 1},
    "His": {"R5P": 1},
    "Phe": {"PEP": 2, "F6P": 0.5, "GAP": 0.5},
    "Tyr": {"PEP": 2, "F6P": 0.5, "GAP": 0.5},
    "Trp": {"PEP": 2, "F6P": 0.5, "GAP": 0.5, "R5P": 1},
}

# Amino nitrogens per residue, backbone plus side chain.
AA_NITROGEN = {
    "Ala": 1, "Arg": 4, "Asn": 2, "Asp": 1, "Cys": 1, "Gln": 2, "Glu": 1, "Gly": 1,
    "His": 3, "Ile": 1, "Leu": 1, "Lys": 2, "Met": 1, "Phe": 1, "Pro": 1, "Ser": 1,
    "Thr": 1, "Trp": 2, "Tyr": 1, "Val": 1,
}

MW_NUC = 339.0    # g/mol, average ribonucleotide residue in RNA
MW_DNUC = 323.0   # g/mol, average deoxyribonucleotide residue
MW_LIPID = 720.0  # g/mol, average branched-chain diacyl phospholipid
MW_PG = 940.0     # g/mol, disaccharide-pentapeptide repeat unit
MW_TA = 172.0     # g/mol, glycerol phosphate repeat with substituents


def derive_biomass():
    """Return the biomass stoichiometry per gDCW, derived from composition.

    A direct port of deriveBiomassEquation in src/lib/physics/network.ts. The two must
    agree: scripts/validate-models.ts solves both and fails if any flux differs.
    """
    prec = {}

    def add(met, value):
        prec[met] = prec.get(met, 0.0) + value

    # Protein. Mass fraction over the weight-averaged peptide-bond residue mass.
    residues = 1000.0 * COMP["protein"] / RESIDUE_MASS
    amino_nitrogen = 0.0
    for aa, frac in AA_FRACTION.items():
        for met, coeff in AA_PRECURSOR[aa].items():
            add(met, residues * frac * coeff)
        amino_nitrogen += residues * frac * AA_NITROGEN[aa]

    # RNA and DNA. One ribose-5-phosphate per nucleotide; the pyrimidine ring carbon beyond
    # the sugar comes from aspartate, hence from oxaloacetate.
    nmp = 1000.0 * COMP["rna"] / MW_NUC
    dnmp = 1000.0 * COMP["dna"] / MW_DNUC
    add("R5P", nmp + dnmp)
    add("OAA", 0.55 * (nmp + dnmp))
    nucleic_nitrogen = 3.75 * (nmp + dnmp)

    # Membrane lipid. Two branched-chain acyl chains of about sixteen carbons, so eight
    # acetyl-CoA each, esterified to a glycerol-3-phosphate derived from GAP.
    lipid = 1000.0 * COMP["lipid"] / MW_LIPID
    add("ACCOA", 8 * 2 * lipid)
    add("GAP", lipid)

    # Peptidoglycan. Disaccharide pentapeptide: two amino sugars from F6P, two N-acetyl
    # groups from acetyl-CoA, the muramic acid lactyl ether from PEP, two alanines and part
    # of diaminopimelate from pyruvate, the rest of diaminopimelate from OAA, and the stem
    # iso-glutamate from 2-oxoglutarate.
    pg = 1000.0 * COMP["peptidoglycan"] / MW_PG
    add("F6P", 2 * pg)
    add("ACCOA", 2 * pg)
    add("PEP", pg)
    add("PYR", 3 * pg)
    add("OAA", pg)
    add("AKG", pg)
    pg_nitrogen = 5 * pg

    # Teichoic acid. Poly(glycerol phosphate) on an N-acetylglucosamine linkage unit.
    ta = 1000.0 * COMP["teichoic"] / MW_TA
    add("GAP", ta)
    add("F6P", 0.06 * ta)

    # Nitrogen carrier. Glutamate-family residues keep their own skeleton and backbone
    # nitrogen; every remaining biomass nitrogen arrives by one glutamate to 2-oxoglutarate
    # transamination, which is carbon neutral.
    glutamate_skeleton = prec.pop("AKG", 0.0)
    nitrogen_drawn = amino_nitrogen + nucleic_nitrogen + pg_nitrogen
    transaminated = nitrogen_drawn - glutamate_skeleton

    stoich = {met: -value for met, value in prec.items()}
    stoich["GLU"] = -(glutamate_skeleton + transaminated)
    stoich["AKG"] = transaminated
    stoich["ATP"] = -GROWTH_ATP
    stoich["NADPH"] = -GROWTH_NADPH
    stoich["biomass"] = 1.0
    return stoich


CARBON = dict(GLC=6, G6P=6, F6P=6, FBP=6, GAP=3, PEP=3, PYR=3, ACCOA=2,
              CIT=6, ICIT=6, AKG=5, SUCCOA=4, SUC=4, FUM=4, MAL=4, OAA=4,
              R5P=5, E4P=4, X5P=5, GLU=5, co2=1, ac=2, lac=3, pga=5, ca=875,
              glc_ext=6, biomass=0)
NITROGEN = dict(GLU=1, nh3=1, pga=1, ca=175, biomass=0)

BIOMASS = derive_biomass()
BIO_CARBON = -sum(v * CARBON.get(m, 0) for m, v in BIOMASS.items())
BIO_NITROGEN = -sum(v * NITROGEN.get(m, 0) for m, v in BIOMASS.items())

# =========================================================================================
# 2. The network
# =========================================================================================
CA_RESIDUES = 175      # residues in the heterologous beta-carbonic anhydrase
ATP_PER_RESIDUE = 4.3  # ATP per peptide bond formed, including proofreading and folding

# id: (stoichiometry, lower bound, upper bound)
RXN = {
    # Glycolysis
    "PTS":   ({"glc_ext": -1, "PEP": -1, "G6P": 1, "PYR": 1}, 0, INF),
    "PGI":   ({"G6P": -1, "F6P": 1}, -INF, INF),
    "PFK":   ({"F6P": -1, "ATP": -1, "GAP": 2}, 0, INF),
    "FBP":   ({"GAP": -2, "F6P": 1}, 0, INF),
    # Lower glycolysis, lumped exactly as network.ts lumps it (gapA/pgk/pgm/eno):
    # oxidation and substrate-level phosphorylation all the way from GAP to PEP.
    # Reversible, which is what makes gluconeogenesis possible.
    "GAPD":  ({"GAP": -1, "PEP": 1, "ATP": 1, "NADH": 1}, -INF, INF),
    # Pyruvate kinase. This was missing, and without it PEP has no sink but the
    # PTS. Since lower glycolysis returns two PEP for every one the PTS spends,
    # PEP could not balance and the entire network solved as infeasible.
    "PYK":   ({"PEP": -1, "PYR": 1, "ATP": 1}, 0, INF),
    "PCK":   ({"OAA": -1, "ATP": -1, "PEP": 1, "co2": 1}, 0, INF),
    # Pentose phosphate
    "ZWF":   ({"G6P": -1, "NADPH": 2, "co2": 1, "R5P": 1}, 0, INF),
    "TKT":   ({"R5P": -3, "GAP": 1, "F6P": 2}, -INF, INF),
    # Pyruvate node and TCA
    "PDH":   ({"PYR": -1, "ACCOA": 1, "co2": 1, "NADH": 1}, 0, INF),
    "PYC":   ({"PYR": -1, "co2": -1, "ATP": -1, "OAA": 1}, 0, INF),
    "CS":    ({"ACCOA": -1, "OAA": -1, "CIT": 1}, 0, INF),
    "ICDH":  ({"CIT": -1, "AKG": 1, "co2": 1, "NADPH": 1}, 0, INF),
    "AKGD":  ({"AKG": -1, "SUC": 1, "co2": 1, "NADH": 1, "ATP": 1}, 0, INF),
    "SDH":   ({"SUC": -1, "MAL": 1, "QH2": 1}, 0, INF),
    "MDH":   ({"MAL": -1, "OAA": 1, "NADH": 1}, -INF, INF),
    "ME":    ({"MAL": -1, "PYR": 1, "co2": 1, "NADPH": 1}, 0, INF),
    # Nitrogen and products
    # Glutamine synthetase and glutamate synthase, lumped. The ATP is the
    # glutamine synthetase step, and it is the only anabolic route to glutamate
    # in B. subtilis, so every biomass and product nitrogen pays it.
    "GOGAT": ({"AKG": -1, "nh3": -1, "ATP": -1, "NADPH": -1, "GLU": 1}, 0, INF),
    "PGS":   ({"GLU": -1, "ATP": -2, "pga": 1}, 0, INF),
    "CAS":   ({"GLU": -CA_RESIDUES, "ATP": -ATP_PER_RESIDUE * CA_RESIDUES, "ca": 1}, 0, INF),
    # Energy
    "RESP":  ({"NADH": -1, "o2": -0.5, "ATP": PO_NADH}, 0, INF),
    "RESPQ": ({"QH2": -1, "o2": -0.5, "ATP": PO_QUINOL}, 0, INF),
    "ATPM":  ({"ATP": -1}, ATP_MAINT, INF),
    # Overflow and fermentation
    "OVF":   ({"ACCOA": -1, "ATP": 1, "ac": 1}, 0, INF),
    "LDH":   ({"PYR": -1, "NADH": -1, "lac": 1}, 0, INF),
    # Biomass drain
    "BIO":   (BIOMASS, 0, INF),
    # Exchanges. Positive flux is supply into the cell for substrates, removal for products.
    "EX_GLC":  ({"glc_ext": 1}, 0, V_GLC_MAX),
    "EX_O2":   ({"o2": 1}, 0, V_O2_MAX),
    "EX_NH3":  ({"nh3": 1}, 0, INF),
    "EX_CO2":  ({"co2": -1}, 0, INF),
    "EX_AC":   ({"ac": -1}, 0, INF),
    "EX_LAC":  ({"lac": -1}, 0, INF),
    "EX_PGA":  ({"pga": -1}, 0, INF),
    "EX_CA":   ({"ca": -1}, 0, INF),
    "EX_BIOM": ({"biomass": -1}, 0, INF),
}

IDS = list(RXN.keys())
METS = sorted({m for st, _, _ in RXN.values() for m in st})


def solve(objective="EX_BIOM", glucose=V_GLC_MAX, oxygen=V_O2_MAX,
          knockouts=(), fix_growth=None, maintenance=ATP_MAINT):
    """Maximise one reaction subject to S.v = 0 and the bounds. Returns (status, obj, flux)."""
    S = np.zeros((len(METS), len(IDS)))
    lb = np.zeros(len(IDS))
    ub = np.zeros(len(IDS))
    for j, r in enumerate(IDS):
        st, lo, hi = RXN[r]
        for m, v in st.items():
            S[METS.index(m), j] = v
        lb[j], ub[j] = lo, hi
        if r == "EX_GLC":
            ub[j] = glucose
        if r == "EX_O2":
            ub[j] = oxygen
        if r == "ATPM":
            lb[j] = maintenance
        if r in knockouts:
            lb[j] = ub[j] = 0.0
        if r == "EX_BIOM" and fix_growth is not None:
            lb[j] = ub[j] = fix_growth

    c = np.zeros(len(IDS))
    c[IDS.index(objective)] = -1.0
    res = linprog(c, A_eq=S, b_eq=np.zeros(len(METS)),
                  bounds=list(zip(lb, ub)), method="highs")
    if not res.success:
        return "infeasible", 0.0, {r: 0.0 for r in IDS}
    flux = {r: (0.0 if abs(v) < 1e-9 else float(v)) for r, v in zip(IDS, res.x)}
    return "optimal", -float(res.fun), flux


def reference():
    """The wild-type optimum at the calibrated bounds."""
    status, mu, flux = solve()
    return dict(
        status=status, mu=mu,
        yield_gdcw_per_g=mu / (flux["EX_GLC"] * FLUX_TO_CONC),
        qO2=flux["EX_O2"], qCO2=flux["EX_CO2"],
        acetate=flux["EX_AC"], lactate=flux["EX_LAC"], flux=flux,
    )


def production_envelope(n=25):
    """Maximum PGA flux against forced growth rate: the phenotype phase plane."""
    _, mu_max, _ = solve()
    mus = np.linspace(0.0, mu_max, n)
    pga = np.array([solve("EX_PGA", fix_growth=m)[1] for m in mus])
    return mus, pga, mu_max


KNOCKOUTS = [
    ("pycA", "PYC"), ("pdhABCD", "PDH"), ("ndh/qoxABCD", "RESP"),
    ("pta/ackA", "OVF"), ("ldh", "LDH"), ("zwf", "ZWF"), ("tkt/tal", "TKT"),
    ("odhAB", "AKGD"), ("malE/ytsJ", "ME"), ("pckA", "PCK"), ("capBCA", "PGS"),
]


def knockout_scan():
    """Growth and PGA capacity for each deletion, both relative to wild type.

    PGA capacity is compared at matched growth (60% of wild-type mu), not at each mutant's
    own optimum. Comparing at the unconstrained optimum conflates a deletion that redirects
    carbon with one that merely grows more slowly.
    """
    _, mu_wt, _ = solve()
    target = 0.6 * mu_wt
    pga_wt = solve("EX_PGA", fix_growth=target)[1]
    out = []
    for gene, rxn in KNOCKOUTS:
        _, mu_ko, _ = solve(knockouts=(rxn,))
        pga_ko = solve("EX_PGA", fix_growth=target, knockouts=(rxn,))[1]
        out.append((gene, mu_ko / mu_wt, pga_ko / pga_wt if pga_wt > 0 else 0.0))
    return out


def figures():
    figs = []

    # 1) Production envelope with the wild-type operating point marked.
    mus, pga, mu_max = production_envelope()
    ref = reference()
    fig1, ax1 = plt.subplots()
    ax1.plot(mus, pga, color=MAROON, lw=2.4)
    ax1.fill_between(mus, pga, color=ORANGE, alpha=0.28)
    ax1.plot([ref["mu"]], [0.0], "o", color=TEAL, ms=8, zorder=5)
    ax1.annotate(f"unconstrained optimum\n$\\mu$ = {ref['mu']:.2f} h$^{{-1}}$, no PGA",
                 xy=(ref["mu"], 0.0), xytext=(mu_max * 0.42, pga.max() * 0.55),
                 fontsize=9, color=ASH,
                 arrowprops=dict(arrowstyle="->", color=ASH, lw=1))
    ax1.set_xlabel("Growth rate  (h$^{-1}$)")
    ax1.set_ylabel("Maximum PGA flux  (mmol gDCW$^{-1}$ h$^{-1}$)")
    ax1.set_title("Growth competes with gamma-PGA for carbon")
    fig1.tight_layout()
    figs.append((fig1, "fba-1.png"))

    # 2) Knockout scan: growth cost against effect on product capacity.
    scan = knockout_scan()
    genes = [g for g, _, _ in scan]
    mu_rel = [100 * m for _, m, _ in scan]
    pga_rel = [100 * p for _, _, p in scan]
    x = np.arange(len(genes))
    fig2, ax2 = plt.subplots(figsize=(8.2, 4.5))
    ax2.bar(x - 0.2, mu_rel, 0.4, label="growth rate", color=TEAL)
    ax2.bar(x + 0.2, pga_rel, 0.4, label="PGA capacity at matched growth", color=ROSE)
    ax2.axhline(100, color=ASH, lw=1, ls="--")
    ax2.set_xticks(x)
    ax2.set_xticklabels(genes, rotation=35, ha="right", fontsize=9)
    ax2.set_ylabel("Percent of wild type")
    ax2.set_title("In-silico single deletions")
    ax2.legend(frameon=False, fontsize=9)
    fig2.tight_layout()
    figs.append((fig2, "fba-2.png"))
    return figs


if __name__ == "__main__":
    print("biomass equation, per gDCW")
    for m, v in sorted(BIOMASS.items(), key=lambda kv: kv[0]):
        print(f"  {m:>8}  {v:+8.3f}")
    print(f"  carbon drawn   {BIO_CARBON:6.2f} mmol C/gDCW "
          f"({100 * BIO_CARBON / 40.6:.1f}% of elemental analysis)")
    print(f"  nitrogen drawn {BIO_NITROGEN:6.2f} mmol N/gDCW "
          f"({100 * BIO_NITROGEN / 8.8:.1f}% of elemental analysis)")

    ref = reference()
    print("\nwild type at the calibrated bounds")
    print(f"  growth rate     {ref['mu']:.4f} /h  (doubling {60 * 0.693 / ref['mu']:.0f} min)")
    print(f"  biomass yield   {ref['yield_gdcw_per_g']:.4f} gDCW/g glucose")
    print(f"  oxygen uptake   {ref['qO2']:.3f} mmol/gDCW/h")
    print(f"  CO2 evolution   {ref['qCO2']:.3f} mmol/gDCW/h")
    print(f"  acetate         {ref['acetate']:.3f}   lactate {ref['lactate']:.3f}")

    print("\nsingle deletions, percent of wild type")
    for gene, mu_rel, pga_rel in knockout_scan():
        print(f"  {gene:>12}  growth {100 * mu_rel:5.1f}   PGA {100 * pga_rel:5.1f}")

    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
