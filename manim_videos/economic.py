"""
Economic module explainer — "Does it actually pencil out?".
Renders one narrated scene: EconomicExplainer.

Honest to the scalability engine: costs are built bottom-up per prong (γ-PGA fermentation,
cementing feedstock + enzyme, purchased alginate) and compared against conventional sprays /
concrete matting. The crossover area is where the biological option becomes the cheaper one —
and the CO₂ captured by cementing shifts that crossover in our favour.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class EconomicExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Does it pencil out?", "Cost & scalability", accent=AMBER)
        self.say(
            "A beautiful crust is worthless if nobody can afford it. So we build the cost from the "
            "ground up, and ask a blunt question — is it cheaper than what people use today?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Bottom-up cost stack ---------------------------------------
        items = [("γ-PGA fermentation", AMBER), ("cementing feedstock + enzyme", EMERALD), ("purchased alginate", ROSE)]
        stack = VGroup()
        y = 1.4
        for name, color in items:
            row = self.chip(name, color, width=4.2, height=0.7).move_to([-3.0, y, 0])
            stack.add(row); y -= 0.95
        plus = Text("+", font_size=30, color=INK)
        self.say(
            "Each prong has its own bill: fermentation for the polymer, feedstock and enzyme for the "
            "cementing, and alginate we simply buy in.",
            LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in stack], lag_ratio=0.3), hold=0.4,
        )

        # --- 3. Cost vs treated area, with a crossover ---------------------
        self.smooth_clear(run_time=0.8)
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 10, 1], x_len=8.0, y_len=4.0).shift(DOWN * 0.2 + LEFT * 0.2)
        lab = self.axis_labels(ax, "treated area →", "cost", color=MUTED)
        conv = ax.plot(lambda a: 1.0 + 0.85 * a, x_range=[0, 10], color=ROSE, stroke_width=6)
        bio = ax.plot(lambda a: 3.6 + 0.30 * a, x_range=[0, 10], color=TEAL, stroke_width=6)
        conv_l = Text("conventional spray / matting", font_size=18, color=ROSE).to_corner(UR, buff=0.7)
        bio_l = Text("biological crust", font_size=18, color=TEAL).next_to(conv_l, DOWN, buff=0.12).align_to(conv_l, LEFT)
        self.say(
            "Now plot cost against the area you treat. Conventional methods start cheap but climb "
            "steeply. Our biological crust starts higher — the setup costs — but grows far more "
            "slowly.",
            AnimationGroup(Create(ax), FadeIn(lab)), hold=0.1,
        )
        self.play(Create(conv), FadeIn(conv_l), run_time=1.2)
        self.play(Create(bio), FadeIn(bio_l), run_time=1.2)

        # crossover point: 1 + 0.85a = 3.6 + 0.30a -> a = 2.6/0.55 ≈ 4.7
        ax_cross = 2.6 / 0.55
        y_cross = 1.0 + 0.85 * ax_cross
        cross = Dot(color=AMBER, radius=0.12).move_to(ax.c2p(ax_cross, y_cross))
        cross_l = Text("crossover", font_size=20, color=AMBER).next_to(cross, UP, buff=0.25)
        self.say(
            "Where the two lines cross is the crossover: beyond that treated area, the biological "
            "option is simply the cheaper one.",
            AnimationGroup(GrowFromCenter(cross), FadeIn(cross_l),
                           Flash(cross.get_center(), color=AMBER, line_length=0.3, num_lines=14, flash_radius=0.6)),
            hold=0.5,
        )

        # --- 4. Carbon credit shifts it earlier ----------------------------
        bio2 = ax.plot(lambda a: 3.6 + 0.18 * a, x_range=[0, 10], color=TEAL, stroke_width=6)
        credit = Text("+ CO₂ captured → crossover moves earlier", font_size=20, color=EMERALD).to_edge(DOWN, buff=0.7)
        self.say(
            "And because the cementing locks away carbon dioxide, the credit for that capture pulls "
            "the crossover earlier still — the crust pays for itself sooner.",
            AnimationGroup(Transform(bio, bio2), FadeIn(credit, shift=UP * 0.2),
                           cross.animate.move_to(ax.c2p(2.6 / 0.67, 1.0 + 0.85 * (2.6 / 0.67)))),
            run_time=2.0, hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
