import type { GtmCondition, GtmTag, GtmTrigger, GtmVariable } from './types.js';
import {
    findMatchingConfigTag,
    isExpectedCustomEventTrigger,
    isExpectedDataLayerVariable,
    isExpectedGa4EventTag,
} from './fixed-setup-guards.js';

export interface FixedSetupManager {
    listTags(): Promise<GtmTag[]>;
    listTriggers(): Promise<GtmTrigger[]>;
    listVariables(): Promise<GtmVariable[]>;
    createVariable(name: string, type: string, parameters: GtmVariable['parameter']): Promise<GtmVariable>;
    createTrigger(name: string, type: string, filters: GtmCondition[]): Promise<GtmTrigger>;
    createGa4ConfigurationTag(
        name: string,
        measurementId: string,
        options?: { sendPageView?: boolean; }
    ): Promise<GtmTag>;
    createGa4EventTag(
        name: string,
        measurementId: string,
        eventName: string,
        options?: {
            triggerId?: string;
            configTagId?: string;
            eventParameters?: Record<string, string>;
            resolveVariables?: boolean;
        }
    ): Promise<GtmTag>;
}

interface LoggerLike {
    log(...args: unknown[]): void;
}

type GtmTriggerWithId = GtmTrigger & { triggerId: string };

function findEntity<T extends { name?: string | null }>(
    list: readonly T[] | null | undefined,
    name: string,
    entityType: string
): T | undefined {
    const matches = (list || []).filter((entity) => entity.name === name);
    if (matches.length > 1) {
        throw new Error(`Multiple ${entityType} named '${name}' found`);
    }

    return matches[0];
}

function requireTriggerId(trigger: GtmTrigger, name: string): GtmTriggerWithId {
    if (!trigger.triggerId) {
        throw new Error(`Trigger '${name}' is missing triggerId`);
    }

    return trigger as GtmTriggerWithId;
}

export async function resolveGa4ConfigTag(
    manager: FixedSetupManager,
    existingTags: readonly GtmTag[],
    existingTriggers: readonly GtmTrigger[],
    measurementId: string,
    logger: LoggerLike = console
): Promise<string> {
    const ga4ConfigTags = existingTags.filter((tag) => tag.type === 'gaawc');
    const existingConfigTag = findMatchingConfigTag(ga4ConfigTags, existingTriggers, measurementId);

    if (!existingConfigTag && ga4ConfigTags.length > 0) {
        throw new Error('Existing GA4 configuration tag does not match the expected measurement ID or trigger');
    }

    if (existingConfigTag?.tagId) {
        logger.log(`✅ Google Tag exists: ${existingConfigTag.name} (${existingConfigTag.tagId})`);
        return existingConfigTag.tagId;
    }

    logger.log('Creating Google Tag...');

    try {
        const newTag = await manager.createGa4ConfigurationTag('Google Tag', measurementId, { sendPageView: true });
        if (!newTag.tagId) {
            throw new Error('Created GA4 configuration tag is missing tagId');
        }
        logger.log(`✅ Created Google Tag: ${newTag.tagId}`);
        return newTag.tagId;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`⚠️ Google Tag (or trigger) might already exist. Proceeding...`);
        const tagsAgain = await manager.listTags();
        const triggersAgain = await manager.listTriggers();
        const recovered = findMatchingConfigTag(
            tagsAgain.filter((tag) => tag.type === 'gaawc'),
            triggersAgain,
            measurementId,
        );
        if (recovered?.tagId) {
            return recovered.tagId;
        }
        throw new Error(`Failed to recover a matching GA4 configuration tag: ${message}`);
    }
}

export async function ensureDataLayerVariable(
    manager: FixedSetupManager,
    existingVariables: readonly GtmVariable[],
    name: string,
    dataLayerName: string,
    logger: LoggerLike = console
): Promise<GtmVariable> {
    const existingVariable = findEntity(existingVariables, name, 'variables');
    if (existingVariable) {
        if (!isExpectedDataLayerVariable(existingVariable, dataLayerName)) {
            throw new Error(`Existing variable '${name}' does not match expected data layer variable '${dataLayerName}'`);
        }
        logger.log(`ℹ️ Using existing Variable '${name}': ${existingVariable.variableId}`);
        return existingVariable;
    }

    try {
        const variable = await manager.createVariable(name, 'v', [
            { type: 'integer', key: 'dataLayerVersion', value: '2' },
            { type: 'boolean', key: 'setDefaultValue', value: 'false' },
            { type: 'template', key: 'name', value: dataLayerName },
        ]);
        logger.log(`✅ Created Variable '${name}': ${variable.variableId}`);
        return variable;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`⚠️ Skiping Variable ${name}: ${message}`);
        const variablesAgain = await manager.listVariables();
        const recovered = findEntity(variablesAgain, name, 'variables');
        if (recovered) {
            if (!isExpectedDataLayerVariable(recovered, dataLayerName)) {
                throw new Error(`Recovered variable '${name}' does not match expected data layer variable '${dataLayerName}'`);
            }
            logger.log(`ℹ️ Recovered existing Variable '${name}': ${recovered.variableId}`);
            return recovered;
        }
        throw new Error(`Failed to create or recover variable '${name}'`);
    }
}

