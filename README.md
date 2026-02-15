# Playful Determinism

<div align="center">
  <img src="src/assets/Skærmoptagelse 2026-02-13 kl. 00.32.33.gif" alt="Playful Determinism Animation" />
  <p><em>The swirling animation in action - tiles pulsing and oscillating in a radial wave pattern</em></p>
</div>

A generative canvas animation that creates an infinite swirling pattern from randomly colored tiles. Each tile pulses and oscillates in response to its position within a radial wave field, producing a mesmerizing motion that feels both organic and mathematical.

## What It Does

The animation generates a grid of square tiles across the canvas, each assigned a color from a predefined palette. Rather than moving the tiles themselves, the system modulates their size according to a wave function that propagates outward from the center. This creates the illusion of a swirling vortex where tiles appear to breathe and flow in synchronized patterns.

The deterministic aspect comes from the initial color distribution. While the colors appear random, they're generated using `crypto.getRandomValues()`, which means the same seed would theoretically produce identical patterns. The playfulness emerges from how these static color assignments interact with the dynamic wave mathematics to create ever-changing visual complexity from simple rules.

## The Mathematics

At the heart of this animation lies a combination of radial and angular mapping. For each tile, the system calculates its distance from the canvas center using the Pythagorean theorem, then normalizes this distance against the maximum possible distance. Simultaneously, it computes the angle between the tile and center using `Math.atan2(y, x)`, which provides the directional component.

The wave itself is generated through a sine function that takes three inputs: the normalized distance, the angle, and time. The formula `Math.sin(distNormalized * rippleFactor + angle - time)` creates a spiral wave that rotates around the center while propagating outward. The `rippleFactor` variable (calculated as `tightness * (1 + distNormalized * ripple)`) determines how tightly the spiral winds, with the factor increasing toward the edges to create more compressed waves in the outer regions.

What makes the transitions sharp rather than gradual is the smooth step function. This interpolation technique takes the raw sine wave output (ranging from -1 to 1, normalized to 0 to 1) and applies cubic Hermite interpolation within a specified edge threshold. The function `x * x * (3 - 2 * x)` creates an S-curve that compresses values near the edges of the threshold range, resulting in crisper transitions between large and small tile states.

## Customization Possibilities

The animation exposes several parameters that fundamentally alter its character. Adjusting `density` changes the grid resolution, with higher values creating finer patterns at the cost of performance. The `tightness` parameter controls how many spiral arms wrap around the center. Setting it to 1 creates gentle curves, while values above 5 produce tight, intricate spirals.

The `ripple` parameter determines how wave frequency changes with distance. A value of 0 creates uniform waves across the entire canvas, while higher values compress the waves toward the edges. This can shift the animation from feeling centered and calm to chaotic and energetic.

Color choice significantly impacts the mood. The default palette uses saturated hues (red, orange, blue) against black or white backgrounds. Replacing these with pastel tones would create a softer aesthetic, while monochromatic schemes could emphasize the geometric patterns over color relationships. You could also increase the palette size to reduce repetition, or limit it to two colors for a more binary, digital feel.

If you wanted to explore non-radial patterns, you could modify the distance calculation to use Manhattan distance (`Math.abs(x) + Math.abs(y)`) instead of Euclidean distance, which would create diamond-shaped wave propagation. Alternatively, removing the angular component entirely and using only distance would transform the spiral into concentric rings.

## Running Locally

This is a vanilla JavaScript project with no external dependencies. Open `index.html` in a modern browser to run the animation. The canvas automatically scales to fit your viewport and responds to system theme changes.

To clone this repository: `git clone https://github.com/ionas/Playful-Determinism.git`

## License

MIT License - see LICENSE file for details.