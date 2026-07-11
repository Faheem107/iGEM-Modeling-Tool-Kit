# Task 3 — Parameter Audit & iGEM Presentation Benchmark

_NYUAD iGEM 2026 modeling toolkit · audit date 2026-07-07_

This is the literature validation pass over `src/lib/physics/constants.ts` plus a review of
how award-winning iGEM teams present modeling, done to strengthen the **Best Model** bar.
It is a working note (kept off GitHub, like the Research Table).

---

## Part A — Parameter audit

**Headline finding:** `constants.ts` is already unusually well-disciplined for an iGEM dry lab —
every calibration entry is a `Calib` object carrying `value`, `units`, `source`, a concrete
`wetlab` measurement plan, and a sensitivity `range`. That provenance-in-code is itself a
Best-Model strength. The audit was therefore a *validate-and-tighten* pass, not a
placeholder hunt. Spot-checks against primary literature below.

| Constant | Value | Verdict | Primary source checked |
|---|---|---|---|
| `AEOLIAN.A` (Bagnold threshold) | 0.11 | ✅ correct | Bagnold 1941 gives A=0.10 (Re\*>3.5); Shao & Lu 2000 dynamic threshold ≈0.11 (doi:10.1029/2000JD900304) |
| `CACO3.caRateEnhancement` | 1.0×10⁶ fold | ✅ defensible | CA kcat ≈1.3×10⁶ s⁻¹ (isozyme C, 37 °C); ~10⁶-fold over uncatalyzed at physiological pH |
| `CACO3.pKspCalcite` | 8.48 | ✅ correct | Plummer & Busenberg 1982, Geochim. Cosmochim. Acta 46:1011–1040 (the canonical value) |
| `CACO3.pKspACC` / `pKa1` / `pKa2` | 6.4 / 6.35 / 10.33 | ✅ standard | textbook carbonate-system constants at 25 °C |
| `CACO3.vateriteFraction` | 0.6 | ✅ supported | non-ureolytic CA-MICP frequently yields vaterite; CA route also avoids the ammonia byproduct of ureolysis (design justification) |
| `GRAINSIZE` UCS anchors (SP0063=3.1, SP0125=2.9, SP0250=1.6, SP0500=0.7 MPa) | — | ✅ real data, ⚠️ **was mis-cited** | Erdmann et al. 2024, *Discover Materials*, doi:10.1007/s43939-024-00108-3 (Research Table Study 4) |
| `ECOLOGY` Fisher–KPP (`muMax`, `motilityD0`, escape freq) | — | ✅ sourced last session | c=2√(Dµ); Kubota & Kobayashi 2017; Chan 2016 / Stirling 2017 |

### Correction applied
- **Grain-size study was attributed to "Xiao et al. 2024" — this is wrong.** The paper the
  team's Research Table (Study 4) actually links (doi:10.1007/s43939-024-00108-3) is
  **Erdmann, Schaefer, Becker, Bröckel & Strieth (2024), _Discover Materials_.** "Xiao"
  appears nowhere in the research tables — it was an incorrect author name in the code.
  Fixed in `constants.ts` (block comment) and `moduleSources.ts` (Sources window). This is
  exactly the kind of citation slip the iGEM honesty rules require us to catch before the wiki.

### Notes / honest caveats worth surfacing on the wiki
- Erdmann et al. found strength rising monotonically down to their finest band (63 µm). Our
  model's **fine-side fall-off** (`micpPenetrationD50 = 40 µm`, cells can't penetrate) is a
  mechanism-based *extrapolation below the tested range*, not a measured Erdmann result — the
  code already flags it as wet-lab-to-calibrate, which is the honest framing to keep.
- `caRateEnhancement`'s own note (kcat≈10⁶ vs kuncat≈0.04 s⁻¹) implies ~2.5×10⁷ fold; the
  stored 1.0×10⁶ is the commonly-quoted round figure and sits inside the declared range
  [10³,10⁷]. Fine to keep, but don't claim more precision than that on the wiki.
- Study 3 (crust/bearing-capacity) was on _S. pasteurii_, not _B. subtilis_ — the Research
  Table already notes B. subtilis may need more cycles. Keep that caveat visible.

---

## Part B — How winning iGEM teams present modeling (visual benchmark for Task 4)

Reviewed: Heidelberg 2024 "DaVinci" (Grand Prize, Undergraduate), Peking (long Best-Model
tradition, quantitative-first), and iGEM's own modeling-page guidance.

**Recurring techniques that win:**
1. **Progressive disclosure** — a plain-language "in a nutshell" summary *before* the math, with
   anchored in-page navigation so a judge can jump to any model. (We already have the Sandyx
   glossary + "Show the Math" + Video windows — this is on-brand; extend it to the landing page.)
2. **Real structures, honestly colored** — AlphaFold renders colored by pLDDT confidence, MD
   trajectories. (We now ship the real capBCA / 1CA2 structures — lean into confidence coloring.)
3. **Typeset equations** as first-class visuals (KaTeX/LaTeX), each with a one-line caption of
   what it *means*. (Already have KaTeX blocks — keep captions.)
4. **Piecewise, meaningful color coding** in every plot (series colors that map to a concept,
   not decoration) + a consistent palette across the whole wiki.
5. **Digital-twin narrative**: computation ↔ experiment loop, each model tied to a wet-lab
   measurement it predicts or is calibrated by. (Our `wetlab` field on every constant is
   literally this — expose it in the UI as provenance panels.)
6. **Honest limitations** sections build credibility more than polish does. Keep the
   "calibrate to our data" framing everywhere.

**Takeaways applied to the toolkit landing page (Task 4):**
- Keep the cinematic scroll (desert → city → lab) as the *nutshell* layer, then let the three
  prong cards be the anchored jump-off into the quantitative models — mirrors the
  nutshell→detail structure judges reward.
- Every dramatized section should still resolve to a concrete, sourced claim (not just vibes),
  and the prong cards should telegraph "each model is calibrated to a wet-lab measurement."

**Sources:** Shao & Lu 2000 (doi:10.1029/2000JD900304); Plummer & Busenberg 1982 (GCA 46:1011);
Erdmann et al. 2024 (doi:10.1007/s43939-024-00108-3); iGEM 2024 Results / Heidelberg DaVinci
model page; Peking model pages; iGEM modeling-page guidance.
