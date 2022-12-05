import Parse from './parse';
import { appKey, RepositoryModel } from './constants';

export const Item = Parse.Object.extend('Item');
export const User = Parse.Object.extend('User');
export const Screen = Parse.Object.extend('Screen');
export const ItemType = Parse.Object.extend('ItemType');
export const ItemLink = Parse.Object.extend('ItemLink');
export const Board = Parse.Object.extend('Board');
export const Chart = Parse.Object.extend('Chart');
export const ChartGroup = Parse.Object.extend('ChartGroup');
export const Workspace = Parse.Object.extend('Workspace');
export const CustomField = Parse.Object.extend('CustomField');
export const ItemLinkType = Parse.Object.extend('ItemLinkType');
export const AppsWorkspace = Parse.Object.extend('AppsWorkspace');
export const ItemTypeScheme = Parse.Object.extend('ItemTypeScheme');
export const AppInstallation = Parse.Object.extend('AppInstallation');
export const ItemTypeScreenScheme = Parse.Object.extend('ItemTypeScreenScheme');
export const ItemTypeScreenSchemeMapping = Parse.Object.extend('ItemTypeScreenSchemeMapping');

export const Test = Parse.Object.extend(`${appKey}_Test`);
export const Repository = Parse.Object.extend(RepositoryModel);
export const TestConfig = Parse.Object.extend(`${appKey}_TestConfig`);
export const WordTemplate = Parse.Object.extend(`${appKey}_WordTemplate`);
export const TestRelation = Parse.Object.extend(`${appKey}_TestRelation`);
export const UserSetting = Parse.Object.extend(`${appKey}_UserSetting`);
export const TestExecution = Parse.Object.extend(`${appKey}_TestExecution`);
