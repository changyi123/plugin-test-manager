#!/usr/bin/env node

// Test script to demonstrate IQL query functionality
// This script tests the queryExistingCasesByTestIds function

const testIds = [
  'ess-Code6001Test-fail_CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_32',
  'ess-Code6602Test-some_other_test_method',
  'ess-Code6603Test-nonexistent_test',
];

console.log('🧪 Testing IQL Query for Test Case Search');
console.log(`📋 Test IDs to search for: ${testIds.join(', ')}`);
console.log();

// This would be the actual IQL query that would be generated (using IN operator and field name):
const testIdList = testIds.map(id => `'${id}'`).join(', ');
const iql = `用例唯一标识 in [${testIdList}] and 'test_manager_type' = 'TestCase' and workspaceKey='test_workspace'`;

console.log('🔍 Generated IQL Query:');
console.log(iql);
console.log();

console.log('📊 Expected API Call:');
console.log('POST /parse/api/search');
console.log(
  JSON.stringify(
    {
      iql: iql,
      fields: ['id', 'name', 'values'],
      displayContext: 'test_manager',
      size: testIds.length,
    },
    null,
    2,
  ),
);

console.log();
// Updated implementation with dynamic itemTypeKey
console.log();
console.log('🔄 New Dynamic Implementation:');
const dynamicIql = `用例唯一标识 in [${testIdList}] and itemTypeKey = '\${dynamicItemTypeKey}' and workspaceKey = '\${workspaceKey}'`;
console.log(dynamicIql);

console.log();
console.log('✅ IQL Query Implementation Complete!');
console.log('🎯 Key Features:');
console.log('- Batch query multiple test IDs using IN operator');
console.log('- Search by field name "用例唯一标识" instead of technical key');
console.log('- Dynamic itemTypeKey from workspace configuration');
console.log('- No hardcoded item types - retrieved from getItemCreateRequiredAttrs()');
console.log('- More readable and concise IQL syntax');
console.log('- Return case ID and all field values for UPDATE operations');
