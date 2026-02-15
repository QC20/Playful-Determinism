/*
  *****~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*****

    Created by Jonas Kjeldmand Jensen
    February 2026

    "Playful Determinism"

    A generative canvas animation that creates a mesmerizing swirl pattern
    made of animated tiles. The piece uses a TiledSwirl class to compute
    tile positions and sizes based on distance and angle from the center,
    then applies a continuous wave function that creates a rippling effect.
    The animation is fully responsive, adapts to dark/light theme preferences,
    and uses a procedural color palette that cycles through the tiles.

    Key features:
    - Real-time responsive canvas rendering with requestAnimationFrame
    - Dark/light theme detection via media queries
    - Smooth animation using wave equations and normalized distances
    - Configurable parameters (density, ripple, speed, tightness, palette)
    - Cryptographically random tile color initialization
    - Full viewport coverage with dynamic aspect ratio handling

  *****~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*****
*/

window.addEventListener("DOMContentLoaded", () => {
	const canvas = document.querySelector("canvas");

	if (!canvas) return;

	new TiledSwirl(canvas);
});

class TiledSwirl {
	density = 32;
	edge = 0.1;
	ripple = 5;
	speed = 0.03;
	tightness = 3;
	palette = [
		"", // black or white by default
		"hsl(343, 90%, 50%)",
		"hsl(43, 90%, 50%)",
		"hsl(223, 90%, 50%)"
	];
	rows = 0;
	cols = 0;
	size = 0;
	time = 0;
	distanceMax = 0;
	isDark = false;
	colors = [];
	canvas;
	ctx;
	themeQuery = window.matchMedia("(prefers-color-scheme: dark)");

	/**
	 * @param canvas Canvas element where the swirl should be rendered
	 */
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		this.canvasResize();
		this.checkDarkTheme();
		this.colorsInit();
		this.animate();

		window.addEventListener("resize", this.canvasResize.bind(this));
		this.themeQuery.addEventListener("change", this.checkDarkTheme.bind(this));
	}
	/** Use black or white depending on the color scheme. */
	get blankColor() {
		return this.isDark ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 0%)";
	}
	/** Animation loop */
	animate() {
		requestAnimationFrame(this.animate.bind(this));

		if (!this.canvas || !this.ctx) return;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.time += this.speed;
		this.draw();
	}
	/** Adjust the canvas to fit window changes and fill entire viewport. */
	canvasResize() {
		if (!this.canvas) return;

		const ratio = window.devicePixelRatio;

		// Fill entire viewport dynamically
		this.canvas.width = window.innerWidth * ratio;
		this.canvas.height = window.innerHeight * ratio;
		this.canvas.style.width = window.innerWidth + "px";
		this.canvas.style.height = window.innerHeight + "px";

		this.ctx?.scale(ratio, ratio);

		this.size = (Math.min(this.canvas.width, this.canvas.height) / this.density) / ratio;
		this.rows = Math.ceil((this.canvas.height / this.size) / ratio);
		this.cols = Math.ceil((this.canvas.width / this.size) / ratio);

		const halfWidth = (this.canvas.width / 2) / ratio;
		const halfHeight = (this.canvas.height / 2) / ratio;

		this.distanceMax = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
	}
	/** Set the theme to dark if the preferred color scheme is so. */
	checkDarkTheme() {
		this.isDark = this.themeQuery.matches;
	}
	/** Populate the array of colors used by all tiles. */
	colorsInit() {
		this.colors = [];

		for (let i = 0; i < this.cols; i++) {
			this.colors[i] = [];

			for (let j = 0; j < this.rows; j++) {
				const index = Math.floor(Utils.random() * this.palette.length);

				this.colors[i][j] = this.palette[index];
			}
		}
	}
	/** Calculate the tile positions and sizes, and then draw the swirl. */
	draw() {
		if (!this.canvas || !this.ctx) return;
	
		const ratio = window.devicePixelRatio;
		const centerX = (this.canvas.width / ratio) / 2;
		const centerY = (this.canvas.height / ratio) / 2;

		for (let i = 0; i < this.cols; i++) {
			for (let j = 0; j < this.rows; j++) {
				const x = i * this.size;
				const y = j * this.size;
				// tile position and size
				const legHorizontal = Math.pow(x + this.size / 2 - centerX, 2);
				const legVertical = Math.pow(y + this.size / 2 - centerY, 2);
				const dist = Math.sqrt(legHorizontal + legVertical);
				const distNormalized = dist / this.distanceMax;
				const angleX = x + this.size / 2 - centerX;
				const angleY = y + this.size / 2 - centerY;
				const angle = Math.atan2(angleY, angleX);
				const rippleFactor = this.tightness * (1 + distNormalized * this.ripple);
				const wave = Math.sin(distNormalized * rippleFactor + angle - this.time);
				const waveNormalized = (wave + 1) / 2;
				const edge1 = 0.5 - this.edge;
				const edge2 = 0.5 + this.edge;
				const waveEdged = Utils.smoothStep(waveNormalized, edge1, edge2);
				const tileSize = this.size * 0.2 + (this.size * 0.8 * waveEdged);
				// draw the tile
				const tileX = x + (this.size - tileSize) / 2;
				const tileY = y + (this.size - tileSize) / 2;

				this.ctx.fillStyle = this.colors[i][j] || this.blankColor;
				this.ctx.fillRect(tileX, tileY, tileSize, tileSize);
			}
		}
	}
}
class Utils {
	/** Generate a number between 0 and 1. */
	static random() {
		return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
	}
	/**
	 * Sharpen the transition of the swirl edges.
	 * @param x Raw tile size based on its position in the wave (0–1)
	 * @param edge1 Lower transition threshold. `x` values below will be mapped to 0.
	 * @param edge2 Upper transition threshold. `x` values above will be mapped to 1.
	 */
	static smoothStep(x, edge1, edge2) {
		x = Math.max(0, Math.min(1, (x - edge1) / (edge2 - edge1)));

		return x * x * (3 - 2 * x);
	}
}