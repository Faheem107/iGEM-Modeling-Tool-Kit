"""
Composite module explainer: "Why two prongs beat one".
Renders one narrated scene: CompositeExplainer.

Honest to src/lib/physics/composite.ts and interactions.ts for the two engineered
prongs (gamma-PGA and CaCO3). Three effects bend the naive sum: shared-calcium
competition hits gamma-PGA hardest because calcite is the high-affinity sink;
co-expression burden lowers both titres; gamma-PGA carboxylates template calcite,
a real synergy. Redundancy across failure scenarios is the resilience argument.
Alginate was dropped and is not a prong here.
"""

from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


def pillar(label, color, height, x):
    bar = Rectangle(width=1.4, height=height, fill_color=color, fill_opacity=0.85, stroke_color=color, stroke_width=2)
    bar.move_to([x, -2.2 + height / 2, 0])
    lab = Text(label, font_size=20, color=INK, weight="BOLD").next_to(bar, UP, buff=0.2)
    return VGroup(bar, lab), bar


class CompositeExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Why two beat one", "Composite strength", accent=FUCHSIA)
        self.say(
            "We have two engineered ways to hold sand together. The obvious question, if we run "
            "both in one crust, do the strengths simply add up?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.play(FadeOut(g), run_time=0.6)

        # --- 2. Two prongs -------------------------------------------------
        p1, b1 = pillar("γ-PGA", AMBER, 1.7, -3.0)
        p2, b2 = pillar("CaCO₃", EMERALD, 2.2, -0.4)
        self.say(
            "A sticky bio-polymer, and cement grown from carbon dioxide. Each adds its own "
            "cohesion between the grains.",
            LaggedStart(GrowFromEdge(b1, DOWN), Write(p1[1]),
                        GrowFromEdge(b2, DOWN), Write(p2[1]), lag_ratio=0.3),
            hold=0.4,
        )
        naive = DashedLine([-3.7, 3.1, 0], [0.4, 3.1, 0], color=MUTED, stroke_width=3)
        naive_lab = Text("naïve sum", font_size=18, color=MUTED).next_to(naive, RIGHT, buff=0.2)
        self.say(
            "Naively you just stack them. But three real effects bend that answer.",
            AnimationGroup(Create(naive), FadeIn(naive_lab)), hold=0.4,
        )

        # --- 3. Competition: shared calcium --------------------------------
        self.play(FadeOut(naive), FadeOut(naive_lab), run_time=0.4)
        ca = Text("Ca²⁺", font_size=26, color=CYAN, weight="BOLD").move_to(UP * 2.6 + LEFT * 1.7)
        arrows = VGroup(
            Arrow(ca.get_bottom(), b1.get_top(), color=CYAN, stroke_width=4, buff=0.15),
            Arrow(ca.get_bottom(), b2.get_top(), color=CYAN, stroke_width=4, buff=0.15),
        )
        self.say(
            "First, competition. Both bind the same soil calcium, but calcite is a high-affinity "
            "sink and out-competes the polymer. So the calcium shortfall costs gamma-P-G-A about "
            "sixty percent of its binding, and the cement almost nothing.",
            AnimationGroup(FadeIn(ca), LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.2)),
            hold=0.4,
        )
        self.play(
            b1.animate.stretch_to_fit_height(0.8).move_to([-3.0, -2.2 + 0.4, 0], aligned_edge=DOWN),
            arrows[1].animate.set_stroke(width=8),
            run_time=1.2,
        )
        self.play(FadeOut(ca), FadeOut(arrows), run_time=0.5)

        # --- 4. Burden: shared cell budget ---------------------------------
        self.say(
            "Second, burden. One cell making both products shares a single energy budget, so each "
            "titre falls to roughly four-fifths of what it reaches alone.",
            AnimationGroup(Indicate(b1, color=AMBER, scale_factor=0.95),
                           Indicate(b2, color=EMERALD, scale_factor=0.95)),
            hold=0.4,
        )

        # --- 5. Synergy ----------------------------------------------------
        syn = CurvedArrow(b1.get_top() + UP * 0.1, b2.get_top() + UP * 0.1, color=FUCHSIA, angle=-TAU / 6)
        syn_lab = Text("acidic groups seed calcite", font_size=18, color=FUCHSIA).next_to(syn, UP, buff=0.1)
        self.say(
            "Third, synergy, and it pushes back the other way. The polymer's acidic groups "
            "organise calcium and seed finer, tougher calcite, so a bonus is added back.",
            AnimationGroup(Create(syn), FadeIn(syn_lab)), hold=0.4,
        )
        combined = Rectangle(width=1.5, height=2.9, fill_color=FUCHSIA, fill_opacity=0.9, stroke_color=FUCHSIA, stroke_width=2)
        combined.move_to([2.9, -2.2 + 1.45, 0], aligned_edge=DOWN)
        clab = Text("combined", font_size=20, color=INK, weight="BOLD").next_to(combined, UP, buff=0.2)
        self.say(
            "Add the synergy, subtract the competition and the burden, and the combined crust "
            "still comes out tougher than either prong on its own.",
            AnimationGroup(FadeOut(syn), FadeOut(syn_lab), GrowFromEdge(combined, DOWN), Write(clab)),
            hold=0.5,
        )

        # --- 6. Redundancy -------------------------------------------------
        self.say(
            "And there is a safety reason to run both. If a rainstorm dissolves the polymer, the "
            "insoluble calcite still holds. Two prongs fail in different ways, so together they "
            "survive conditions that break either one alone.",
            AnimationGroup(
                Flash(combined.get_top(), color=FUCHSIA, line_length=0.4, num_lines=18, flash_radius=1.0),
                Indicate(combined, color=FUCHSIA, scale_factor=1.06),
            ),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
