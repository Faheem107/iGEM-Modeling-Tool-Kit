"""
Wet-lab module explainer — "From the bench to the dune".
Renders one narrated scene: WetlabExplainer.

Honest to the sandbox: measurable bench inputs (culture density OD, glutamate feed, salinity)
feed the SAME wind-erosion physics as the rest of the toolkit, so a Monday bench number becomes a
Tuesday field prediction.
"""

import numpy as np
from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


def dial(label, color, value):
    track = Line(LEFT * 0.9, RIGHT * 0.9, color=MUTED, stroke_width=3)
    knob = Dot(radius=0.12, color=color).move_to(track.point_from_proportion(value))
    lab = Text(label, font_size=18, color=INK).next_to(track, LEFT, buff=0.3)
    return VGroup(track, knob, lab), knob, track


class WetlabExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("Bench to dune", "The wet-lab sandbox", accent=TEAL)
        self.say(
            "Here is the bridge between the lab and the field. Real numbers you measure at the bench "
            "flow straight into the same physics that predicts erosion in the desert.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Three bench dials ------------------------------------------
        d1, k1, t1 = dial("culture OD", CYAN, 0.35)
        d2, k2, t2 = dial("glutamate feed", AMBER, 0.4)
        d3, k3, t3 = dial("salinity", ROSE, 0.5)
        dials = VGroup(d1, d2, d3).arrange(DOWN, buff=0.7, aligned_edge=RIGHT).to_edge(LEFT, buff=0.8)
        self.say(
            "How dense is the culture? How much glutamate are we feeding? How salty is the water? "
            "These are dials you actually turn on the bench.",
            LaggedStart(*[FadeIn(d, shift=RIGHT * 0.2) for d in dials], lag_ratio=0.3), hold=0.4,
        )

        # --- 3. Feed into the shared physics -------------------------------
        physics = self.chip("wind-erosion physics", TEAL, width=3.2, height=1.0).move_to([1.4, 0, 0])
        arrows = VGroup(*[Arrow(d.get_right(), physics.get_left(), color=MUTED, stroke_width=3, buff=0.2) for d in dials])
        self.say(
            "Every one of those bench inputs feeds the exact same wind-erosion model the other "
            "modules use — no separate, hand-waved lab version.",
            LaggedStart(*[GrowArrow(a) for a in arrows], FadeIn(physics, scale=0.9), lag_ratio=0.2),
            hold=0.4,
        )

        # --- 4. The virtual dune responds ----------------------------------
        base = Line([3.2, -1.6, 0], [6.6, -1.6, 0], color=MUTED, stroke_width=3)
        dune = VMobject(fill_color="#c8b68f", fill_opacity=0.9, stroke_width=0)
        dune.set_points_smoothly([[3.3, -1.6, 0], [4.0, -0.4, 0], [4.9, 0.2, 0], [5.8, -0.5, 0], [6.5, -1.6, 0]])
        dune.add_points_as_corners([[6.5, -1.6, 0], [3.3, -1.6, 0]])
        arrow2 = Arrow(physics.get_right(), base.get_left() + UP * 0.3, color=TEAL, stroke_width=4, buff=0.2)
        self.say(
            "And the answer shows up as a virtual dune — hold the settings that give a strong crust, "
            "and it stands firm.",
            AnimationGroup(GrowArrow(arrow2), Create(base), FadeIn(dune)), hold=0.4,
        )

        # turn salinity up → dune erodes
        eroded = dune.copy()
        eroded.set_points_smoothly([[3.3, -1.6, 0], [4.1, -1.0, 0], [5.0, -0.7, 0], [5.9, -1.1, 0], [6.5, -1.6, 0]])
        eroded.add_points_as_corners([[6.5, -1.6, 0], [3.3, -1.6, 0]])
        self.say(
            "Turn a dial the wrong way — too much salt, too little feed — and you watch the same "
            "dune wear down. An experiment on Monday becomes a field prediction on Tuesday.",
            AnimationGroup(k3.animate.move_to(t3.get_end()),
                           Transform(dune, eroded)),
            run_time=2.0, hold=0.5,
        )
        self.wait(0.3)
        self.smooth_clear()
