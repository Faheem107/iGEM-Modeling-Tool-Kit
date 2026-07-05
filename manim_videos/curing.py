"""
Curing module explainer — "How the crust sets, ages, and is renewed".
Renders one narrated scene: CuringExplainer.

Honest to the curing/deployment timeline: each binder sets on its own clock (alginate in minutes,
γ-PGA in hours, calcite ripening over the ~32 h protocol), then months of weathering slowly wear
the crust down — the durable calcite floor stretches out the re-spray interval.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class CuringExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Set, age, renew", "The curing timeline", accent=EMERALD)
        self.say(
            "Spray the crust, and it does not harden all at once. Each binder sets on its own "
            "clock — and that turns out to be a feature, not a bug.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Timeline axis ----------------------------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.1, 1], x_len=9.0, y_len=3.6).shift(DOWN * 0.2)
        lab = self.axis_labels(ax, "time  (min → hours → months)", "strength", color=MUTED)
        self.play(Create(ax), FadeIn(lab), run_time=0.8)

        # --- 3. Three binders, three clocks --------------------------------
        alg = ax.plot(lambda t: 0.5 * (1 - np.exp(-t / 0.3)) * np.exp(-t / 6.0), x_range=[0, 10], color=ROSE, stroke_width=5)
        pga = ax.plot(lambda t: 0.7 * (1 - np.exp(-t / 1.5)) * np.exp(-t / 9.0), x_range=[0, 10], color=AMBER, stroke_width=5)
        cal = ax.plot(lambda t: 0.95 * (1 - np.exp(-t / 3.2)), x_range=[0, 10], color=EMERALD, stroke_width=6)
        alg_l = Text("alginate — minutes", font_size=18, color=ROSE).to_corner(UL, buff=0.7)
        pga_l = Text("γ-PGA — hours", font_size=18, color=AMBER).next_to(alg_l, DOWN, buff=0.12).align_to(alg_l, LEFT)
        cal_l = Text("calcite — the 32-hour ripen", font_size=18, color=EMERALD).next_to(pga_l, DOWN, buff=0.12).align_to(alg_l, LEFT)

        self.say(
            "Alginate gels in minutes — instant early grip. Gamma-P-G-A firms up over hours. "
            "And the calcite slowly ripens across the full thirty-two-hour protocol.",
            AnimationGroup(Create(alg), FadeIn(alg_l)), hold=0.1,
        )
        self.play(Create(pga), FadeIn(pga_l), run_time=1.2)
        self.play(Create(cal), FadeIn(cal_l), run_time=1.4)

        # --- 4. The fast polymers hand off to durable calcite --------------
        self.say(
            "So the fast polymers carry the crust through its fragile first day, while the durable "
            "calcite takes over as the long-term floor.",
            AnimationGroup(Indicate(alg, color=ROSE, scale_factor=1.02),
                           Indicate(cal, color=EMERALD, scale_factor=1.02)),
            hold=0.5,
        )

        # --- 5. Months of weathering; re-spray -----------------------------
        decay = ax.plot(lambda t: 0.95 * (1 - np.exp(-t / 3.2)) * np.exp(-(max(0, t - 6)) / 12.0),
                        x_range=[0, 10], color=EMERALD, stroke_width=6)
        respray = DashedLine(ax.c2p(8.5, 0), ax.c2p(8.5, 0.9), color=CYAN, stroke_width=3)
        respray_l = Text("re-spray", font_size=18, color=CYAN).next_to(ax.c2p(8.5, 0.9), UP, buff=0.1)
        self.say(
            "Then months of sun and wind slowly wear even the calcite down. Because that floor lasts "
            "longest, it is what sets how long you can wait before spraying again.",
            AnimationGroup(Transform(cal, decay), Create(respray), FadeIn(respray_l)),
            run_time=2.0, hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
