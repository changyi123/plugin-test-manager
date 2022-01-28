## 测试用例步骤

```
{
    precondition: string;          // 前置条件
    steps: [{
        id: string;
        index: number;             // 索引
        action: string;            // 步骤描述
        data: string;              // 预期结果
        
        callTestId?: string;        // 测试继承（test entity id） 

        defectItemIds: string[];    // 缺陷关联
        result?: string;            // 时间结果
        attachments?: string[];     // 附件
        customFields: string[];     // 自定义字段 
    }]
}
```




type Step = {
        id: string;
        index: number;             // 索引
        action: string;            // 步骤描述
        data: string;              // 预期结果
        
        callTestId?: string;        // 测试继承（test entity id）

        defectItemIds: string[];    // 缺陷关联
        result?: string;            // 时间结果
        attachments?: string[];     // 附件
        customFields: string[];     // 自定义字段 
    }


## 需要修改
1. 测试用例继承选择弹窗
2. 继承类型测试步骤数据
3. 测试执行生成
   1. 测试计划 panel 创建测试执行
   2. 测试用例 panel 创建测试执行
   3. 测试执行 panel 关联测试执行
4. 测试执行页面
   1. 执行步骤渲染
   2. 测试用例步骤状态流转
   3. 测试执行缺陷关联

## 脚本
所有的数据表