export async function ensureCustomEventTrigger(
    manager: FixedSetupManager,
    existingTriggers: readonly GtmTrigger[],
    name: string,
    eventName: string,
    logger: LoggerLike = console
): Promise<GtmTriggerWithId> {
    const existingTrigger = findEntity(existingTriggers, name, 'triggers');
    if (existingTrigger) {
        if (!isExpectedCustomEventTrigger(existingTrigger, eventName)) {
            throw new Error(`Existing trigger '${name}' does not match expected event '${eventName}'`);
        }
        const triggerWithId = requireTriggerId(existingTrigger, name);
        logger.log(`ℹ️ Using existing Trigger '${name}': ${triggerWithId.triggerId}`);
        return triggerWithId;
    }

    try {
        const trigger = await manager.createTrigger(name, 'customEvent', [{
            type: 'equals',
            parameter: [
                { type: 'template', key: 'arg0', value: '{{_event}}' },
                { type: 'template', key: 'arg1', value: eventName },
            ],
        }]);
        const triggerWithId = requireTriggerId(trigger, name);
        logger.log(`✅ Created Trigger '${name}': ${triggerWithId.triggerId}`);
        return triggerWithId;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`⚠️ Skiping Trigger ${name}: ${message}`);
        const triggersAgain = await manager.listTriggers();
        const recovered = findEntity(triggersAgain, name, 'triggers');
        if (recovered) {
            if (!isExpectedCustomEventTrigger(recovered, eventName)) {
                throw new Error(`Recovered trigger '${name}' does not match expected event '${eventName}'`);
            }
            const triggerWithId = requireTriggerId(recovered, name);
            logger.log(`ℹ️ Recovered existing Trigger '${name}': ${triggerWithId.triggerId}`);
            return triggerWithId;
        }
        throw new Error(`Failed to create or recover trigger '${name}': ${message}`);
    }
}

export async function ensureGa4EventTag(
    manager: FixedSetupManager,
    existingTags: readonly GtmTag[],
    tagName: string,
    eventName: string,
    triggerId: string,
    configTagId: string,
    eventParameters: Record<string, string>,
    measurementId: string,
    logger: LoggerLike = console
): Promise<GtmTag> {
    if (!triggerId) {
        throw new Error(`GA4 event tag '${tagName}' requires a triggerId`);
    }

    const existingTag = findEntity(existingTags, tagName, 'tags');
    if (existingTag) {
        if (!isExpectedGa4EventTag(existingTag, eventName, triggerId, configTagId, eventParameters)) {
            throw new Error(`Existing tag '${tagName}' does not match the expected GA4 event configuration`);
        }
        logger.log(`ℹ️ Tag '${tagName}' already exists.`);
        return existingTag;
    }

    try {
        const createdTag = await manager.createGa4EventTag(tagName, measurementId, eventName, {
            triggerId,
            configTagId,
            eventParameters,
            resolveVariables: true,
        });
        logger.log(`✅ Created Tag: ${tagName}`);
        return createdTag;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.log(`⚠️ Failed to create tag ${tagName}: ${message}`);
        const tagsAgain = await manager.listTags();
        const recovered = findEntity(tagsAgain, tagName, 'tags');
        if (recovered) {
            if (!isExpectedGa4EventTag(recovered, eventName, triggerId, configTagId, eventParameters)) {
                throw new Error(`Recovered tag '${tagName}' does not match the expected GA4 event configuration`);
            }
            logger.log(`ℹ️ Recovered existing Tag '${tagName}': ${recovered.tagId}`);
            return recovered;
        }
        throw new Error(`Failed to create or recover tag '${tagName}'`);
    }
}
