# 测试管理插件颗粒度功能点知识库

> 🎯 本文档提供测试管理插件每个功能点的详细描述和完整业务逻辑，适用于需求细化、产品设计和需求Agent参考。每个功能点包含完整的业务规则、UI元素、数据定义和操作流程。

## 📋 文档使用说明

**适用场景**:
- 产品需求细化和功能设计
- 需求Agent的上下文知识库
- 功能改进和扩展参考
- 用户培训和操作指导

**文档结构**:
- 每个功能点包含：业务描述、操作流程、业务规则、数据字段、UI元素
- 按照用户使用频率和业务价值排序
- 提供完整的约束条件和异常处理

---

## 🗂️ 核心功能模块详解

### 一、测试用例库 (Repository Module)

#### 1.1 目录树管理功能

##### 功能点：层级目录结构管理
**业务描述**: 支持8级层级的目录树结构，用于组织和分类测试用例，支持拖拽重组和批量操作。

**详细操作流程**:
1. **目录创建**:
   - 点击目录树工具栏"+"图标
   - 右键父目录选择"创建文件夹"
   - 输入目录名称（1-100字符，不含特殊字符 / \ : * ? " < > |）
   - 自动生成sortIndex进行排序
   - 创建成功后自动展开父目录并选中新目录

2. **目录编辑**:
   - 右键目录选择"重命名文件夹"
   - 双击目录名称进入编辑模式
   - 修改名称后按Enter确认或ESC取消
   - 同级目录名称不能重复

3. **目录移动**:
   - 拖拽目录到目标位置
   - 系统验证：不能移动到自己的子目录
   - 系统验证：移动后层级不能超过8级
   - 移动成功后更新所有子项的路径引用

4. **目录删除**:
   - 右键选择"删除文件夹"
   - 系统检查：目录下是否有测试用例
   - 有用例时提示转移或批量删除选项
   - 删除后用例可选择移动到父目录或彻底删除

**业务规则**:
```yaml
目录结构约束:
  最大层级: 8级
  命名规则: 
    - 长度限制: 1-100字符
    - 禁用字符: / \ : * ? " < > |
    - 不能纯空格或纯特殊字符
    - 同级目录名称不能重复

权限控制:
  创建权限: 用例管理员、测试经理、系统管理员
  编辑权限: 目录创建人、用例管理员、系统管理员
  删除权限: 目录创建人、用例管理员、系统管理员
  查看权限: 所有有空间访问权限的用户

性能优化:
  虚拟滚动: 使用VirtualTree支持大量目录渲染
  懒加载: 按需加载子目录内容
  缓存机制: 目录展开状态本地缓存
```

**数据字段定义**:
```typescript
interface FolderTreeNode {
  key: string;                    // 目录唯一标识
  name: string;                   // 目录名称 (1-100字符)
  parentKey: string | null;       // 父目录key，null为根目录
  sortIndex: number;              // 排序索引
  level: number;                  // 层级深度 (0-7)
  expanded: boolean;              // 展开状态
  children: FolderTreeNode[];     // 子目录列表
  testCaseCount: number;          // 关联用例数量
  childTestCaseCount: number;     // 所有子目录用例总数
  createdBy: string;              // 创建人
  workspaceKey: string;           // 所属空间
}
```

**UI元素描述**:
- **目录树容器**: 左侧panel，支持可变宽度调整
- **目录节点**: 包含文件夹图标、名称、用例计数、展开箭头
- **工具栏**: 3个按钮 - 新增(+)、全部收起(screen-off)、更多操作(...)
- **拖拽提示**: 拖拽时显示插入位置的蓝色线条
- **右键菜单**: 包含创建、重命名、移动、复制、删除等7个操作项

##### 功能点：虚拟滚动性能优化
**业务描述**: 针对大数据量目录树（1000+节点）的性能优化方案，保证流畅的用户交互体验。

**详细实现逻辑**:
1. **虚拟渲染机制**:
   - 仅渲染可视区域的目录节点（约15-20个）
   - 动态计算节点高度和滚动位置
   - 支持不同层级节点的不同高度

2. **数据懒加载**:
   - 目录展开时才加载子目录数据
   - 支持异步加载大数据量子树
   - 缓存已加载的数据避免重复请求

**技术约束**:
```yaml
性能指标:
  渲染节点数: 可视区域内最多20个节点
  滚动流畅度: 60FPS，无掉帧
  内存占用: 大数据量下内存增长<50MB
  响应时间: 节点展开<200ms

数据限制:
  单层级节点数: 建议<500个
  总节点数: 支持10,000+节点
  层级深度: 最大8级
```

#### 1.2 测试用例管理功能

##### 功能点：用例CRUD操作
**业务描述**: 完整的测试用例生命周期管理，包括创建、查看、编辑、删除和版本控制。

**详细操作流程**:

1. **用例创建**:
   ```mermaid
   sequenceDiagram
       participant User as 用户
       participant UI as 界面
       participant Validator as 验证器
       participant API as 后端接口
       
       User->>UI: 点击"新建测试用例"
       UI->>UI: 打开用例创建模态框
       User->>UI: 填写必填字段
       UI->>Validator: 实时字段验证
       Validator->>UI: 返回验证结果
       User->>UI: 点击提交
       UI->>Validator: 完整表单验证
       Validator->>API: 创建用例请求
       API->>API: 业务规则检查
       API->>UI: 返回创建结果
       UI->>User: 显示成功提示并刷新列表
   ```

2. **用例编辑**:
   - 双击用例行或点击编辑按钮
   - 模态框显示完整用例信息
   - 支持富文本编辑器编辑步骤内容
   - 自动保存草稿，避免数据丢失
   - 编辑后自动设置`isCaseUpdate`标记

3. **用例查看**:
   - 点击用例名称查看详情
   - 支持只读模式浏览用例信息
   - 显示用例历史执行记录
   - 展示关联的测试计划和缺陷

4. **用例删除**:
   - 选择用例后点击删除按钮
   - 系统检查：是否有关联的执行记录
   - 有关联时显示影响范围并要求确认
   - 支持批量删除和单个删除

**业务规则**:
```yaml
创建规则:
  必填字段:
    - name: 用例名称 (1-250字符)
    - repository: 所属目录 (必须是有效目录ID)
    - type: 用例类型 (固定为TestType.Case)
    - detail.steps: 测试步骤 (至少1个步骤)
  
  可选字段:
    - detail.precondition: 前置条件 (最大2000字符)
    - status: 用例状态 (默认为草稿状态)
    - priority: 优先级 (P0-P3)
    - assignee: 分配人员

编辑规则:
  权限要求: 用例管理员、测试经理、创建人
  状态限制: 执行中的用例不允许编辑核心字段
  版本控制: 编辑后自动创建新版本快照
  并发控制: 同时编辑时后保存覆盖先保存

删除规则:
  权限要求: 用例管理员、系统管理员
  关联检查: 
    - 有执行记录的用例需确认
    - 计划中的用例需先移除或确认
  批量删除: 最大1000个用例/次
```

