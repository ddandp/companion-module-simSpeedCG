import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import ModuleInstance from './main.js'

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = [
		{
			id: 'replicants',
			name: 'Replicants',
			definitions: [
				{
					id: 'maintenance',
					name: 'Maintenance',
					description: 'Utility buttons for the NodeCG bridge connection.',
					type: 'simple',
					presets: ['refresh_snapshot'],
				},
			],
		},
		{
			id: 'lowerthirds',
			name: 'Lower Thirds',
			definitions: [
				{
					id: 'lowerthirds_slots',
					name: 'Slots',
					description: 'Buttons labelled from lowerThirdList slots 1-10.',
					type: 'simple',
					presets: [
						'lowerthird_1',
						'lowerthird_2',
						'lowerthird_3',
						'lowerthird_4',
						'lowerthird_5',
						'lowerthird_6',
						'lowerthird_7',
						'lowerthird_8',
						'lowerthird_9',
						'lowerthird_10',
					],
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		refresh_snapshot: {
			type: 'simple',
			name: 'Refresh Replicants',
			style: {
				text: 'Refresh\nReplicants',
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x000000,
				show_topbar: false,
			},
			steps: [
				{
					down: [
						{
							actionId: 'toggle_boolean_replicant',
							options: {
								replicant: 'exampleReplicant',
								bundle: 'exampleBundle',
								name: 'exampleName',
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
	}

	for (let index = 1; index <= 10; index++) {
		const key = `lowerthird_${index}`
		const name = self.getLowerThirdName(index) || `Lower Third ${index}`

		presets[key] = {
			type: 'simple',
			name: `Lower Third ${index}`,
			style: {
				text: `LT${index}\\n${name}`,
				size: 'auto',
				color: 0xffffff,
				bgcolor: 0x1f2937,
				show_topbar: false,
			},
			steps: [
				{
					down: [
						{
							actionId: 'patch_replicant_path',
							options: {
								replicant: 'manual',
								bundle: 'simSpeedCG',
								name: 'lowerThirdControl',
								path: 'selectedSlot',
								value: String(index),
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	self.setPresetDefinitions(structure, presets)
}
