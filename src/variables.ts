import type ModuleInstance from './main.js'
import { variableIdForReplicant } from './util.js'

export type VariablesSchema = Record<string, string | number | boolean | null | undefined>

export function UpdateVariableDefinitions(self: ModuleInstance): void {
  const definitions: Record<string, { name: string }> = {
    bridge_connected: { name: 'Bridge connected' },
    bridge_status: { name: 'Bridge status' },
    bridge_url: { name: 'Bridge URL' },
    replicant_count: { name: 'Replicant count' },
  }

  for (let index = 1; index <= 10; index++) {
    definitions[`lowerthird_${index}`] = {
      name: `Lower Third ${index} name`,
    }
  }

  for (const replicant of self.getReplicants()) {
    definitions[variableIdForReplicant(replicant.bundle, replicant.name)] = {
      name: `${replicant.bundle}:${replicant.name}`,
    }
  }

  self.setVariableDefinitions(definitions)
}