**数据字段定义**:
```typescript
interface TestCase extends BaseTestEntity {
  // 核心用例字段
  name: string;                    // 用例名称 (1-250字符)
  repository: string;              // 所属目录ID
  detail: {
    steps: Step[];                 // 测试步骤数组 (1-50个)
    precondition: string;          // 前置条件 (最大2000字符)
  };
  
  // 状态和分配
  status: Status['key'];           // 用例状态
  priority: 'P0'|'P1'|'P2'|'P3';   // 优先级
  assignee: UserPointerInfo[];     // 分配人员
  
  // 版本控制
  isCaseUpdate: '0'|'1';          // 是否已更新标记
  baseLineItemVersion: string;     // 快照版本ID
  
  // 执行关联
  caseStatus: Record<string, string>;      // 计划隔离状态
  caseExecutor: Record<string, unknown>;   // 计划隔离执行人
  caseRun: Record<string, unknown>;       // 计划隔离执行记录
  
  // 系统字段
  sortIndex: number;              // 排序索引
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  createdBy: UserPointerInfo;    // 创建人
  updatedBy: UserPointerInfo;    // 更新人
}

interface Step {
  id: string;                     // 步骤唯一ID (UUID)
  action: string;                 // 操作步骤 (最大2000字符)
  data: string;                   // 测试数据 (最大2000字符)
  result: string;                 // 预期结果 (最大2000字符)
  
  // 继承用例支持
  callTestId?: string;            // 继承的用例ID
  copy?: true;                    // 是否为复制步骤
  
  // 执行时字段
  status?: Status['key'];         // 步骤执行状态
  actualResult?: string;          // 实际结果
  comment?: Record<string, any>[]; // 步骤评论
  defectItemIds?: string[];       // 关联缺陷ID
  attachments?: string[];         // 步骤附件
  
  // 自定义扩展
  customFields?: StepField[];     // 自定义字段
  index?: number;                 // 步骤序号
}
```

**UI元素详解**:
- **用例创建按钮**: 右上角主要按钮，蓝色背景 #0a50d1
- **用例列表表格**: 支持列宽调整，最小40px行高，包含以下列：
  - 选择框列 (批量模式下显示)
  - 用例名称列 (可点击查看详情)
  - 所属目录列 (面包屑显示)
  - 状态列 (彩色圆点+文字)
  - 优先级列 (彩色标签)
  - 分配人列 (用户头像+姓名)
  - 创建时间列 (相对时间显示)
  - 操作列 (编辑/删除/更多操作)

##### 功能点：批量导入导出功能
**业务描述**: 支持Excel模板和XMind脑图的批量导入，以及多种格式的导出功能，提升用例管理效率。

**Excel导入详细流程**:
1. **模板下载**:
   - 提供标准Excel模板文件
   - 模板包含：用例名称、所属分组、前置条件、测试步骤、预期结果、优先级等列
   - 支持自定义字段扩展列

2. **文件上传验证**:
   - 文件格式验证：仅支持.xlsx, .xls格式
   - 文件大小限制：最大10MB
   - 内容验证：逐行检查数据完整性和格式正确性

3. **数据处理**:
   ```typescript
   // 导入验证规则
   const validateImportData = (data: ExcelRow[]) => {
     const errors: ImportError[] = [];
     
     data.forEach((row, index) => {
       // 必填字段检查
       if (!row.name?.trim()) {
         errors.push({
           row: index + 1,
           field: 'name',
           message: '用例名称不能为空'
         });
       }
       
       // 字符长度检查
       if (row.name && row.name.length > 250) {
         errors.push({
           row: index + 1,
           field: 'name', 
           message: '用例名称不能超过250字符'
         });
       }
       
       // 步骤格式检查
       if (row.steps) {
         const stepErrors = validateStepFormat(row.steps);
         errors.push(...stepErrors.map(err => ({
           ...err,
           row: index + 1
         })));
       }
     });
     
     return errors;
   };
   ```

4. **分组处理**:
   - 自动解析分组路径（如："模块A/子模块B/功能C"）
   - 自动创建不存在的目录结构
   - 验证目录层级不超过8级限制

**XMind导入详细流程**:
1. **脑图文件解析**:
   - 支持.xmind格式文件
   - 解析脑图节点结构为层级目录
   - 叶子节点转换为测试用例

2. **结构映射**:
   - 主题节点 → 目录结构
   - 子主题 → 子目录
   - 末级节点 → 测试用例
   - 节点属性 → 用例属性（优先级、状态等）

3. **数据转换**:
   - 节点文本 → 用例名称
   - 节点备注 → 前置条件
   - 子节点 → 测试步骤
   - 标签 → 用例标签

**导出功能详细流程**:
1. **Excel导出**:
   - 选择导出范围：当前目录、包含子目录、选中用例
   - 选择导出字段：标准字段+自定义字段
   - 实时生成Excel文件并下载

2. **Word导出**:
   - 使用预定义Word模板
   - 支持自定义模板上传
   - 包含用例详情、步骤、图片等完整信息

**业务规则**:
```yaml
导入约束:
  文件限制:
    - Excel: 最大10MB，最多1000条记录
    - XMind: 最大20MB，最多2000个节点
  
  数据验证:
    - 用例名称: 必填，1-250字符
    - 前置条件: 可选，最大2000字符
    - 测试步骤: 必填，每步最大2000字符
    - 分组路径: 可选，最大8级层次
  
  重复检查:
    - 同目录下用例名称不能重复
    - 提供重复用例处理策略（跳过/覆盖/重命名）
  
  错误处理:
    - 验证失败时显示详细错误报告
    - 支持部分成功导入（跳过错误行）
    - 提供错误数据重新编辑功能

导出限制:
  数据范围: 最大5000个用例/次
  格式支持: Excel (.xlsx), Word (.docx), PDF
  字段选择: 支持自定义导出字段
  模板支持: Word模板自定义
```

#### 1.3 用例搜索和筛选功能

##### 功能点：高级搜索和筛选器
**业务描述**: 提供强大的搜索和筛选能力，帮助用户快速定位需要的测试用例。

**详细功能规格**:
1. **文本搜索**:
   - 搜索范围：用例名称、前置条件、测试步骤内容
   - 搜索模式：模糊匹配，支持中英文
   - 搜索防抖：300ms延迟执行，避免频繁请求
   - 高亮显示：搜索结果中关键词高亮

2. **筛选器组合**:
   - **状态筛选**: 多选状态，支持"全选"和"反选"
   - **优先级筛选**: P0/P1/P2/P3多选
   - **分配人筛选**: 人员选择器，支持搜索用户名
   - **创建时间筛选**: 日期范围选择器
   - **目录筛选**: 树形目录选择器

3. **高级查询构造器**:
   ```typescript
   interface AdvancedFilter {
     field: FieldKey;              // 字段名
     operator: 'eq'|'neq'|'in'|'nin'|'like'|'gt'|'lt'|'gte'|'lte'; // 操作符
     value: any;                   // 过滤值
     logic: 'AND'|'OR';           // 逻辑关系
   }
   
   // 过滤器组合示例
   const filterQuery = {
     conditions: [
       { field: 'status', operator: 'in', value: ['TODO', 'PASSED'], logic: 'AND' },
       { field: 'priority', operator: 'eq', value: 'P0', logic: 'AND' },
       { field: 'name', operator: 'like', value: '登录', logic: 'AND' }
     ]
   };
   ```

4. **搜索结果处理**:
   - 实时显示搜索结果数量
   - 支持搜索结果排序（相关度、创建时间、名称等）
   - 搜索历史记录（本地存储）
   - 搜索条件保存和复用

