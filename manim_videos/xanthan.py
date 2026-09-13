"""
Xanthan-flow module explainer: "Thick until it moves".
Renders one narrated scene: XanthanExplainer.

Honest to src/lib/xanthanFlow.ts. Xanthan gum is a power-law (Ostwald-de Waele)
fluid, shear stress = K x (strain rate)^n, with n well below one, so it is
shear-thinning. Laminar tube flow uses the generalized Hagen-Poiseuille law to
get the pressure needed for a given flow. Diluting raises n toward one and lowers
K, so it thins. This is one straight, smooth, isothermal tube in laminar flow;
bends, fittings and temperature changes are not modelled.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class XanthanExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Thick until it moves", "Xanthan gum flow", accent=TEAL)
        self.say(
            "Xanthan gum is the thickener that carries a lot of what we spray. So a fair question "
            "is, how hard is it to push through a tube?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Shear-thinning law -----------------------------------------
        law = self.eqn("τ  =  K · (γ̇)ⁿ", color=INK, size=44).move_to(UP * 1.4)
        nlab = Text("n ≈ 0.25   (well below 1 → shear-thinning)", font_size=24, color=AMBER).next_to(law, DOWN, buff=0.5)
        self.say(
            "Its behaviour is one line. Shear stress equals a constant K times the strain rate "
            "raised to a power n. For xanthan n is about a quarter, well below one, and that is "
            "what makes it shear-thinning.",
            AnimationGroup(Write(law), FadeIn(nlab)), hold=0.4,
        )
        self.say(
            "In plain terms, the faster you push it, the thinner it gets. At rest it is thick, so "
            "it does not drip or run off. Under pressure it flows freely.",
            Indicate(nlab, color=AMBER, scale_factor=1.03), hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 3. Tube flow: generalized Hagen-Poiseuille --------------------
        tube = RoundedRectangle(corner_radius=0.25, width=7.5, height=1.1, stroke_color=MUTED, stroke_width=3).move_to(UP * 1.2)
        tlab = Text("straight tube:  D = 1 cm,  L = 15 cm", font_size=20, color=MUTED).next_to(tube, DOWN, buff=0.3)
        pin = Arrow(tube.get_left() + LEFT * 0.8, tube.get_left(), color=CYAN, stroke_width=6, buff=0)
        pin_l = Text("ΔP", font_size=24, color=CYAN).next_to(pin, UP, buff=0.1)
        flow = Arrow(tube.get_right(), tube.get_right() + RIGHT * 0.8, color=TEAL, stroke_width=6, buff=0)
        flow_l = Text("flow Q", font_size=22, color=TEAL).next_to(flow, UP, buff=0.1)
        self.say(
            "Put that law into steady laminar flow down a straight tube, and you get the "
            "generalized Hagen-Poiseuille result. It ties the pressure you apply at one end to the "
            "flow you get out the other.",
            AnimationGroup(Create(tube), FadeIn(tlab)), hold=0.1,
        )
        self.play(GrowArrow(pin), FadeIn(pin_l), GrowArrow(flow), FadeIn(flow_l), run_time=1.0)
        hp = self.eqn("Q  =  (πnR³ / (3n+1)) · (ΔP·R / 2KL)^(1/n)", color=INK, size=28).move_to(DOWN * 1.6)
        self.say(
            "That is the equation the page solves, forwards and backwards, so it can report either "
            "the flow for a given push or the push needed for a given flow.",
            Write(hp), hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 4. Dilution ---------------------------------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 10, 1], x_len=8.0, y_len=3.4).shift(DOWN * 0.2)
        lab = self.axis_labels(ax, "flow speed →", "pressure needed", color=MUTED)
        conc = ax.plot(lambda v: 0.9 + 2.6 * v ** 0.25, x_range=[0, 10], color=TEAL, stroke_width=6)
        dil = ax.plot(lambda v: 0.3 + 0.55 * v, x_range=[0, 10], color=CYAN, stroke_width=6)
        conc_l = Text("undiluted xanthan", font_size=18, color=TEAL).to_corner(UR, buff=0.7)
        dil_l = Text("diluted → n → 1, thinner", font_size=18, color=CYAN).next_to(conc_l, DOWN, buff=0.12).align_to(conc_l, LEFT)
        self.say(
            "Water it down and the exponent n climbs back toward one, so it behaves more like plain "
            "water, and the consistency K drops. Both mean it thins out and needs far less pressure "
            "to move.",
            AnimationGroup(Create(ax), FadeIn(lab), Create(conc), FadeIn(conc_l)), hold=0.1,
        )
        self.play(Create(dil), FadeIn(dil_l), run_time=1.2)
        self.smooth_clear(run_time=0.7)

        # --- 5. Limit ------------------------------------------------------
        lim = Text("One straight, smooth, isothermal tube, laminar flow", font_size=24, color=AMBER, weight="BOLD").move_to([0, 0.7, 0])
        lim2 = Text("no bends, no fittings, no temperature swings",
                    font_size=21, color=MUTED).next_to(lim, DOWN, buff=0.3)
        self.say(
            "Two honest limits. Every number on the page comes straight from these equations, so it "
            "cannot drift from the model. But it is one straight, smooth, isothermal tube in laminar "
            "flow. Real delivery has bends, fittings and temperature swings this does not capture.",
            AnimationGroup(FadeIn(lim, shift=UP * 0.2), FadeIn(lim2, shift=UP * 0.2)),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
