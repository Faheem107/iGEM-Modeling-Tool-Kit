"""
Thermal module explainer — "Why heat can switch a protein off".
Renders one narrated scene: ThermalExplainer.

Honest to the two-state model: folded fraction follows a sigmoid in temperature that collapses
past the melting point Tm; that folded fraction is the "how alive is the enzyme" dial gating
every downstream rate.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


def folded_glyph(color=TEAL):
    v = VMobject(stroke_color=color, stroke_width=6)
    v.set_points_smoothly([[-0.6, 0, 0], [-0.2, 0.6, 0], [0.2, -0.5, 0], [0.6, 0.5, 0], [0.9, -0.1, 0]])
    return v


class ThermalExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Heat switches it off", "Protein thermal stability", accent=ROSE)
        self.say(
            "An enzyme only works when it is folded into exactly the right shape. So what happens "
            "when the desert heats up?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Tug of war: order vs disorder ------------------------------
        folded = folded_glyph(TEAL).scale(1.6).to_edge(LEFT, buff=2.0)
        flab = Text("folded — active", font_size=20, color=TEAL).next_to(folded, DOWN, buff=0.4)
        unfolded = VMobject(stroke_color=ROSE, stroke_width=5)
        unfolded.set_points_as_corners([[-0.9, 0.3, 0], [-0.4, -0.4, 0], [0.1, 0.5, 0], [0.5, -0.3, 0], [1.0, 0.4, 0], [1.4, -0.2, 0]])
        unfolded.scale(1.2).to_edge(RIGHT, buff=2.0)
        ulab = Text("unfolded — dead", font_size=20, color=ROSE).next_to(unfolded, DOWN, buff=0.4)
        arrow = Arrow(folded.get_right() + RIGHT * 0.3, unfolded.get_left() + LEFT * 0.3, color=MUTED, stroke_width=4)
        heat = Text("heat", font_size=22, color=AMBER, weight="BOLD").next_to(arrow, UP, buff=0.2)
        self.say(
            "Folding is a tug of war between order and disorder. Add heat, and the disorder wins — "
            "the chain shakes loose and falls apart into a useless tangle.",
            LaggedStart(Create(folded), FadeIn(flab),
                        GrowArrow(arrow), FadeIn(heat),
                        Create(unfolded), FadeIn(ulab), lag_ratio=0.3),
            hold=0.5,
        )

        # --- 3. The melting curve ------------------------------------------
        self.smooth_clear(run_time=0.8)
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 1.1, 1], x_len=7.5, y_len=3.6).shift(DOWN * 0.2)
        lab = self.axis_labels(ax, "temperature →", "folded", color=MUTED)
        Tm, k = 6.0, 1.6
        curve = ax.plot(lambda T: 1 / (1 + np.exp((T - Tm) * k)), x_range=[0, 10], color=CYAN, stroke_width=6)
        self.say(
            "We track the folded fraction as temperature climbs. It holds steady while the protein "
            "is comfortable — then, past a melting point, it collapses.",
            AnimationGroup(Create(ax), FadeIn(lab)), hold=0.2,
        )
        self.play(Create(curve), run_time=1.8, rate_func=smooth)

        tm_line = DashedLine(ax.c2p(Tm, 0), ax.c2p(Tm, 0.55), color=ROSE, stroke_width=3)
        tm_lab = Text("Tm — melting point", font_size=20, color=ROSE).next_to(ax.c2p(Tm, 0), DOWN, buff=0.3)
        self.say(
            "That tipping point is the melting temperature. Cross it, and half the enzyme is already "
            "gone.",
            AnimationGroup(Create(tm_line), FadeIn(tm_lab),
                          Flash(ax.c2p(Tm, 0.5), color=ROSE, line_length=0.3, num_lines=14, flash_radius=0.6)),
            hold=0.5,
        )

        # --- 4. It gates everything downstream -----------------------------
        gate = self.eqn("folded fraction  ×  every downstream rate", color=AMBER, size=24).to_edge(UP, buff=0.7)
        self.say(
            "This single dial gates the whole toolkit: whatever fraction stays folded is the fraction "
            "of enzyme still doing chemistry. Lose it, and every downstream rate falls with it.",
            Write(gate), hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
