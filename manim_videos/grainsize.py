"""
Grain-size module explainer — "No single glue fits every grain".
Renders one narrated scene: GrainsizeExplainer.

Honest to the coverage model: each binder has a grain-size band it holds well (cementing =
fine-to-medium; γ-PGA and alginate cover the coarse / ultra-fine ends cementing misses). Overlap
the three bands and the whole size distribution is covered.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class GrainsizeExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("No one glue fits all", "Grain-size coverage", accent=TEAL)
        self.say(
            "Desert sand is not one size — it is a whole mixture of grains, from dust to gravel. "
            "And no single binder holds all of them.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Axis of grain size -----------------------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.2, 1], x_len=9.5, y_len=3.2).shift(DOWN * 0.3)
        xlab = Text("grain size  →  (fine … coarse)", font_size=22, color=MUTED).next_to(ax.x_axis, DOWN, buff=0.3)
        ylab = Text("held?", font_size=20, color=MUTED).next_to(ax.y_axis, UP, buff=0.15)
        self.play(Create(ax), FadeIn(xlab), FadeIn(ylab), run_time=0.9)

        def band(centre, width, color):
            return ax.plot(lambda x: np.exp(-((x - centre) ** 2) / (2 * width ** 2)),
                           x_range=[0.2, 9.8], color=color, stroke_width=5)

        # --- 3. Cementing covers the middle --------------------------------
        cement = band(5.2, 1.6, EMERALD)
        cement_l = Text("CaCO₃ cementing — fine-to-medium", font_size=20, color=EMERALD).to_edge(UP, buff=0.7)
        self.say(
            "Cementing — growing calcium carbonate — is superb on fine-to-medium grains. But it "
            "struggles on the very coarse ones and the very finest dust.",
            AnimationGroup(Create(cement), FadeIn(cement_l)), hold=0.4,
        )
        gap_l = VGroup(
            Text("gaps", font_size=18, color=ROSE).move_to(ax.c2p(1.2, 0.5)),
            Text("gaps", font_size=18, color=ROSE).move_to(ax.c2p(8.8, 0.5)),
        )
        self.play(FadeIn(gap_l), run_time=0.6)

        # --- 4. γ-PGA + alginate cover the ends ----------------------------
        pga = band(8.4, 1.4, AMBER)
        pga_l = Text("γ-PGA — coarse grains", font_size=18, color=AMBER)
        alg = band(1.6, 1.3, ROSE)
        alg_l = Text("alginate — ultra-fine", font_size=18, color=ROSE)
        pga_l.next_to(cement_l, DOWN, buff=0.15).align_to(cement_l, LEFT)
        alg_l.next_to(pga_l, DOWN, buff=0.1).align_to(cement_l, LEFT)
        self.say(
            "This is where the other two prongs earn their place. The sticky gamma-P-G-A polymer "
            "grips the coarse grains, and the alginate gel catches the ultra-fine ones.",
            AnimationGroup(FadeOut(gap_l), Create(pga), FadeIn(pga_l),
                           Create(alg), FadeIn(alg_l)),
            hold=0.5,
        )

        # --- 5. Overlap = full coverage ------------------------------------
        combined = ax.plot(
            lambda x: min(1.0, np.exp(-((x - 5.2) ** 2) / (2 * 1.6 ** 2))
                          + np.exp(-((x - 8.4) ** 2) / (2 * 1.4 ** 2))
                          + np.exp(-((x - 1.6) ** 2) / (2 * 1.3 ** 2))),
            x_range=[0.2, 9.8], color=CYAN, stroke_width=6,
        )
        fill = ax.get_area(combined, x_range=[0.2, 9.8], color=CYAN, opacity=0.18)
        self.say(
            "Overlap all three and every grain size is held by at least one mechanism. That total "
            "coverage — not any single binder — is the whole point of using three prongs.",
            AnimationGroup(Create(combined), FadeIn(fill),
                           *[m.animate.set_stroke(opacity=0.35) for m in (cement, pga, alg)]),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
