import { tagmanager_v2 } from 'googleapis';

export type GtmTagManager = tagmanager_v2.Tagmanager;
export type GtmAccount = tagmanager_v2.Schema$Account;
export type GtmBuiltInVariable = tagmanager_v2.Schema$BuiltInVariable;
export type GtmCondition = tagmanager_v2.Schema$Condition;
export type GtmContainer = tagmanager_v2.Schema$Container;
export type GtmContainerVersion = tagmanager_v2.Schema$ContainerVersion;
export type GtmContainerVersionHeader = tagmanager_v2.Schema$ContainerVersionHeader;
export type GtmCreateBuiltInVariableResponse = tagmanager_v2.Schema$CreateBuiltInVariableResponse;
export type GtmCreateContainerVersionResponse = tagmanager_v2.Schema$CreateContainerVersionResponse;
export type GtmParameter = tagmanager_v2.Schema$Parameter;
export type GtmTag = tagmanager_v2.Schema$Tag;
export type GtmTrigger = tagmanager_v2.Schema$Trigger;
export type GtmVariable = tagmanager_v2.Schema$Variable;
export type GtmWorkspace = tagmanager_v2.Schema$Workspace;

export interface GtmContainerSelection {
    accountId: string;
    containerId: string;
}

export interface GtmWorkspaceContext extends GtmContainerSelection {
    workspaceId: string;
}

export interface GtmVariableReference {
    value?: unknown;
    varId?: string;
    var?: string;
}

export type GtmEventParameterSpec = unknown | GtmVariableReference;

export interface GtmGa4ConfigurationOptions {
    sendPageView?: boolean;
    triggerType?: string;
    triggerId?: string;
    fieldsToSet?: Record<string, string>;
}

export interface GtmGa4EventOptions {
    configTagId?: string;
    eventParameters?: Record<string, GtmEventParameterSpec>;
    triggerType?: string;
    triggerId?: string;
    resolveVariables?: boolean;
}

export interface GtmWorkspaceValidationResult {
    ok: boolean;
    issues: string[];
}

export interface GtmSetupSummary {
    enabledBuiltInVariables: string[];
    reusedBuiltInVariables: string[];
    createdTriggers: string[];
    reusedTriggers: string[];
    createdTags: string[];
    reusedTags: string[];
}
