"""
Protein explorer explainer — "A look inside the real enzymes".
Renders one narrated 3-D scene: Protein3dExplainer.

The two backbones are traced from REAL structures (no PyMOL needed — Cα records are read directly):
  - Carbonic anhydrase II  → 1CA2.pdb  (crystal structure; Zn²⁺ site = His94/His96/His119).
  - γ-PGA synthase PgsB     → AF-O34899-F1-model_v6.pdb  (AlphaFold model, honestly labelled).
Nothing here invents data; the visuals only trace deposited / predicted coordinates.
"""

from manim import *
from _style import (
    IGemScene, load_ca_trace, resid_point, ribbon,
    BG, INK, MUTED, TEAL, CYAN, AMBER, EMERALD, INDIGO, FUCHSIA,
)


class Protein3dExplainer(IGemScene, ThreeDScene):
    def construct(self):
        # --- 1. Title (fixed to the frame so it always faces us) -------------
        title = Text("A look inside the real enzymes", font_size=40, color=INK, weight="BOLD")
        subtitle = Text("traced from deposited & predicted structures",
                        font_size=22, color=CYAN, weight="MEDIUM")
        subtitle.next_to(title, DOWN, buff=0.3)
        card = VGroup(title, subtitle).move_to(ORIGIN)
        card.set_opacity(0)
        self.add_fixed_in_frame_mobjects(card)
        self.say(
            "The models talk about proteins — but what do they actually look like? "
            "Let's trace two of them, atom by atom, from real structures.",
            card.animate.set_opacity(1), hold=0.6,
        )
        self.play(card.animate.set_opacity(0), run_time=0.6)
        self.remove(card)

        # --- 2. Carbonic anhydrase backbone reveal --------------------------
        self.set_camera_orientation(phi=68 * DEGREES, theta=-50 * DEGREES, zoom=0.95)
        arr, resids = load_ca_trace("1CA2.pdb", target_height=4.6, return_resids=True)
        ca = ribbon(arr, color_a=CYAN, color_b=TEAL, stroke_width=6.5)

        label_ca = Text("Carbonic anhydrase II  ·  Prong 2", font_size=26, color=CYAN, weight="BOLD")
        label_ca.to_corner(UL, buff=0.6)
        label_ca.set_opacity(0)
        self.add_fixed_in_frame_mobjects(label_ca)

        self.say(
            "This is carbonic anhydrase — the enzyme we bolt onto the cell to turn carbon "
            "dioxide into carbonate. Every twist is its real, folded backbone.",
            AnimationGroup(Create(ca, run_time=3.0), label_ca.animate.set_opacity(1)),
            hold=0.5,
        )
        self.begin_ambient_camera_rotation(rate=0.12)
        self.wait(0.3)

        # --- 3. The zinc active site (real coordinating histidines) ----------
        site_pts = [p for p in (resid_point(arr, resids, r) for r in (94, 96, 119)) if p is not None]
        if not site_pts:
            site_pts = [arr[len(arr) // 2]]
        centre = sum(site_pts) / len(site_pts)

        his = VGroup(*[
            Sphere(radius=0.14, resolution=(12, 12)).move_to(p).set_color(AMBER)
            for p in site_pts
        ])
        zinc = Sphere(radius=0.2, resolution=(16, 16)).move_to(centre).set_color(FUCHSIA)
        pocket = Circle(radius=0.55, color=AMBER, stroke_width=4).move_to(centre)
        pocket.rotate(PI / 2, axis=RIGHT)

        site_label = Text("Zn²⁺ active site — His94 · His96 · His119",
                          font_size=22, color=AMBER, weight="BOLD")
        site_label.to_edge(DOWN, buff=0.6)
        site_label.set_opacity(0)
        self.add_fixed_in_frame_mobjects(site_label)

        self.say(
            "Follow the chain to where the chemistry happens: three histidines clamp a single "
            "zinc ion. That tiny pocket is what speeds the reaction about a million-fold.",
            AnimationGroup(
                LaggedStart(*[GrowFromCenter(h) for h in his], lag_ratio=0.3),
                GrowFromCenter(zinc), Create(pocket),
                site_label.animate.set_opacity(1),
            ),
            hold=0.5,
        )
        self.play(Indicate(zinc, color=FUCHSIA, scale_factor=1.4), run_time=1.0)
        self.wait(0.4)

        # --- 4. Transition to the γ-PGA synthase ----------------------------
        self.stop_ambient_camera_rotation()
        self.play(
            *[FadeOut(m) for m in (ca, his, zinc, pocket)],
            label_ca.animate.set_opacity(0), site_label.animate.set_opacity(0),
            run_time=0.9,
        )
        self.remove(label_ca, site_label)

        pgs_arr = load_ca_trace("AF-O34899-F1-model_v6.pdb", target_height=4.8)
        pgs = ribbon(pgs_arr, color_a=AMBER, color_b=FUCHSIA, stroke_width=6.5)

        label_pgs = Text("γ-PGA synthase (PgsB)  ·  AlphaFold model  ·  Prong 1",
                         font_size=24, color=AMBER, weight="BOLD")
        label_pgs.to_corner(UL, buff=0.6)
        label_pgs.set_opacity(0)
        self.add_fixed_in_frame_mobjects(label_pgs)

        self.begin_ambient_camera_rotation(rate=0.12)
        self.say(
            "And this is the other one — the synthase that stitches glutamate into long "
            "gamma-P-G-A chains. This fold is AlphaFold's prediction, not a crystal, so we "
            "flag it honestly.",
            AnimationGroup(Create(pgs, run_time=3.0), label_pgs.animate.set_opacity(1)),
            hold=0.5,
        )
        self.wait(0.6)

        # --- 5. Payoff -------------------------------------------------------
        self.stop_ambient_camera_rotation()
        payoff = Text("Real shapes — where every reaction in the toolkit begins",
                      font_size=24, color=INK, weight="MEDIUM")
        payoff.to_edge(DOWN, buff=0.6)
        payoff.set_opacity(0)
        self.add_fixed_in_frame_mobjects(payoff)
        self.say(
            "Two real enzymes, two real shapes — and the pocket on each one is where every "
            "downstream number in this toolkit is born.",
            payoff.animate.set_opacity(1), hold=0.6,
        )
        self.wait(0.4)
        self.play(FadeOut(pgs), payoff.animate.set_opacity(0), run_time=0.9)
