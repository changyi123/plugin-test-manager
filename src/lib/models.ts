import Parse from './parse';

const appKey = window.QiankunProps?.frame?.app?.key || 'test_manager';

export const Repository = Parse.Object.extend(`${appKey}_Repository`);
export const Item = Parse.Object.extend('Item');
export const Workspace = Parse.Object.extend('Workspace');