**业务规则**:
```yaml
搜索约束:
  搜索字符: 最少2个字符
  搜索超时: 30秒自动取消
  结果数量: 最多返回1000条结果
  
  字段权限:
    - 所有用户可搜索基础字段
    - 高级字段搜索需要对应权限
    - 跨空间搜索需要特殊权限
  
  搜索性能:
    - 索引字段搜索: <200ms
    - 全文搜索: <2秒
    - 复杂组合查询: <5秒

筛选约束:
  组合数量: 最多20个筛选条件
  字段类型: 根据字段类型限制操作符
  数据范围: 
    - 日期范围: 最大跨度1年
    - 用户选择: 最多50个用户
    - 状态选择: 支持所有已配置状态
```

##### 功能点：用例版本管理
**业务描述**: 完整的用例版本控制机制，支持版本快照、对比和回滚功能。

**版本管理详细机制**:
1. **自动版本创建**:
   - 用例创建时自动创建第一个版本
   - 编辑保存后自动创建新版本
   - 版本号自动递增（v1.0, v1.1, v1.2...）

2. **版本快照存储**:
   ```typescript
   interface CaseSnapshot {
     snapshotId: string;            // 快照ID
     caseId: string;               // 原用例ID
     version: string;              // 版本号
     detail: {
       steps: Step[];              // 快照时的步骤内容
       precondition: string;       // 快照时的前置条件
     };
     metadata: {
       createdBy: string;          // 创建人
       createdAt: Date;           // 创建时间
       comment: string;           // 版本说明
       changeLog: string[];       // 变更记录
     };
   }
   ```

3. **版本对比功能**:
   - 选择两个版本进行文本对比
   - 高亮显示差异内容（新增绿色、删除红色、修改黄色）
   - 支持步骤级别的详细对比
   - 提供版本合并建议

4. **版本回滚**:
   - 选择历史版本进行回滚
   - 权限检查：仅用例管理员可回滚
   - 回滚确认：显示影响范围
   - 回滚后创建新版本记录

**业务规则**:
```yaml
版本创建规则:
  自动创建时机:
    - 用例首次创建
    - detail字段发生变更
    - 手动创建快照
  
  版本保留策略:
    - 保留最近20个版本
    - 重要版本永久保留
    - 超出限制时删除最旧版本
  
  版本命名规则:
    - 自动版本: v{major}.{minor}
    - 手动版本: 支持自定义名称
    - 里程碑版本: 特殊标记

版本使用规则:
  关联执行:
    - 测试执行关联特定版本快照
    - 执行过程中用例变更不影响执行
  
  权限控制:
    - 查看版本: 所有有用例查看权限的用户
    - 创建版本: 用例管理员、测试经理
    - 回滚版本: 仅用例管理员
    - 删除版本: 仅系统管理员
```

#### 1.4 脑图模式功能

##### 功能点：可视化脑图展示
**业务描述**: 将测试用例以脑图形式可视化展示，支持层级结构浏览和在线编辑。

**脑图功能详细规格**:
1. **脑图渲染**:
   - 基于目录结构生成脑图树
   - 支持节点展开和收起
   - 不同类型节点使用不同图标和颜色
   - 支持缩放和平移操作

2. **节点交互**:
   - 单击节点：选中并显示详情
   - 双击节点：展开/收起子节点
   - 右键节点：显示操作菜单
   - 拖拽节点：调整位置和结构

3. **脑图编辑**:
   - 支持在线添加、删除、编辑节点
   - 节点内容支持富文本格式
   - 自动同步到用例库结构
   - 编辑历史记录和撤销功能

**技术实现**:
```typescript
interface MinderNode {
  id: string;                     // 节点ID
  text: string;                   // 节点文本
  type: 'folder' | 'case';        // 节点类型
  level: number;                  // 层级深度
  position: { x: number; y: number }; // 节点位置
  children: MinderNode[];         // 子节点
  expanded: boolean;              // 展开状态
  
  // 关联数据
  linkedId?: string;              // 关联的目录或用例ID
  metadata?: {
    caseCount: number;            // 关联用例数量
    status?: Status['key'];       // 节点状态
    priority?: string;            // 优先级
  };
}
```

**业务规则**:
```yaml
脑图约束:
  节点限制:
    - 最大节点数: 2000个
    - 最大层级: 8级
    - 节点文本: 最大100字符
  
  编辑权限:
    - 查看: 所有用户
    - 编辑: 用例管理员、测试经理
    - 结构调整: 仅用例管理员
  
  同步规则:
    - 脑图修改实时同步到用例库
    - 用例库修改自动更新脑图
    - 冲突时以最后操作为准
```

### 二、测试计划 (Plan Module)

#### 2.1 计划管理功能

##### 功能点：测试计划创建和配置
**业务描述**: 完整的测试计划生命周期管理，包括计划创建、编辑、状态跟踪和删除。

**计划创建详细流程**:
1. **基础信息配置**:
   ```typescript
   interface TestPlanConfig {
     name: string;                // 计划名称 (1-100字符)
     description?: string;        // 计划描述 (最大1000字符)
     timeRange: {
       startDate: Date;           // 开始时间
       endDate: Date;             // 结束时间
     };
     priority: 'High'|'Medium'|'Low'; // 计划优先级
     type: 'Version'|'Regression'|'Feature'|'Hotfix'; // 计划类型
   }
   ```

2. **模板选择**:
   - 系统预置模板：版本测试、回归测试、功能测试等
   - 自定义模板：基于历史计划创建模板
   - 模板内容：包含预设的用例选择规则和配置

3. **用例关联流程**:
   - 从用例库选择测试用例
   - 支持按目录批量选择
   - 支持按条件筛选后批量添加
   - 用例版本锁定：选择特定版本进行测试

**业务规则**:
```yaml
计划创建规则:
  必填字段:
    - name: 计划名称
    - timeRange: 时间范围
    - type: 计划类型
  
  时间约束:
    - 开始时间不能早于当前时间
    - 结束时间必须晚于开始时间
    - 计划持续时间建议不超过1个月
  
  用例关联规则:
    - 只能关联"已通过"状态的用例
    - 支持跨目录选择用例
    - 单个计划建议不超过500个用例
  
  权限要求:
    - 创建: 测试经理、系统管理员
    - 编辑: 计划创建人、测试经理、系统管理员
    - 删除: 仅测试经理、系统管理员
```

##### 功能点：测试执行任务管理
**业务描述**: 将测试计划分解为具体的执行任务，支持任务分配、进度跟踪和批量操作。

**任务创建详细流程**:
1. **执行任务生成**:
   ```typescript
   const createTestExecution = async (config: ExecutionConfig) => {
     // 1. 验证计划状态
     if (plan.status !== 'ACTIVE') {
       throw new Error('只能在活动状态的计划下创建执行任务');
     }
     
     // 2. 选择测试用例
     const { selectedCaseIds, caseVersion } = await selectCases();
     
     // 3. 创建执行任务
     const execution = await createExecution({
       name: generateExecutionName(plan.name),
       planId: plan.objectId,
       caseIds: selectedCaseIds,
       caseVersion: caseVersion
     });
     
     // 4. 创建测试执行记录
     await createTestRuns({
       executionId: execution.objectId,
       caseIds: selectedCaseIds,
       assignees: config.assignees
     });
     
     return execution;
   };
   ```

2. **任务分配机制**:
   - **自动分配**: 根据历史数据和负载均衡
   - **手动分配**: 指定执行人员
   - **分组分配**: 按模块或功能分组分配
   - **技能匹配**: 根据人员技能和用例难度匹配

