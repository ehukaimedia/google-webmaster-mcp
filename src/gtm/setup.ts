import { GTMManager } from './client.js';
import { buildGa4ConfigurationParameters, buildGa4EventParameters } from './helpers.js';
import type { GtmCondition, GtmParameter, GtmSetupSummary, GtmTag, GtmTrigger } from './types.js';

const BUILT_IN_VARIABLES = ['clickText', 'clickUrl', 'clickTarget', 'clickId', 'clickClasses', 'clickElement'];
const ALL_PAGES_TRIGGER_NAME = 'All Pages';

function findUniqueByName<T extends { name?: string | null; }>(
    items: T[],
    name: string,
    entityType: string
): T | undefined {
    const matches = items.filter((item) => item.name === name);
    if (matches.length > 1) {
        throw new Error(`Multiple ${entityType} named '${name}' found`);
    }

    return matches[0];
}

type GtmTriggerWithId = GtmTrigger & { triggerId: string };

function requireTriggerId(trigger: GtmTrigger, name: string): GtmTriggerWithId {
    if (!trigger.triggerId) {
        throw new Error(`Trigger '${name}' is missing triggerId`);
    }

    return trigger as GtmTriggerWithId;
}

function isAllPagesTrigger(trigger: GtmTrigger): boolean {
    return (
        trigger.type === 'pageview' &&
        (!trigger.filter || trigger.filter.length === 0) &&
        (!trigger.autoEventFilter || trigger.autoEventFilter.length === 0) &&
        (!trigger.customEventFilter || trigger.customEventFilter.length === 0)
    );
}

function normalizeParameter(parameter: GtmParameter | undefined): unknown {
    if (!parameter) {
        return undefined;
    }

    return {
        type: parameter.type || null,
        key: parameter.key || null,
        value: parameter.value || null,
        list: (parameter.list || []).map((entry) => normalizeParameter(entry))
            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
        map: (parameter.map || []).map((entry) => normalizeParameter(entry))
            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    };
}

