import type { WindowEventType, ScenePhase, CabinFocusTarget } from '../types';

export interface DevPanelCallbacks {
	onTriggerEvent: (type: WindowEventType) => void;
	onSetPhase: (phase: ScenePhase) => void;
	onSetProximity: (proximity: number) => void;
	onTogglePostFx?: (enabled: boolean) => void;
	onFocusTarget: (target: CabinFocusTarget) => void;
	onSetCabinLuminosity?: (multiplier: number) => void;
}

export class DevPanel {
	private container: HTMLElement | null = null;
	private isOpen: boolean = false;

	constructor(callbacks: DevPanelCallbacks) {
		if (!import.meta.env.DEV) return;

		this.createUI(callbacks);
	}

	private createUI(cb: DevPanelCallbacks): void {
		const root = document.createElement('div');
		root.id = 'sonarwave-dev-panel';
		root.style.position = 'fixed';
		root.style.top = '12px';
		root.style.right = '12px';
		root.style.zIndex = '99999';
		root.style.fontFamily = 'monospace';
		root.style.fontSize = '12px';

		const toggleBtn = document.createElement('button');
		toggleBtn.innerText = '⚙ [DEV] ABYSS & EVENTS';
		toggleBtn.style.padding = '6px 12px';
		toggleBtn.style.background = 'rgba(10, 20, 25, 0.9)';
		toggleBtn.style.color = '#00ffcc';
		toggleBtn.style.border = '1px solid #00ffcc';
		toggleBtn.style.borderRadius = '4px';
		toggleBtn.style.cursor = 'pointer';
		toggleBtn.style.boxShadow = '0 2px 8px rgba(0, 255, 204, 0.25)';

		const panel = document.createElement('div');
		panel.style.display = 'none';
		panel.style.marginTop = '8px';
		panel.style.padding = '14px';
		panel.style.background = 'rgba(8, 14, 18, 0.95)';
		panel.style.color = '#e0f0ea';
		panel.style.border = '1px solid #00aa88';
		panel.style.borderRadius = '6px';
		panel.style.width = '320px';
		panel.style.maxHeight = '85vh';
		panel.style.overflowY = 'auto';
		panel.style.backdropFilter = 'blur(6px)';

		toggleBtn.onclick = () => {
			this.isOpen = !this.isOpen;
			panel.style.display = this.isOpen ? 'block' : 'none';
		};

		const phaseTitle = document.createElement('div');
		phaseTitle.innerText = '--- FASE DO CENÁRIO ---';
		phaseTitle.style.color = '#ffaa33';
		phaseTitle.style.fontWeight = 'bold';
		phaseTitle.style.marginBottom = '6px';
		panel.appendChild(phaseTitle);

		const phaseRow = document.createElement('div');
		phaseRow.style.display = 'flex';
		phaseRow.style.gap = '6px';
		phaseRow.style.marginBottom = '12px';

		([1, 2, 3] as ScenePhase[]).forEach((p) => {
			const b = document.createElement('button');
			b.innerText = `Fase ${p}`;
			b.style.flex = '1';
			b.style.padding = '4px';
			b.style.background = '#142226';
			b.style.color = '#88ddcc';
			b.style.border = '1px solid #224440';
			b.style.cursor = 'pointer';
			b.onclick = () => cb.onSetPhase(p);
			phaseRow.appendChild(b);
		});
		panel.appendChild(phaseRow);

		const proxTitle = document.createElement('div');
		proxTitle.innerText = '--- PROXIMIDADE (0 - 100) ---';
		proxTitle.style.color = '#ffaa33';
		proxTitle.style.fontWeight = 'bold';
		proxTitle.style.marginBottom = '4px';
		panel.appendChild(proxTitle);

		const slider = document.createElement('input');
		slider.type = 'range';
		slider.min = '0';
		slider.max = '100';
		slider.value = '10';
		slider.style.width = '100%';
		slider.style.marginBottom = '12px';
		slider.oninput = (e) => cb.onSetProximity(Number((e.target as HTMLInputElement).value));
		panel.appendChild(slider);

		const lumTitle = document.createElement('div');
		lumTitle.innerText = '--- LUMINOSIDADE DA CABINE ---';
		lumTitle.style.color = '#ffaa33';
		lumTitle.style.fontWeight = 'bold';
		lumTitle.style.marginBottom = '4px';
		panel.appendChild(lumTitle);

		const lumHeaderRow = document.createElement('div');
		lumHeaderRow.style.display = 'flex';
		lumHeaderRow.style.justifyContent = 'space-between';
		lumHeaderRow.style.marginBottom = '4px';

		const lumLabel = document.createElement('span');
		lumLabel.innerText = 'Brilho da Cabine:';
		lumLabel.style.color = '#88ddcc';
		lumLabel.style.fontSize = '11px';

		const lumVal = document.createElement('span');
		lumVal.innerText = '70%';
		lumVal.style.color = '#ffea78';
		lumVal.style.fontWeight = 'bold';
		lumVal.style.fontSize = '11px';

		lumHeaderRow.appendChild(lumLabel);
		lumHeaderRow.appendChild(lumVal);
		panel.appendChild(lumHeaderRow);

		const lumSlider = document.createElement('input');
		lumSlider.type = 'range';
		lumSlider.min = '20';
		lumSlider.max = '300';
		lumSlider.value = '70';
		lumSlider.style.width = '100%';
		lumSlider.style.marginBottom = '6px';
		lumSlider.oninput = (e) => {
			const v = Number((e.target as HTMLInputElement).value);
			lumVal.innerText = `${v}%`;
			cb.onSetCabinLuminosity?.(v / 100);
		};
		panel.appendChild(lumSlider);

		const lumPresetsRow = document.createElement('div');
		lumPresetsRow.style.display = 'flex';
		lumPresetsRow.style.gap = '4px';
		lumPresetsRow.style.marginBottom = '12px';

		const lumPresets = [
			{ label: '50%', val: 50 },
			{ label: '100%', val: 100 },
			{ label: '150%', val: 150 },
			{ label: '220%', val: 220 }
		];
		lumPresets.forEach((p) => {
			const btn = document.createElement('button');
			btn.innerText = p.label;
			btn.style.flex = '1';
			btn.style.padding = '3px 2px';
			btn.style.fontSize = '10px';
			btn.style.background = '#142226';
			btn.style.color = '#ffea78';
			btn.style.border = '1px solid #224440';
			btn.style.borderRadius = '3px';
			btn.style.cursor = 'pointer';
			btn.onclick = () => {
				lumSlider.value = String(p.val);
				lumVal.innerText = `${p.val}%`;
				cb.onSetCabinLuminosity?.(p.val / 100);
			};
			lumPresetsRow.appendChild(btn);
		});
		panel.appendChild(lumPresetsRow);

		const focusTitle = document.createElement('div');
		focusTitle.innerText = '--- CÂMERA & VISÃO ---';
		focusTitle.style.color = '#ffaa33';
		focusTitle.style.fontWeight = 'bold';
		focusTitle.style.marginBottom = '6px';
		panel.appendChild(focusTitle);

		const focusGrid = document.createElement('div');
		focusGrid.style.display = 'grid';
		focusGrid.style.gridTemplateColumns = '1fr 1fr';
		focusGrid.style.gap = '4px';
		focusGrid.style.marginBottom = '12px';

		const targets: Array<{ label: string; target: CabinFocusTarget }> = [
			{ label: 'Assento (Reset)', target: 'none' },
			{ label: 'Console A (CRT)', target: 'main' },
			{ label: 'Console B (Aux)', target: 'aux' },
			{ label: 'Janela Lateral', target: 'window' },
			{ label: 'Armário/Manual', target: 'manual' },
			{ label: 'Pôster', target: 'poster' }
		];

		targets.forEach((t) => {
			const b = document.createElement('button');
			b.innerText = t.label;
			b.style.padding = '4px';
			b.style.background = '#142226';
			b.style.color = '#88ddcc';
			b.style.border = '1px solid #224440';
			b.style.cursor = 'pointer';
			b.onclick = () => cb.onFocusTarget(t.target);
			focusGrid.appendChild(b);
		});
		panel.appendChild(focusGrid);

		const eventTitle = document.createElement('div');
		eventTitle.innerText = '--- DISPARAR EVENTO DO ABISSO ---';
		eventTitle.style.color = '#ffaa33';
		eventTitle.style.fontWeight = 'bold';
		eventTitle.style.marginBottom = '6px';
		panel.appendChild(eventTitle);

		const events: Array<{ type: WindowEventType; label: string; tier: string }> = [

			{ type: 'LANTERN_SWARM', label: '1. Cardume de Lanternas', tier: 'T1' },
			{ type: 'SIPHONOPHORE', label: '2. Sifonóforo Gigante', tier: 'T1' },
			{ type: 'GIANT_ISOPODS', label: '3. Isópodes Gigantes', tier: 'T1' },
			{ type: 'LEVIATHAN_SHADOWS', label: '4. Sombras de Leviatãs', tier: 'T1' },

			{ type: 'LURKING_PREDATOR', label: '5. Predador no Leito', tier: 'T2' },
			{ type: 'COLOSSAL_EYE', label: '6. Olho Colossal Cósmico', tier: 'T2' },
			{ type: 'MASSIVE_ECLIPSE', label: '7. O Eclipse da Massa', tier: 'T2' },
			{ type: 'DEAD_DIVER', label: '8. Mergulhador à Deriva', tier: 'T2' },
			{ type: 'LIGHT_FAILURE', label: '9. Falha do Holofote', tier: 'T2' },

			{ type: 'TENTACLE_INSPECTION', label: '10. Tentáculo no Vidro', tier: 'T3' },
			{ type: 'QUARTZ_IMPACT', label: '11. Impacto no Quartzo', tier: 'T3' },
			{ type: 'CLAW_SCRAPE', label: '12. Garras no Vidro', tier: 'T3' },
			{ type: 'MAW_PRESS', label: '13. Mandíbula Dentada', tier: 'T3' }
		];

		const eventList = document.createElement('div');
		eventList.style.display = 'flex';
		eventList.style.flexDirection = 'column';
		eventList.style.gap = '4px';

		events.forEach((ev) => {
			const b = document.createElement('button');
			const color = ev.tier === 'T1' ? '#00ffaa' : ev.tier === 'T2' ? '#ffcc44' : '#ff4455';
			b.innerHTML = `<span style="color: ${color}">[${ev.tier}]</span> ${ev.label}`;
			b.style.padding = '5px';
			b.style.textAlign = 'left';
			b.style.background = '#11181c';
			b.style.color = '#d0e0dc';
			b.style.border = '1px solid #1c2b30';
			b.style.cursor = 'pointer';
			b.style.borderRadius = '3px';
			b.onmouseenter = () => (b.style.borderColor = color);
			b.onmouseleave = () => (b.style.borderColor = '#1c2b30');
			b.onclick = () => cb.onTriggerEvent(ev.type);
			eventList.appendChild(b);
		});
		panel.appendChild(eventList);

		if (cb.onTogglePostFx) {
			const postFxRow = document.createElement('div');
			postFxRow.style.marginTop = '12px';
			postFxRow.style.paddingTop = '8px';
			postFxRow.style.borderTop = '1px solid #223338';
			postFxRow.style.display = 'flex';
			postFxRow.style.justifyContent = 'space-between';
			postFxRow.style.alignItems = 'center';

			const fxLabel = document.createElement('span');
			fxLabel.innerText = 'Pós-Processamento:';
			const fxCheckbox = document.createElement('input');
			fxCheckbox.type = 'checkbox';
			fxCheckbox.checked = false;
			fxCheckbox.onchange = () => cb.onTogglePostFx?.(fxCheckbox.checked);

			postFxRow.appendChild(fxLabel);
			postFxRow.appendChild(fxCheckbox);
			panel.appendChild(postFxRow);
		}

		root.appendChild(toggleBtn);
		root.appendChild(panel);
		document.body.appendChild(root);
		this.container = root;
	}

	public dispose(): void {
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
			this.container = null;
		}
	}
}

