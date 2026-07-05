"""
Ecological module explainer — "Spreading safely: the kill switch".
Renders one narrated scene: EcologicalExplainer.

Honest to the reaction–diffusion + biosafety model: the colony grows and diffuses across the sand
(logistic growth on a resource grid), but an engineered kill switch trips on an environmental
trigger and shuts the colony down, so it can't spread where it shouldn't.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class EcologicalExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Spreading safely", "Growth + the kill switch", accent=EMERALD)
        self.say(
            "A living crust is powerful precisely because it grows and spreads on its own. But that "
            "is also the danger — it must never spread where it should not.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Build the resource grid ------------------------------------
        N = 11
        cell = 0.42
        grid = VGroup()
        cells = {}
        for i in range(N):
            for j in range(N):
                sq = Square(side_length=cell, stroke_color=GRID, stroke_width=1,
                            fill_color="#0d1526", fill_opacity=1.0)
                sq.move_to([(j - N / 2) * cell, (i - N / 2) * cell, 0])
                grid.add(sq); cells[(i, j)] = sq
        grid.shift(LEFT * 2.3)
        self.play(FadeIn(grid), run_time=0.7)

        # --- 3. Growth + diffusion from the centre -------------------------
        c = N // 2
        rings = {}
        for (i, j), sq in cells.items():
            d = max(abs(i - c), abs(j - c))
            rings.setdefault(d, []).append(sq)
        self.say(
            "Drop the bacteria in one spot. They multiply and diffuse outward across the sand — "
            "like a drop of ink spreading through water.",
            AnimationGroup(*[cells[(c, c)].animate.set_fill(EMERALD, opacity=0.9)]), hold=0.1,
        )
        for d in range(1, 5):
            self.play(*[sq.animate.set_fill(EMERALD, opacity=max(0.25, 0.9 - d * 0.14)) for sq in rings[d]],
                      run_time=0.5, rate_func=smooth)

        # --- 4. The kill switch trips --------------------------------------
        trigger = DashedLine([0.2, -2.5, 0], [0.2, 2.5, 0], color=ROSE, stroke_width=4).shift(LEFT * 2.3)
        trig_lab = Text("environmental trigger", font_size=20, color=ROSE).next_to(trigger, UP, buff=0.15)
        toxin = self.chip("kill-switch → toxin", ROSE, width=3.4).to_edge(RIGHT, buff=1.0)
        self.say(
            "So we engineer a kill switch. Cross an environmental line — leave the target zone — and "
            "a toxin gene switches on and shuts the colony down.",
            LaggedStart(Create(trigger), FadeIn(trig_lab), FadeIn(toxin, shift=LEFT * 0.2), lag_ratio=0.3),
            hold=0.4,
        )
        # cells past the trigger die off
        beyond = [sq for (i, j), sq in cells.items() if sq.get_center()[0] > 0.2 + (-2.3) and sq.get_fill_opacity() > 0]
        self.play(LaggedStart(*[sq.animate.set_fill("#3a0f14", opacity=0.9) for sq in beyond], lag_ratio=0.02),
                  run_time=1.4)

        # --- 5. Payoff: growth vs containment ------------------------------
        self.say(
            "So two forces are always in balance: growth that builds the crust, and containment that "
            "keeps it exactly where we want it — and nowhere else.",
            AnimationGroup(Indicate(toxin, color=ROSE, scale_factor=1.05)), hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
