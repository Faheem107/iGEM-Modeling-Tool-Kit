"""
Alginate module explainer — "The egg-box that holds sand together".
Renders one narrated scene: AlginateExplainer.

Honest to the egg-box model: G-blocks pair up and chelate Ca²⁺ (the classic "egg-box" junction),
which sets the gel; the honest caveat is that alginate is water-soluble and rain leaches it.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


def wavy(x0, y0, length=5.0, amp=0.28, n=5, color=ROSE, width=5):
    v = VMobject(stroke_color=color, stroke_width=width)
    pts = []
    for t in np.linspace(0, 1, 60):
        x = x0 + t * length
        y = y0 + amp * np.sin(t * n * TAU)
        pts.append([x, y, 0])
    v.set_points_smoothly(pts)
    return v


class AlginateExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("The egg-box gel", "Alginate + calcium", accent=ROSE)
        self.say(
            "Alginate is a sugar from seaweed. On its own it is just a floppy chain — but add "
            "calcium, and it snaps into a gel. The way it does that has a lovely shape.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Two chains line up -----------------------------------------
        top = wavy(-2.5, 1.1, color=ROSE)
        bot = wavy(-2.5, -1.1, color=ROSE)
        gblk = Text("G-blocks — the buckled stretches", font_size=20, color=ROSE).to_edge(UP, buff=0.7)
        self.say(
            "Certain stretches of the chain, the G-blocks, are buckled — and two of them line up "
            "face to face.",
            LaggedStart(Create(top), Create(bot), FadeIn(gblk), lag_ratio=0.3), hold=0.4,
        )
        self.play(top.animate.shift(DOWN * 0.35), bot.animate.shift(UP * 0.35), run_time=1.0)

        # --- 3. Calcium cradled between them (egg-box) ---------------------
        ca_ions = VGroup()
        for x in np.linspace(-1.8, 1.8, 5):
            ion = Circle(radius=0.2, stroke_color=WHITE, stroke_width=1.5, fill_color=AMBER, fill_opacity=1.0).move_to([x, 0, 0])
            lab = Text("Ca", font_size=14, color=BG, weight="BOLD").move_to(ion)
            ca_ions.add(VGroup(ion, lab))
        eggbox = Text('like eggs in a carton — the "egg-box"', font_size=20, color=AMBER).to_edge(DOWN, buff=0.9)
        self.say(
            "Between them sit calcium ions, each cradled by the buckles above and below — exactly "
            "like eggs nestled in an egg carton. Those junctions lock the gel together.",
            LaggedStart(*[GrowFromCenter(c) for c in ca_ions], lag_ratio=0.15), hold=0.2,
        )
        self.play(FadeIn(eggbox, shift=UP * 0.2), run_time=0.6)
        self.play(Indicate(VGroup(top, bot, ca_ions), color=AMBER, scale_factor=1.03), run_time=1.0)

        # --- 4. It sets into a solid ---------------------------------------
        self.smooth_clear(run_time=0.8)
        gel = VGroup()
        for i in range(4):
            gel.add(wavy(-2.5, 1.2 - i * 0.8, length=5.0, amp=0.22, color=ROSE, width=4))
        junctions = VGroup(*[Dot(radius=0.09, color=AMBER).move_to([x, 0.8 - i * 0.8, 0])
                             for i in range(3) for x in np.linspace(-1.5, 1.5, 4)])
        self.say(
            "Repeat that junction many times over and the floppy solution becomes a springy, "
            "load-bearing solid that grips the sand grains.",
            LaggedStart(*[Create(w) for w in gel], *[GrowFromCenter(j) for j in junctions], lag_ratio=0.06),
            hold=0.5,
        )

        # --- 5. The honest caveat: water-soluble ---------------------------
        caveat = Text("but alginate is water-soluble", font_size=26, color=CYAN, weight="BOLD").to_edge(UP, buff=0.7)
        drops = VGroup(*[Line([x, 3.0, 0], [x, 2.4, 0], color=CYAN, stroke_width=4)
                         for x in np.linspace(-3, 3, 9)])
        self.say(
            "There is an honest catch. Alginate dissolves in water — so every rain shower washes a "
            "little of the gel away. That is why it is one prong of three, not the whole answer.",
            AnimationGroup(FadeIn(caveat, shift=DOWN * 0.2),
                           LaggedStart(*[Create(d) for d in drops], lag_ratio=0.05)),
            hold=0.4,
        )
        self.play(VGroup(gel, junctions).animate.set_opacity(0.45), run_time=1.2)
        self.wait(0.3)
        self.smooth_clear()
