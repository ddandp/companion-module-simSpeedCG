import type ModuleInstance from './main.js'
import { encodeReplicantChoice, parseJsonValue, resolveReplicantTarget } from './util.js'
import type { SomeCompanionActionInputField } from '@companion-module/base'

type ReplicantSelectOptions = {
	replicant: string
	bundle: string
	name: string
}

export type ActionsSchema = {
	set_replicant: {
		options: ReplicantSelectOptions & {
			value: string
		}
	}
	patch_replicant_path: {
		options: ReplicantSelectOptions & {
			path: string
			value: string
		}
	}
	toggle_boolean_replicant: {
		options: ReplicantSelectOptions
	}
	increment_number_replicant: {
		options: ReplicantSelectOptions & {
			amount: number
		}
	}
	refresh_snapshot: {
		options: Record<string, never>
	}
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		set_replicant: {
			name: 'Set Replicant',
			description: 'Set the full value of a writable Replicant. Value must be JSON.',
			options: [
				...replicantTargetOptions(self, true),
				{
					type: 'textinput',
					id: 'value',
					label: 'Value JSON',
					default: 'true',
					multiline: true,
					useVariables: true,
				},
			],
			callback: async (event) => {
				const target = resolveReplicantTarget(event.options)
				const value = parseJsonValue(event.options.value)

				await self.setReplicant(target.bundle, target.name, value)
			},
		},

		patch_replicant_path: {
			name: 'Patch Replicant path',
			description:
				'Set a nested path on a writable Replicant. Requires the NodeCG bridge to implement replicant:patch.',
			options: [
				...replicantTargetOptions(self, true),
				{
					type: 'textinput',
					id: 'path',
					label: 'Path',
					default: '',
					tooltip: 'Dot path, for example runner.name or splits[0].time. Leave blank to replace the whole value.',
					useVariables: true,
				},
				{
					type: 'textinput',
					id: 'value',
					label: 'Value JSON',
					default: '"hello"',
					multiline: true,
					useVariables: true,
				},
			],
			callback: async (event) => {
				const target = resolveReplicantTarget(event.options)
				const path = String(event.options.path ?? '').trim()
				const value = parseJsonValue(event.options.value)

				await self.patchReplicant(target.bundle, target.name, path, value)
			},
		},

		toggle_boolean_replicant: {
			name: 'Toggle boolean Replicant',
			description: 'Toggle a writable Replicant whose current value is boolean.',
			options: [...replicantTargetOptions(self, true)],
			callback: async (event) => {
				const target = resolveReplicantTarget(event.options)
				const current = self.getReplicantValue(target.bundle, target.name)

				if (typeof current !== 'boolean') {
					throw new Error(`${target.bundle}:${target.name} is not currently boolean.`)
				}

				await self.setReplicant(target.bundle, target.name, !current)
			},
		},

		increment_number_replicant: {
			name: 'Increment number Replicant',
			description: 'Add an amount to a writable Replicant whose current value is number.',
			options: [
				...replicantTargetOptions(self, true),
				{
					type: 'number',
					id: 'amount',
					label: 'Amount',
					default: 1,
					min: -999999,
					max: 999999,
				},
			],
			callback: async (event) => {
				const target = resolveReplicantTarget(event.options)
				const current = self.getReplicantValue(target.bundle, target.name)

				if (typeof current !== 'number') {
					throw new Error(`${target.bundle}:${target.name} is not currently numeric.`)
				}

				await self.setReplicant(target.bundle, target.name, current + Number(event.options.amount ?? 0))
			},
		},

		refresh_snapshot: {
			name: 'Refresh Replicant snapshot',
			description: 'Ask the NodeCG bridge to resend the full Replicant snapshot.',
			options: [],
			callback: async () => {
				await self.refreshSnapshot()
			},
		},
	})
}

function replicantTargetOptions(
	self: ModuleInstance,
	writableOnly: boolean,
): SomeCompanionActionInputField<'replicant'>[] {
	const replicants = self.getReplicants().filter((item) => !writableOnly || item.writable)

	const choices = [
		{ id: 'manual', label: 'Manual entry below' },
		...replicants.map((item) => ({
			id: encodeReplicantChoice(item.bundle, item.name) as 'replicant',
			label: `${item.bundle}:${item.name}${item.writable ? '' : ' (read-only)'}`,
		})),
	]

	return [
		{
			type: 'dropdown',
			id: 'replicant',
			label: writableOnly ? 'Known writable Replicant' : 'Known Replicant',
			default: 'manual',
			choices,
			minChoicesForSearch: 5,
		},
	]
}
