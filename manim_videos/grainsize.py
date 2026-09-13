"""
Grain-size module explainer: "No single glue fits every grain".
Renders one narrated scene: GrainsizeExplainer.

Honest to src/lib/physics/grainsize.ts. MICP (CaCO3) cements a mid sweet spot near
63 to 125 microns and fails on the finest sand (cells cannot penetrate) and the
coarsest (pores too wide to bridge). gamma-PGA gel is strongest on fine and medium
grains and fades on coarse. Together they cover fine through medium; the coarse
tail is where both fade. Two prongs, not three: alginate was dropped.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class GrainsizeExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("No one glue fits all", "Grain-size coverage", accent=TEAL)
        self.say(
            "Desert sand is not one size. It is a mixture of grains, from fine dust to coarse "
            "sand, and no single binder holds all of them.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Axis of grain size -----------------------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.2, 1], x_len=9.5, y_len=3.2).shift(DOWN * 0.3)
        xlab = Text("grain size  (fine … coarse)", font_size=22, color=MUTED).next_to(ax.x_axis, DOWN, buff=0.3)
        ylab = Text("held?", font_size=20, color=MUTED).next_to(ax.y_axis, UP, buff=0.15)
        self.play(Create(ax), FadeIn(xlab), FadeIn(ylab), run_time=0.9)

        def band(fn, color, w=5):
            return ax.plot(fn, x_range=[0.2, 9.8], color=color, stroke_width=w)

        # --- 3. MICP covers the middle -------------------------------------
        # Log-Gaussian sweet spot near the middle, rolled off at the fine end
        # (penetration) so it also fails on the very finest grains.
        micp_fn = lambda x: np.exp(-((x - 4.6) ** 2) / (2 * 1.5 ** 2)) / (1 + np.exp(-(x - 1.8) * 3))
        micp = band(micp_fn, EMERALD, 6)
        micp_l = Text("CaCO₃ cementing", font_size=20, color=EMERALD).to_edge(UP, buff=0.7)
        self.say(
            "Calcium-carbonate cementing is strongest on fine-to-medium grains. But the cells "
            "cannot colonise the very finest sand, and the coarsest grains leave pores too wide "
            "to bridge, so it fades at both ends.",
            AnimationGroup(Create(micp), FadeIn(micp_l)), hold=0.4,
        )

        # --- 4. gamma-PGA holds the fine end -------------------------------
        pga_fn = lambda x: 1 - 1 / (1 + np.exp(-(x - 6.2) * 0.9))
        pga = band(pga_fn, AMBER)
        pga_l = Text("γ-PGA gel", font_size=20, color=AMBER).next_to(micp_l, DOWN, buff=0.15).align_to(micp_l, LEFT)
        gap = Text("finest grains", font_size=16, color=CYAN).move_to(ax.c2p(1.0, 0.55))
        self.say(
            "This is where the sticky gamma-P-G-A gel earns its place. It bridges the fine and "
            "medium grains, and it is strongest exactly where cementing cannot reach, at the fine "
            "end.",
            AnimationGroup(FadeIn(gap), Create(pga), FadeIn(pga_l)), hold=0.4,
        )
        self.play(FadeOut(gap), run_time=0.5)

        # --- 5. Overlap over the real UAE distribution ---------------------
        combined = band(lambda x: min(1.0, micp_fn(x) + pga_fn(x)), CYAN, 6)
        fill = ax.get_area(combined, x_range=[0.2, 7.6], color=CYAN, opacity=0.16)
        self.say(
            "Overlap the two, and fine through medium sand is held by at least one mechanism. "
            "Over the UAE's dune sand, which sits mostly around two hundred microns, about "
            "seven-eighths of the sand mass is bound.",
            AnimationGroup(Create(combined), FadeIn(fill),
                           *[m.animate.set_stroke(opacity=0.35) for m in (micp, pga)]),
            hold=0.5,
        )

        # --- 6. Honest weak point ------------------------------------------
        weak = Text("coarse tail: both fade", font_size=18, color=ROSE).move_to(ax.c2p(9.0, 0.5))
        self.say(
            "The honest weak point is the coarsest tail, where both binders fade at once. A "
            "two-prong crust is a coverage argument, not a claim to hold every grain.",
            AnimationGroup(FadeIn(weak),
                           combined.animate.set_stroke(opacity=0.5)),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
