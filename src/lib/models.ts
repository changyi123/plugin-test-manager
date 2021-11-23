import Parse from './parse';

const appKey = window.QiankunProps?.frame?.app?.key || 'test_manager';

export const Repository = Parse.Object.extend(`${appKey}_Repository`);