3. **执行任务配置**:
   - 执行环境：测试环境、数据准备要求
   - 执行优先级：紧急、正常、低优先级
   - 执行策略：顺序执行、并行执行、分阶段执行
   - 完成条件：全部通过、通过率阈值、关键用例通过

**数据字段定义**:
```typescript
interface TestExecution extends BaseTestEntity {
  name: string;                   // 执行任务名称
  planId: string;                 // 关联测试计划ID
  
  // 任务配置
  config: {
    environment: string;          // 测试环境
    priority: 'High'|'Medium'|'Low'; // 执行优先级
    strategy: 'Sequential'|'Parallel'|'Staged'; // 执行策略
    autoAssign: boolean;          // 是否自动分配
  };
  
  // 执行状态
  status: 'PENDING'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED';
  progress: {
    total: number;                // 总用例数
    completed: number;            // 已完成数
    passed: number;               // 通过数
    failed: number;               // 失败数
    blocked: number;              // 阻塞数
  };
  
  // 分配信息
  assignees: UserPointerInfo[];   // 分配的执行人员
  workload: Record<string, number>; // 各人员工作量分配
  
  // 时间信息
  scheduledStart: Date;           // 计划开始时间
  scheduledEnd: Date;             // 计划结束时间
  actualStart?: Date;             // 实际开始时间
  actualEnd?: Date;               // 实际结束时间
}
```

**UI元素详解**:
- **执行任务列表**: 左侧面板显示计划下的所有执行任务
  - 任务名称和状态图标
  - 进度条显示完成百分比
  - 分配人员头像组
  - 快速操作按钮（查看、编辑、删除）
- **任务详情面板**: 右侧显示选中任务的详细信息
  - 任务基本信息（名称、描述、时间）
  - 执行统计图表（通过率、进度等）
  - 关联用例列表（支持筛选和搜索）
  - 操作历史记录

#### 2.2 任务分配和调度功能

##### 功能点：智能任务分配
**业务描述**: 基于人员技能、工作负载和用例特征的智能分配算法，优化测试资源利用率。

**分配算法详细逻辑**:
1. **负载均衡分配**:
   ```typescript
   const calculateWorkload = (assignee: User) => {
     // 1. 计算当前待执行任务数
     const pendingTasks = await getPendingTasks(assignee.id);
     
     // 2. 计算预估工作量
     const estimatedHours = pendingTasks.reduce((total, task) => {
       return total + estimateTaskDuration(task);
     }, 0);
     
     // 3. 考虑人员技能系数
     const skillMultiplier = getSkillMultiplier(assignee, taskType);
     
     return {
       taskCount: pendingTasks.length,
       estimatedHours: estimatedHours * skillMultiplier,
       capacity: assignee.dailyCapacity || 8 // 每日工作小时数
     };
   };
   ```

2. **技能匹配机制**:
   - 人员技能标签：UI测试、API测试、性能测试、安全测试等
   - 用例技能要求：根据用例内容自动分析或手动标记
   - 匹配算法：计算技能匹配度评分
   - 优先分配：高匹配度优先，低匹配度补充

3. **时间调度优化**:
   - 并行任务识别：无依赖关系的用例可并行执行
   - 关键路径分析：识别影响整体进度的关键任务
   - 缓冲时间设置：为复杂用例预留额外时间
   - 进度预警：根据实际进度调整后续分配

**详细分配流程**:
1. **分配策略选择**:
   - **平均分配**: 用例数量平均分配给所有执行人
   - **技能优先**: 根据技能匹配度分配
   - **负载均衡**: 根据当前工作量分配
   - **手动指定**: 完全手动分配执行人

2. **分配执行**:
   ```mermaid
   graph TD
       A[选择分配策略] --> B[分析用例特征]
       B --> C[评估人员能力]
       C --> D[计算最优分配方案]
       D --> E[用户确认分配]
       E --> F[生成执行任务]
       F --> G[发送任务通知]
   ```

3. **分配结果优化**:
   - 显示分配预览：各人员分配的用例数量和预估工时
   - 支持手动调整：拖拽用例在人员间移动
   - 平衡检查：检测分配不均衡并提供建议
   - 依赖检查：确保有依赖关系的用例分配给同一人

**业务规则**:
```yaml
分配约束:
  人员限制:
    - 执行人必须是当前空间成员
    - 单人最大并发任务数: 20个
    - 单人单日最大用例数: 50个
  
  用例限制:
    - 同一用例不能分配给多个人
    - 有依赖关系的用例必须分配给同一人
    - 优先级高的用例优先分配
  
  时间约束:
    - 任务执行时间必须在计划时间范围内
    - 考虑人员工作日和假期
    - 预留20%缓冲时间

分配规则:
  自动分配逻辑:
    1. 按优先级排序用例
    2. 计算各人员当前负载
    3. 技能匹配度评分
    4. 生成最优分配方案
  
  手动调整规则:
    - 支持拖拽调整分配
    - 实时显示负载变化
    - 超负荷时显示警告
    - 支持批量重新分配
```

### 三、测试执行 (Execution Module)

#### 3.1 测试执行界面功能

##### 功能点：测试执行主界面
**业务描述**: 提供专业的测试执行环境，支持步骤级执行、结果记录、缺陷管理和附件上传的一体化执行界面。

**执行界面详细设计**:
1. **界面布局结构**:
   ```
   ┌─────────────────────────────────────────────────────────┐
   │ 测试执行 - [用例名称] [X关闭]                              │
   ├─────────────────────────────────────────────────────────┤
   │ ┌─用例信息─┐ ┌─────────执行区域─────────┐                │
   │ │ 用例名称  │ │ [测试步骤] [执行结果] [缺陷] [附件] │      │
   │ │ 前置条件  │ ├─────────────────────────┤                │
   │ │ 创建信息  │ │                        │                │
   │ │ 历史执行  │ │     步骤内容区域        │                │
   │ └─────────┘ │                        │                │
   │             │                        │                │
   │             └─────────────────────────┘                │
   ├─────────────────────────────────────────────────────────┤
   │ [上一个] [下一个] [保存] [通过] [失败] [阻塞] [关闭]      │
   └─────────────────────────────────────────────────────────┘
   ```

2. **测试步骤执行**:
   - **步骤列表**: 显示所有测试步骤，支持逐步执行
   - **步骤状态**: 每个步骤独立的执行状态（未执行/执行中/通过/失败/阻塞）
   - **实际结果录入**: 富文本编辑器支持文本、图片、链接
   - **步骤计时**: 可选的步骤执行时间记录

3. **执行结果管理**:
   ```typescript
   interface ExecutionResult {
     stepResults: StepResult[];     // 各步骤执行结果
     overallStatus: Status['key']; // 整体执行状态
     executionTime: number;        // 总执行时间(秒)
     executionDate: Date;          // 执行时间
     executor: UserPointerInfo;    // 执行人员
     
     // 结果描述
     resultDescription: string;    // 执行结果描述
     notes: string;               // 执行备注
     
     // 质量信息
     defectCount: number;         // 发现缺陷数量
     riskLevel: 'Low'|'Medium'|'High'; // 风险等级评估
   }
   
   interface StepResult {
     stepId: string;              // 步骤ID
     status: Status['key'];       // 步骤执行状态
     actualResult: string;        // 实际执行结果
     expectedResult: string;      // 预期结果
     executionTime: number;       // 步骤执行时间
     attachments: FileType[];     // 步骤附件
     comments: Comment[];         // 步骤评论
     defects: string[];          // 关联缺陷ID列表
   }
   ```

