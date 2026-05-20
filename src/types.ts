export type ReplicantValue =
	| null
	| boolean
	| number
	| string
	| ReplicantValue[]
	| {
			[key: string]: ReplicantValue
	  }

export type ReplicantSnapshot = {
	bundle: string
	name: string
	writable?: boolean
	value: ReplicantValue
}

export type ReplicantUpdate = {
	bundle: string
	name: string
	writable?: boolean
	value: ReplicantValue
	oldValue?: ReplicantValue
}

export type ReplicantRecord = {
	bundle: string
	name: string
	writable: boolean
	value: ReplicantValue
	updatedAt: number
}

export type BridgeAck<T = unknown> =
	| {
			ok: true
			data?: T
	  }
	| {
			ok: false
			error?: string
	  }

export type LowerThirdList = Record<string, string>