function normalizeParameterList(parameters: GtmParameter[] = []): unknown[] {
    return parameters
        .map((parameter) => normalizeParameter(parameter))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeCondition(condition: GtmCondition | undefined): unknown {
    if (!condition) {
        return undefined;
    }

    return {
        type: condition.type || null,
        parameter: normalizeParameterList(condition.parameter || []),
    };
}

function normalizeConditionList(conditions: GtmCondition[] = []): unknown[] {
    return conditions
        .map((condition) => normalizeCondition(condition))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function extractTemplateValue(parameters: GtmParameter[] = [], key: string): string | undefined {
    return parameters.find((parameter) => parameter.key === key)?.value || undefined;
}

function assertReusableTrigger(
    trigger: GtmTrigger,
    name: string,
    type: string,
    filters: GtmCondition[]
): void {
    const expectedFilters = JSON.stringify(normalizeConditionList(filters || []));
    const actualFilter = JSON.stringify(normalizeConditionList(trigger.filter || []));
    const actualAutoEventFilter = JSON.stringify(normalizeConditionList(trigger.autoEventFilter || []));
    const actualCustomEventFilter = JSON.stringify(normalizeConditionList(trigger.customEventFilter || []));

    if (trigger.type !== type) {
        throw new Error(`Existing trigger '${name}' does not match the expected ${type} configuration`);
    }

    if (type === 'customEvent') {
        if (
            actualCustomEventFilter !== expectedFilters ||
            (trigger.filter?.length || 0) > 0 ||
            (trigger.autoEventFilter?.length || 0) > 0
        ) {
            throw new Error(`Existing trigger '${name}' does not match the expected ${type} configuration`);
        }
        return;
    }

    if (
        actualFilter !== expectedFilters ||
        actualAutoEventFilter !== JSON.stringify(normalizeConditionList()) ||
        (trigger.customEventFilter?.length || 0) > 0
    ) {
        throw new Error(`Existing trigger '${name}' does not match the expected ${type} configuration`);
    }
}

function assertReusableConfigTag(tag: GtmTag, measurementId: string, pageviewTriggerIds: Set<string>): void {
    const parameters = tag.parameter || [];
    const expectedParameters = buildGa4ConfigurationParameters(measurementId, { sendPageView: true });
    const actualMeasurementId = extractTemplateValue(parameters, 'measurementId');
    const sendPageView = extractTemplateValue(parameters, 'sendPageView');

    if (
        tag.type !== 'gaawc' ||
        actualMeasurementId !== measurementId ||
        sendPageView !== 'true' ||
        JSON.stringify(normalizeParameterList(parameters)) !== JSON.stringify(normalizeParameterList(expectedParameters))
    ) {
        throw new Error(`Existing tag '${tag.name}' does not match the expected GA4 configuration`);
    }

    const firingTriggerIds = new Set((tag.firingTriggerId || []).map((triggerId) => String(triggerId)));
    if (
        firingTriggerIds.size !== 1 ||
        ![...firingTriggerIds].some((triggerId) => pageviewTriggerIds.has(triggerId))
    ) {
        throw new Error(`Existing tag '${tag.name}' is not attached to a pageview trigger`);
    }
}

function findReusableConfigTag(
    tags: GtmTag[],
    measurementId: string,
    pageviewTriggerIds: Set<string>
): GtmTag | undefined {
    const configTags = tags.filter((tag) => tag.type === 'gaawc');
    if (configTags.length > 1) {
        throw new Error('Multiple GA4 configuration tags found');
    }

    const [configTag] = configTags;
    if (!configTag) {
        return undefined;
    }

    assertReusableConfigTag(configTag, measurementId, pageviewTriggerIds);
    return configTag;
}

function assertReusableEventTag(
    tag: GtmTag,
    measurementId: string,
    eventName: string,
    triggerId: string | undefined,
    eventParameters: Record<string, unknown>
): void {
    const expectedParameters = buildGa4EventParameters(measurementId, eventName, {
        eventParameters,
    });

    if (tag.type !== 'gaawe' || JSON.stringify(normalizeParameterList(tag.parameter || [])) !== JSON.stringify(normalizeParameterList(expectedParameters))) {
        throw new Error(`Existing tag '${tag.name}' does not match the expected ${eventName} configuration`);
    }

    const firingTriggerIds = new Set((tag.firingTriggerId || []).map((value) => String(value)));
    if (triggerId && (firingTriggerIds.size !== 1 || !firingTriggerIds.has(triggerId))) {
        throw new Error(`Existing tag '${tag.name}' is attached to the wrong trigger`);
    }
}

async function ensureTrigger(
    manager: GTMManager,
    existingTriggers: GtmTrigger[],
    summary: GtmSetupSummary,
    name: string,
    type: string,
    filters: GtmCondition[]
): Promise<GtmTriggerWithId> {
    const existingTrigger = findUniqueByName(existingTriggers, name, 'triggers');
    if (existingTrigger) {
        assertReusableTrigger(existingTrigger, name, type, filters);
        summary.reusedTriggers.push(name);
        return requireTriggerId(existingTrigger, name);
    }

    const createdTrigger = await manager.createTrigger(name, type, filters);
    existingTriggers.push(createdTrigger);
    summary.createdTriggers.push(name);
    return requireTriggerId(createdTrigger, name);
}

async function ensureEventTag(
    manager: GTMManager,
    existingTags: GtmTag[],
    summary: GtmSetupSummary,
    tagName: string,
    measurementId: string,
    eventName: string,
    triggerId: string | undefined,
    eventParameters: Record<string, unknown> = {}
): Promise<void> {
    if (!triggerId) {
        throw new Error(`Event tag '${tagName}' requires a triggerId`);
    }

    const existingTag = findUniqueByName(existingTags, tagName, 'tags');
    if (existingTag) {
        assertReusableEventTag(existingTag, measurementId, eventName, triggerId, eventParameters);
        summary.reusedTags.push(tagName);
        return;
    }

    const createdTag = await manager.createGa4EventTag(tagName, measurementId, eventName, {
        triggerId,
        eventParameters,
    });
    existingTags.push(createdTag);
    summary.createdTags.push(tagName);
}

export async function setupGa4Defaults(manager: GTMManager, measurementId: string): Promise<GtmSetupSummary> {
    const summary: GtmSetupSummary = {
        enabledBuiltInVariables: [],
        reusedBuiltInVariables: [],
        createdTriggers: [],
        reusedTriggers: [],
        createdTags: [],
        reusedTags: [],
    };

    const existingTags = await manager.listTags();
    const existingTriggers = await manager.listTriggers();
    const pageviewTriggerIds = new Set(
        existingTriggers
            .filter((trigger) => isAllPagesTrigger(trigger) && trigger.triggerId)
            .map((trigger) => String(trigger.triggerId)),
    );

    for (const variableType of BUILT_IN_VARIABLES) {
        const result = await manager.enableBuiltInVariable(variableType);
        if ('status' in result && result.status === 'already_enabled') {
            summary.reusedBuiltInVariables.push(variableType);
        } else {
            summary.enabledBuiltInVariables.push(variableType);
        }
    }

    const configTagName = 'GA4 Configuration';
    const existingConfigTag = findReusableConfigTag(existingTags, measurementId, pageviewTriggerIds);
    if (existingConfigTag) {
        summary.reusedTags.push(existingConfigTag.name || configTagName);
    } else {
        const createdConfigTag = await manager.createGa4ConfigurationTag(configTagName, measurementId, {
            triggerType: 'pageview',
            sendPageView: true,
        });
        existingTags.push(createdConfigTag);
        for (const triggerId of createdConfigTag.firingTriggerId || []) {
            if (triggerId) {
                pageviewTriggerIds.add(String(triggerId));
            }
        }
        summary.createdTags.push(configTagName);
    }

    const leadTrigger = await ensureTrigger(manager, existingTriggers, summary, 'Universal Lead Trigger', 'customEvent', [{
        type: 'equals',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{_event}}' },
            { type: 'template', key: 'arg1', value: 'generate_lead' },
        ],
    }]);

    const linkedinTrigger = await ensureTrigger(manager, existingTriggers, summary, 'Outbound - LinkedIn', 'linkClick', [{
        type: 'contains',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{Click URL}}' },
            { type: 'template', key: 'arg1', value: 'linkedin.com' },
        ],
    }]);

    const mailtoTrigger = await ensureTrigger(manager, existingTriggers, summary, 'Support Intent - Mailto', 'linkClick', [{
        type: 'contains',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{Click URL}}' },
            { type: 'template', key: 'arg1', value: 'mailto:' },
        ],
    }]);

    const telTrigger = await ensureTrigger(manager, existingTriggers, summary, 'Support Intent - Tel', 'linkClick', [{
        type: 'contains',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{Click URL}}' },
            { type: 'template', key: 'arg1', value: 'tel:' },
        ],
    }]);

    const auditTrigger = await ensureTrigger(manager, existingTriggers, summary, 'Intent - Request AI Audit', 'linkClick', [{
        type: 'contains',
        parameter: [
            { type: 'template', key: 'arg0', value: '{{Click URL}}' },
            { type: 'template', key: 'arg1', value: '/contact-us' },
        ],
    }]);

    await ensureEventTag(manager, existingTags, summary, 'GA4 - Lead Generation', measurementId, 'generate_lead', leadTrigger.triggerId);
    await ensureEventTag(manager, existingTags, summary, 'GA4 - Click LinkedIn', measurementId, 'click', linkedinTrigger.triggerId, {
        link_url: '{{Click URL}}',
        outbound: true,
        outbound_dest: 'linkedin',
    });
    await ensureEventTag(manager, existingTags, summary, 'GA4 - Contact Email', measurementId, 'contact', mailtoTrigger.triggerId, {
        method: 'email',
    });
    await ensureEventTag(manager, existingTags, summary, 'GA4 - Contact Phone', measurementId, 'contact', telTrigger.triggerId, {
        method: 'phone',
    });
    await ensureEventTag(manager, existingTags, summary, 'GA4 - Intent - AI Audit', measurementId, 'generate_lead', auditTrigger.triggerId, {
        method: 'form_start',
        lead_type: 'ai_audit',
    });

    return summary;
}
