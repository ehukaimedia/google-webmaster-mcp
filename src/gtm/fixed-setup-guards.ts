import type { GtmTag, GtmTrigger, GtmVariable } from './types.js';

type ParameterizedEntity = Pick<GtmTag, 'parameter'> | Pick<GtmVariable, 'parameter'>;

export function extractParameterValue(tag: ParameterizedEntity | null | undefined, key: string): string | undefined {
    if (!Array.isArray(tag?.parameter)) {
        return undefined;
    }

    const parameter = tag.parameter.find((entry) => entry.key === key);
    return typeof parameter?.value === 'string' ? parameter.value : undefined;
}

function findSingleParameter(
    entity: ParameterizedEntity | null | undefined,
    key: string,
    type: string
) {
    const matches = (entity?.parameter || []).filter((parameter) => parameter.key === key);
    if (matches.length !== 1) {
        return undefined;
    }

    const [parameter] = matches;
    return parameter?.type === type ? parameter : undefined;
}

export function isAllPagesTrigger(trigger: GtmTrigger | null | undefined): boolean {
    return Boolean(
        trigger &&
        trigger.type === 'pageview' &&
        (!trigger.filter || trigger.filter.length === 0) &&
        (!trigger.autoEventFilter || trigger.autoEventFilter.length === 0) &&
        (!trigger.customEventFilter || trigger.customEventFilter.length === 0)
    );
}

export function isExpectedCustomEventTrigger(
    trigger: GtmTrigger | null | undefined,
    eventName: string
): boolean {
    const conditionParameters = trigger?.customEventFilter?.[0]?.parameter || [];

    return Boolean(
        trigger &&
        trigger.type === 'customEvent' &&
        (!trigger.filter || trigger.filter.length === 0) &&
        (!trigger.autoEventFilter || trigger.autoEventFilter.length === 0) &&
        Array.isArray(trigger.customEventFilter) &&
        trigger.customEventFilter.length === 1 &&
        trigger.customEventFilter[0].type === 'equals' &&
        Array.isArray(trigger.customEventFilter[0].parameter) &&
        conditionParameters.length === 2 &&
        conditionParameters.some((parameter) => parameter.key === 'arg0' && parameter.type === 'template' && parameter.value === '{{_event}}') &&
        conditionParameters.some((parameter) => parameter.key === 'arg1' && parameter.type === 'template' && parameter.value === eventName)
    );
}

export function isExpectedDataLayerVariable(
    variable: GtmVariable | null | undefined,
    dataLayerName: string
): boolean {
    const parameters = variable?.parameter || [];
    const dataLayerVersionEntry = findSingleParameter(variable, 'dataLayerVersion', 'integer');
    const defaultValueEntry = findSingleParameter(variable, 'setDefaultValue', 'boolean');
    const nameEntry = findSingleParameter(variable, 'name', 'template');

    return Boolean(
        variable &&
        variable.type === 'v' &&
        parameters.length === 3 &&
        dataLayerVersionEntry &&
        defaultValueEntry &&
        nameEntry &&
        nameEntry.value === dataLayerName &&
        dataLayerVersionEntry.value === '2' &&
        defaultValueEntry.value === 'false'
    );
}

export function isExpectedConfigTag(
    tag: GtmTag | null | undefined,
    triggers: readonly GtmTrigger[],
    measurementId: string
): boolean {
    const parameters = tag?.parameter || [];
    const measurementEntry = findSingleParameter(tag, 'measurementId', 'template');
    const sendPageViewEntry = findSingleParameter(tag, 'sendPageView', 'boolean');

    return Boolean(
        tag &&
        tag.type === 'gaawc' &&
        parameters.length === 2 &&
        measurementEntry &&
        sendPageViewEntry &&
        measurementEntry.value === measurementId &&
        sendPageViewEntry.value === 'true' &&
        Array.isArray(tag.firingTriggerId) &&
        tag.firingTriggerId.length === 1 &&
        triggers.some((trigger) => trigger.triggerId === tag.firingTriggerId?.[0] && isAllPagesTrigger(trigger))
    );
}

export function findMatchingConfigTag(
    tags: readonly GtmTag[],
    triggers: readonly GtmTrigger[],
    measurementId: string
): GtmTag | undefined {
    if (tags.length > 1) {
        throw new Error('Multiple GA4 configuration tags found');
    }

    const matches = tags.filter((tag) => isExpectedConfigTag(tag, triggers, measurementId));
    if (matches.length > 1) {
        throw new Error('Multiple matching GA4 configuration tags found');
    }

    return matches[0];
}

function extractListMapValues(tag: GtmTag, key: string): Map<string, string> | null {
    const listParameter = tag.parameter?.find((parameter) => parameter.key === key);
    if (listParameter?.type !== 'list') {
        return null;
    }
    const values = new Map<string, string>();

    for (const entry of listParameter?.list || []) {
        const names = entry.map?.filter((parameter) => parameter.key === 'name' && parameter.type === 'template') || [];
        const entryValues = entry.map?.filter((parameter) => parameter.key === 'value' && parameter.type === 'template') || [];
        if (!entry.type || entry.type !== 'map' || names.length !== 1 || entryValues.length !== 1) {
            return null;
        }

        const name = names[0]?.value;
        const value = entryValues[0]?.value;
        if (typeof name === 'string' && typeof value === 'string') {
            if (values.has(name)) {
                return null;
            }
            values.set(name, value);
        } else {
            return null;
        }
    }

    return values;
}

export function isExpectedGa4EventTag(
    tag: GtmTag | null | undefined,
    eventName: string,
    triggerId: string,
    configTagId: string,
    eventParameters: Record<string, string>
): boolean {
    const expectedParameterKeys = new Set(['eventName', 'sendToTag']);
    if (Object.keys(eventParameters).length > 0) {
        expectedParameterKeys.add('eventParameters');
    }

    const parameters = tag?.parameter || [];
    const actualParameterKeys = new Set(parameters.map((parameter) => parameter.key || ''));

    if (!tag || tag.type !== 'gaawe' || extractParameterValue(tag, 'eventName') !== eventName) {
        return false;
    }

    if (parameters.length !== expectedParameterKeys.size || actualParameterKeys.size !== expectedParameterKeys.size) {
        return false;
    }

    if ([...expectedParameterKeys].some((key) => !actualParameterKeys.has(key))) {
        return false;
    }

    const eventNameEntry = findSingleParameter(tag, 'eventName', 'template');
    const sendToTagEntry = findSingleParameter(tag, 'sendToTag', 'tagReference');
    if (!eventNameEntry || eventNameEntry.value !== eventName || !sendToTagEntry || sendToTagEntry.value !== configTagId) {
        return false;
    }

    if (!Array.isArray(tag.firingTriggerId) || tag.firingTriggerId.length !== 1 || tag.firingTriggerId[0] !== triggerId) {
        return false;
    }

    if (Object.keys(eventParameters).length === 0) {
        return true;
    }

    const actualParameters = extractListMapValues(tag, 'eventParameters');
    if (!actualParameters || actualParameters.size !== Object.keys(eventParameters).length) {
        return false;
    }

    return Object.entries(eventParameters).every(([key, value]) => actualParameters.get(key) === value);
}
