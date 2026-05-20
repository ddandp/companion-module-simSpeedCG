import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { io, type Socket } from 'socket.io-client'

import { UpdateActions, type ActionsSchema } from './actions.js'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import type {
  BridgeAck,
  LowerThirdList,
  ReplicantRecord,
  ReplicantSnapshot,
  ReplicantUpdate,
  ReplicantValue,
} from './types.js'
import {
  normaliseNamespace,
  normaliseSocketPath,
  replicantKey,
  valueToVariableValue,
  variableIdForReplicant,
} from './util.js'

export type ModuleSchema = {
  config: ModuleConfig
  secrets: ModuleSecrets
  actions: ActionsSchema
  feedbacks: FeedbacksSchema
  variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
  config!: ModuleConfig
  secrets: ModuleSecrets = {}

  private socket?: Socket
  private currentUrl = ''
  private statusText = 'disconnected'
  private replicants = new Map<string, ReplicantRecord>()
  private lowerThirdNames: string[] = Array.from({ length: 10 }, () => '')

  constructor(internal: unknown) {
    super(internal)
  }

  async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
    this.config = this.normaliseConfig(config)
    this.secrets = secrets ?? {}

    this.updateVariableDefinitions()
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()

    this.connect()
  }

  async destroy(): Promise<void> {
    this.disconnect()
    this.log('debug', 'destroy')
  }

  async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
    this.config = this.normaliseConfig(config)
    this.secrets = secrets ?? {}
    this.connect()
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return GetConfigFields()
  }

  updateActions(): void {
    UpdateActions(this)
  }

  updateFeedbacks(): void {
    UpdateFeedbacks(this)
  }

  updatePresets(): void {
    UpdatePresets(this)
  }

  updateVariableDefinitions(): void {
    UpdateVariableDefinitions(this)
  }

  getReplicants(): ReplicantRecord[] {
    return [...this.replicants.values()].sort((a, b) => replicantKey(a.bundle, a.name).localeCompare(replicantKey(b.bundle, b.name)))
  }

  getReplicant(bundle: string, name: string): ReplicantRecord | undefined {
    return this.replicants.get(replicantKey(bundle, name))
  }

  getReplicantValue(bundle: string, name: string): ReplicantValue | undefined {
    return this.getReplicant(bundle, name)?.value
  }

  getBridgeUrl(): string {
    return this.currentUrl
  }

  getStatusText(): string {
    return this.statusText
  }

  getLowerThirdName(index: number): string {
    if (!Number.isInteger(index) || index < 1 || index > 10) {
      return ''
    }

    return this.lowerThirdNames[index - 1] || ''
  }

  getLowerThirdNames(): string[] {
    return [...this.lowerThirdNames]
  }

  async setReplicant(bundle: string, name: string, value: ReplicantValue): Promise<void> {
    await this.sendBridgeRequest('replicant:set', { bundle, name, value })
  }

  async patchReplicant(bundle: string, name: string, path: string, value: ReplicantValue): Promise<void> {
    await this.sendBridgeRequest('replicant:patch', { bundle, name, path, value })
  }

  async refreshSnapshot(): Promise<void> {
    const data = await this.sendBridgeRequest<ReplicantSnapshot[]>('replicant:refresh', {})

    if (Array.isArray(data)) {
      this.applySnapshot(data)
    }
  }

  async sendBridgeRequest<T = unknown>(eventName: string, payload: unknown): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('NodeCG bridge is not connected.'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${eventName} ack.`))
      }, 5000)

      this.socket.emit(eventName, payload, (reply: BridgeAck<T>) => {
        clearTimeout(timeout)

        if (reply?.ok) {
          resolve(reply.data)
        } else {
          reject(new Error(reply?.error || `${eventName} failed.`))
        }
      })
    })
  }

  private normaliseConfig(config: ModuleConfig): ModuleConfig {
    return {
      protocol: config?.protocol === 'https' ? 'https' : 'http',
      host: config?.host || '127.0.0.1',
      port: Number(config?.port || 9090),
      namespace: config?.namespace || '/simspeedcg-companion',
      socketPath: config?.socketPath || '/socket.io',
    }
  }

  private connect(): void {
    this.disconnect()
    this.clearReplicants()

    const host = this.config.host.trim()

    if (!host) {
      this.statusText = 'bad config'
      this.currentUrl = ''
      this.updateStatus(InstanceStatus.BadConfig, 'NodeCG host is required.')
      this.updateBaseVariables(false)
      return
    }

    const namespace = normaliseNamespace(this.config.namespace)
    const socketPath = normaliseSocketPath(this.config.socketPath)
    const url = `${this.config.protocol}://${host}:${this.config.port}${namespace}`

    this.currentUrl = url
    this.statusText = 'connecting'
    this.updateStatus(InstanceStatus.Connecting)
    this.updateBaseVariables(false)

    this.socket = io(url, {
      path: socketPath,
      auth: {
        token: this.secrets.token || '',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    this.socket.on('connect', () => {
      this.statusText = 'connected'
      this.updateStatus(InstanceStatus.Ok)
      this.updateBaseVariables(true)

      this.refreshSnapshot().catch((error) => {
        this.log('debug', `Refresh on connect failed: ${String(error?.message || error)}`)
      })
    })

    this.socket.on('disconnect', () => {
      this.statusText = 'disconnected'
      this.updateStatus(InstanceStatus.Disconnected)
      this.updateBaseVariables(false)
    })

    this.socket.on('connect_error', (error) => {
      const message = String(error?.message || error || 'Connection failed')
      this.statusText = message

      if (/auth|token|unauthori[sz]ed/i.test(message)) {
        this.updateStatus(InstanceStatus.AuthenticationFailure, message)
      } else {
        this.updateStatus(InstanceStatus.ConnectionFailure, message)
      }

      this.updateBaseVariables(false)
    })

    this.socket.on('replicant:snapshot', (payload: ReplicantSnapshot[] | { items?: ReplicantSnapshot[] }) => {
      const items = Array.isArray(payload) ? payload : payload.items
      if (Array.isArray(items)) {
        this.applySnapshot(items)
      }
    })

    this.socket.on('replicant:update', (payload: ReplicantUpdate) => {
      this.applyUpdate(payload)
    })

    this.socket.on('lowerThirdList', (payload: LowerThirdList) => {
      this.applyLowerThirdList(payload)
    })
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = undefined
    }
  }

  private clearReplicants(): void {
    const oldVariableIds = [...this.replicants.values()].map((item) => variableIdForReplicant(item.bundle, item.name))
    this.replicants.clear()
    this.resetLowerThirdNames()

    this.updateVariableDefinitions()
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()

    const unsetValues: VariablesSchema = {}
    for (const variableId of oldVariableIds) {
      unsetValues[variableId] = undefined
    }

    for (let index = 1; index <= 10; index++) {
      unsetValues[`lowerthird_${index}`] = ''
    }

    this.setVariableValues({
      ...unsetValues,
      replicant_count: 0,
    })
  }

  private applySnapshot(items: ReplicantSnapshot[]): void {
    const oldVariableIds = new Set([...this.replicants.values()].map((item) => variableIdForReplicant(item.bundle, item.name)))

    this.replicants.clear()

    for (const item of items) {
      this.upsertReplicant(item)
    }

    this.updateVariableDefinitions()
    this.updateActions()
    this.updateFeedbacks()
    this.updatePresets()

    const values: VariablesSchema = {
      replicant_count: this.replicants.size,
    }

    for (const item of this.replicants.values()) {
      const variableId = variableIdForReplicant(item.bundle, item.name)
      values[variableId] = valueToVariableValue(item.value)
      oldVariableIds.delete(variableId)
    }

    for (const oldVariableId of oldVariableIds) {
      values[oldVariableId] = undefined
    }

    this.setVariableValues(values)
    this.checkAllFeedbacks()
  }

  private applyUpdate(item: ReplicantUpdate): void {
    const key = replicantKey(item.bundle, item.name)
    const isNew = !this.replicants.has(key)

    const record = this.upsertReplicant(item)
    const variableId = variableIdForReplicant(record.bundle, record.name)

    if (isNew) {
      this.updateVariableDefinitions()
      this.updateActions()
      this.updateFeedbacks()
      this.updatePresets()
    }

    this.setVariableValues({
      replicant_count: this.replicants.size,
      [variableId]: valueToVariableValue(record.value),
    })

    this.checkFeedbacks('replicant_available', 'replicant_truthy', 'replicant_equals', 'replicant_path_equals', 'replicant_value')
  }

  private upsertReplicant(item: ReplicantSnapshot | ReplicantUpdate): ReplicantRecord {
    const key = replicantKey(item.bundle, item.name)

    const existing = this.replicants.get(key)
    const record: ReplicantRecord = {
      bundle: item.bundle,
      name: item.name,
      writable: item.writable ?? existing?.writable ?? false,
      value: item.value,
      updatedAt: Date.now(),
    }

    this.replicants.set(key, record)
    return record
  }

  private updateBaseVariables(connected: boolean): void {
    const values: VariablesSchema = {
      bridge_connected: connected,
      bridge_status: this.statusText,
      bridge_url: this.currentUrl,
      replicant_count: this.replicants.size,
    }

    for (let index = 1; index <= 10; index++) {
      values[`lowerthird_${index}`] = this.getLowerThirdName(index)
    }

    this.setVariableValues(values)
  }

  private applyLowerThirdList(payload: LowerThirdList): void {
    const next = Array.from({ length: 10 }, () => '')

    for (let index = 1; index <= 10; index++) {
      const value = payload?.[String(index)]
      next[index - 1] = value === undefined || value === null ? '' : String(value)
    }

    this.lowerThirdNames = next
    this.updatePresets()

    const values: VariablesSchema = {}
    for (let index = 1; index <= 10; index++) {
      values[`lowerthird_${index}`] = this.lowerThirdNames[index - 1]
    }

    this.setVariableValues(values)
  }

  private resetLowerThirdNames(): void {
    this.lowerThirdNames = Array.from({ length: 10 }, () => '')
  }
}