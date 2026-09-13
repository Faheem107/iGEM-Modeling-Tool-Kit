"""
Kill-switch module explainer: "A switch that fails safe".
Renders one narrated scene: KillswitchExplainer.

Honest to src/lib/physics/killswitch.ts and ecology.ts. A MazE/MazF toxin-antitoxin
pair: the stable MazF toxin cleaves the cell's own mRNA and stops it making
protein; the labile MazE antitoxin sequesters it. One switch escapes at about
1e-8 per cell per generation, which meets the NIH per-cell target but, over the
~1e15 cells on a hectare, still leaves ~1e7 escapees. Two orthogonal switches
multiply, ~1e-16, dropping expected escapees below one. The open risk is dormant
spores: MazF needs active translation, so it cannot kill a spore until it wakes.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class KillswitchExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("A switch that fails safe", "MazE / MazF kill switch", accent=ROSE)
        self.say(
            "A living crust is useful because it grows. That is also the risk. It must not survive "
            "outside the patch we put it on. So we build in a way to shut it down.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Toxin vs antitoxin -----------------------------------------
        tox = self.chip("MazF: the toxin", ROSE, width=4.0, height=0.9).move_to([-3.0, 1.4, 0])
        anti = self.chip("MazE: the antidote", EMERALD, width=4.0, height=0.9).move_to([-3.0, 0.1, 0])
        desc = Text("MazF cuts the cell's own mRNA → no new protein → death",
                    font_size=20, color=MUTED).to_edge(DOWN, buff=1.1)
        self.say(
            "The cell carries a toxin, MazF, that chops up its own messenger R-N-A, so it can no "
            "longer build protein and it dies. Alongside it sits an antidote, MazE, that binds the "
            "toxin and holds it harmless.",
            LaggedStart(FadeIn(tox, shift=RIGHT * 0.2), FadeIn(anti, shift=RIGHT * 0.2), lag_ratio=0.4),
            hold=0.1,
        )
        self.play(FadeIn(desc), run_time=0.7)

        # balance: antidote is fragile and must be constantly remade
        self.say(
            "The trick is that the antidote is fragile and must be made constantly, while the toxin "
            "is stable. So the cell only stays alive as long as it is healthy and where it should "
            "be.",
            AnimationGroup(anti.animate.scale(0.92).set_opacity(0.85),
                           Indicate(tox, color=ROSE, scale_factor=1.03)),
            hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 3. Two triggers -----------------------------------------------
        t1 = Text("1.  an inducer makes extra toxin on demand", font_size=22, color=INK).move_to([0, 1.5, 0])
        t2 = Text("2.  the antidote sits on a plasmid that dilutes out\n     over ~20 generations",
                  font_size=22, color=INK, line_spacing=0.8).move_to([0, 0.4, 0])
        t3 = Text("if the DNA jumps to a wild microbe with no matching\nantidote, its toxin kills it",
                  font_size=20, color=CYAN, line_spacing=0.8).move_to([0, -1.2, 0])
        self.say(
            "There are two ways to trip it. A chemical signal can force extra toxin on demand. And "
            "because the antidote rides on a plasmid that is slowly lost, a cell that escapes the "
            "patch dilutes its antidote away over about twenty generations and shuts itself down.",
            LaggedStart(FadeIn(t1, shift=UP * 0.2), FadeIn(t2, shift=UP * 0.2), lag_ratio=0.5),
            hold=0.1,
        )
        self.say(
            "There is a bonus. The antidote only neutralises its own species' toxin, so if the DNA "
            "ever jumps into a wild microbe, that toxin simply kills the new host.",
            FadeIn(t3, shift=UP * 0.2), hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 4. The numbers: one switch is not enough at scale -------------
        line1 = Text("one switch:  escape ≈ 1 in 100,000,000 cells", font_size=24, color=INK).move_to([0, 1.7, 0])
        line1b = Text("meets the NIH < 10⁻⁸ target", font_size=19, color=EMERALD).next_to(line1, DOWN, buff=0.2)
        line2 = Text("but a hectare carries ~10¹⁵ cells", font_size=24, color=INK).move_to([0, 0.1, 0])
        line3 = Text("→ ~10⁷ escapees per hectare", font_size=26, color=ROSE, weight="BOLD").move_to([0, -1.1, 0])
        self.say(
            "Now the honest arithmetic. One switch fails in about one cell in a hundred million per "
            "generation, which meets the standard target. But a single hectare of crust holds "
            "around ten to the fifteen cells. Multiply, and that is still ten million escapees per "
            "hectare. One switch is not contained.",
            LaggedStart(FadeIn(line1), FadeIn(line1b), FadeIn(line2), FadeIn(line3), lag_ratio=0.4),
            hold=0.5,
        )
        self.smooth_clear(run_time=0.7)

        # --- 5. Two orthogonal switches multiply ---------------------------
        m1 = Text("two independent switches → frequencies multiply", font_size=24, color=INK).move_to([0, 1.4, 0])
        m2 = Text("10⁻⁸ × 10⁻⁸ = 10⁻¹⁶", font_size=30, color=CYAN, weight="BOLD").move_to([0, 0.2, 0])
        m3 = Text("→ ~0.1 escapees per hectare  (below one)", font_size=24, color=EMERALD, weight="BOLD").move_to([0, -1.0, 0])
        self.say(
            "The fix is redundancy. Two independent switches must both fail in the same cell, so "
            "their escape frequencies multiply, ten to the minus sixteen. Now the expected number "
            "of escapees on a hectare drops below one. That is what crosses the line at deployment "
            "scale.",
            LaggedStart(FadeIn(m1), FadeIn(m2), FadeIn(m3), lag_ratio=0.4),
            hold=0.5,
        )
        self.smooth_clear(run_time=0.7)

        # --- 6. The honest limit -------------------------------------------
        lim = Text("The gap: dormant spores", font_size=26, color=AMBER, weight="BOLD").move_to([0, 0.9, 0])
        lim2 = Text("MazF needs an active, translating cell, so it cannot kill\n"
                    "a spore until it germinates, and some spores resist waking",
                    font_size=21, color=MUTED, line_spacing=0.8).next_to(lim, DOWN, buff=0.35)
        self.say(
            "One caveat we do not paper over. The toxin only works in an active cell, so it cannot "
            "kill a dormant spore. The spore has to be woken first, and a stubborn fraction resists "
            "waking. Closing that gap is still open work.",
            AnimationGroup(FadeIn(lim, shift=UP * 0.2), FadeIn(lim2, shift=UP * 0.2)),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
