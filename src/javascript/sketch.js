window.addEventListener("DOMContentLoaded", () => {
	const canvas = document.querySelector("canvas");

	if (!canvas) return;

	new TiledSwirl(canvas);
});

class TiledSwirl {
	density: number = 32;
	edge: number = 0.1;
	ripple: number = 5;
	speed: number = 0.03;
	tightness: number = 3;
	palette: string[] = [
		"", // black or white by default
		"hsl(343, 90%, 50%)",
		"hsl(43, 90%, 50%)",
		"hsl(223, 90%, 50%)"
	];
	private rows: number = 0;
	private cols: number = 0;
	private size: number = 0;
	private time: number = 0;
	private distanceMax: number = 0;
	private isDark: boolean = false;
	private colors: string[][] = [];
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D | null;
	private themeQuery: MediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");

	/**
	 * @param canvas Canvas element where the swirl should be rendered
	 */
	constructor(canvas: HTMLCanvasElement) {
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
	private get blankColor(): string {
		return this.isDark ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 0%)";
	}
	/** Animation loop */
	private animate(): void {
		requestAnimationFrame(this.animate.bind(this));

		if (!this.canvas || !this.ctx) return;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.time += this.speed;
		this.draw();
	}
	/** Adjust the canvas to fit window changes. */
	private canvasResize(): void {
		if (!this.canvas) return;

		const ratio = window.devicePixelRatio;

		// should be 1:1 ratio
		this.canvas.width = window.innerWidth * ratio;
		this.canvas.height = window.innerWidth * ratio
		this.canvas.style.width = window.innerWidth + "px";
        this.canvas.style.height = window.innerWidth + "px";

		this.ctx?.scale(ratio, ratio);

		this.size = (Math.min(this.canvas.width, this.canvas.height) / this.density) / ratio;
		this.rows = Math.floor((this.canvas.height / this.size) / ratio);
		this.cols = Math.floor((this.canvas.width / this.size) / ratio);

		const halfWidth = (this.canvas.width / 2) / ratio;
    	const halfHeight = (this.canvas.height / 2) / ratio;

    	this.distanceMax = Math.sqrt(halfWidth ** 2 + halfHeight ** 2);
	}
	/** Set the theme to dark if the preferred color scheme is so. */
	private checkDarkTheme(): void {
		this.isDark = this.themeQuery.matches;
	}
	/** Populate the array of colors used by all tiles. */
	private colorsInit(): void {
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
	private draw(): void {
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
	static random(): number {
		return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
	}
	/**
	 * Sharpen the transition of the swirl edges.
	 * @param x Raw tile size based on its position in the wave (0–1)
	 * @param edge1 Lower transition threshold. `x` values below will be mapped to 0.
	 * @param edge2 Upper transition threshold. `x` values above will be mapped to 1.
	 */
	static smoothStep(x: number, edge1: number, edge2: number) {
		x = Math.max(0, Math.min(1, (x - edge1) / (edge2 - edge1)));

		return x * x * (3 - 2 * x);
	}
}