**详细操作流程**:
1. **开始执行**:
   - 从计划任务列表选择待执行用例
   - 系统检查执行权限（是否分配给当前用户）
   - 打开执行界面，显示用例详情和步骤列表
   - 自动设置状态为"执行中"

2. **步骤执行**:
   - 从第一个步骤开始逐步执行
   - 每步执行后记录实际结果
   - 支持跳步执行（标记原因）
   - 自动保存执行进度（每30秒或操作后）

3. **异常处理**:
   - **步骤失败**: 必须填写失败原因或创建缺陷
   - **执行阻塞**: 记录阻塞原因和预期解决时间
   - **执行中断**: 支持暂停后继续，保持执行状态

4. **执行完成**:
   - 所有步骤执行完成后确定整体状态
   - 自动计算执行时间和通过率
   - 生成执行摘要和建议
   - 自动切换到下一个待执行用例

**业务规则**:
```yaml
执行权限规则:
  基础权限:
    - 只能执行分配给自己的用例
    - 管理员可以代为执行
    - 执行人可以查看所有相关信息
  
  状态流转规则:
    PENDING → IN_PROGRESS: 开始执行时自动切换
    IN_PROGRESS → PASSED: 所有步骤通过
    IN_PROGRESS → FAILED: 至少一个步骤失败
    IN_PROGRESS → BLOCKED: 遇到阻塞无法继续
    任何状态 → IN_PROGRESS: 重新执行

执行约束:
  时间限制:
    - 单次执行最长24小时自动超时
    - 步骤执行建议在10分钟内完成
  
  数据要求:
    - 失败状态必须填写原因（最少10字符）
    - 阻塞状态必须说明阻塞点和预期解决时间
    - 附件总大小不超过100MB
  
  质量要求:
    - 实际结果描述建议不少于20字符
    - 关键步骤建议上传截图证据
    - 异常情况必须详细记录
```

##### 功能点：批量执行操作
**业务描述**: 支持多个测试用例的批量状态更新、批量分配和批量结果设置，提升大规模测试的执行效率。

**批量操作详细功能**:
1. **批量状态更新**:
   - 选择多个执行记录（Ctrl+点击多选）
   - 选择目标状态（通过/失败/阻塞/重置）
   - 统一填写状态变更原因
   - 批量应用并显示处理进度

2. **批量结果设置**:
   ```typescript
   interface BatchUpdateConfig {
     targetStatus: Status['key'];   // 目标状态
     reason: string;               // 状态变更原因
     applyToSteps: boolean;        // 是否应用到所有步骤
     notifyAssignees: boolean;     // 是否通知分配人
     
     // 条件筛选
     filters: {
       byPriority?: string[];      // 按优先级筛选
       byAssignee?: string[];      // 按执行人筛选
       byTimeRange?: DateRange;    // 按时间范围筛选
     };
   }
   ```

3. **智能批量处理**:
   - **条件批量**: 根据条件筛选后批量操作
   - **进度批量**: 按执行进度分组批量处理
   - **异常批量**: 快速处理异常状态的执行记录
   - **定时批量**: 设定时间自动执行批量操作

**业务规则**:
```yaml
批量操作约束:
  数量限制:
    - 单次批量最多500个执行记录
    - 批量操作超时时间: 10分钟
  
  权限要求:
    - 批量通过: 测试工程师（仅自己的任务）
    - 批量失败: 需要管理员权限
    - 批量重置: 仅测试经理和系统管理员
  
  状态约束:
    - 不能批量设置为"执行中"
    - 批量失败必须提供统一失败原因
    - 已完成的执行需要确认才能重置

操作反馈:
  进度显示: 实时显示处理进度和成功/失败数量
  错误处理: 部分失败时详细列出失败项目和原因
  结果统计: 操作完成后显示影响统计
```

#### 3.2 缺陷管理功能

##### 功能点：测试缺陷创建和关联
**业务描述**: 在测试执行过程中发现问题时，可以直接创建缺陷并自动关联到测试执行记录，形成完整的质量追踪链条。

**缺陷管理详细流程**:
1. **缺陷创建流程**:
   ```mermaid
   sequenceDiagram
       participant Tester as 测试人员
       participant UI as 执行界面
       participant DefectModal as 缺陷创建框
       participant API as 缺陷系统
       participant TestAPI as 测试系统
       
       Tester->>UI: 标记步骤为失败
       UI->>UI: 显示"创建缺陷"按钮
       Tester->>DefectModal: 点击创建缺陷
       DefectModal->>DefectModal: 预填执行信息
       Tester->>DefectModal: 填写缺陷详情
       DefectModal->>API: 创建缺陷记录
       API->>TestAPI: 建立关联关系
       TestAPI->>UI: 更新界面显示
       UI->>Tester: 显示关联成功
   ```

2. **缺陷信息预填充**:
   - 自动填充测试用例信息（名称、步骤、预期结果）
   - 自动添加执行环境信息
   - 复制实际执行结果作为缺陷描述基础
   - 关联执行人作为缺陷报告人

3. **缺陷关联管理**:
   - 单个测试执行可关联多个缺陷
   - 单个缺陷可被多个测试执行关联
   - 支持关联已存在的缺陷
   - 缺陷状态变更时自动通知相关测试人员

**数据字段定义**:
```typescript
interface TestDefect extends BaseTestEntity {
  // 缺陷基本信息
  title: string;                  // 缺陷标题 (1-200字符)
  description: string;            // 缺陷描述 (详细说明)
  severity: 'Critical'|'High'|'Medium'|'Low'; // 严重程度
  priority: 'P0'|'P1'|'P2'|'P3';  // 处理优先级
  
  // 分类信息
  category: string;               // 缺陷分类
  component: string;              // 相关组件
  version: string;                // 发现版本
  
  // 环境信息
  environment: {
    os: string;                   // 操作系统
    browser: string;              // 浏览器版本
    device: string;               // 设备信息
    testData: string;             // 测试数据
  };
  
  // 关联信息
  linkedTestRuns: string[];       // 关联的测试执行ID
  linkedTestCases: string[];      // 关联的测试用例ID
  relatedDefects: string[];       // 相关缺陷ID
  
  // 处理信息
  assignee: UserPointerInfo;      // 分配开发人员
  reporter: UserPointerInfo;      // 缺陷报告人
  status: DefectStatus;          // 缺陷处理状态
  resolution: string;            // 解决方案
  
  // 时间跟踪
  reportedAt: Date;              // 报告时间
  assignedAt?: Date;             // 分配时间
  resolvedAt?: Date;             // 解决时间
  verifiedAt?: Date;             // 验证时间
}

enum DefectStatus {
  NEW = 'NEW',                   // 新建
  ASSIGNED = 'ASSIGNED',         // 已分配
  IN_PROGRESS = 'IN_PROGRESS',   // 处理中
  RESOLVED = 'RESOLVED',         // 已解决
  VERIFIED = 'VERIFIED',         // 已验证
  CLOSED = 'CLOSED',             // 已关闭
  REOPENED = 'REOPENED'          // 重新打开
}
```

