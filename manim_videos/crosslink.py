"""
Cross-linking module explainer — "Why calcium turns goo into gel".
Renders one narrated scene: CrosslinkExplainer.

Honest to the biophysics model: divalent Ca²⁺ bridges pairs of negatively-charged γ-PGA chains;
a saturating binding curve θ = C/(Kd+C) counts the bridges, and bridge density sets the shear
modulus (rubber-elasticity), i.e. stiffness.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class CrosslinkExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Goo into gel", "Calcium cross-linking", accent=INDIGO)
        self.say(
            "On its own, gamma-P-G-A is a floppy tangle of chains that all carry a negative charge — "
            "so they repel and slide past each other. How do you turn that into a solid?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Two negative chains + a divalent clamp ---------------------
        c1 = Line([-3.2, 0.9, 0], [3.2, 0.9, 0], color=AMBER, stroke_width=6)
        c2 = Line([-3.2, -0.9, 0], [3.2, -0.9, 0], color=AMBER, stroke_width=6)
        minus = VGroup(*[Text("–", font_size=22, color=CYAN).move_to([x, y, 0])
                         for x in np.linspace(-2.6, 2.6, 6) for y in (1.15, -1.15)])
        self.say(
            "Calcium is the answer. Each calcium ion carries two positive charges — so it can grab a "
            "negative site on one chain and a negative site on the next, at the same time.",
            LaggedStart(Create(c1), Create(c2), FadeIn(minus), lag_ratio=0.25), hold=0.3,
        )
        clamp = VGroup()
        for x in np.linspace(-2.2, 2.2, 3):
            ion = Circle(radius=0.22, stroke_color=WHITE, stroke_width=1.5, fill_color=EMERALD, fill_opacity=1).move_to([x, 0, 0])
            il = Text("Ca²⁺", font_size=13, color=BG, weight="BOLD").move_to(ion)
            b1 = Line([x, 0, 0], [x, 0.9, 0], color=EMERALD, stroke_width=3)
            b2 = Line([x, 0, 0], [x, -0.9, 0], color=EMERALD, stroke_width=3)
            clamp.add(VGroup(b1, b2, ion, il))
        self.say(
            "Each ion clamps two chains together into a bridge.",
            LaggedStart(*[GrowFromCenter(c) for c in clamp], lag_ratio=0.25), hold=0.3,
        )

        # --- 3. The binding curve counts the bridges -----------------------
        self.smooth_clear(run_time=0.8)
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.1, 1], x_len=6.0, y_len=3.2).shift(LEFT * 2.6 + DOWN * 0.2)
        lab = self.axis_labels(ax, "calcium →", "bridges", color=MUTED)
        Kd = 3.0
        curve = ax.plot(lambda C: C / (Kd + C), x_range=[0, 10], color=CYAN, stroke_width=6)
        eq = self.eqn("θ = C / (Kd + C)", color=CYAN, size=26).next_to(ax, UP, buff=0.3)
        self.say(
            "How many bridges form? A binding curve tells us: as calcium rises, more sites get "
            "clamped, until the chains are saturated and it levels off.",
            AnimationGroup(Create(ax), FadeIn(lab), Write(eq)), hold=0.3,
        )
        self.play(Create(curve), run_time=1.6, rate_func=smooth)

        # --- 4. Bridges -> stiffness ---------------------------------------
        axis = Line(DOWN * 1.4, UP * 1.6, color=MUTED).to_edge(RIGHT, buff=1.8)
        bar = Rectangle(width=0.7, height=0.4, fill_color=INDIGO, fill_opacity=0.9, stroke_width=0)
        bar.move_to(axis.get_bottom(), aligned_edge=DOWN)
        blab = Text("stiffness (G)", font_size=20, color=INDIGO).next_to(axis, UP, buff=0.15)
        self.say(
            "And bridge count is what sets stiffness. More clamps means a denser network — and a "
            "denser network is a stiffer, stronger gel.",
            AnimationGroup(Create(axis), FadeIn(bar), FadeIn(blab)), hold=0.2,
        )
        dot = Dot(color=AMBER).move_to(ax.c2p(0.4, 0.4 / (Kd + 0.4)))
        self.add(dot)
        self.play(
            MoveAlongPath(dot, curve),
            bar.animate.stretch_to_fit_height(2.7).move_to(axis.get_bottom(), aligned_edge=DOWN),
            run_time=2.2, rate_func=smooth,
        )

        # --- 5. Payoff ------------------------------------------------------
        self.say(
            "So the whole story is: count the calcium clamps, and that number becomes the stiffness "
            "the crust brings to the sand.",
            Flash(bar.get_top(), color=INDIGO, line_length=0.4, num_lines=16, flash_radius=0.9),
            hold=0.5,
        )
        self.wait(0.3)
        self.smooth_clear()
