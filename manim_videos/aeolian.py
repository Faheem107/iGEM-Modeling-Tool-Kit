"""
Aeolian module explainer — "What it takes to stop sand from blowing".
Renders one narrated scene: AeolianExplainer.

Honest to the aeolian model: below a threshold friction velocity nothing moves; above it, saltation
flux grows ~ as the cube of wind speed (Bagnold/Owen). Inter-grain cohesion raises that threshold,
so the treated surface stays put under winds that used to strip it.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class AeolianExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Stopping the sand", "Wind erosion threshold", accent=CYAN)
        self.say(
            "Wind does not move sand gently and gradually. Below a certain strength, nothing "
            "happens at all. Just above it, the sand erupts.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Flux vs wind speed, with a hard threshold ------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 10, 1], x_len=8.0, y_len=4.0).shift(DOWN * 0.3 + LEFT * 0.3)
        lab = self.axis_labels(ax, "wind speed →", "sand moved", color=MUTED)
        u0 = 3.5

        def flux(u, thr):
            return 0.0 if u <= thr else min(9.8, 0.16 * (u - thr) * (u ** 2))

        bare = ax.plot(lambda u: flux(u, u0), x_range=[0, 10, 0.05], color=ROSE, stroke_width=6, use_smoothing=False)
        thr_line = DashedLine(ax.c2p(u0, 0), ax.c2p(u0, 9.5), color=ROSE, stroke_width=3)
        thr_lab = Text("threshold", font_size=20, color=ROSE).next_to(ax.c2p(u0, 9.5), UP, buff=0.1)
        self.say(
            "Here is bare sand. Below the threshold, the curve is flat — dead calm on the ground. "
            "Above it, transport explodes as roughly the cube of the wind speed.",
            AnimationGroup(Create(ax), FadeIn(lab)), hold=0.2,
        )
        self.play(Create(thr_line), FadeIn(thr_lab), run_time=0.6)
        self.play(Create(bare), run_time=1.8, rate_func=linear)

        # --- 3. Crust raises the threshold ---------------------------------
        u1 = 6.2
        crust = ax.plot(lambda u: flux(u, u1), x_range=[0, 10, 0.05], color=TEAL, stroke_width=6, use_smoothing=False)
        thr_line2 = DashedLine(ax.c2p(u1, 0), ax.c2p(u1, 9.5), color=TEAL, stroke_width=3)
        thr_lab2 = Text("with crust", font_size=20, color=TEAL).next_to(ax.c2p(u1, 9.5), UP, buff=0.1)
        self.say(
            "Now add our living crust. The stickiness between grains means the wind has to blow much "
            "harder before anything lifts — the whole threshold slides to the right.",
            AnimationGroup(Create(crust), Create(thr_line2), FadeIn(thr_lab2)), hold=0.4,
        )

        # --- 4. Same wind, now harmless ------------------------------------
        wind_x = 5.0
        wind_line = DashedLine(ax.c2p(wind_x, 0), ax.c2p(wind_x, 9.5), color=AMBER, stroke_width=3)
        wind_lab = Text("today's wind", font_size=18, color=AMBER).next_to(ax.c2p(wind_x, 9.5), UP, buff=0.1)
        d_bare = Dot(color=ROSE, radius=0.11).move_to(ax.c2p(wind_x, flux(wind_x, u0)))
        d_crust = Dot(color=TEAL, radius=0.11).move_to(ax.c2p(wind_x, flux(wind_x, u1)))
        self.say(
            "Take a wind that used to strip the bare surface. On the treated sand, that exact same "
            "wind now sits below threshold — it slides harmlessly over the top.",
            AnimationGroup(Create(wind_line), FadeIn(wind_lab), GrowFromCenter(d_bare), GrowFromCenter(d_crust)),
            hold=0.4,
        )
        self.play(Indicate(d_bare, color=ROSE, scale_factor=1.6),
                  Indicate(d_crust, color=TEAL, scale_factor=1.6), run_time=1.0)

        # --- 5. Payoff ------------------------------------------------------
        self.say(
            "Raise the threshold above the winds a site actually sees, and the dust simply stops "
            "flying. That is the whole goal of the crust.",
            Flash(d_crust.get_center(), color=TEAL, line_length=0.35, num_lines=14, flash_radius=0.7),
            hold=0.5,
        )
        self.wait(0.3)
        self.smooth_clear()
