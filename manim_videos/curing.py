"""
Curing module explainer: "How the crust sets, ages, and is renewed".
Renders one narrated scene: CuringExplainer.

Honest to src/lib/physics/curing.ts. Two engineered prongs cure on their own
clocks: gamma-PGA firms up within hours, calcite ripens across the 32 h spray
protocol. In the field gamma-PGA biodegrades over months (half-life ~5 months)
while calcite is the durable floor (~30 months), so the calcite is what sets the
re-application cadence. The ~6-month interval is where the field evidence stops,
not a measured service life. Alginate was dropped and is not shown.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class CuringExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Set, age, renew", "The curing timeline", accent=EMERALD)
        self.say(
            "Spray the crust, and it does not harden all at once. The two binders set on "
            "different clocks, and that turns out to be useful.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Timeline axis ----------------------------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.1, 1], x_len=9.0, y_len=3.6).shift(DOWN * 0.2)
        lab = self.axis_labels(ax, "time  (hours … months)", "strength", color=MUTED)
        self.play(Create(ax), FadeIn(lab), run_time=0.8)

        # --- 3. Two binders, two clocks ------------------------------------
        pga = ax.plot(lambda t: 0.6 * (1 - np.exp(-t / 1.2)), x_range=[0, 10], color=AMBER, stroke_width=5)
        cal = ax.plot(lambda t: 0.95 * (1 - np.exp(-t / 3.4)), x_range=[0, 10], color=EMERALD, stroke_width=6)
        pga_l = Text("γ-PGA: firms up in hours", font_size=18, color=AMBER).to_corner(UL, buff=0.7)
        cal_l = Text("calcite: ripens over the 32-hour spray", font_size=18, color=EMERALD).next_to(pga_l, DOWN, buff=0.12).align_to(pga_l, LEFT)
        self.say(
            "Gamma-P-G-A firms up within a few hours, giving early grip. The calcite ripens more "
            "slowly, across the full thirty-two-hour spray protocol, and ends up stronger.",
            AnimationGroup(Create(pga), FadeIn(pga_l)), hold=0.1,
        )
        self.play(Create(cal), FadeIn(cal_l), run_time=1.4)

        # --- 4. Fast polymer hands off to durable calcite ------------------
        self.say(
            "So the fast polymer carries the crust through its fragile first day, while the "
            "calcite takes over as the long-term floor.",
            AnimationGroup(Indicate(pga, color=AMBER, scale_factor=1.02),
                           Indicate(cal, color=EMERALD, scale_factor=1.02)),
            hold=0.5,
        )

        # --- 5. Months of weathering; re-spray -----------------------------
        decay = ax.plot(lambda t: 0.95 * (1 - np.exp(-t / 3.4)) * np.exp(-(max(0, t - 6)) / 12.0),
                        x_range=[0, 10], color=EMERALD, stroke_width=6)
        respray = DashedLine(ax.c2p(8.5, 0), ax.c2p(8.5, 0.9), color=CYAN, stroke_width=3)
        respray_l = Text("re-spray", font_size=18, color=CYAN).next_to(ax.c2p(8.5, 0.9), UP, buff=0.1)
        self.say(
            "Over months the polymer biodegrades first, then the calcite slowly wears too. Because "
            "the calcite lasts longest, it is what sets how long you can wait before spraying "
            "again.",
            AnimationGroup(Transform(cal, decay), Create(respray), FadeIn(respray_l)),
            run_time=2.0, hold=0.5,
        )

        # --- 6. Honest limit -----------------------------------------------
        note = Text("~6 months: where the field trial stopped, not a measured life",
                    font_size=17, color=MUTED).to_edge(DOWN, buff=0.5)
        self.say(
            "One caveat. The six-month cadence is where the field trial stopped observing, not a "
            "measured service life. The crust was still stable when the trial ended.",
            FadeIn(note, shift=UP * 0.2), hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
