"""
CA-anchoring module explainer — "Bolting an enzyme to the cell wall".
Renders one narrated scene: CaAnchoringExplainer.

Honest to the surface-display model: display efficiency = product of per-step success
probabilities (export x fold x anchor), and the anchored enzyme accelerates CO2 hydration ~1e6x.
"""

from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class CaAnchoringExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Bolting an enzyme outside", "Surface display", accent=EMERALD)
        self.say(
            "To cement sand quickly, we need the enzyme on the OUTSIDE of the cell, where the "
            "calcium and carbon dioxide are. Getting it there is a relay.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. The cell + membrane ----------------------------------------
        wall = Arc(radius=3.2, start_angle=-PI / 2.4, angle=PI / 1.2, color=TEAL, stroke_width=6)
        wall.to_edge(LEFT, buff=-1.6)
        wall_l = Text("cell wall", font_size=20, color=TEAL).next_to(wall.get_right(), UP, buff=0.3).shift(LEFT * 0.6)
        self.play(Create(wall), FadeIn(wall_l), run_time=0.9)

        # enzyme starts inside
        enz = Circle(radius=0.4, stroke_color=EMERALD, stroke_width=3, fill_color=EMERALD, fill_opacity=0.25)
        enz_l = Text("CA", font_size=20, color=INK, weight="BOLD").move_to(enz)
        enzyme = VGroup(enz, enz_l).move_to([-3.2, -0.2, 0])
        self.play(FadeIn(enzyme, scale=0.6), run_time=0.6)

        # --- 3. Three-step relay, each a partial chance ---------------------
        steps = [
            ("export", 0.9, "push it through the wall"),
            ("fold", 0.85, "fold into the right shape"),
            ("anchor", 0.8, "staple it down"),
        ]
        xs = [-1.2, 1.0, 3.0]
        chips = VGroup()
        probs = VGroup()
        for (name, p, _), x in zip(steps, xs):
            chip = self.chip(name, EMERALD, width=1.9, height=0.8).move_to([x, 1.8, 0])
            pl = Text(f"× {p:.2f}", font_size=24, color=AMBER, weight="BOLD").next_to(chip, DOWN, buff=0.25)
            chips.add(chip); probs.add(pl)

        self.say(
            "First, export the enzyme through the wall. Then it must fold correctly. Then it must be "
            "stapled to the surface. Each step only works part of the time.",
            LaggedStart(*[AnimationGroup(FadeIn(c, shift=DOWN * 0.2), FadeIn(pl))
                          for c, pl in zip(chips, probs)], lag_ratio=0.35),
            hold=0.4,
        )
        # move enzyme along the relay
        for x in xs:
            self.play(enzyme.animate.move_to([x, 0.4, 0]), run_time=0.5)

        # --- 4. Multiply the chances ---------------------------------------
        eq = self.eqn("efficiency = 0.90 × 0.85 × 0.80 ≈ 0.61", color=CYAN, size=26).to_edge(DOWN, buff=1.4)
        self.say(
            "So the fraction that ends up active on the surface is those chances multiplied "
            "together — never all of them, but enough to matter.",
            AnimationGroup(Write(eq),
                           *[Indicate(pl, color=AMBER, scale_factor=1.2) for pl in probs]),
            hold=0.6,
        )

        # --- 5. The payoff: ~million-fold speedup --------------------------
        self.smooth_clear(run_time=0.8)
        co2 = Text("CO₂", font_size=28, color=MUTED, weight="BOLD").to_edge(LEFT, buff=2.0)
        arrow = Arrow(LEFT * 2.0, RIGHT * 1.5, color=EMERALD, stroke_width=7, buff=0.4)
        carb = Text("HCO₃⁻", font_size=28, color=EMERALD, weight="BOLD").to_edge(RIGHT, buff=2.4)
        speed = self.eqn("≈ 1,000,000 × faster", color=AMBER, size=32).next_to(arrow, UP, buff=0.5)
        enz2 = self.chip("carbonic anhydrase", EMERALD, width=3.4).next_to(arrow, DOWN, buff=0.5)
        self.say(
            "Why go to all this trouble? Because carbonic anhydrase speeds the key reaction — carbon "
            "dioxide into bicarbonate — about a million-fold. On the surface, that is where the "
            "cementing happens.",
            LaggedStart(FadeIn(co2), GrowArrow(arrow), FadeIn(carb),
                        FadeIn(enz2, shift=UP * 0.2), Write(speed), lag_ratio=0.3),
            hold=0.6,
        )
        self.play(Flash(arrow.get_center(), color=AMBER, line_length=0.4, num_lines=16, flash_radius=1.0), run_time=1.0)
        self.wait(0.3)
        self.smooth_clear()
