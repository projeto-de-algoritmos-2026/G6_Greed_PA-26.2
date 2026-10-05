import * as THREE from 'three';

const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreate(key: string, generator: () => HTMLCanvasElement): THREE.CanvasTexture {
	const cached = textureCache.get(key);
	if (cached) return cached;
	const canvas = generator();
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	textureCache.set(key, tex);
	return tex;
}

export function createHullMetalTexture(): THREE.CanvasTexture {
	return getOrCreate('hull_metal', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		// Base submarine steel-blue
		ctx.fillStyle = '#263b4d';
		ctx.fillRect(0, 0, 512, 512);

		const imgData = ctx.getImageData(0, 0, 512, 512);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const noise = (Math.random() - 0.5) * 26;
			d[i] = Math.max(25, Math.min(80, 42 + noise * 0.8)); // R
			d[i + 1] = Math.max(40, Math.min(115, 68 + noise * 1.0)); // G
			d[i + 2] = Math.max(60, Math.min(155, 96 + noise * 1.3)); // B (distinctly blue)
		}
		ctx.putImageData(imgData, 0, 0);

		// Metallic scratches and horizontal grain
		ctx.strokeStyle = 'rgba(180, 215, 245, 0.06)';
		ctx.lineWidth = 1;
		for (let y = 0; y < 512; y += 3) {
			if (Math.random() < 0.6) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(512, y);
				ctx.stroke();
			}
		}

		ctx.strokeStyle = 'rgba(210, 235, 255, 0.10)';
		for (let s = 0; s < 45; s++) {
			const sx = Math.random() * 512;
			const sy = Math.random() * 512;
			const slen = 10 + Math.random() * 28;
			const sang = (Math.random() - 0.5) * 0.8;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(sx + Math.cos(sang) * slen, sy + Math.sin(sang) * slen);
			ctx.stroke();
		}

		// Procedural rust patches and corrosion spots
		const rustColors = [
			'rgba(168, 76, 26, 0.44)',
			'rgba(135, 58, 18, 0.48)',
			'rgba(192, 94, 32, 0.38)',
			'rgba(94, 40, 14, 0.55)'
		];

		for (let p = 0; p < 16; p++) {
			const px = Math.random() * 512;
			const py = Math.random() * 512;
			const pr = 16 + Math.random() * 46;
			const grad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
			const col = rustColors[p % rustColors.length];
			grad.addColorStop(0, col);
			grad.addColorStop(0.55, 'rgba(125, 52, 18, 0.28)');
			grad.addColorStop(1, 'rgba(38, 59, 77, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(px, py, pr, 0, Math.PI * 2);
			ctx.fill();
		}

		// Vertical rust drips running down metal seams
		for (let d = 0; d < 20; d++) {
			const dx = Math.random() * 512;
			const dy = Math.random() * 180;
			const dLen = 70 + Math.random() * 250;
			const dW = 3 + Math.random() * 7;
			const grad = ctx.createLinearGradient(dx, dy, dx, dy + dLen);
			grad.addColorStop(0, 'rgba(172, 80, 28, 0.56)');
			grad.addColorStop(0.35, 'rgba(138, 60, 20, 0.42)');
			grad.addColorStop(0.8, 'rgba(96, 42, 15, 0.22)');
			grad.addColorStop(1, 'rgba(96, 42, 15, 0)');
			ctx.fillStyle = grad;
			ctx.fillRect(dx - dW / 2, dy, dW, dLen);
		}

		// Deep water grime stains
		ctx.fillStyle = 'rgba(10, 20, 28, 0.35)';
		for (let r = 0; r < 8; r++) {
			const rx = Math.random() * 512;
			const rw = 12 + Math.random() * 30;
			const rh = 80 + Math.random() * 220;
			ctx.fillRect(rx, 0, rw, rh);
		}

		return canvas;
	});
}

export function createDarkRibTexture(): THREE.CanvasTexture {
	return getOrCreate('dark_rib', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		// Base dark submarine navy steel
		ctx.fillStyle = '#1c2e3d';
		ctx.fillRect(0, 0, 256, 256);

		const imgData = ctx.getImageData(0, 0, 256, 256);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const n = (Math.random() - 0.5) * 18;
			d[i] = Math.max(20, Math.min(65, 32 + n * 0.8)); // R
			d[i + 1] = Math.max(30, Math.min(85, 52 + n * 1.0)); // G
			d[i + 2] = Math.max(45, Math.min(120, 78 + n * 1.3)); // B (distinctly blue)
		}
		ctx.putImageData(imgData, 0, 0);

		// Rust on structural seams
		ctx.fillStyle = 'rgba(152, 68, 24, 0.38)';
		ctx.fillRect(0, 0, 256, 6);
		ctx.fillRect(0, 250, 256, 6);
		ctx.fillRect(0, 0, 6, 256);
		ctx.fillRect(250, 0, 6, 256);

		for (let c = 0; c < 8; c++) {
			const cx = Math.random() * 256;
			const cy = Math.random() * 256;
			const cr = 6 + Math.random() * 18;
			const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cr);
			grad.addColorStop(0, 'rgba(168, 76, 28, 0.46)');
			grad.addColorStop(1, 'rgba(28, 46, 61, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(cx, cy, cr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.strokeStyle = 'rgba(180, 215, 245, 0.12)';
		ctx.lineWidth = 2;
		ctx.strokeRect(1, 1, 254, 254);

		ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
		ctx.lineWidth = 2;
		ctx.strokeRect(4, 4, 248, 248);

		return canvas;
	});
}

