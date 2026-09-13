"""
Economic module explainer: "Does it actually pencil out?".
Renders one narrated scene: EconomicExplainer.

Honest to src/lib/physics/economic.ts. Two engineered prongs share one bioprocess
capex; cost per hectare is capex spread over the treated area plus a recurring
term, so it starts high on a small plot and falls as the area grows, crossing the
flat chemical-spray baseline (~2800 USD/ha) at a few tens of hectares. Concrete
matting (~300,000 USD/ha) is a permanent surface, shown for scale. The CO2 credit
is real but a few dollars a hectare, so it barely moves the crossover: the tonnage
is the result, not the money. Alginate is not a deployed prong.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class EconomicExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Does it pencil out?", "Cost & scalability", accent=AMBER)
        self.say(
            "A good crust is worthless if nobody can afford it. So we build the cost from the "
            "ground up, and ask a blunt question. Is it cheaper than what people use today?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Bottom-up cost stack ---------------------------------------
        items = [("γ-PGA fermentation", AMBER), ("cementing feedstock + enzyme", EMERALD),
                 ("one shared bioprocess setup", TEAL)]
        stack = VGroup()
        y = 1.4
        for name, color in items:
            row = self.chip(name, color, width=4.6, height=0.7).move_to([-2.6, y, 0])
            stack.add(row); y -= 0.95
        self.say(
            "Two prongs, one bill. Fermentation for the polymer, feedstock and enzyme for the "
            "cementing, and a single fermentation setup shared between them.",
            LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in stack], lag_ratio=0.3), hold=0.4,
        )

        # --- 3. Cost per hectare vs treated area ---------------------------
        self.smooth_clear(run_time=0.8)
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 10, 1], x_len=8.2, y_len=4.0).shift(DOWN * 0.2 + LEFT * 0.2)
        lab = self.axis_labels(ax, "treated area →", "cost per hectare", color=MUTED)
        # Flat chemical baseline; biological crust = capex/area + recurring (falls with area).
        chem = DashedLine(ax.c2p(0, 5.2), ax.c2p(10, 5.2), color=ROSE, stroke_width=4)
        chem_l = Text("chemical spray (flat per hectare)", font_size=18, color=ROSE).to_corner(UR, buff=0.6)
        bio = ax.plot(lambda a: 2.4 + 8.0 / (a + 0.9), x_range=[0.3, 10], color=TEAL, stroke_width=6)
        bio_l = Text("biological crust", font_size=18, color=TEAL).next_to(chem_l, DOWN, buff=0.12).align_to(chem_l, LEFT)
        self.say(
            "Now plot cost per hectare against the area you treat. Chemical spray is a flat rate, "
            "you pay it on every hectare. Our crust carries an upfront setup, so on a tiny plot it "
            "is expensive, but that cost spreads out as the treated area grows.",
            AnimationGroup(Create(ax), FadeIn(lab)), hold=0.1,
        )
        self.play(Create(chem), FadeIn(chem_l), run_time=1.0)
        self.play(Create(bio), FadeIn(bio_l), run_time=1.4)

        # crossover: 2.4 + 8/(a+0.9) = 5.2 -> a = 8/2.8 - 0.9 ≈ 1.96
        ax_c = 8.0 / 2.8 - 0.9
        cross = Dot(color=AMBER, radius=0.12).move_to(ax.c2p(ax_c, 5.2))
        cross_l = Text("break-even area", font_size=20, color=AMBER).next_to(cross, UP, buff=0.25)
        self.say(
            "Past a break-even of a few tens of hectares, the biological crust is simply the "
            "cheaper option, and it keeps getting cheaper on larger sites.",
            AnimationGroup(GrowFromCenter(cross), FadeIn(cross_l),
                           Flash(cross.get_center(), color=AMBER, line_length=0.3, num_lines=14, flash_radius=0.6)),
            hold=0.5,
        )

        # --- 4. Concrete for scale, and the honest CO2 note ----------------
        conc = Arrow(ax.c2p(9.2, 8.8), ax.c2p(9.2, 9.9), color=MUTED, stroke_width=5, buff=0)
        conc_l = Text("concrete matting: far off the top", font_size=16, color=MUTED).next_to(ax.c2p(9.2, 8.8), DOWN, buff=0.1)
        self.say(
            "Concrete matting sits far above the top of this chart. It is a permanent surface, not "
            "a treatment, and it is here only for scale.",
            AnimationGroup(GrowArrow(conc), FadeIn(conc_l)), hold=0.4,
        )
        note = Text("CO₂ credit ≈ a few $/ha: real, but not what pays for the crust",
                    font_size=17, color=EMERALD).to_edge(DOWN, buff=0.5)
        self.say(
            "And an honest note on carbon. The cementing does lock away carbon dioxide, but the "
            "credit is worth only a few dollars a hectare, against a cost over a thousand. So the "
            "captured tonnage is the result to report, not something that pays for the crust.",
            FadeIn(note, shift=UP * 0.2), hold=0.6,
        )
        self.wait(0.3)
        self.smooth_clear()
