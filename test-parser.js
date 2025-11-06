#!/usr/bin/env node

// 模拟Java文件内容来测试解析器
const { javaParser } = require('./src/trigger/modules/automation/parser');

// 模拟可能的Java文件格式
const testJavaContent1 = `
package com.cfca.test.ESS_V4.testcase;

import org.junit.jupiter.api.Test;

public class Code6601Test {

    @TestId("ess-Code6601Test-success_test_method")
    @Test 
    public void testSuccess() {
        // 测试代码
        System.out.println("Test success");
    }
    
    @TestId("ess-Code6601Test-fail_test_method")
    @Test
    public void testFail() {
        // 测试代码
        assert false;
    }
}
`;

const testJavaContent2 = `
package com.cfca.test.ESS_V4.testcase;

import org.junit.jupiter.api.Test;

public class Code6601Test {

    @TestId（"ess-Code6601Test-chinese-quotes"）
    @Test 
    public void testChineseQuotes() {
        // 使用中文引号的情况
    }
    
    @TestId('ess-Code6601Test-single-quotes')
    @Test
    private void testSingleQuotes() {
        // 使用单引号和private方法
    }
}
`;

console.log('🧪 测试Java解析器');
console.log();

console.log('📋 测试内容1 (标准格式):');
console.log('类名:', javaParser.extractClassName(testJavaContent1));
const methods1 = javaParser.parseTestMethods(testJavaContent1);
console.log('解析到的测试方法数量:', methods1.length);
methods1.forEach(method => {
  console.log(`- ${method.methodName}: ${method.testId} (${method.startLine}-${method.endLine})`);
});

console.log();
console.log('📋 测试内容2 (特殊格式):');
console.log('类名:', javaParser.extractClassName(testJavaContent2));
const methods2 = javaParser.parseTestMethods(testJavaContent2);
console.log('解析到的测试方法数量:', methods2.length);
methods2.forEach(method => {
  console.log(`- ${method.methodName}: ${method.testId} (${method.startLine}-${method.endLine})`);
});

console.log();
console.log('✅ 解析器测试完成');
