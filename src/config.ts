import type { SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	protocol: 'http' | 'https'
	host: string
	port: number
	namespace: string
	socketPath: string
}

export type ModuleSecrets = {
	token?: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'dropdown',
			id: 'protocol',
			label: 'Protocol',
			width: 4,
			default: 'http',
			choices: [
				{ id: 'http', label: 'HTTP' },
				{ id: 'https', label: 'HTTPS' },
			],
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'NodeCG Host',
			width: 8,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'port',
			label: 'NodeCG Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 9090,
			asInteger: true,
		},
		{
			type: 'textinput',
			id: 'namespace',
			label: 'Socket.IO Namespace',
			width: 8,
			default: '/',
			tooltip: 'Use / for NodeCG. The bridge runs on NodeCG’s existing Socket.IO context.',
		},
		{
			type: 'textinput',
			id: 'socketPath',
			label: 'Socket.IO Path',
			width: 12,
			default: '/socket.io',
			tooltip: 'Leave as /socket.io unless your NodeCG setup changes the Socket.IO path.',
		},
		{
			type: 'secret-text',
			id: 'token',
			label: 'Bridge Token',
			width: 12,
			default: '',
		},
	]
}