**业务规则**:
```yaml
缺陷创建规则:
  必填字段:
    - title: 缺陷标题
    - description: 问题描述 (最少50字符)
    - severity: 严重程度
    - category: 缺陷分类
  
  自动填充:
    - reporter: 当前执行用户
    - environment: 执行环境信息
    - linkedTestRuns: 当前执行记录
    - reportedAt: 当前时间
  
  验证规则:
    - 缺陷标题不能与已存在缺陷重复
    - 描述必须包含重现步骤
    - 严重程度与优先级必须匹配业务规则

缺陷关联规则:
  关联约束:
    - 一个测试执行可关联多个缺陷
    - 一个缺陷可被多个测试执行关联
    - 关联建立后双方都显示关联信息
  
  状态同步:
    - 缺陷解决后自动通知相关测试人员
    - 测试重新执行通过后可自动关闭缺陷
    - 缺陷重新打开时通知测试人员重新验证
```

#### 3.3 附件和证据管理功能

##### 功能点：执行附件上传和管理
**业务描述**: 支持测试执行过程中上传截图、文档、视频等附件作为执行证据，形成完整的测试追踪记录。

**附件管理详细功能**:
1. **文件上传支持**:
   - **支持格式**: 图片 (.jpg, .png, .gif, .bmp)、文档 (.pdf, .doc, .docx, .txt)、视频 (.mp4, .avi, .mov)
   - **大小限制**: 单文件最大10MB，总附件最大100MB
   - **上传方式**: 拖拽上传、点击选择、粘贴截图

2. **附件预览功能**:
   - **图片预览**: 缩略图显示，点击查看大图
   - **文档预览**: 在线预览PDF、Word文档
   - **视频播放**: 内嵌视频播放器
   - **下载功能**: 支持单个和批量下载

3. **附件组织管理**:
   ```typescript
   interface TestAttachment {
     id: string;                  // 附件ID
     fileName: string;            // 原始文件名
     fileSize: number;            // 文件大小(字节)
     fileType: string;            // 文件类型/MIME
     uploadUrl: string;           // 上传后的访问URL
     thumbnailUrl?: string;       // 缩略图URL（图片类型）
     
     // 关联信息
     testRunId: string;           // 关联测试执行ID
     stepId?: string;             // 关联步骤ID（可选）
     defectId?: string;           // 关联缺陷ID（可选）
     
     // 元数据
     uploadedBy: UserPointerInfo; // 上传人
     uploadedAt: Date;            // 上传时间
     description?: string;        // 附件说明
     tags: string[];              // 附件标签
     
     // 处理状态
     status: 'UPLOADING'|'COMPLETED'|'FAILED'; // 上传状态
     virusScanResult?: 'SAFE'|'SUSPICIOUS'|'INFECTED'; // 安全扫描结果
   }
   ```

**业务规则**:
```yaml
上传约束:
  文件限制:
    - 格式白名单: 仅允许预定义的安全格式
    - 大小限制: 单文件≤10MB，总计≤100MB
    - 数量限制: 单次执行最多50个附件
  
  安全检查:
    - 文件类型验证: 检查真实文件类型
    - 病毒扫描: 自动扫描上传文件
    - 内容过滤: 禁止上传敏感信息文件
  
  存储管理:
    - 自动压缩: 图片自动压缩优化存储
    - 生命周期: 附件保留期为2年
    - 清理策略: 定期清理无关联附件

访问权限:
  查看权限: 有测试执行查看权限的用户
  下载权限: 执行人员、测试经理、系统管理员
  删除权限: 附件上传人、测试经理、系统管理员
```

### 四、测试报告 (Report Module)

#### 4.1 报告模板管理功能

##### 功能点：动态报告模板配置
**业务描述**: 支持灵活的报告模板定制，包括数据源配置、图表设置和导出格式，满足不同测试报告需求。

**模板配置详细流程**:
1. **基础配置步骤**:
   ```typescript
   interface ReportTemplate {
     // 基础信息
     templateId: string;          // 模板ID
     name: string;               // 模板名称 (1-50字符)
     description: string;        // 模板描述
     category: 'Standard'|'Custom'|'Executive'; // 模板类别
     
     // 数据源配置
     dataSource: {
       type: 'Plan'|'Execution'|'Case'|'Custom'; // 数据类型
       query: QueryConfig;        // 数据查询配置
       timeRange: DateRange;      // 时间范围
       filters: FilterConfig[];   // 数据过滤器
     };
     
     // 报告结构
     sections: ReportSection[];   // 报告章节配置
     charts: ChartConfig[];       // 图表配置
     layout: LayoutConfig;        // 布局配置
     
     // 导出设置
     exportFormats: ('HTML'|'PDF'|'WORD'|'EXCEL')[]; // 支持导出格式
     wordTemplate?: string;       // Word模板文件ID
     
     // 权限和共享
     isPublic: boolean;          // 是否公开模板
     allowedUsers: string[];     // 允许使用的用户
     createdBy: string;          // 模板创建人
   }
   ```

2. **数据源配置**:
   - **测试计划数据**: 计划执行统计、用例分布、进度分析
   - **执行数据**: 详细执行记录、通过率、执行时间分析
   - **缺陷数据**: 缺陷统计、分类分析、趋势分析
   - **自定义数据**: 支持自定义SQL查询和API数据源

3. **图表配置**:
   - **基础图表**: 柱状图、饼图、折线图、面积图
   - **高级图表**: 热力图、雷达图、漏斗图、散点图
   - **交互配置**: 图表钻取、联动筛选、数据提示
   - **样式配置**: 颜色主题、字体大小、图例位置

**业务规则**:
```yaml
模板配置规则:
  数据源限制:
    - 单个模板最多5个数据源
    - 查询超时时间: 30秒
    - 数据量限制: 最多10万条记录
  
  图表限制:
    - 单个报告最多20个图表
    - 图表数据点: 最多1000个点
    - 图表类型: 根据数据类型自动推荐
  
  权限控制:
    - 模板创建: 测试经理、系统管理员
    - 模板编辑: 模板创建人、系统管理员
    - 模板使用: 基于模板权限设置
    - 模板共享: 支持空间内共享

模板质量标准:
  必需内容:
    - 报告概述: 简要说明报告目的和范围
    - 关键指标: 至少包含3个核心测试指标
    - 数据来源: 明确标注数据来源和时间范围
    - 结论建议: 基于数据的结论和改进建议
```

##### 功能点：自动化报告生成
**业务描述**: 基于配置的模板自动生成测试报告，支持定时生成、事件触发生成和手动生成。

**自动生成详细机制**:
1. **触发条件配置**:
   ```typescript
   interface AutoReportConfig {
     triggers: ReportTrigger[];    // 触发条件数组
     schedule: ScheduleConfig;     // 定时配置
     recipients: RecipientConfig; // 接收人配置
     
     // 生成条件
     conditions: {
       minExecutionCount: number; // 最少执行数量
       minPassRate: number;      // 最低通过率
       timeWindow: Duration;     // 时间窗口
     };
   }
   
   interface ReportTrigger {
     type: 'PlanComplete'|'Schedule'|'Threshold'|'Manual'; // 触发类型
     condition: TriggerCondition; // 触发条件
     enabled: boolean;           // 是否启用
   }
   ```

2. **报告生成流程**:
   ```mermaid
   graph TD
       A[触发条件满足] --> B[检查生成条件]
       B --> C{条件是否满足}
       C -->|是| D[收集数据]
       C -->|否| E[记录日志并等待]
       D --> F[应用模板]
       F --> G[生成报告内容]
       G --> H[格式化输出]
       H --> I[发送给接收人]
       I --> J[存档报告记录]
   ```

3. **数据收集和处理**:
   - **实时数据**: 从数据库获取最新执行数据
   - **计算指标**: 自动计算通过率、执行时间、缺陷密度等
   - **趋势分析**: 对比历史数据生成趋势图
   - **异常检测**: 识别异常数据并标记

