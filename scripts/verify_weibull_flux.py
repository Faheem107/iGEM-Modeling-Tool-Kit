"""
Check the closed-form Weibull-integrated saltation flux against brute-force integration.

Backs section 5.2 of DUST_EXPOSURE_BUILD_PLAN.md. The mean saltation flux over a Weibull
wind speed distribution has an exact solution in upper incomplete gamma functions:

    <q> = C*(rho_a/g)*r^3 * [ A^3*Gamma(1+3/k, x) - ut^2*A*Gamma(1+1/k, x) ],  x = (ut/A)^k

where q is the Bagnold law implemented in src/lib/physics/aeolian.ts, r is the
u*/U ratio (AEOLIAN_CALIB.uStarRatio), and ut is the threshold as a freestream speed.

Run:  python3 scripts/verify_weibull_flux.py
Both columns must agree to floating point tolerance. If they do not, the closed form in
windStats.ts is wrong and any monthly flux it produces is wrong with it.
"""

from math import exp, gamma


def upper_incomplete_gamma(s, x, n=400_000, top=60.0):
    """Gamma(s, x) by Simpson quadrature. Reference implementation, not for production."""
    if x >= top:
        return 0.0
    h = (top - x) / n
    total = 0.0
    for i in range(n + 1):
        t = x + i * h
        w = 1 if i in (0, n) else (4 if i % 2 else 2)
        total += w * (t ** (s - 1)) * exp(-t)
    return total * h / 3


def bagnold_flux(u_star, u_star_t, C, rho_a, g):
    """Eq 9 as implemented in aeolian.ts."""
    if u_star <= u_star_t:
        return 0.0
    return C * (rho_a / g) * u_star**3 * (1 - u_star_t**2 / u_star**2)


def weibull_pdf(u, A, k):
    return (k / A) * (u / A) ** (k - 1) * exp(-((u / A) ** k))


def mean_flux_brute(A, k, ut, r, C, rho_a, g, n=2_000_000, umax=80.0):
    h = umax / n
    total = 0.0
    for i in range(1, n + 1):
        u = i * h
        w = 1 if i == n else (4 if i % 2 else 2)
        total += w * bagnold_flux(r * u, r * ut, C, rho_a, g) * weibull_pdf(u, A, k)
    return total * h / 3


def mean_flux_closed(A, k, ut, r, C, rho_a, g):
    x = (ut / A) ** k
    return (
        C
        * (rho_a / g)
        * r**3
        * (A**3 * upper_incomplete_gamma(1 + 3 / k, x)
           - ut**2 * A * upper_incomplete_gamma(1 + 1 / k, x))
    )


def main():
    # Placeholder wind and calibration values, chosen only to exercise the identity.
    # They are NOT site values and must not be quoted as such.
    rho_a, g, C, r = 1.225, 9.81, 1.8, 0.045
    cases = [(6.0, 2.0, 4.0), (8.0, 1.6, 5.0), (5.0, 2.5, 3.0),
             (10.0, 3.0, 7.0), (6.0, 2.0, 0.001)]

    print(f"{'A':>5} {'k':>5} {'ut':>6} | {'brute force':>14} {'closed form':>14} {'rel err':>10}")
    worst = 0.0
    for A, k, ut in cases:
        b = mean_flux_brute(A, k, ut, r, C, rho_a, g)
        c = mean_flux_closed(A, k, ut, r, C, rho_a, g)
        err = abs(b - c) / b
        worst = max(worst, err)
        print(f"{A:5} {k:5} {ut:6} | {b:14.6e} {c:14.6e} {err:10.2e}")

    print(f"\nworst relative error: {worst:.2e}")
    assert worst < 1e-9, "closed form does not match numerical integration"
    print("PASS, the closed form is exact.")

    # The moment ratio quoted in section 5.4 of the build plan.
    print("\nRayleigh (k=2), why flux-of-the-mean is wrong:")
    print(f"  <u^3>/A^3   = Gamma(1+3/k) = {gamma(1 + 3 / 2):.4f}")
    print(f"  (<u>/A)^3   = Gamma(1+1/k)^3 = {gamma(1 + 1 / 2) ** 3:.4f}")
    print(f"  ratio       = {gamma(2.5) / gamma(1.5) ** 3:.4f}")


if __name__ == "__main__":
    main()
