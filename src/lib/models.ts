import Parse from './parse';

const appKey = window.QiankunProps?.frame?.app?.key || 'test_manager';

export const App = Parse.Object.extend('App');
export const Item = Parse.Object.extend('Item');
export const ItemType = Parse.Object.extend('ItemType');
export const ItemLink = Parse.Object.extend('ItemLink');
export const Workspace = Parse.Object.extend('Workspace');
export const CustomField = Parse.Object.extend('CustomField');
export const ItemLinkType = Parse.Object.extend('ItemLinkType');
export const ItemTypeScheme = Parse.Object.extend('ItemTypeScheme');
export const AppInstallation = Parse.Object.extend('AppInstallation');
export const WorkspaceScheme = Parse.Object.extend('WorkspaceScheme');
export const ItemTypeScreenScheme = Parse.Object.extend('ItemTypeScreenScheme');
export const ItemTypeScreenSchemeMapping = Parse.Object.extend('ItemTypeScreenSchemeMapping');
export const Screen = Parse.Object.extend('Screen');


export const Test = Parse.Object.extend(`${appKey}_Test`);
export const Repository = Parse.Object.extend(`${appKey}_Repository`);
export const TestConfig = Parse.Object.extend(`${appKey}_TestConfig`);
export const TestRelation = Parse.Object.extend(`${appKey}_TestRelation`);
export const TestExecution = Parse.Object.extend(`${appKey}_TestExecution`);