export function createBasaltRockTexture(): THREE.CanvasTexture {
	return getOrCreate('basalt_rock', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#060a0d';
		ctx.fillRect(0, 0, 512, 512);

		for (let b = 0; b < 120; b++) {
			const bx = Math.random() * 512;
			const by = Math.random() * 512;
			const br = 20 + Math.random() * 60;
			const grad = ctx.createRadialGradient(bx, by, 2, bx, by, br);
			const shade = 14 + Math.floor(Math.random() * 22);
			grad.addColorStop(0, `rgb(${shade + 4}, ${shade + 8}, ${shade + 12})`);
			grad.addColorStop(0.7, `rgb(${shade - 4}, ${shade}, ${shade + 2})`);
			grad.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(bx, by, br, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.strokeStyle = '#020304';
		ctx.lineWidth = 1.5;
		for (let c = 0; c < 24; c++) {
			ctx.beginPath();
			let cx = Math.random() * 512;
			let cy = Math.random() * 512;
			ctx.moveTo(cx, cy);
			for (let step = 0; step < 6; step++) {
				cx += (Math.random() - 0.5) * 45;
				cy += (Math.random() - 0.5) * 45;
				ctx.lineTo(cx, cy);
			}
			ctx.stroke();
		}

		return canvas;
	});
}

export function createSedimentTexture(): THREE.CanvasTexture {
	return getOrCreate('sediment_bed', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#4a5b66';
		ctx.fillRect(0, 0, 512, 512);

		for (let r = 0; r < 28; r++) {
			const ry = (r / 28) * 512;
			const rGrad = ctx.createLinearGradient(0, ry, 0, ry + 16);
			rGrad.addColorStop(0, 'rgba(105, 128, 142, 0.45)');
			rGrad.addColorStop(0.5, 'rgba(55, 70, 80, 0.35)');
			rGrad.addColorStop(1, 'rgba(30, 40, 48, 0.2)');
			ctx.fillStyle = rGrad;
			ctx.beginPath();
			ctx.moveTo(0, ry);
			ctx.bezierCurveTo(128, ry + 8, 384, ry - 8, 512, ry);
			ctx.lineTo(512, ry + 16);
			ctx.bezierCurveTo(384, ry + 8, 128, ry + 24, 0, ry + 16);
			ctx.closePath();
			ctx.fill();
		}

		const imgData = ctx.getImageData(0, 0, 512, 512);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const noise = (Math.random() - 0.5) * 32;
			d[i] = Math.max(45, Math.min(130, d[i] + noise));
			d[i + 1] = Math.max(55, Math.min(145, d[i + 1] + noise * 1.05));
			d[i + 2] = Math.max(65, Math.min(160, d[i + 2] + noise * 1.15));
		}
		ctx.putImageData(imgData, 0, 0);

		ctx.fillStyle = 'rgba(180, 215, 235, 0.5)';
		for (let s = 0; s < 90; s++) {
			const sx = Math.random() * 512;
			const sy = Math.random() * 512;
			ctx.fillRect(sx, sy, 2, 2);
		}

		return canvas;
	});
}

