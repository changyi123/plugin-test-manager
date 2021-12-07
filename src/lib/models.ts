import Parse from './parse';

const appKey = window.QiankunProps?.frame?.app?.key || 'test_manager';

export const Item = Parse.Object.extend('Item');
export const Workspace = Parse.Object.extend('Workspace');

export const Test = Parse.Object.extend(`${appKey}_Test`);
export const TestStep = Parse.Object.extend(`${appKey}_TestStep`);
export const Repository = Parse.Object.extend(`${appKey}_Repository`);
export const TestConfig = Parse.Object.extend(`${appKey}_TestConfig`);
export const TestExecution = Parse.Object.extend(`${appKey}_TestExecution`);
