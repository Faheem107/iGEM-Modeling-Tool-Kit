"""
Composite module explainer — "Why three prongs beat one".
Renders one narrated scene: CompositeExplainer.
"""

from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


def pillar(label, color, height, x):
    bar = Rectangle(width=1.3, height=height, fill_color=color, fill_opacity=0.85, stroke_color=color, stroke_width=2)
    bar.move_to([x, -2.2 + height / 2, 0])
    lab = Text(label, font_size=20, color=INK, weight="BOLD").next_to(bar, UP, buff=0.2)
    return VGroup(bar, lab), bar


class CompositeExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Why three beat one", "Composite strength", accent=FUCHSIA)
        self.say(
            "We have three ways to hold sand together. The obvious question: if we combine them, "
            "do the strengths just add up?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.play(FadeOut(g), run_time=0.6)

        # --- 2. Three prongs -----------------------------------------------
        p1, b1 = pillar("γ-PGA", AMBER, 1.7, -3.6)
        p2, b2 = pillar("CaCO₃", EMERALD, 2.2, -1.2)
        p3, b3 = pillar("Alginate", ROSE, 1.4, 1.2)
        prongs = VGroup(p1, p2, p3)
        self.say(
            "A sticky bio-polymer, cement grown from carbon dioxide, and a seaweed gel. Each adds "
            "its own cohesion to the crust.",
            LaggedStart(GrowFromEdge(b1, DOWN), Write(p1[1]),
                        GrowFromEdge(b2, DOWN), Write(p2[1]),
                        GrowFromEdge(b3, DOWN), Write(p3[1]), lag_ratio=0.3),
            hold=0.4,
        )

        naive = DashedLine([-4.3, 3.1, 0], [2.0, 3.1, 0], color=MUTED, stroke_width=3)
        naive_lab = Text("naïve sum", font_size=18, color=MUTED).next_to(naive, RIGHT, buff=0.2)
        self.say(
            "Naively you would just stack them. But three real effects bend that answer.",
            AnimationGroup(Create(naive), FadeIn(naive_lab)), hold=0.4,
        )

        # --- 3. Competition: shared calcium (tug of war) --------------------
        self.play(FadeOut(naive), FadeOut(naive_lab), run_time=0.4)
        ca = Text("Ca²⁺", font_size=26, color=CYAN, weight="BOLD").move_to(UP * 2.6)
        arrows = VGroup(
            Arrow(ca.get_bottom(), b1.get_top(), color=CYAN, stroke_width=4, buff=0.15),
            Arrow(ca.get_bottom(), b2.get_top(), color=CYAN, stroke_width=4, buff=0.15),
            Arrow(ca.get_bottom(), b3.get_top(), color=CYAN, stroke_width=4, buff=0.15),
        )
        self.say(
            "First, competition. All three fight over the same calcium — and the cement is the "
            "greediest sink, so it starves the polymers a little.",
            AnimationGroup(FadeIn(ca), LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.2)),
            hold=0.4,
        )
        self.play(
            b1.animate.stretch_to_fit_height(1.4).move_to([-3.6, -2.2 + 0.7, 0], aligned_edge=DOWN),
            b3.animate.stretch_to_fit_height(1.15).move_to([1.2, -2.2 + 0.575, 0], aligned_edge=DOWN),
            arrows[1].animate.set_stroke(width=8),
            run_time=1.2,
        )
        self.play(FadeOut(ca), FadeOut(arrows), run_time=0.5)

        # --- 4. Burden: shared cell budget ----------------------------------
        self.say(
            "Second, burden. When one cell makes two products at once, they share one energy "
            "budget, so each yields a bit less.",
            AnimationGroup(Indicate(b1, color=AMBER, scale_factor=0.95),
                           Indicate(b2, color=EMERALD, scale_factor=0.95)),
            hold=0.4,
        )

        # --- 5. Synergy + redundancy ----------------------------------------
        syn = CurvedArrow(b1.get_top() + UP * 0.1, b2.get_top() + UP * 0.1, color=FUCHSIA, angle=-TAU / 6)
        syn_lab = Text("chemistry helps", font_size=18, color=FUCHSIA).next_to(syn, UP, buff=0.1)
        self.say(
            "Third, synergy. Some pairs help each other — the polymer's acidic groups template better "
            "crystals — so a bonus term is added back.",
            AnimationGroup(Create(syn), FadeIn(syn_lab)), hold=0.4,
        )

        # combined bar
        combined = Rectangle(width=1.5, height=3.4, fill_color=FUCHSIA, fill_opacity=0.9, stroke_color=FUCHSIA, stroke_width=2)
        combined.move_to([3.9, -2.2 + 1.7, 0], aligned_edge=DOWN)
        clab = Text("combined", font_size=20, color=INK, weight="BOLD").next_to(combined, UP, buff=0.2)
        self.say(
            "Add the cooperation, subtract the competition, and the combined crust still comes out "
            "tougher than any single prong.",
            AnimationGroup(FadeOut(syn), FadeOut(syn_lab), GrowFromEdge(combined, DOWN), Write(clab)),
            hold=0.5,
        )

        # --- 6. Redundancy --------------------------------------------------
        self.say(
            "And there is a safety bonus: if a storm defeats one mechanism, the others still hold. "
            "Redundancy is why the team survives conditions that break any soloist.",
            AnimationGroup(
                Flash(combined.get_top(), color=FUCHSIA, line_length=0.4, num_lines=18, flash_radius=1.0),
                Indicate(combined, color=FUCHSIA, scale_factor=1.06),
            ),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