export function createAbyssalSkinTexture(): THREE.CanvasTexture {
	return getOrCreate('abyssal_skin', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#081014';
		ctx.fillRect(0, 0, 512, 512);

		for (let m = 0; m < 90; m++) {
			const mx = Math.random() * 512;
			const my = Math.random() * 512;
			const mr = 15 + Math.random() * 45;
			const grad = ctx.createRadialGradient(mx, my, 2, mx, my, mr);
			grad.addColorStop(0, 'rgba(18, 38, 44, 0.45)');
			grad.addColorStop(0.6, 'rgba(10, 22, 28, 0.2)');
			grad.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(mx, my, mr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.strokeStyle = 'rgba(4, 8, 12, 0.7)';
		ctx.lineWidth = 2;
		for (let l = 0; l < 512; l += 14) {
			ctx.beginPath();
			ctx.moveTo(0, l);
			ctx.bezierCurveTo(170, l + 8, 340, l - 8, 512, l);
			ctx.stroke();
		}

		return canvas;
	});
}

export function createImpactTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;
	ctx.clearRect(0, 0, 512, 512);

	const cx = 256;
	const cy = 256;

	const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 140);
	grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
	grad.addColorStop(0.2, 'rgba(200, 245, 255, 0.75)');
	grad.addColorStop(0.5, 'rgba(90, 185, 210, 0.35)');
	grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(cx, cy, 140, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
	ctx.lineWidth = 3;
	const rays = 20;
	for (let i = 0; i < rays; i++) {
		const angle = (i / rays) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		let r = 0;
		let curX = cx;
		let curY = cy;
		while (r < 235) {
			r += 20 + Math.random() * 32;
			curX = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 16;
			curY = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 16;
			ctx.lineTo(curX, curY);

			if (Math.random() < 0.35 && r > 60) {
				const forkAngle = angle + (Math.random() < 0.5 ? 0.45 : -0.45);
				ctx.moveTo(curX, curY);
				ctx.lineTo(
					curX + Math.cos(forkAngle) * 35 + (Math.random() - 0.5) * 10,
					curY + Math.sin(forkAngle) * 35 + (Math.random() - 0.5) * 10
				);
				ctx.moveTo(curX, curY);
			}
		}
		ctx.stroke();
	}

	for (const rad of [35, 75, 120, 175, 220]) {
		ctx.beginPath();
		ctx.arc(cx, cy, rad, 0, Math.PI * 2);
		ctx.strokeStyle = `rgba(180, 240, 255, ${0.85 - rad / 280})`;
		ctx.lineWidth = 2;
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

export function createScratchTexture(): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext('2d')!;
	ctx.clearRect(0, 0, 512, 512);

	const clawOffsets = [-85, -30, 25, 80];
	for (const ox of clawOffsets) {
		ctx.beginPath();
		ctx.moveTo(256 + ox, 30);
		let curY = 30;
		let curX = 256 + ox;
		while (curY < 480) {
			curY += 18 + Math.random() * 22;
			curX += (Math.random() - 0.5) * 14;
			ctx.lineTo(curX, curY);
		}

		ctx.strokeStyle = 'rgba(235, 255, 250, 0.95)';
		ctx.lineWidth = 4;
		ctx.stroke();

		ctx.strokeStyle = 'rgba(0, 255, 180, 0.38)';
		ctx.lineWidth = 16;
		ctx.stroke();
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

export function createEyeballTexture(): THREE.CanvasTexture {
	return getOrCreate('eyeball_texture', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		const bgGrad = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
		bgGrad.addColorStop(0, '#f4eedb');
		bgGrad.addColorStop(0.7, '#d6cbaf');
		bgGrad.addColorStop(1, '#877c64');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, 512, 512);

		const numVessels = 32;
		for (let v = 0; v < numVessels; v++) {
			const angle = (v / numVessels) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
			ctx.beginPath();
			let r = 250;
			let x = 256 + Math.cos(angle) * r;
			let y = 256 + Math.sin(angle) * r;
			ctx.moveTo(x, y);

			while (r > 130) {
				r -= 12 + Math.random() * 18;
				const jitter = (Math.random() - 0.5) * 0.25;
				x = 256 + Math.cos(angle + jitter) * r;
				y = 256 + Math.sin(angle + jitter) * r;
				ctx.lineTo(x, y);

				if (Math.random() < 0.4 && r > 150) {
					const subAngle = angle + (Math.random() < 0.5 ? 0.3 : -0.3);
					ctx.moveTo(x, y);
					ctx.lineTo(
						x + Math.cos(subAngle) * 25,
						y + Math.sin(subAngle) * 25
					);
					ctx.moveTo(x, y);
				}
			}
			ctx.strokeStyle = Math.random() < 0.3 ? 'rgba(120, 20, 45, 0.75)' : 'rgba(165, 30, 30, 0.8)';
			ctx.lineWidth = 1.2 + Math.random() * 1.5;
			ctx.stroke();
		}

		const limbusGrad = ctx.createRadialGradient(256, 256, 110, 256, 256, 140);
		limbusGrad.addColorStop(0, 'rgba(15, 35, 25, 0)');
		limbusGrad.addColorStop(0.8, 'rgba(15, 35, 25, 0.6)');
		limbusGrad.addColorStop(1, 'rgba(5, 15, 10, 0.95)');
		ctx.fillStyle = limbusGrad;
		ctx.beginPath();
		ctx.arc(256, 256, 140, 0, Math.PI * 2);
		ctx.fill();

		const irisGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 125);
		irisGrad.addColorStop(0, '#e5a522');
		irisGrad.addColorStop(0.4, '#b07510');
		irisGrad.addColorStop(0.8, '#445e33');
		irisGrad.addColorStop(1, '#1b2d18');
		ctx.fillStyle = irisGrad;
		ctx.beginPath();
		ctx.arc(256, 256, 125, 0, Math.PI * 2);
		ctx.fill();

		for (let s = 0; s < 180; s++) {
			const sang = (s / 180) * Math.PI * 2;
			ctx.beginPath();
			ctx.moveTo(256 + Math.cos(sang) * 35, 256 + Math.sin(sang) * 35);
			ctx.lineTo(256 + Math.cos(sang) * 123, 256 + Math.sin(sang) * 123);
			ctx.strokeStyle = s % 2 === 0 ? 'rgba(255, 220, 100, 0.45)' : 'rgba(20, 40, 15, 0.6)';
			ctx.lineWidth = 1.2;
			ctx.stroke();
		}

		ctx.save();
		ctx.translate(256, 256);
		ctx.scale(0.28, 1.0);
		ctx.beginPath();
		ctx.arc(0, 0, 95, 0, Math.PI * 2);
		ctx.fillStyle = '#010203';
		ctx.fill();
		ctx.restore();

		return canvas;
	});
}