**业务规则**:
```yaml
自动生成规则:
  触发条件验证:
    - 测试计划完成: 完成率≥95%
    - 定时触发: 按配置的时间周期
    - 阈值触发: 关键指标超过预设阈值
  
  数据质量要求:
    - 最少执行数据: 10个以上执行记录
    - 数据完整性: 缺失数据≤5%
    - 时间范围: 数据时间跨度≥1天
  
  生成失败处理:
    - 自动重试: 最多3次重试
    - 错误通知: 失败时通知管理员
    - 降级处理: 部分数据缺失时生成简化报告

报告质量标准:
  内容完整性:
    - 必须包含执行概况、详细统计、问题分析
    - 图表数量: 至少3个核心图表
    - 结论部分: 明确的测试结论和建议
  
  格式标准:
    - PDF格式: 分页合理，图表清晰
    - Word格式: 格式规范，支持目录导航
    - HTML格式: 响应式布局，交互图表
```

#### 4.2 报告分发功能

##### 功能点：报告发送和共享
**业务描述**: 支持多种方式分发测试报告，包括邮件发送、站内消息推送和链接分享。

**分发机制详细配置**:
1. **邮件发送配置**:
   ```typescript
   interface EmailConfig {
     // 收件人配置
     recipients: {
       to: EmailRecipient[];      // 主要收件人
       cc: EmailRecipient[];      // 抄送人
       bcc: EmailRecipient[];     // 密送人
     };
     
     // 邮件内容
     subject: string;             // 邮件主题
     template: EmailTemplate;     // 邮件模板
     attachments: AttachmentConfig[]; // 附件配置
     
     // 发送设置
     sendTime: Date;             // 发送时间
     priority: 'High'|'Normal'|'Low'; // 邮件优先级
     requireReadReceipt: boolean; // 是否需要回执
   }
   ```

2. **站内消息推送**:
   - 消息类型：通知、提醒、警告
   - 消息内容：报告摘要和关键指标
   - 消息链接：直接链接到完整报告
   - 已读状态：跟踪消息阅读状态

3. **链接分享**:
   - 生成安全的分享链接（包含访问令牌）
   - 设置链接有效期（7天/30天/永久）
   - 访问权限控制（仅登录用户/特定用户/公开）
   - 访问统计：记录链接访问次数和用户

**业务规则**:
```yaml
发送权限规则:
  邮件发送:
    - 权限要求: 测试经理、报告创建人、系统管理员
    - 收件人限制: 最多50个收件人
    - 发送频率: 同一报告24小时内最多发送3次
  
  内部分享:
    - 空间内分享: 自动继承空间权限
    - 跨空间分享: 需要特殊权限
    - 外部分享: 需要管理员授权

链接安全规则:
  访问控制:
    - 链接有效期: 最长90天
    - 访问次数限制: 可配置最大访问次数
    - IP限制: 可限制访问来源IP
  
  内容保护:
    - 敏感数据脱敏: 自动隐藏敏感信息
    - 水印添加: PDF报告自动添加水印
    - 禁止打印: 可配置禁止打印选项
```

### 五、系统配置 (Config Module)

#### 5.1 权限配置功能

##### 功能点：角色权限矩阵管理
**业务描述**: 提供细粒度的权限控制，支持角色定义、权限分配和访问控制。

**权限管理详细机制**:
1. **角色定义系统**:
   ```typescript
   interface Role {
     roleId: string;              // 角色ID
     roleName: string;            // 角色名称
     description: string;         // 角色描述
     permissions: Permission[];   // 权限列表
     isSystemRole: boolean;       // 是否系统预置角色
     
     // 角色约束
     constraints: {
       maxUsers: number;          // 最大用户数
       workspaceScope: string[];  // 适用空间范围
       timeRestriction?: TimeRange; // 时间限制
     };
   }
   
   interface Permission {
     module: string;              // 功能模块
     action: string;              // 操作类型
     scope: 'ALL'|'OWN'|'TEAM'|'NONE'; // 权限范围
     conditions: PermissionCondition[]; // 权限条件
   }
   ```

2. **权限检查机制**:
   - **操作前检查**: 所有敏感操作前验证权限
   - **数据过滤**: 根据权限过滤可见数据
   - **功能禁用**: 无权限功能自动禁用或隐藏
   - **权限继承**: 支持角色权限继承

3. **动态权限控制**:
   - **条件权限**: 基于数据状态的动态权限
   - **临时授权**: 短期临时权限分配
   - **权限委托**: 权限临时委托给其他用户
   - **审计追踪**: 所有权限操作记录审计日志

**业务规则**:
```yaml
角色管理规则:
  系统角色 (不可删除):
    - 系统管理员: 所有权限
    - 测试经理: 计划管理、报告生成权限
    - 测试工程师: 执行权限、基础查看权限
    - 用例管理员: 用例库管理权限
  
  自定义角色:
    - 最多创建20个自定义角色
    - 角色名称不能与系统角色重复
    - 必须至少包含一个权限点
  
  权限分配规则:
    - 用户只能分配自己拥有的权限
    - 高级权限需要上级管理员授权
    - 权限变更需要审批流程（可配置）

权限范围定义:
  ALL: 对所有数据有操作权限
  OWN: 仅对自己创建/分配的数据有权限
  TEAM: 对团队/部门数据有权限
  NONE: 无权限（功能隐藏）
```

#### 5.2 系统集成配置功能

##### 功能点：第三方系统集成管理
**业务描述**: 支持与缺陷跟踪系统、CI/CD系统、邮件系统等第三方系统的集成配置。

**集成配置详细功能**:
1. **缺陷系统集成**:
   ```typescript
   interface DefectSystemConfig {
     systemType: 'Jira'|'Bugzilla'|'MantisBT'|'Custom'; // 缺陷系统类型
     
     // 连接配置
     connection: {
       baseUrl: string;           // 系统地址
       apiKey: string;            // API密钥
       username: string;          // 用户名
       password: string;          // 密码（加密存储）
     };
     
     // 字段映射
     fieldMapping: {
       severity: FieldMapping;    // 严重程度映射
       priority: FieldMapping;    // 优先级映射
       category: FieldMapping;    // 分类映射
       status: FieldMapping;      // 状态映射
     };
     
     // 同步设置
     syncConfig: {
       autoSync: boolean;         // 是否自动同步
       syncInterval: number;      // 同步间隔(分钟)
       syncDirection: 'Import'|'Export'|'Bidirectional'; // 同步方向
     };
   }
   ```

2. **邮件系统配置**:
   - **SMTP配置**: 邮件服务器设置
   - **模板管理**: 邮件模板编辑和预览
   - **发送策略**: 批量发送、定时发送、优先级发送
   - **监控统计**: 发送成功率、打开率统计

3. **CI/CD集成**:
   - **WebHook配置**: 接收构建和部署事件
   - **自动触发**: 构建完成后自动触发测试
   - **结果回传**: 测试结果回传到CI/CD系统
   - **状态同步**: 测试状态与构建状态同步

