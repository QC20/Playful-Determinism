/*
  *****~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*****

    Created by Jonas Kjeldmand Jensen
    February 2026

    "Playful Determinism" - Interactive Edition

    An interactive generative canvas animation with novel interaction modes:
    - Gestural wave sculpting with persistent distortion trails
    - Spawnable interference sources that create complex wave patterns
    - Gravity wells that warp the radial field
    - Time dilation zones with variable speeds
    - Device orientation response (mobile)
    - Harmonic layer stacking
    - Breath-responsive mode (experimental)

    Controls:
    - Drag: Create distortion trails in the wave field
    - Click: Spawn interference source
    - Shift + Drag: Create gravity well
    - Alt/Option + Click: Create time dilation zone
    - 1-5: Add harmonic layers
    - B: Toggle breath mode (microphone)
    - C: Clear all effects
    - Space: Pause/Resume

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
	baseSpeed = 0.03;
	tightness = 3;
	palette = [
		"",
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
	paused = false;
	colors = [];
	canvas;
	ctx;
	themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
	
	// Interaction state
	isDrawing = false;
	isShiftPressed = false;
	isAltPressed = false;
	distortionTrails = [];
	interferenceSources = [];
	gravityWells = [];
	timeDilationZones = [];
	harmonicLayers = [1];
	breathMode = false;
	breathAudio = null;
	breathAnalyser = null;
	breathDataArray = null;
	
	// Device orientation
	centerOffsetX = 0;
	centerOffsetY = 0;
	targetCenterOffsetX = 0;
	targetCenterOffsetY = 0;

	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		this.canvasResize();
		this.checkDarkTheme();
		this.colorsInit();
		this.setupInteractions();
		this.animate();

		window.addEventListener("resize", this.canvasResize.bind(this));
		this.themeQuery.addEventListener("change", this.checkDarkTheme.bind(this));
	}

	get blankColor() {
		return this.isDark ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 0%)";
	}

	setupInteractions() {
		// Mouse/touch events
		this.canvas.addEventListener("mousedown", this.handlePointerDown.bind(this));
		this.canvas.addEventListener("mousemove", this.handlePointerMove.bind(this));
		this.canvas.addEventListener("mouseup", this.handlePointerUp.bind(this));
		this.canvas.addEventListener("mouseleave", this.handlePointerUp.bind(this));
		
		this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
		this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
		this.canvas.addEventListener("touchend", this.handlePointerUp.bind(this));
		
		// Keyboard events
		window.addEventListener("keydown", this.handleKeyDown.bind(this));
		window.addEventListener("keyup", this.handleKeyUp.bind(this));
		
		// Device orientation (mobile)
		if (window.DeviceOrientationEvent) {
			window.addEventListener("deviceorientation", this.handleOrientation.bind(this));
		}
	}

	handlePointerDown(e) {
		this.isDrawing = true;
		const pos = this.getCanvasPosition(e);
		
		if (this.isAltPressed) {
			// Create time dilation zone
			this.timeDilationZones.push({
				x: pos.x,
				y: pos.y,
				radius: 80,
				speedMultiplier: Math.random() * 3 + 0.5,
				life: 1.0
			});
		} else if (!this.isShiftPressed) {
			// Create interference source
			this.interferenceSources.push({
				x: pos.x,
				y: pos.y,
				frequency: Math.random() * 2 + 1,
				amplitude: 0,
				targetAmplitude: 1.0,
				life: 1.0
			});
		}
	}

	handlePointerMove(e) {
		const pos = this.getCanvasPosition(e);
		
		if (this.isDrawing) {
			if (this.isShiftPressed) {
				// Update or create gravity well
				const existingWell = this.gravityWells.find(w => w.active);
				if (existingWell) {
					existingWell.x = pos.x;
					existingWell.y = pos.y;
				} else {
					this.gravityWells.push({
						x: pos.x,
						y: pos.y,
						strength: 0.3,
						radius: 200,
						active: true
					});
				}
			} else {
				// Create distortion trail
				this.distortionTrails.push({
					x: pos.x,
					y: pos.y,
					strength: 1.0,
					radius: 60,
					life: 1.0
				});
			}
		}
	}

	handlePointerUp() {
		this.isDrawing = false;
		// Deactivate gravity wells
		this.gravityWells.forEach(well => well.active = false);
	}

	handleTouchStart(e) {
		e.preventDefault();
		if (e.touches.length > 0) {
			this.handlePointerDown(e.touches[0]);
		}
	}

	handleTouchMove(e) {
		e.preventDefault();
		if (e.touches.length > 0) {
			this.handlePointerMove(e.touches[0]);
		}
	}

	handleKeyDown(e) {
		if (e.key === "Shift") this.isShiftPressed = true;
		if (e.key === "Alt") this.isAltPressed = true;
		
		if (e.key === " ") {
			e.preventDefault();
			this.paused = !this.paused;
		}
		
		if (e.key === "c" || e.key === "C") {
			this.clearEffects();
		}
		
		if (e.key === "b" || e.key === "B") {
			this.toggleBreathMode();
		}
		
		// Harmonic layers
		const num = parseInt(e.key);
		if (num >= 1 && num <= 5) {
			if (!this.harmonicLayers.includes(num)) {
				this.harmonicLayers.push(num);
			}
		}
	}

	handleKeyUp(e) {
		if (e.key === "Shift") this.isShiftPressed = false;
		if (e.key === "Alt") this.isAltPressed = false;
	}

	handleOrientation(e) {
		if (e.beta !== null && e.gamma !== null) {
			// Map device tilt to center offset
			this.targetCenterOffsetX = (e.gamma / 90) * 100; // -100 to 100
			this.targetCenterOffsetY = (e.beta / 90) * 100;
		}
	}

	async toggleBreathMode() {
		if (!this.breathMode) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				const audioContext = new AudioContext();
				const source = audioContext.createMediaStreamSource(stream);
				this.breathAnalyser = audioContext.createAnalyser();
				this.breathAnalyser.fftSize = 256;
				source.connect(this.breathAnalyser);
				this.breathDataArray = new Uint8Array(this.breathAnalyser.frequencyBinCount);
				this.breathMode = true;
				this.breathAudio = stream;
			} catch (err) {
				console.error("Microphone access denied:", err);
			}
		} else {
			if (this.breathAudio) {
				this.breathAudio.getTracks().forEach(track => track.stop());
			}
			this.breathMode = false;
			this.speed = this.baseSpeed;
		}
	}

	clearEffects() {
		this.distortionTrails = [];
		this.interferenceSources = [];
		this.gravityWells = [];
		this.timeDilationZones = [];
		this.harmonicLayers = [1];
	}

	getCanvasPosition(e) {
		const rect = this.canvas.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (this.canvas.width / rect.width) / window.devicePixelRatio,
			y: (e.clientY - rect.top) * (this.canvas.height / rect.height) / window.devicePixelRatio
		};
	}

	animate() {
		requestAnimationFrame(this.animate.bind(this));

		if (!this.canvas || !this.ctx) return;

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		if (!this.paused) {
			// Update breath mode
			if (this.breathMode && this.breathAnalyser && this.breathDataArray) {
				this.breathAnalyser.getByteFrequencyData(this.breathDataArray);
				const average = this.breathDataArray.reduce((a, b) => a + b, 0) / this.breathDataArray.length;
				this.speed = this.baseSpeed * (0.5 + (average / 256) * 2);
			}
			
			this.time += this.speed;
			
			// Update center offset (device orientation)
			this.centerOffsetX += (this.targetCenterOffsetX - this.centerOffsetX) * 0.05;
			this.centerOffsetY += (this.targetCenterOffsetY - this.centerOffsetY) * 0.05;
			
			// Update effects
			this.updateEffects();
		}
		
		this.draw();
		this.drawEffectIndicators();
	}

	updateEffects() {
		// Decay distortion trails
		this.distortionTrails = this.distortionTrails.filter(trail => {
			trail.life -= 0.01;
			trail.strength = trail.life;
			return trail.life > 0;
		});
		
		// Update interference sources
		this.interferenceSources = this.interferenceSources.filter(source => {
			source.amplitude += (source.targetAmplitude - source.amplitude) * 0.1;
			source.life -= 0.002;
			return source.life > 0;
		});
		
		// Decay gravity wells
		this.gravityWells = this.gravityWells.filter(well => {
			if (!well.active) {
				well.strength *= 0.95;
				return well.strength > 0.01;
			}
			return true;
		});
		
		// Decay time dilation zones
		this.timeDilationZones = this.timeDilationZones.filter(zone => {
			zone.life -= 0.005;
			return zone.life > 0;
		});
	}

	canvasResize() {
		if (!this.canvas) return;

		const ratio = window.devicePixelRatio;

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

	checkDarkTheme() {
		this.isDark = this.themeQuery.matches;
	}

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

	draw() {
		if (!this.canvas || !this.ctx) return;
	
		const ratio = window.devicePixelRatio;
		const baseCenterX = (this.canvas.width / ratio) / 2;
		const baseCenterY = (this.canvas.height / ratio) / 2;
		
		// Apply center offset from device orientation
		const centerX = baseCenterX + this.centerOffsetX;
		const centerY = baseCenterY + this.centerOffsetY;

		for (let i = 0; i < this.cols; i++) {
			for (let j = 0; j < this.rows; j++) {
				const x = i * this.size;
				const y = j * this.size;
				const tileX = x + this.size / 2;
				const tileY = y + this.size / 2;
				
				// Base wave calculation
				let effectiveTime = this.time;
				
				// Apply time dilation zones
				for (const zone of this.timeDilationZones) {
					const zoneDist = Math.sqrt(Math.pow(tileX - zone.x, 2) + Math.pow(tileY - zone.y, 2));
					if (zoneDist < zone.radius) {
						const influence = (1 - zoneDist / zone.radius) * zone.life;
						effectiveTime = this.time * (1 + influence * (zone.speedMultiplier - 1));
					}
				}
				
				// Calculate position relative to (possibly offset) center
				const dx = tileX - centerX;
				const dy = tileY - centerY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const distNormalized = dist / this.distanceMax;
				const angle = Math.atan2(dy, dx);
				
				// Apply gravity wells
				let adjustedDist = dist;
				for (const well of this.gravityWells) {
					const wellDist = Math.sqrt(Math.pow(tileX - well.x, 2) + Math.pow(tileY - well.y, 2));
					if (wellDist < well.radius) {
						const influence = (1 - wellDist / well.radius) * well.strength;
						adjustedDist *= (1 - influence * 0.5);
					}
				}
				
				const adjustedDistNormalized = adjustedDist / this.distanceMax;
				
				// Calculate wave with harmonic layers
				let waveSum = 0;
				for (const harmonic of this.harmonicLayers) {
					const rippleFactor = this.tightness * harmonic * (1 + adjustedDistNormalized * this.ripple);
					waveSum += Math.sin(adjustedDistNormalized * rippleFactor + angle - effectiveTime * harmonic);
				}
				let wave = waveSum / this.harmonicLayers.length;
				
				// Add interference sources
				for (const source of this.interferenceSources) {
					const sourceDist = Math.sqrt(Math.pow(tileX - source.x, 2) + Math.pow(tileY - source.y, 2));
					const sourceWave = Math.sin(sourceDist * 0.1 * source.frequency - effectiveTime * 2);
					wave += sourceWave * source.amplitude * 0.3;
				}
				
				// Add distortion trails
				for (const trail of this.distortionTrails) {
					const trailDist = Math.sqrt(Math.pow(tileX - trail.x, 2) + Math.pow(tileY - trail.y, 2));
					if (trailDist < trail.radius) {
						const influence = (1 - trailDist / trail.radius) * trail.strength;
						wave += Math.sin(effectiveTime * 5) * influence * 0.5;
					}
				}
				
				const waveNormalized = (Math.max(-1, Math.min(1, wave)) + 1) / 2;
				const edge1 = 0.5 - this.edge;
				const edge2 = 0.5 + this.edge;
				const waveEdged = Utils.smoothStep(waveNormalized, edge1, edge2);
				const tileSize = this.size * 0.2 + (this.size * 0.8 * waveEdged);
				
				// Draw the tile
				const finalTileX = x + (this.size - tileSize) / 2;
				const finalTileY = y + (this.size - tileSize) / 2;

				this.ctx.fillStyle = this.colors[i][j] || this.blankColor;
				this.ctx.fillRect(finalTileX, finalTileY, tileSize, tileSize);
			}
		}
	}

	drawEffectIndicators() {
		if (!this.ctx) return;
		
		// Draw interference sources
		for (const source of this.interferenceSources) {
			const alpha = source.life * 0.3;
			this.ctx.strokeStyle = `hsla(0, 0%, ${this.isDark ? 100 : 0}%, ${alpha})`;
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(source.x, source.y, 20 * source.amplitude, 0, Math.PI * 2);
			this.ctx.stroke();
		}
		
		// Draw gravity wells
		for (const well of this.gravityWells) {
			if (well.active) {
				const alpha = well.strength * 0.2;
				this.ctx.strokeStyle = `hsla(43, 90%, 50%, ${alpha})`;
				this.ctx.lineWidth = 3;
				this.ctx.beginPath();
				this.ctx.arc(well.x, well.y, 30, 0, Math.PI * 2);
				this.ctx.stroke();
			}
		}
		
		// Draw time dilation zones
		for (const zone of this.timeDilationZones) {
			const alpha = zone.life * 0.15;
			this.ctx.strokeStyle = `hsla(223, 90%, 50%, ${alpha})`;
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(zone.x, zone.y, zone.radius * zone.life, 0, Math.PI * 2);
			this.ctx.stroke();
		}
		
		// Draw UI hints
		this.drawUIHints();
	}

	drawUIHints() {
		if (!this.ctx) return;
		
		const hints = [];
		if (this.paused) hints.push("PAUSED");
		if (this.breathMode) hints.push("BREATH MODE");
		if (this.harmonicLayers.length > 1) hints.push(`HARMONICS: ${this.harmonicLayers.join(", ")}`);
		
		if (hints.length > 0) {
			this.ctx.font = "12px monospace";
			this.ctx.fillStyle = this.isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";
			this.ctx.textAlign = "left";
			hints.forEach((hint, i) => {
				this.ctx.fillText(hint, 10, 20 + i * 20);
			});
		}
	}
}

class Utils {
	static random() {
		return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
	}

	static smoothStep(x, edge1, edge2) {
		x = Math.max(0, Math.min(1, (x - edge1) / (edge2 - edge1)));
		return x * x * (3 - 2 * x);
	}
}