export function createGlazedEyeTexture(): THREE.CanvasTexture {
	return getOrCreate('glazed_eyeball_texture', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		const bgGrad = ctx.createRadialGradient(256, 256, 60, 256, 256, 256);
		bgGrad.addColorStop(0, '#bcc7c7');
		bgGrad.addColorStop(0.65, '#8c9c9b');
		bgGrad.addColorStop(1, '#4e5c5b');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, 512, 512);

		const numVessels = 36;
		for (let v = 0; v < numVessels; v++) {
			const angle = (v / numVessels) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
			ctx.beginPath();
			let r = 252;
			let x = 256 + Math.cos(angle) * r;
			let y = 256 + Math.sin(angle) * r;
			ctx.moveTo(x, y);

			while (r > 125) {
				r -= 10 + Math.random() * 16;
				const jitter = (Math.random() - 0.5) * 0.28;
				x = 256 + Math.cos(angle + jitter) * r;
				y = 256 + Math.sin(angle + jitter) * r;
				ctx.lineTo(x, y);

				if (Math.random() < 0.35 && r > 145) {
					const subAngle = angle + (Math.random() < 0.5 ? 0.35 : -0.35);
					ctx.moveTo(x, y);
					ctx.lineTo(
						x + Math.cos(subAngle) * 20,
						y + Math.sin(subAngle) * 20
					);
					ctx.moveTo(x, y);
				}
			}
			ctx.strokeStyle = Math.random() < 0.4 ? 'rgba(55, 35, 60, 0.7)' : 'rgba(30, 50, 55, 0.75)';
			ctx.lineWidth = 1.3 + Math.random() * 1.4;
			ctx.stroke();
		}

		const limbusGrad = ctx.createRadialGradient(256, 256, 105, 256, 256, 145);
		limbusGrad.addColorStop(0, 'rgba(160, 185, 185, 0.1)');
		limbusGrad.addColorStop(0.7, 'rgba(70, 95, 95, 0.65)');
		limbusGrad.addColorStop(1, 'rgba(25, 40, 42, 0.95)');
		ctx.fillStyle = limbusGrad;
		ctx.beginPath();
		ctx.arc(256, 256, 145, 0, Math.PI * 2);
		ctx.fill();

		const irisGrad = ctx.createRadialGradient(256, 256, 25, 256, 256, 130);
		irisGrad.addColorStop(0, '#c8d8d6');
		irisGrad.addColorStop(0.4, '#9fb4b2');
		irisGrad.addColorStop(0.75, '#6a8280');
		irisGrad.addColorStop(1, '#3b4e4d');
		ctx.fillStyle = irisGrad;
		ctx.beginPath();
		ctx.arc(256, 256, 130, 0, Math.PI * 2);
		ctx.fill();

		for (let s = 0; s < 160; s++) {
			const sang = (s / 160) * Math.PI * 2;
			ctx.beginPath();
			ctx.moveTo(256 + Math.cos(sang) * 32, 256 + Math.sin(sang) * 32);
			ctx.lineTo(256 + Math.cos(sang) * 128, 256 + Math.sin(sang) * 128);
			ctx.strokeStyle = s % 2 === 0 ? 'rgba(235, 245, 245, 0.35)' : 'rgba(50, 70, 70, 0.45)';
			ctx.lineWidth = 1.0;
			ctx.stroke();
		}

		ctx.save();
		ctx.translate(256, 256);
		ctx.scale(0.85, 1.0);
		ctx.beginPath();
		ctx.arc(0, 0, 80, 0, Math.PI * 2);
		ctx.fillStyle = '#0f1719';
		ctx.fill();
		ctx.restore();

		const cataractGrad = ctx.createRadialGradient(256, 256, 10, 256, 256, 110);
		cataractGrad.addColorStop(0, 'rgba(215, 230, 230, 0.7)');
		cataractGrad.addColorStop(0.45, 'rgba(170, 195, 195, 0.45)');
		cataractGrad.addColorStop(0.85, 'rgba(120, 150, 150, 0.2)');
		cataractGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
		ctx.fillStyle = cataractGrad;
		ctx.beginPath();
		ctx.arc(256, 256, 110, 0, Math.PI * 2);
		ctx.fill();

		return canvas;
	});
}

