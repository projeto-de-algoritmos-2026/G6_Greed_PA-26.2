import * as THREE from 'three';
import type { CabinFocusTarget } from '../types';
import type { CRTMonitor } from './crtMonitor';
import type { AuxMonitor } from './auxMonitor';
import type { MedCabinet } from './medCabinet';
import type { DystopianPoster } from './poster';
import type { OpeningsManager } from './openings';
import type { EventDirector } from '../events/director';

export type FocusChangeCallback = (target: CabinFocusTarget) => void;

export class CabinCameraRig {
	public camera: THREE.PerspectiveCamera;
	private canvas: HTMLCanvasElement;
	private onFocusChangeCb?: FocusChangeCallback;

	private seatPosition = new THREE.Vector3(0, 0.72, 3.4);
	private currentCamPos = new THREE.Vector3(0, 0.72, 3.4);
	private targetCamPos = new THREE.Vector3(0, 0.72, 3.4);
	private currentYaw: number = 0;
	private currentPitch: number = -0.06;
	private targetYaw: number = 0;
	private targetPitch: number = -0.06;
	private currentFov: number = 54;
	private targetFov: number = 54;

	private isDragging: boolean = false;
	private lastPointerX: number = 0;
	private lastPointerY: number = 0;
	private pointerDownPos = new THREE.Vector2();

	private raycaster = new THREE.Raycaster();
	private mouseNDC = new THREE.Vector2();
	public cameraShakeIntensity: number = 0;

	private onPointerDownHandler: (e: PointerEvent) => void;
	private onPointerMoveHandler: (e: PointerEvent) => void;
	private onPointerUpHandler: (e: PointerEvent) => void;

	constructor(
		width: number,
		height: number,
		canvas: HTMLCanvasElement,
		crt: CRTMonitor,
		aux: AuxMonitor,
		cabinet: MedCabinet,
		poster: DystopianPoster,
		openings: OpeningsManager,
		eventDirector: EventDirector,
		onCabinetOpen: () => void
	) {
		this.canvas = canvas;
		this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 65);
		this.camera.position.copy(this.currentCamPos);
		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;

		this.onPointerDownHandler = (e: PointerEvent) => {
			this.isDragging = true;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;
			this.pointerDownPos.set(e.clientX, e.clientY);
		};

		this.onPointerMoveHandler = (e: PointerEvent) => {
			if (!this.isDragging) return;
			const dx = e.clientX - this.lastPointerX;
			const dy = e.clientY - this.lastPointerY;
			this.lastPointerX = e.clientX;
			this.lastPointerY = e.clientY;

			this.targetYaw -= dx * 0.0035;
			this.targetPitch -= dy * 0.0035;
			this.targetPitch = Math.max(-0.65, Math.min(0.65, this.targetPitch));
		};

		this.onPointerUpHandler = (e: PointerEvent) => {
			this.isDragging = false;
			const distMoved = this.pointerDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));

			if (distMoved < 10) {
				const rect = this.canvas.getBoundingClientRect();
				this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
				this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

				this.raycaster.setFromCamera(this.mouseNDC, this.camera);

				const crtHits = this.raycaster.intersectObject(crt.screenMesh, false);
				if (crtHits.length > 0 && crtHits[0].uv) {
					const { x, y } = crtHits[0].uv;
					crt.terminalCanvas.handleClickUV(x, y);
					crt.markDirty();
					return;
				}

				const auxHits = this.raycaster.intersectObject(aux.auxScreenMesh, false);
				if (auxHits.length > 0 && auxHits[0].uv) {
					const { x, y } = auxHits[0].uv;
					const handled = aux.auxCanvas.handleClickUV(x, y);
					aux.markDirty();
					if (!handled) {
						this.focusAuxiliaryMonitor();
					}
					return;
				}

				const auxGroupHits = this.raycaster.intersectObjects(aux.group.children, true);
				if (auxGroupHits.length > 0) {
					this.focusAuxiliaryMonitor();
					return;
				}

				const cabinetHits = this.raycaster.intersectObject(cabinet.group, true);
				if (cabinetHits.length > 0) {
					onCabinetOpen();
					this.focusManual();
					return;
				}

				const winHits = this.raycaster.intersectObject(openings.hatchFrame.pivot, true);
				if (winHits.length > 0) {
					this.focusWindow();
					eventDirector.notifyPlayerLookingAtWindow();
					return;
				}

				const posterHits = this.raycaster.intersectObject(poster.group, true);
				if (posterHits.length > 0) {
					this.focusPoster();
					return;
				}
			}
		};

		this.canvas.addEventListener('pointerdown', this.onPointerDownHandler);
		window.addEventListener('pointermove', this.onPointerMoveHandler);
		window.addEventListener('pointerup', this.onPointerUpHandler);
	}

	public onFocusChange(cb: FocusChangeCallback): void {
		this.onFocusChangeCb = cb;
	}

	public focusMonitor(): void {
		this.targetCamPos.copy(this.seatPosition);
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 34;
		this.onFocusChangeCb?.('main');
	}

	public focusAuxiliaryMonitor(): void {
		this.targetCamPos.copy(this.seatPosition);
		this.targetYaw = -0.85;
		this.targetPitch = -0.065;
		this.targetFov = 30;
		this.onFocusChangeCb?.('aux');
	}

	public focusManual(): void {
		this.targetCamPos.set(-3.2, 0.48, 2.3);
		this.targetYaw = Math.PI / 2;
		this.targetPitch = 0.0;
		this.targetFov = 40;
		this.onFocusChangeCb?.('manual');
	}

	public focusWindow(): void {
		this.targetCamPos.set(2.45, 0.95, 2.3);
		this.targetYaw = -Math.PI / 2;
		this.targetPitch = 0.0;
		this.targetFov = 52;
		this.onFocusChangeCb?.('window');
	}

	public focusPoster(): void {
		this.targetCamPos.set(-4.3, 1.05, -0.9);
		this.targetYaw = 0.0;
		this.targetPitch = 0.0;
		this.targetFov = 46;
		this.onFocusChangeCb?.('poster');
	}

	public resetCabinView(): void {
		this.targetCamPos.copy(this.seatPosition);
		this.targetYaw = 0;
		this.targetPitch = -0.06;
		this.targetFov = 54;
		this.onFocusChangeCb?.('none');
	}

	public triggerCameraShake(intensity: number): void {
		this.cameraShakeIntensity = Math.min(1.2, this.cameraShakeIntensity + intensity);
	}

	public resize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	public update(delta: number): void {
		this.currentCamPos.lerp(this.targetCamPos, 0.12);
		this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 0.14);
		this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, 0.14);

		if (Math.abs(this.currentFov - this.targetFov) > 0.05) {
			this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, 0.12);
			this.camera.fov = this.currentFov;
			this.camera.updateProjectionMatrix();
		}

		this.camera.position.copy(this.currentCamPos);

		if (this.cameraShakeIntensity > 0.001) {
			const rx = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			const ry = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.08;
			this.camera.position.x += rx;
			this.camera.position.y += ry;
			this.cameraShakeIntensity *= Math.pow(0.05, delta);
		}

		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.currentYaw;
		this.camera.rotation.x = this.currentPitch;
	}

	public dispose(): void {
		this.canvas.removeEventListener('pointerdown', this.onPointerDownHandler);
		window.removeEventListener('pointermove', this.onPointerMoveHandler);
		window.removeEventListener('pointerup', this.onPointerUpHandler);
	}
}