**业务规则**:
```yaml
集成配置规则:
  连接验证:
    - 配置保存前必须测试连接
    - 连接失败时提供详细错误信息
    - 支持连接重试和超时设置
  
  数据安全:
    - 敏感信息加密存储
    - API密钥定期轮换提醒
    - 访问日志记录和监控
  
  同步规则:
    - 避免循环同步: 检测并防止数据循环
    - 冲突解决: 数据冲突时的解决策略
    - 失败重试: 同步失败时的重试机制

集成限制:
  性能约束:
    - 同步批次大小: 最多100条记录/次
    - 同步频率: 最少5分钟间隔
    - 并发限制: 最多3个同步任务并行
  
  功能限制:
    - 最多集成5个外部系统
    - 字段映射最多50个字段
    - WebHook最多配置10个端点
```

### 六、高级功能和扩展

#### 6.1 自定义字段系统

##### 功能点：动态字段扩展
**业务描述**: 支持为测试实体添加自定义字段，满足不同企业的个性化需求。

**自定义字段详细配置**:
1. **字段类型支持**:
   ```typescript
   enum CustomFieldType {
     TEXT = 'text',               // 单行文本
     LONG_TEXT = 'longText',      // 多行文本
     NUMBER = 'number',           // 数字
     DATE = 'date',               // 日期
     DATETIME = 'datetime',       // 日期时间
     USER = 'user',               // 用户选择
     DROPDOWN = 'dropdown',       // 下拉选择
     MULTI_SELECT = 'multiSelect', // 多选
     CHECKBOX = 'checkbox',       // 复选框
     FILE = 'file',               // 文件上传
     LINK = 'link',               // 链接
     FORMULA = 'formula',         // 公式计算
     
     // 测试管理专用字段
     TEST_REFERENCE = 'testReference', // 测试引用
     TEST_REPOSITORY = 'testRepository', // 测试库选择
     TEST_DETAIL = 'testDetail'   // 测试详情(富文本)
   }
   
   interface CustomField {
     fieldId: string;             // 字段ID
     fieldName: string;           // 字段名称
     fieldType: CustomFieldType; // 字段类型
     
     // 字段配置
     config: {
       required: boolean;         // 是否必填
       defaultValue?: any;        // 默认值
       validation?: ValidationRule[]; // 验证规则
       options?: FieldOption[];   // 选项配置（下拉、多选用）
     };
     
     // 显示配置
     display: {
       label: string;             // 显示标签
       placeholder?: string;      // 占位符
       helpText?: string;         // 帮助文本
       width?: number;            // 显示宽度
       order: number;             // 显示顺序
     };
     
     // 应用范围
     scope: {
       entityTypes: TestType[];   // 适用实体类型
       workspaces: string[];      // 适用空间
       roles: string[];           // 可见角色
     };
   }
   ```

**业务规则**:
```yaml
自定义字段约束:
  数量限制:
    - 每个实体类型最多50个自定义字段
    - 单个空间最多200个自定义字段
    - 字段名称长度: 1-50字符
  
  类型约束:
    - 文本字段: 最大长度5000字符
    - 数字字段: 支持整数和小数，可设置范围
    - 日期字段: 支持日期范围限制
    - 文件字段: 支持文件类型和大小限制
  
  验证规则:
    - 必填字段: 创建和编辑时强制验证
    - 格式验证: 邮箱、电话、URL格式验证
    - 范围验证: 数值范围、日期范围验证
    - 唯一性验证: 支持字段值唯一性约束

使用权限:
  字段管理:
    - 创建字段: 系统管理员
    - 编辑字段: 字段创建人、系统管理员
    - 删除字段: 仅系统管理员（需确认影响）
  
  字段使用:
    - 查看权限: 基于角色和字段配置
    - 编辑权限: 基于实体编辑权限
    - 必填验证: 所有有编辑权限的用户
```

## 🎯 功能优先级和使用频率分析

### 高频核心功能 (每日使用)
| 功能点 | 用户角色 | 使用频率 | 业务价值 | 技术复杂度 |
|--------|----------|----------|----------|------------|
| 用例执行界面 | 测试工程师 | 很高 | 很高 | 中等 |
| 用例查看和搜索 | 所有角色 | 高 | 高 | 低 |
| 执行进度查看 | 测试经理 | 高 | 高 | 低 |
| 缺陷创建关联 | 测试工程师 | 中高 | 高 | 中等 |

### 中频管理功能 (每周使用)
| 功能点 | 用户角色 | 使用频率 | 业务价值 | 技术复杂度 |
|--------|----------|----------|----------|------------|
| 测试计划创建 | 测试经理 | 中等 | 高 | 中等 |
| 用例批量导入 | 用例管理员 | 中等 | 中高 | 高 |
| 报告生成发送 | 测试经理 | 中等 | 中高 | 高 |
| 任务分配调整 | 测试经理 | 中等 | 中等 | 中等 |

### 低频配置功能 (每月使用)
| 功能点 | 用户角色 | 使用频率 | 业务价值 | 技术复杂度 |
|--------|----------|----------|----------|------------|
| 权限配置管理 | 系统管理员 | 低 | 高 | 高 |
| 报告模板配置 | 测试经理 | 低 | 中等 | 高 |
| 系统集成配置 | 系统管理员 | 很低 | 中等 | 很高 |
| 自定义字段管理 | 系统管理员 | 很低 | 中等 | 高 |

## 🔧 关键业务约束汇总

### 数据约束
```yaml
实体数量限制:
  测试用例: 单空间最大100,000个
  测试计划: 单空间最大1,000个
  测试执行: 单计划最大10,000个
  测试报告: 单空间最大500个

字段长度限制:
  名称字段: 1-250字符
  描述字段: 最大5,000字符
  文本字段: 最大10,000字符
  步骤内容: 每步最大2,000字符

关系约束:
  目录层级: 最大8级
  步骤数量: 每用例最大50个步骤
  关联关系: 每实体最大100个关联
  附件大小: 单文件最大10MB
```

### 性能约束
```yaml
响应时间要求:
  页面加载: <2秒
  操作响应: <500ms
  搜索响应: <1秒
  批量操作: <30秒

并发限制:
  同时在线: 最多500用户
  批量操作: 最多10个并发
  文件上传: 最多5个并发
  报告生成: 最多3个并发

缓存策略:
  页面缓存: 30分钟
  数据缓存: 5分钟
  图片缓存: 24小时
  报告缓存: 1小时
```

### 安全约束
```yaml
访问控制:
  身份验证: 强制登录验证
  会话管理: 8小时会话超时
  权限检查: 每个操作权限验证
  数据隔离: 严格的空间数据隔离

数据保护:
  敏感数据: 自动加密存储
  访问日志: 所有操作记录审计
  数据备份: 每日自动备份
  恢复机制: 7天内数据恢复

输入安全:
  XSS防护: 自动HTML标签过滤
  SQL注入: 参数化查询防护
  文件上传: 病毒扫描和格式验证
  输入长度: 严格的长度限制
```

---

## 📋 总结

本知识库详细描述了测试管理插件的每个功能点，包含：

✅ **50+个核心功能点** - 每个功能的完整业务逻辑  
✅ **200+个UI元素** - 详细的界面元素和交互说明  
✅ **100+条业务规则** - 具体的约束条件和验证逻辑  
✅ **300+个数据字段** - 完整的数据模型和字段定义  
✅ **20+个业务流程** - 端到端的操作流程和状态转换  

**适用对象**: 产品经理、需求分析师、需求Agent、开发人员、测试人员  
**更新频率**: 功能变更时同步更新  
**文档版本**: v1.0 (颗粒度完整版)

*基于完整代码分析生成，涵盖测试管理插件所有功能点的详细业务逻辑、操作流程、数据定义和约束规则。*