export function createDiverSuitTexture(): THREE.CanvasTexture {
	return getOrCreate('diver_suit_texture', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#5a5e4b';
		ctx.fillRect(0, 0, 512, 512);

		const imgData = ctx.getImageData(0, 0, 512, 512);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const n = (Math.random() - 0.5) * 35;
			d[i] = Math.max(30, Math.min(130, d[i] + n * 1.2));
			d[i + 1] = Math.max(35, Math.min(130, d[i + 1] + n * 1.1));
			d[i + 2] = Math.max(25, Math.min(100, d[i + 2] + n * 0.8));
		}
		ctx.putImageData(imgData, 0, 0);

		for (let r = 0; r < 40; r++) {
			const rx = Math.random() * 512;
			const ry = Math.random() * 512;
			const rr = 15 + Math.random() * 55;
			const rGrad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rr);
			rGrad.addColorStop(0, 'rgba(140, 50, 15, 0.7)');
			rGrad.addColorStop(0.5, 'rgba(95, 32, 10, 0.45)');
			rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = rGrad;
			ctx.beginPath();
			ctx.arc(rx, ry, rr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.save();
		ctx.fillStyle = 'rgba(215, 160, 20, 0.35)';
		for (let x = -200; x < 700; x += 60) {
			ctx.beginPath();
			ctx.moveTo(x, 210);
			ctx.lineTo(x + 30, 210);
			ctx.lineTo(x + 10, 280);
			ctx.lineTo(x - 20, 280);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();

		ctx.font = 'bold 36px monospace';
		ctx.fillStyle = 'rgba(220, 225, 230, 0.45)';
		ctx.textAlign = 'center';
		ctx.fillText('TARTARUS-04', 256, 175);
		ctx.font = '16px monospace';
		ctx.fillText('DEEP ATMOSPHERIC SUIT // 12.000M', 256, 325);

		ctx.fillStyle = '#1c221e';
		for (let bx = 20; bx < 512; bx += 48) {
			ctx.beginPath();
			ctx.arc(bx, 25, 6, 0, Math.PI * 2);
			ctx.arc(bx, 485, 6, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createChitinTexture(): THREE.CanvasTexture {
	return getOrCreate('chitin_texture', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#182422';
		ctx.fillRect(0, 0, 512, 512);

		for (let y = 0; y < 512; y += 32) {
			const sGrad = ctx.createLinearGradient(0, y, 0, y + 32);
			sGrad.addColorStop(0, 'rgba(45, 68, 62, 0.6)');
			sGrad.addColorStop(0.3, 'rgba(25, 42, 38, 0.3)');
			sGrad.addColorStop(0.85, 'rgba(8, 14, 12, 0.7)');
			sGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
			ctx.fillStyle = sGrad;
			ctx.fillRect(0, y, 512, 32);

			ctx.strokeStyle = '#070d0b';
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(512, y);
			ctx.stroke();
		}

		for (let n = 0; n < 350; n++) {
			const tx = Math.random() * 512;
			const ty = Math.random() * 512;
			const tr = 1.5 + Math.random() * 3.5;
			const tGrad = ctx.createRadialGradient(tx - 1, ty - 1, 0.5, tx, ty, tr);
			tGrad.addColorStop(0, 'rgba(95, 140, 125, 0.8)');
			tGrad.addColorStop(0.5, 'rgba(30, 48, 42, 0.5)');
			tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = tGrad;
			ctx.beginPath();
			ctx.arc(tx, ty, tr, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createPaleGhoulSkinTexture(): THREE.CanvasTexture {
	return getOrCreate('pale_ghoul_skin', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#a2adb1';
		ctx.fillRect(0, 0, 512, 512);

		for (let m = 0; m < 50; m++) {
			const mx = Math.random() * 512;
			const my = Math.random() * 512;
			const mr = 30 + Math.random() * 80;
			const grad = ctx.createRadialGradient(mx, my, 5, mx, my, mr);
			grad.addColorStop(0, 'rgba(125, 140, 148, 0.5)');
			grad.addColorStop(0.5, 'rgba(145, 130, 145, 0.25)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(mx, my, mr, 0, Math.PI * 2);
			ctx.fill();
		}

		for (let v = 0; v < 18; v++) {
			ctx.beginPath();
			let vx = Math.random() * 512;
			let vy = Math.random() * 512;
			ctx.moveTo(vx, vy);
			const steps = 8 + Math.floor(Math.random() * 8);
			for (let s = 0; s < steps; s++) {
				vx += (Math.random() - 0.5) * 60;
				vy += (Math.random() - 0.5) * 60;
				ctx.lineTo(vx, vy);
			}
			ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(75, 45, 85, 0.35)' : 'rgba(40, 65, 95, 0.3)';
			ctx.lineWidth = 1.5 + Math.random() * 2.0;
			ctx.stroke();
		}

		return canvas;
	});
}

export function createTentacleSkinTexture(): THREE.CanvasTexture {
	return getOrCreate('tentacle_skin', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#32101c';
		ctx.fillRect(0, 0, 512, 512);

		for (let y = 0; y < 512; y += 18) {
			ctx.fillStyle = y % 36 === 0 ? 'rgba(80, 24, 42, 0.45)' : 'rgba(20, 6, 12, 0.5)';
			ctx.fillRect(0, y, 512, 8);
		}

		for (let c = 0; c < 500; c++) {
			const cx = Math.random() * 512;
			const cy = Math.random() * 512;
			const cr = 1.5 + Math.random() * 4.5;
			const cGrad = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, cr);
			cGrad.addColorStop(0, '#150308');
			cGrad.addColorStop(0.6, '#5a1228');
			cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = cGrad;
			ctx.beginPath();
			ctx.arc(cx, cy, cr, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createMawFleshTexture(): THREE.CanvasTexture {
	return getOrCreate('maw_flesh', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#420b12';
		ctx.fillRect(0, 0, 512, 512);

		for (let f = 0; f < 30; f++) {
			const fy = (f / 30) * 512;
			const grad = ctx.createLinearGradient(0, fy, 0, fy + 24);
			grad.addColorStop(0, 'rgba(110, 20, 32, 0.7)');
			grad.addColorStop(0.4, 'rgba(60, 10, 18, 0.4)');
			grad.addColorStop(1, 'rgba(20, 2, 5, 0.85)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.moveTo(0, fy);
			ctx.bezierCurveTo(170, fy + 15, 340, fy - 15, 512, fy);
			ctx.lineTo(512, fy + 24);
			ctx.bezierCurveTo(340, fy + 9, 170, fy + 39, 0, fy + 24);
			ctx.closePath();
			ctx.fill();
		}

		for (let b = 0; b < 25; b++) {
			const bx = Math.random() * 512;
			const by = Math.random() * 512;
			const br = 10 + Math.random() * 35;
			const bGrad = ctx.createRadialGradient(bx, by, 2, bx, by, br);
			bGrad.addColorStop(0, 'rgba(160, 140, 25, 0.35)');
			bGrad.addColorStop(0.7, 'rgba(80, 70, 10, 0.15)');
			bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = bGrad;
			ctx.beginPath();
			ctx.arc(bx, by, br, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createHydrothermalSulfideTexture(): THREE.CanvasTexture {
	return getOrCreate('hydrothermal_sulfide', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#0c0f13';
		ctx.fillRect(0, 0, 512, 512);

		for (let i = 0; i < 90; i++) {
			const x = Math.random() * 512;
			const y = Math.random() * 512;
			const r = 10 + Math.random() * 35;
			const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
			const isCopper = Math.random() < 0.35;
			if (isCopper) {
				grad.addColorStop(0, 'rgba(180, 140, 50, 0.45)');
				grad.addColorStop(0.6, 'rgba(100, 75, 20, 0.25)');
			} else {
				grad.addColorStop(0, 'rgba(60, 75, 80, 0.4)');
				grad.addColorStop(0.7, 'rgba(25, 30, 35, 0.2)');
			}
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}

		for (let s = 0; s < 25; s++) {
			const sx = Math.random() * 512;
			const sy = Math.random() * 512;
			const sr = 6 + Math.random() * 18;
			ctx.fillStyle = 'rgba(190, 180, 85, 0.32)';
			ctx.beginPath();
			ctx.arc(sx, sy, sr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.lineWidth = 1.8;
		for (let f = 0; f < 18; f++) {
			let fx = Math.random() * 512;
			let fy = Math.random() * 512;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			ctx.strokeStyle = Math.random() < 0.4 ? 'rgba(255, 90, 20, 0.75)' : '#020304';
			for (let step = 0; step < 7; step++) {
				fx += (Math.random() - 0.5) * 35;
				fy += (Math.random() - 0.5) * 35;
				ctx.lineTo(fx, fy);
			}
			ctx.stroke();
		}

		return canvas;
	});
}

export function createManganeseNoduleTexture(): THREE.CanvasTexture {
	return getOrCreate('manganese_nodule', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#0a0d10';
		ctx.fillRect(0, 0, 256, 256);

		for (let i = 0; i < 60; i++) {
			const nx = Math.random() * 256;
			const ny = Math.random() * 256;
			const nr = 8 + Math.random() * 22;
			const grad = ctx.createRadialGradient(nx, ny, 2, nx, ny, nr);
			grad.addColorStop(0, 'rgba(40, 50, 58, 0.6)');
			grad.addColorStop(0.5, 'rgba(20, 26, 30, 0.4)');
			grad.addColorStop(1, 'rgba(5, 8, 10, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(nx, ny, nr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
		for (let p = 0; p < 80; p++) {
			const px = Math.random() * 256;
			const py = Math.random() * 256;
			ctx.fillRect(px, py, 2, 2);
		}

		return canvas;
	});
}

export function createTubeWormTexture(): THREE.CanvasTexture {
	return getOrCreate('tube_worm', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#dadfd8';
		ctx.fillRect(0, 0, 256, 256);

		for (let y = 0; y < 256; y += 8) {
			ctx.fillStyle = y % 16 === 0 ? 'rgba(70, 75, 70, 0.35)' : 'rgba(120, 110, 95, 0.18)';
			ctx.fillRect(0, y, 256, 3);
		}

		const baseGrad = ctx.createLinearGradient(0, 160, 0, 256);
		baseGrad.addColorStop(0, 'rgba(40, 45, 40, 0)');
		baseGrad.addColorStop(1, 'rgba(18, 22, 20, 0.85)');
		ctx.fillStyle = baseGrad;
		ctx.fillRect(0, 160, 256, 96);

		return canvas;
	});
}

export function createTrenchCliffTexture(): THREE.CanvasTexture {
	return getOrCreate('trench_cliff', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#081014';
		ctx.fillRect(0, 0, 512, 512);

		for (let s = 0; s < 45; s++) {
			const x = Math.random() * 512;
			const w = 4 + Math.random() * 14;
			const grad = ctx.createLinearGradient(x, 0, x + w, 0);
			grad.addColorStop(0, 'rgba(25, 45, 52, 0.1)');
			grad.addColorStop(0.5, 'rgba(42, 68, 75, 0.45)');
			grad.addColorStop(1, 'rgba(12, 22, 26, 0.1)');
			ctx.fillStyle = grad;
			ctx.fillRect(x, 0, w, 512);
		}

		for (let b = 0; b < 24; b++) {
			const by = (b / 24) * 512;
			ctx.strokeStyle = 'rgba(3, 6, 8, 0.85)';
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.moveTo(0, by);
			ctx.lineTo(512, by + (Math.random() - 0.5) * 20);
			ctx.stroke();
		}

		return canvas;
	});
}

export function createWhaleBoneTexture(): THREE.CanvasTexture {
	return getOrCreate('whale_bone', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#b8baa8';
		ctx.fillRect(0, 0, 512, 512);

		const imgData = ctx.getImageData(0, 0, 512, 512);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const noise = (Math.random() - 0.5) * 35;
			d[i] = Math.max(90, Math.min(220, d[i] + noise));
			d[i + 1] = Math.max(95, Math.min(220, d[i + 1] + noise));
			d[i + 2] = Math.max(80, Math.min(200, d[i + 2] + noise));
		}
		ctx.putImageData(imgData, 0, 0);

		for (let m = 0; m < 40; m++) {
			const mx = Math.random() * 512;
			const my = Math.random() * 512;
			const mr = 12 + Math.random() * 40;
			const grad = ctx.createRadialGradient(mx, my, 2, mx, my, mr);
			grad.addColorStop(0, 'rgba(80, 110, 65, 0.5)');
			grad.addColorStop(0.6, 'rgba(45, 65, 40, 0.3)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(mx, my, mr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.strokeStyle = 'rgba(30, 32, 28, 0.7)';
		ctx.lineWidth = 1.5;
		for (let f = 0; f < 14; f++) {
			let fx = Math.random() * 512;
			let fy = Math.random() * 512;
			ctx.beginPath();
			ctx.moveTo(fx, fy);
			for (let step = 0; step < 8; step++) {
				fx += (Math.random() - 0.5) * 12;
				fy += 25 + Math.random() * 30;
				ctx.lineTo(fx, fy);
			}
			ctx.stroke();
		}

		return canvas;
	});
}

export function createBacterialMatTexture(): THREE.CanvasTexture {
	return getOrCreate('bacterial_mat', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 256;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#061012';
		ctx.fillRect(0, 0, 256, 256);

		for (let i = 0; i < 40; i++) {
			const bx = Math.random() * 256;
			const by = Math.random() * 256;
			const br = 15 + Math.random() * 45;
			const grad = ctx.createRadialGradient(bx, by, 4, bx, by, br);
			grad.addColorStop(0, 'rgba(230, 240, 215, 0.75)');
			grad.addColorStop(0.5, 'rgba(180, 205, 170, 0.4)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(bx, by, br, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createDiatomOozeTexture(): THREE.CanvasTexture {
	return getOrCreate('diatom_ooze', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#788894';
		ctx.fillRect(0, 0, 512, 512);

		const imgData = ctx.getImageData(0, 0, 512, 512);
		const d = imgData.data;
		for (let i = 0; i < d.length; i += 4) {
			const noise = (Math.random() - 0.5) * 24;
			d[i] = Math.max(90, Math.min(185, d[i] + noise));
			d[i + 1] = Math.max(100, Math.min(195, d[i + 1] + noise));
			d[i + 2] = Math.max(110, Math.min(205, d[i + 2] + noise));
		}
		ctx.putImageData(imgData, 0, 0);

		ctx.strokeStyle = 'rgba(35, 42, 48, 0.35)';
		ctx.lineWidth = 2;
		for (let t = 0; t < 18; t++) {
			let tx = Math.random() * 512;
			let ty = Math.random() * 512;
			ctx.beginPath();
			ctx.moveTo(tx, ty);
			for (let step = 0; step < 6; step++) {
				tx += (Math.random() - 0.5) * 45;
				ty += (Math.random() - 0.5) * 45;
				ctx.lineTo(tx, ty);
			}
			ctx.stroke();
		}

		for (let c = 0; c < 35; c++) {
			const cx = Math.random() * 512;
			const cy = Math.random() * 512;
			const cr = 3 + Math.random() * 8;
			const cGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, cr);
			cGrad.addColorStop(0, 'rgba(25, 30, 35, 0.6)');
			cGrad.addColorStop(0.8, 'rgba(80, 92, 100, 0.2)');
			cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = cGrad;
			ctx.beginPath();
			ctx.arc(cx, cy, cr, 0, Math.PI * 2);
			ctx.fill();
		}

		return canvas;
	});
}

export function createSerpentiniteSpireTexture(): THREE.CanvasTexture {
	return getOrCreate('serpentinite_spire', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#7a8c88';
		ctx.fillRect(0, 0, 512, 512);

		for (let p = 0; p < 70; p++) {
			const px = Math.random() * 512;
			const py = Math.random() * 512;
			const pr = 8 + Math.random() * 32;
			const grad = ctx.createRadialGradient(px, py, 2, px, py, pr);
			grad.addColorStop(0, 'rgba(225, 238, 230, 0.65)');
			grad.addColorStop(0.6, 'rgba(140, 160, 155, 0.35)');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(px, py, pr, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.strokeStyle = 'rgba(20, 30, 28, 0.85)';
		ctx.lineWidth = 2;
		for (let c = 0; c < 22; c++) {
			let cx = Math.random() * 512;
			let cy = Math.random() * 512;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			for (let step = 0; step < 7; step++) {
				cx += (Math.random() - 0.5) * 30;
				cy += 20 + Math.random() * 35;
				ctx.lineTo(cx, cy);
			}
			ctx.stroke();
		}

		return canvas;
	});
}

export function createCrushedTitaniumTexture(): THREE.CanvasTexture {
	return getOrCreate('crushed_titanium', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		ctx.fillStyle = '#1c2630';
		ctx.fillRect(0, 0, 512, 512);

		for (let i = 0; i < 60; i++) {
			const ix = Math.random() * 512;
			const iy = Math.random() * 512;
			const iw = 20 + Math.random() * 80;
			const ih = 10 + Math.random() * 25;
			ctx.fillStyle = Math.random() < 0.5 ? 'rgba(50, 70, 85, 0.4)' : 'rgba(8, 14, 20, 0.6)';
			ctx.fillRect(ix, iy, iw, ih);
		}

		ctx.save();
		ctx.translate(60, 60);
		ctx.rotate(-Math.PI / 4);
		for (let s = -100; s < 300; s += 36) {
			ctx.fillStyle = 'rgba(210, 160, 30, 0.7)';
			ctx.fillRect(s, 0, 18, 140);
		}
		ctx.restore();

		ctx.strokeStyle = 'rgba(200, 220, 240, 0.6)';
		ctx.lineWidth = 1.5;
		for (let c = 0; c < 15; c++) {
			const cx = Math.random() * 512;
			const cy = Math.random() * 512;
			const len = 30 + Math.random() * 60;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(cx + len, cy + (Math.random() - 0.5) * 30);
			ctx.stroke();
		}

		const leakGrad = ctx.createLinearGradient(0, 0, 512, 512);
		leakGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
		leakGrad.addColorStop(0.7, 'rgba(5, 8, 12, 0.5)');
		leakGrad.addColorStop(1, 'rgba(2, 4, 6, 0.85)');
		ctx.fillStyle = leakGrad;
		ctx.fillRect(0, 0, 512, 512);

		return canvas;
	});
}

