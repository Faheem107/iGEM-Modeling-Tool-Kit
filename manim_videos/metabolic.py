"""
Metabolic module explainer — "From gene to glue, step by step".
Renders one narrated scene: MetabolicExplainer.

Honest to src/lib/physics (central-dogma kinetics): gene -> mRNA -> enzyme -> γ-PGA, with the
γ-PGA-degrading "scissors" genes (ggt / pgdS) knocked out so the polymer accumulates.
"""

from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, ROSE, INDIGO, FUCHSIA, GRID


class MetabolicExplainer(IGemScene):
    def construct(self):
        # --- 1. Title -------------------------------------------------------
        g, head, sub = self.title_card("From gene to glue", "The central dogma, in time", accent=AMBER)
        self.say(
            "How does a strand of DNA become the sticky glue that holds sand together? "
            "It happens in three steps.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.smooth_clear(run_time=0.7)

        # --- 2. Gene -> mRNA (transcription) --------------------------------
        gene = RoundedRectangle(corner_radius=0.1, width=2.6, height=0.7,
                                stroke_color=INDIGO, stroke_width=3, fill_color=INDIGO, fill_opacity=0.15)
        gene_l = Text("gene (DNA)", font_size=22, color=INK, weight="BOLD").move_to(gene)
        gene_grp = VGroup(gene, gene_l).to_edge(LEFT, buff=1.0).shift(UP * 2.0)

        mrna = VMobject(stroke_color=CYAN, stroke_width=5)
        mrna.set_points_smoothly([[-1.2, 0, 0], [-0.4, 0.25, 0], [0.4, -0.25, 0], [1.2, 0, 0]])
        mrna.next_to(gene_grp, DOWN, buff=1.0)
        mrna_l = Text("mRNA — a short-lived copy", font_size=20, color=CYAN).next_to(mrna, DOWN, buff=0.2)
        arrow1 = Arrow(gene_grp.get_bottom(), mrna.get_top() + UP * 0.1, color=MUTED, stroke_width=4, buff=0.15)
        tx = Text("transcription", font_size=16, color=MUTED).next_to(arrow1, RIGHT, buff=0.15)

        self.say(
            "First, the gene is copied into a short-lived message called messenger R-N-A. "
            "This copy does not last — it is made and destroyed constantly.",
            LaggedStart(FadeIn(gene_grp, shift=RIGHT * 0.2),
                        GrowArrow(arrow1), FadeIn(tx),
                        Create(mrna), FadeIn(mrna_l), lag_ratio=0.35),
            hold=0.5,
        )

        # --- 3. mRNA -> enzyme (translation) --------------------------------
        enzyme = self.chip("PgsB synthase", EMERALD, width=3.2).to_edge(RIGHT, buff=1.0).shift(UP * 0.2)
        arrow2 = Arrow(mrna.get_right(), enzyme.get_left(), color=MUTED, stroke_width=4, buff=0.2)
        tl = Text("translation", font_size=16, color=MUTED).next_to(arrow2, UP, buff=0.1)
        self.say(
            "That message is then read to build the enzyme — the molecular machine "
            "that does the real work.",
            LaggedStart(GrowArrow(arrow2), FadeIn(tl), FadeIn(enzyme, shift=LEFT * 0.2), lag_ratio=0.3),
            hold=0.5,
        )

        # --- 4. Enzyme stitches glutamate into γ-PGA ------------------------
        self.smooth_clear(run_time=0.8)
        enzyme2 = self.chip("PgsB", EMERALD, width=1.8).to_edge(LEFT, buff=1.2)
        self.play(FadeIn(enzyme2), run_time=0.5)

        beads = VGroup(*[Circle(radius=0.16, stroke_color=AMBER, stroke_width=2,
                                fill_color=AMBER, fill_opacity=0.8) for _ in range(9)])
        for i, b in enumerate(beads):
            b.move_to([-2.2 + i * 0.55, 0.2, 0])
        links = VGroup(*[Line(beads[i].get_right(), beads[i + 1].get_left(), color=AMBER, stroke_width=3)
                         for i in range(len(beads) - 1)])
        chain_l = Text("γ-PGA chain — glutamate, stitched long", font_size=20, color=AMBER).next_to(beads, DOWN, buff=0.6)
        self.say(
            "The enzyme grabs glutamate units, one after another, and stitches them into a long "
            "chain — gamma-P-G-A. This is the polymer that becomes our crust.",
            LaggedStart(*[GrowFromCenter(b) for b in beads], lag_ratio=0.12),
            hold=0.2,
        )
        self.play(LaggedStart(*[Create(l) for l in links], lag_ratio=0.15), FadeIn(chain_l), run_time=1.2)

        # --- 5. Knock out the "scissors" so it piles up ---------------------
        scissors = Text("✂ ggt / pgdS — the scissors", font_size=22, color=ROSE, weight="BOLD").to_edge(UP, buff=0.8)
        cut = Cross(scale_factor=0.5, stroke_color=ROSE, stroke_width=8).move_to(scissors.get_left() + LEFT * 0.3)
        self.say(
            "But the cell also carries genes whose enzymes chew that chain back up. "
            "So we knock those scissors out.",
            AnimationGroup(FadeIn(scissors, shift=DOWN * 0.2)), hold=0.4,
        )
        self.play(Create(cut), scissors.animate.set_opacity(0.4), run_time=0.8)

        bar_axis = Line(DOWN * 1.4, UP * 1.6, color=MUTED).to_edge(RIGHT, buff=1.6)
        bar = Rectangle(width=0.6, height=0.4, fill_color=AMBER, fill_opacity=0.9, stroke_width=0)
        bar.move_to(bar_axis.get_bottom(), aligned_edge=DOWN)
        blab = Text("γ-PGA builds up", font_size=18, color=AMBER).next_to(bar_axis, UP, buff=0.15)
        self.say(
            "With no scissors, the gamma-P-G-A no longer gets cut back — so it piles up, and the "
            "crust gets what it needs.",
            AnimationGroup(Create(bar_axis), FadeIn(bar), FadeIn(blab)), hold=0.2,
        )
        self.play(bar.animate.stretch_to_fit_height(2.7).move_to(bar_axis.get_bottom(), aligned_edge=DOWN),
                  run_time=1.8, rate_func=smooth)

        # --- 6. Payoff ------------------------------------------------------
        self.say(
            "Gene, message, enzyme, polymer — four steps, tracked in time. That is how a line of "
            "code in the DNA turns into glue in the sand.",
            Flash(bar.get_top(), color=AMBER, line_length=0.4, num_lines=16, flash_radius=0.9),
            hold=0.5,
        )
        self.wait(0.3)
        self.smooth_clear()
