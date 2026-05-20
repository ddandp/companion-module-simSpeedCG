import type { ReplicantValue } from './types.js'

export function normaliseNamespace(namespace: string | undefined): string {
	const trimmed = namespace?.trim() || '/simspeedcg-companion'
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function normaliseSocketPath(path: string | undefined): string {
	const trimmed = path?.trim() || '/socket.io'
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function replicantKey(bundle: string, name: string): string {
	return `${bundle}:${name}`
}

export function variableIdForReplicant(bundle: string, name: string): string {
	return `replicant_${bundle}_${name}`.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function valueToVariableValue(value: ReplicantValue): string | number | boolean | null {
	if (value === null) return null
	if (typeof value === 'string') return value
	if (typeof value === 'number') return value
	if (typeof value === 'boolean') return value
	return JSON.stringify(value)
}

export function encodeReplicantChoice(bundle: string, name: string): string {
	return JSON.stringify([bundle, name])
}

export function decodeReplicantChoice(value: unknown): { bundle: string; name: string } | undefined {
	if (typeof value !== 'string' || value.length === 0) return undefined

	try {
		const parsed = JSON.parse(value)
		if (Array.isArray(parsed) && typeof parsed[0] === 'string' && typeof parsed[1] === 'string') {
			return {
				bundle: parsed[0],
				name: parsed[1],
			}
		}
	} catch {
		// Ignore invalid dropdown values and fall back to manual bundle/name fields.
	}

	return undefined
}

function coerceToString(value: unknown): string {
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`
	if (typeof value === 'bigint') return String(value)
	return ''
}

export function resolveReplicantTarget(options: { replicant?: unknown; bundle?: unknown; name?: unknown }): {
	bundle: string
	name: string
} {
	const selected = decodeReplicantChoice(options.replicant)
	if (selected) return selected

	const bundle = coerceToString(options.bundle).trim()
	const name = coerceToString(options.name).trim()

	if (!bundle || !name) {
		throw new Error('Choose a known Replicant, or provide both Bundle and Replicant name.')
	}

	return { bundle, name }
}

export function parseJsonValue(value: unknown): ReplicantValue {
	const raw = coerceToString(value).trim()

	if (raw.length === 0) {
		throw new Error('Value JSON is empty.')
	}

	return JSON.parse(raw) as ReplicantValue
}

export function getByPath(value: unknown, path: string): unknown {
	const cleanPath = path.trim()
	if (!cleanPath) return value

	const parts = cleanPath
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.filter(Boolean)
	let current: unknown = value

	for (const part of parts) {
		if (current === null || current === undefined) return undefined

		if (Array.isArray(current)) {
			const index = Number(part)
			if (!Number.isInteger(index)) return undefined
			current = current[index]
			continue
		}

		if (typeof current === 'object') {
			current = (current as Record<string, unknown>)[part]
			continue
		}

		return undefined
	}

	return current
}

export function jsonEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b)
}
