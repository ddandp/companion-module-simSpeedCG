import type ModuleInstance from './main.js'
import { encodeReplicantChoice, getByPath, jsonEqual, parseJsonValue, resolveReplicantTarget } from './util.js'
import type { SomeCompanionFeedbackInputField } from '@companion-module/base';

type ReplicantSelectOptions = {
  replicant: string
  bundle: string
  name: string
}

export type FeedbacksSchema = {
  replicant_available: {
    type: 'boolean'
    options: ReplicantSelectOptions
  }
  replicant_truthy: {
    type: 'boolean'
    options: ReplicantSelectOptions & {
      path: string
    }
  }
  replicant_equals: {
    type: 'boolean'
    options: ReplicantSelectOptions & {
      value: string
    }
  }
  replicant_path_equals: {
    type: 'boolean'
    options: ReplicantSelectOptions & {
      path: string
      value: string
    }
  }
  replicant_value: {
    type: 'value'
    options: ReplicantSelectOptions & {
      path: string
    }
  }
}

export function UpdateFeedbacks(self: ModuleInstance): void {
  self.setFeedbackDefinitions({
    replicant_available: {
      name: 'Replicant is available',
      type: 'boolean',
      defaultStyle: {
        bgcolor: 0x00ff00,
        color: 0x000000,
      },
      options: [...replicantTargetOptions(self)],
      callback: (feedback) => {
        const target = resolveReplicantTarget(feedback.options)
        return self.getReplicant(target.bundle, target.name) !== undefined
      },
    },

    replicant_truthy: {
      name: 'Replicant/path is truthy',
      type: 'boolean',
      defaultStyle: {
        bgcolor: 0x00ff00,
        color: 0x000000,
      },
      options: [
        ...replicantTargetOptions(self),
        {
          type: 'textinput',
          id: 'path',
          label: 'Path',
          default: '',
          tooltip: 'Optional dot path, for example runner.name or splits[0].time.',
          useVariables: true,
        },
      ],
      callback: (feedback) => {
        const target = resolveReplicantTarget(feedback.options)
        const value = self.getReplicantValue(target.bundle, target.name)
        const atPath = getByPath(value, String(feedback.options.path ?? ''))

        return !!atPath
      },
    },

    replicant_equals: {
      name: 'Replicant equals JSON value',
      type: 'boolean',
      defaultStyle: {
        bgcolor: 0x00ff00,
        color: 0x000000,
      },
      options: [
        ...replicantTargetOptions(self),
        {
          type: 'textinput',
          id: 'value',
          label: 'Expected JSON value',
          default: 'true',
          multiline: true,
          useVariables: true,
        },
      ],
      callback: (feedback) => {
        const target = resolveReplicantTarget(feedback.options)
        const actual = self.getReplicantValue(target.bundle, target.name)
        const expected = parseJsonValue(feedback.options.value)

        return jsonEqual(actual, expected)
      },
    },

    replicant_path_equals: {
      name: 'Replicant path equals JSON value',
      type: 'boolean',
      defaultStyle: {
        bgcolor: 0x00ff00,
        color: 0x000000,
      },
      options: [
        ...replicantTargetOptions(self),
        {
          type: 'textinput',
          id: 'path',
          label: 'Path',
          default: '',
          tooltip: 'Dot path, for example runner.name or splits[0].time.',
          useVariables: true,
        },
        {
          type: 'textinput',
          id: 'value',
          label: 'Expected JSON value',
          default: '"hello"',
          multiline: true,
          useVariables: true,
        },
      ],
      callback: (feedback) => {
        const target = resolveReplicantTarget(feedback.options)
        const actual = getByPath(self.getReplicantValue(target.bundle, target.name), String(feedback.options.path ?? ''))
        const expected = parseJsonValue(feedback.options.value)

        return jsonEqual(actual, expected)
      },
    },

    replicant_value: {
      name: 'Replicant/path value',
      type: 'value',
      options: [
        ...replicantTargetOptions(self),
        {
          type: 'textinput',
          id: 'path',
          label: 'Path',
          default: '',
          tooltip: 'Optional dot path, for example runner.name or splits[0].time.',
          useVariables: true,
        },
      ],
      callback: (feedback) => {
        const target = resolveReplicantTarget(feedback.options)
        const value = self.getReplicantValue(target.bundle, target.name)
        const atPath = getByPath(value, String(feedback.options.path ?? ''))

        return atPath === undefined ? null : JSON.parse(JSON.stringify(atPath))
      },
    },
  })
}

function replicantTargetOptions(self: ModuleInstance): SomeCompanionFeedbackInputField<'replicant'>[] {
  const replicants = self.getReplicants();

  const choices = [
    { id: 'manual', label: 'Manual entry below' },
    ...replicants.map((item) => ({
      id: encodeReplicantChoice(item.bundle, item.name) as 'replicant',
      label: `${item.bundle}:${item.name}${item.writable ? '' : ' (read-only)'}`,
    })),
  ];

  return [
    {
      type: 'dropdown',
      id: 'replicant',
      label: 'Known Replicant',
      default: 'manual',
      choices,
      minChoicesForSearch: 5,
    },
  ];
}