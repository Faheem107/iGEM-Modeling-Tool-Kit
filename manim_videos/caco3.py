"""
CaCO3 module explainer — "Turning CO2 and calcium into rock".
Renders one narrated scene: Caco3Explainer.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, GRID


O_RED = "#f87171"
C_GRAY = "#9ca3af"


def atom(sym, color, r=0.28):
    c = Circle(radius=r, stroke_color=WHITE, stroke_width=1.5, fill_color=color, fill_opacity=1.0)
    t = Text(sym, font_size=18, color=BG, weight="BOLD").move_to(c)
    return VGroup(c, t)


def co2():
    o1, cc, o2 = atom("O", O_RED), atom("C", C_GRAY), atom("O", O_RED)
    o1.move_to(LEFT * 0.7); cc.move_to(ORIGIN); o2.move_to(RIGHT * 0.7)
    b1 = VGroup(Line(LEFT * 0.5 + UP * 0.06, LEFT * 0.2 + UP * 0.06), Line(LEFT * 0.5 + DOWN * 0.06, LEFT * 0.2 + DOWN * 0.06)).set_stroke(MUTED, 3)
    b2 = VGroup(Line(RIGHT * 0.2 + UP * 0.06, RIGHT * 0.5 + UP * 0.06), Line(RIGHT * 0.2 + DOWN * 0.06, RIGHT * 0.5 + DOWN * 0.06)).set_stroke(MUTED, 3)
    return VGroup(b1, b2, o1, cc, o2)


def carbonate():
    cc = atom("C", C_GRAY, r=0.24)
    os = VGroup()
    bonds = VGroup()
    for ang in [90, 210, 330]:
        p = 0.6 * np.array([np.cos(ang * DEGREES), np.sin(ang * DEGREES), 0])
        o = atom("O", O_RED, r=0.22).move_to(p)
        os.add(o)
        bonds.add(Line(ORIGIN, p * 0.62, stroke_color=MUTED, stroke_width=3))
    lab = Text("CO₃²⁻", font_size=20, color=EMERALD, weight="BOLD")
    grp = VGroup(bonds, cc, os)
    lab.next_to(grp, DOWN, buff=0.15)
    return VGroup(grp, lab)


class Caco3Explainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Turning CO₂ into rock", "CaCO₃ biocementation", accent=EMERALD)
        self.say(
            "How do you glue loose desert sand into a solid crust? You grow the glue in place, "
            "out of thin air.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.play(FadeOut(g), run_time=0.6)

        # --- 2. Enzyme grabs CO2 -> carbonate -------------------------------
        molecule = co2().scale(1.1).move_to(LEFT * 3.5)
        enzyme = self.chip("carbonic anhydrase", EMERALD, width=3.4).move_to(UP * 2.2)
        self.say(
            "An engineered enzyme called carbonic anhydrase captures carbon dioxide and, in water, "
            "converts it into carbonate ions.",
            AnimationGroup(FadeIn(molecule, shift=RIGHT * 0.3), FadeIn(enzyme, shift=DOWN * 0.2)),
            hold=0.5,
        )
        carb = carbonate().move_to(LEFT * 3.5)
        arrow = Arrow(LEFT * 2.4, LEFT * 0.9, color=EMERALD, stroke_width=6, buff=0.1)
        self.play(Indicate(enzyme, color=EMERALD, scale_factor=1.08), run_time=0.8)
        self.play(ReplacementTransform(molecule, carb), run_time=1.0)
        self.play(carb.animate.move_to(LEFT * 3.2), GrowArrow(arrow), run_time=0.7)

        # --- 3. Ca2+ meets carbonate ----------------------------------------
        ca = atom("Ca²⁺", AMBER, r=0.4).scale(0.9).move_to(RIGHT * 3.2)
        self.say(
            "Meanwhile the sand supplies calcium. Positive calcium and negative carbonate attract, "
            "and lock together.",
            FadeIn(ca, shift=LEFT * 0.4), hold=0.4,
        )
        unit = VGroup(Text("CaCO₃", font_size=30, color=EMERALD, weight="BOLD")).move_to(RIGHT * 0.6)
        self.play(
            carb.animate.move_to(RIGHT * 0.1),
            ca.animate.move_to(RIGHT * 1.1),
            FadeOut(arrow),
            run_time=1.0,
        )
        self.play(FadeOut(carb), FadeOut(ca), FadeIn(unit, scale=1.3), run_time=0.7)

        # --- 4. Supersaturation -> crystals glue grains ---------------------
        omega = self.eqn("Ω = [Ca²⁺][CO₃²⁻] / Ksp   >  1", color=CYAN, size=24).to_edge(UP, buff=0.7)
        self.say(
            "Once the water is over-saturated — when this ratio climbs above one — the calcium "
            "carbonate can no longer stay dissolved. It crystallises.",
            AnimationGroup(FadeOut(unit), FadeOut(enzyme, shift=UP * 0.3), Write(omega)), hold=0.5,
        )

        grains = VGroup()
        for pos in [[-2.2, -1.0, 0], [-0.6, -1.4, 0], [1.0, -0.9, 0], [2.4, -1.3, 0], [-1.4, 0.1, 0], [0.6, 0.2, 0]]:
            grains.add(Circle(radius=0.55, color="#c8b68f", fill_color="#c8b68f", fill_opacity=0.9, stroke_width=1).move_to(pos))
        self.play(LaggedStart(*[FadeIn(gr, scale=1.2) for gr in grains], lag_ratio=0.15), run_time=1.2)

        # cement bridges between neighbouring grains
        pairs = [(0, 1), (1, 4), (4, 5), (5, 2), (2, 3), (1, 5)]
        bridges = VGroup()
        for i, j in pairs:
            bridges.add(Line(grains[i].get_center(), grains[j].get_center(), stroke_width=10).set_color(EMERALD))
        self.say(
            "The fresh crystals grow at the contact points between grains, bridging them into one "
            "cemented mass.",
            LaggedStart(*[Create(b) for b in bridges], lag_ratio=0.2), hold=0.4,
        )

        # --- 5. The polymorph twist: vaterite -> calcite --------------------
        self.play(
            VGroup(grains, bridges).animate.scale(0.62).to_edge(LEFT, buff=0.8),
            FadeOut(omega),
            run_time=0.9,
        )
        # strength bar
        axis = Line(DOWN * 1.4, UP * 1.6, color=MUTED).move_to(RIGHT * 2.2 + DOWN * 0.0)
        bar = Rectangle(width=0.7, height=0.4, fill_color=ROSE, fill_opacity=0.9, stroke_width=0)
        bar.move_to(axis.get_bottom() + UP * 0.2 + RIGHT * 0.5, aligned_edge=DOWN)
        blab = Text("strength", font_size=20, color=INK).next_to(axis, UP, buff=0.15)
        vlab = Text("vaterite (soft)", font_size=18, color=ROSE).next_to(bar, RIGHT, buff=0.25)
        self.say(
            "But there is a twist most models ignore. This enzyme route does not make hard "
            "limestone right away. It first makes a softer, unstable crystal called vaterite.",
            AnimationGroup(Create(axis), Write(blab), FadeIn(bar), FadeIn(vlab)), hold=0.5,
        )

        clab = Text("calcite (strong)", font_size=18, color=EMERALD).move_to(vlab)
        self.say(
            "Over the following hours vaterite slowly rearranges into strong, durable calcite — so "
            "the crust literally keeps getting harder as it ages.",
            AnimationGroup(
                bar.animate.stretch_to_fit_height(2.6).move_to(axis.get_bottom() + UP * 0.2 + RIGHT * 0.5, aligned_edge=DOWN).set_color(EMERALD),
                bridges.animate.set_color(EMERALD),
                ReplacementTransform(vlab, clab),
            ),
            run_time=2.4, hold=0.4,
        )

        # --- 6. Payoff: CO2 captured ---------------------------------------
        payoff = Text("every unit of crust locks away one CO₂", font_size=24, color=CYAN).to_edge(DOWN, buff=0.6)
        self.say(
            "And because each carbonate came from carbon dioxide, every gram of crust also captures "
            "a little climate co-benefit.",
            FadeIn(payoff, shift=UP * 0.2), hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
