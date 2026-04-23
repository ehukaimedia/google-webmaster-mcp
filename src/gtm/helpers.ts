import type {
    GtmBuiltInVariable,
    GtmCondition,
    GtmEventParameterSpec,
    GtmGa4ConfigurationOptions,
    GtmGa4EventOptions,
    GtmParameter,
    GtmTag,
    GtmTrigger,
    GtmVariable,
    GtmVariableReference,
    GtmWorkspaceValidationResult,
} from './types.js';

const MACRO_PATTERN = /\{\{([^}]+)\}\}/;

function templateParameter(key: string, value: string): GtmParameter {
    return { type: 'template', key, value };
}

function booleanParameter(key: string, value: boolean): GtmParameter {
    return { type: 'boolean', key, value: value ? 'true' : 'false' };
}

function mapParameter(entries: GtmParameter[]): GtmParameter {
    return { type: 'map', map: entries };
}

function listParameter(key: string, list: GtmParameter[]): GtmParameter {
    return { type: 'list', key, list };
}

function isVariableReference(spec: GtmEventParameterSpec): spec is GtmVariableReference {
    return typeof spec === 'object' && spec !== null && !Array.isArray(spec);
}

export function buildHtmlParameters(html: string): GtmParameter[] {
    return [templateParameter('html', html)];
}

export function buildCustomEventFilter(triggerName: string): GtmCondition[] {
    return [{
        type: 'equals',
        parameter: [
            templateParameter('arg0', '{{_event}}'),
            templateParameter('arg1', triggerName),
        ],
    }];
}

export function buildGa4ConfigurationParameters(
    measurementId: string,
    options?: Pick<GtmGa4ConfigurationOptions, 'sendPageView' | 'fieldsToSet'>
): GtmParameter[] {
    const parameters: GtmParameter[] = [templateParameter('measurementId', measurementId)];

    if (typeof options?.sendPageView === 'boolean') {
        parameters.push(booleanParameter('sendPageView', options.sendPageView));
    }

    if (options?.fieldsToSet && Object.keys(options.fieldsToSet).length > 0) {
        parameters.push(listParameter(
            'fieldsToSet',
            Object.entries(options.fieldsToSet).map(([key, value]) => mapParameter([
                templateParameter('name', key),
                templateParameter('value', String(value)),
            ])),
        ));
    }

    return parameters;
}

export function resolveEventParameterValue(
    spec: GtmEventParameterSpec,
    variablesById: Map<string, GtmVariable> = new Map(),
    variablesByName: Map<string, GtmVariable> = new Map()
): string {
    if (isVariableReference(spec)) {
        if ('value' in spec) {
            return String(spec.value);
        }

        if ('varId' in spec) {
            const variableId = String(spec.varId);
            const variable = variablesById.get(variableId);
            return variable?.name ? `{{${variable.name}}}` : `{{${variableId}}}`;
        }

        if ('var' in spec) {
            const variableName = String(spec.var);
            const variable = variablesByName.get(variableName);
            return variable?.name ? `{{${variable.name}}}` : `{{${variableName}}}`;
        }
    }

    return String(spec);
}

export function buildGa4EventParameters(
    measurementId: string | undefined,
    eventName: string,
    options?: Pick<GtmGa4EventOptions, 'configTagId' | 'eventParameters'>,
    variables: GtmVariable[] = []
): GtmParameter[] {
    const parameters: GtmParameter[] = [templateParameter('eventName', eventName)];

    if (options?.configTagId) {
        parameters.push({ type: 'tagReference', key: 'sendToTag', value: options.configTagId });
    } else if (measurementId) {
        parameters.push(templateParameter('measurementId', measurementId));
        parameters.push(listParameter('measurementIdOverride', [{ type: 'template', value: measurementId }]));
    } else {
        throw new Error('Either configTagId or measurementId is required');
    }

    if (options?.eventParameters && Object.keys(options.eventParameters).length > 0) {
        const variablesById = new Map<string, GtmVariable>();
        const variablesByName = new Map<string, GtmVariable>();

        for (const variable of variables) {
            if (variable.variableId) {
                variablesById.set(String(variable.variableId), variable);
            }
            if (variable.name) {
                variablesByName.set(String(variable.name), variable);
            }
        }

        parameters.push(listParameter(
            'eventParameters',
            Object.entries(options.eventParameters).map(([key, spec]) => mapParameter([
                templateParameter('name', key),
                templateParameter('value', resolveEventParameterValue(spec, variablesById, variablesByName)),
            ])),
        ));
    }

    return parameters;
}

export function validateWorkspaceAssets(
    tags: GtmTag[],
    variables: GtmVariable[],
    triggers: GtmTrigger[],
    builtInVariables: GtmBuiltInVariable[] = []
): GtmWorkspaceValidationResult {
    const variableNames = new Set([
        ...variables.map((variable) => String(variable.name || '')),
        ...builtInVariables.map((variable) => String(variable.name || '')),
    ]);
    const tagIds = new Set(tags.map((tag) => String(tag.tagId || '')));
    const triggerIds = new Set(triggers.map((trigger) => String(trigger.triggerId || '')));
    const issues: string[] = [];

    for (const tag of tags) {
        const parameters = tag.parameter || [];

        if (Array.isArray(tag.firingTriggerId)) {
            for (const triggerId of tag.firingTriggerId) {
                if (triggerId && !triggerIds.has(String(triggerId))) {
                    issues.push(`Tag '${tag.name}' references missing trigger ${triggerId}`);
                }
            }
        }

        if (tag.type === 'gaawe') {
            const sendToTag = parameters.find((parameter) => parameter.key === 'sendToTag');
            const hasSendToTag = Boolean(sendToTag);
            const hasMeasurementId = parameters.some((parameter) => parameter.key === 'measurementId');
            const hasMeasurementIdOverride = parameters.some((parameter) => parameter.key === 'measurementIdOverride');

            if (!hasSendToTag && !hasMeasurementId && !hasMeasurementIdOverride) {
                issues.push(`GA4 Event '${tag.name}' missing configTagId/measurementId`);
            }

            if (sendToTag?.value && !tagIds.has(String(sendToTag.value))) {
                issues.push(`GA4 Event '${tag.name}' references missing config tag ${sendToTag.value}`);
            }
        }

        const eventParameters = parameters.find((parameter) => parameter.key === 'eventParameters');
        if (eventParameters?.list) {
            for (const eventParameter of eventParameters.list) {
                const valueEntry = eventParameter.map?.find((entry) => entry.key === 'value');
                const value = valueEntry?.value;
                const macro = value ? MACRO_PATTERN.exec(value) : null;

                if (macro && !variableNames.has(macro[1])) {
                    issues.push(`Tag '${tag.name}' references unknown variable '{{${macro[1]}}}'`);
                }
            }
        }
    }

    for (const trigger of triggers) {
        const conditions = [
            ...(trigger.filter || []),
            ...(trigger.customEventFilter || []),
            ...(trigger.autoEventFilter || []),
        ];

        for (const condition of conditions) {
            for (const parameter of condition.parameter || []) {
                const value = parameter.value || '';
                for (const match of value.matchAll(/\{\{([^}]+)\}\}/g)) {
                    const variableName = match[1];
                    if (!variableName.startsWith('_') && !variableNames.has(variableName)) {
                        issues.push(`Trigger '${trigger.name}' references unknown variable '{{${variableName}}}'`);
                    }
                }
            }
        }
    }

    return { ok: issues.length === 0, issues };
}
