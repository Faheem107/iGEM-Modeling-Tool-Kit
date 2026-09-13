"""
Exposure module explainer: "Where a site's sand comes from".
Renders one narrated scene: ExposureExplainer.

Honest to src/lib/physics/windStats.ts, aeolian.ts, dustTransport.ts and
hotspotTransport.ts. A 3-year ERA5 wind record is fitted (Weibull) and the
Bagnold flux, which rises as roughly the cube of wind speed above a threshold,
is integrated over it. Fryberger drift over 16 sectors gives the direction sand
moves. Saltation (hopping sand) travels metres and is what a crust holds;
suspension (fine dust) rides hundreds of km from Ginoux sources and a local crust
does not touch it. The weakest link is turning blowing sand into lost power,
which has no measured coefficient yet.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class ExposureExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Where the sand comes from", "The exposure model", accent=CYAN)
        self.say(
            "A solar plant in the desert loses output to sand and dust. The question this model "
            "asks is narrower and more useful. Which of that can a crust on the ground actually "
            "stop?",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Wind distribution, not the average -------------------------
        ax = self.mini_axes(x_range=[0, 10, 1], y_range=[0, 0.9, 1], x_len=8.6, y_len=3.2).shift(DOWN * 0.2)
        lab = self.axis_labels(ax, "wind speed →", "how often", color=MUTED)
        weib = ax.plot(lambda x: 0.8 * (x / 3.0) ** 1.1 * np.exp(-((x / 3.0) ** 2.0)),
                       x_range=[0.05, 9.8], color=CYAN, stroke_width=5)
        thr = DashedLine(ax.c2p(4.2, 0), ax.c2p(4.2, 0.75), color=ROSE, stroke_width=3)
        thr_l = Text("threshold to move sand", font_size=18, color=ROSE).next_to(ax.c2p(4.2, 0.75), UP, buff=0.1)
        self.say(
            "Start with the wind. We take three years of hourly wind and fit the spread of speeds. "
            "The reason we keep the whole spread, not the average, is that sand flux climbs as "
            "roughly the cube of wind speed above a threshold. A few strong days do almost all the "
            "work.",
            AnimationGroup(Create(ax), FadeIn(lab), Create(weib)), hold=0.1,
        )
        self.play(Create(thr), FadeIn(thr_l), run_time=0.9)
        over = ax.get_area(weib, x_range=[4.2, 9.8], color=ROSE, opacity=0.25)
        self.say(
            "Only this shaded tail, the hours above the threshold, moves any sand at all.",
            FadeIn(over), hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 3. Direction: drift rose --------------------------------------
        centre = LEFT * 3.2
        circ = Circle(radius=1.6, color=MUTED, stroke_width=2).move_to(centre)
        petals = VGroup()
        drift = [0.2, 0.35, 0.9, 1.0, 0.7, 0.3, 0.15, 0.1, 0.1, 0.1, 0.12, 0.15, 0.2, 0.25, 0.22, 0.18]
        for i, d in enumerate(drift):
            ang = i * TAU / 16
            v = np.array([np.sin(ang), np.cos(ang), 0])
            petals.add(Line(centre, centre + v * (0.4 + d * 1.2), color=CYAN, stroke_width=6))
        res = Arrow(centre, centre + np.array([0.75, -0.62, 0]) * 1.9, color=AMBER, stroke_width=6, buff=0)
        rlab = Text("net drift direction", font_size=18, color=AMBER).next_to(res.get_end(), DOWN, buff=0.15)
        self.say(
            "Next, direction. We sum the drift over sixteen compass sectors, the Fryberger method, "
            "to get the direction sand actually moves and how one-sided it is. That points straight "
            "at the edge of the plant worth treating.",
            AnimationGroup(Create(circ), LaggedStart(*[GrowFromPoint(p, centre) for p in petals], lag_ratio=0.05)),
            hold=0.1,
        )
        self.play(GrowArrow(res), FadeIn(rlab), run_time=1.0)
        self.smooth_clear(run_time=0.7)

        # --- 4. Two journeys: hop vs plume ---------------------------------
        ground = Line(LEFT * 6 + DOWN * 2, RIGHT * 6 + DOWN * 2, color=MUTED, stroke_width=3)
        hop = VGroup(*[Arc(radius=0.35, start_angle=0, angle=PI, color=AMBER, stroke_width=4)
                       .move_to([-4.5 + i * 0.8, -1.75, 0]) for i in range(5)])
        hop_l = Text("saltation: sand hops metres  (the crust holds this)", font_size=19, color=AMBER).to_edge(UP, buff=0.9)
        self.say(
            "Now the key split. Sand near the ground hops in short arcs, metres at a time. That is "
            "saltation, and it is exactly what a crust on the surface holds down.",
            AnimationGroup(Create(ground), LaggedStart(*[Create(h) for h in hop], lag_ratio=0.2), FadeIn(hop_l)),
            hold=0.3,
        )
        plume = ax.plot  # unused; draw a long drifting arrow for dust
        dust = Arrow(LEFT * 5.2 + UP * 1.2, RIGHT * 5.2 + UP * 0.6, color=INDIGO, stroke_width=5, buff=0)
        dust_l = Text("suspension: fine dust rides hundreds of km  (no local crust helps)",
                      font_size=19, color=INDIGO).next_to(dust, UP, buff=0.15)
        self.say(
            "The fine dust is a different animal. It rides the wind hundreds of kilometres from "
            "sources over Iraq and Iran. No crust on a UAE plant touches that.",
            AnimationGroup(GrowArrow(dust), FadeIn(dust_l)), hold=0.4,
        )
        self.smooth_clear(run_time=0.7)

        # --- 5. What the crust addresses + limit ---------------------------
        good = Text("So the crust addresses sand encroachment and burial,\nnot the haze on the glass",
                    font_size=24, color=INK, line_spacing=0.8).move_to([0, 1.2, 0])
        lim = Text("Weakest link: blowing sand → lost power", font_size=23, color=AMBER, weight="BOLD").move_to([0, -0.6, 0])
        lim2 = Text("we have no measured abrasion coefficient, so that step is left blank",
                    font_size=19, color=MUTED).next_to(lim, DOWN, buff=0.25)
        self.say(
            "So the crust addresses sand piling up and burying things, not the haze on the glass.",
            FadeIn(good, shift=UP * 0.2), hold=0.3,
        )
        self.say(
            "And the honest weak link is the last step: turning blowing sand into lost power. We "
            "have no measured coefficient for glass abrasion yet, so we leave that number blank "
            "rather than invent it.",
            AnimationGroup(FadeIn(lim, shift=UP * 0.2), FadeIn(lim2, shift=UP * 0.2)),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
