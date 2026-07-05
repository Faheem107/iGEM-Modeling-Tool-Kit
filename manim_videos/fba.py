"""
FBA module explainer — "How the cell decides where carbon goes".
Renders one narrated scene: FbaExplainer.
"""

from manim import *
from _style import IGemScene, BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, INDIGO, GRID


def node(label, color, r=0.42):
    c = Circle(radius=r, stroke_color=color, stroke_width=3.5,
               fill_color=color, fill_opacity=0.15)
    t = Text(label, font_size=20, color=INK, weight="BOLD").move_to(c)
    return VGroup(c, t)


class FbaExplainer(IGemScene):
    def construct(self):
        # --- 1. Hook / title -------------------------------------------------
        g, head, sub = self.title_card(
            "Where does the carbon go?",
            "Flux Balance Analysis",
            accent=CYAN,
        )
        self.say(
            "Every cell is a tiny chemical factory. Feed it sugar, and it has to decide "
            "where all that carbon should flow.",
            FadeIn(head, shift=UP * 0.3), Write(sub), hold=0.6,
        )
        self.wait(0.2)
        self.play(FadeOut(g), run_time=0.6)

        # --- 2. Build the pipe network --------------------------------------
        glc = node("Sugar", CYAN).to_edge(LEFT, buff=1.2)
        hub = node("hub", TEAL).move_to([-1.2, 0, 0])
        branch = node("branch", TEAL).move_to([1.4, 0, 0])
        biomass = node("Growth", MUTED).move_to([3.6, 1.4, 0])
        product = node("Product", AMBER).move_to([3.6, -1.4, 0])

        e1 = Arrow(glc.get_right(), hub.get_left(), buff=0.12, color=GRID, stroke_width=5, max_tip_length_to_length_ratio=0.12)
        e2 = Arrow(hub.get_right(), branch.get_left(), buff=0.12, color=GRID, stroke_width=5, max_tip_length_to_length_ratio=0.12)
        e3 = Arrow(branch.get_top(), biomass.get_left(), buff=0.12, color=GRID, stroke_width=5, max_tip_length_to_length_ratio=0.1)
        e4 = Arrow(branch.get_bottom(), product.get_left(), buff=0.12, color=GRID, stroke_width=5, max_tip_length_to_length_ratio=0.1)
        edges = VGroup(e1, e2, e3, e4)
        nodes = VGroup(glc, hub, branch, biomass, product)

        self.say(
            "Think of its metabolism as a network of pipes. Sugar enters here, and splits "
            "between building new cells and making the product we care about.",
            LaggedStart(
                FadeIn(glc), Create(e1), FadeIn(hub), Create(e2), FadeIn(branch),
                Create(e3), FadeIn(biomass), Create(e4), FadeIn(product),
                lag_ratio=0.35,
            ),
            hold=0.5,
        )

        # --- 3. Steady state: nothing piles up ------------------------------
        rule = self.eqn("in  =  out   at every junction", color=TEAL, size=26).to_edge(DOWN, buff=0.7)
        ring = Circle(radius=0.62, color=TEAL, stroke_width=4).move_to(branch)
        self.say(
            "The key rule is balance. At steady state nothing is allowed to pile up: whatever "
            "flows into a junction must flow back out.",
            AnimationGroup(Create(ring), Write(rule)),
            hold=0.5,
        )
        self.play(Indicate(branch, color=TEAL, scale_factor=1.15), FadeOut(ring), run_time=1.0)

        # --- 4. Flow dots along the pipes -----------------------------------
        def flow_dots(path_edges, color, n=3):
            dots = VGroup(*[Dot(radius=0.09, color=color) for _ in range(n)])
            anims = []
            for k, d in enumerate(dots):
                seq = Succession(*[MoveAlongPath(d, e.copy(), run_time=0.7, rate_func=linear) for e in path_edges])
                anims.append(seq)
            return dots, LaggedStart(*anims, lag_ratio=0.25)

        dots_b, anim_b = flow_dots([e1, e2, e3], MUTED)
        dots_p, anim_p = flow_dots([e1, e2, e4], AMBER)
        self.add(dots_b, dots_p)
        self.say(
            "So the cell is really solving a routing puzzle: given a fixed sugar supply, which "
            "split of the flow is best?",
            AnimationGroup(anim_b, anim_p),
            hold=0.4,
        )
        self.remove(dots_b, dots_p)

        # --- 5. The objective: maximise product -----------------------------
        obj = self.eqn("maximise  →  Product", color=AMBER, size=30).to_edge(UP, buff=0.7)
        self.say(
            "Flux Balance Analysis picks the routing that maximises our objective — here, the "
            "precursor that feeds the rest of the toolkit.",
            AnimationGroup(
                Write(obj),
                e4.animate.set_color(AMBER).set_stroke(width=8),
                product[0].animate.set_stroke(width=6).set_fill(opacity=0.35),
                e3.animate.set_stroke(opacity=0.35),
            ),
            hold=0.5,
        )
        dots_p2, anim_p2 = flow_dots([e1, e2, e4], AMBER, n=5)
        self.add(dots_p2)
        self.play(anim_p2, run_time=2.0)
        self.remove(dots_p2)

        # --- 6. Payoff ------------------------------------------------------
        payoff = Text("that flux becomes the precursor the other models use",
                      font_size=24, color=INK).to_edge(DOWN, buff=0.7)
        self.play(FadeOut(rule), FadeIn(payoff, shift=UP * 0.2), run_time=0.8)
        self.say(
            "No new chemistry is invented — it is simply the best traffic plan on a fixed road "
            "network. That single number sets the stage for everything downstream.",
            Flash(product.get_center(), color=AMBER, line_length=0.4, num_lines=16, flash_radius=0.9),
            hold=0.6,
        )
        self.wait(0.4)
        self.smooth_clear()
