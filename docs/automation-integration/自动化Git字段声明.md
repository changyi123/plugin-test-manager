# 自动化测试Git相关自定义字段声明

## 需要在Proxima系统中声明的自定义字段

### 1. Git仓库相关字段（新增）

以下字段需要在测试用例（TestCase）类型中声明：

| 字段名 | 字段类型 | 说明 | 对应webhook字段 | Pipe参数名 |
|-------|---------|------|----------------|-----------|
| r_test_manager_atm_git_clone_url | Text | Git仓库克隆地址(SSH) | payload.project.git_ssh_url | GIT_CODE_CLONE_URL |
| r_test_manager_atm_git_branch | Text | Git分支名称 | payload.ref | GIT_CODE_BRANCH |
| r_test_manager_atm_git_path | Text | Git仓库路径 | payload.project.full_path | GIT_CODE_PATH |

### 2. 已有的自动化相关字段（供参考）

| 字段名 | 字段类型 | 说明 |
|-------|---------|------|
| r_test_manager_atm_test_id | Text | 自动化测试ID（@TestId注解值） |
| r_test_manager_atm_file_path | Text | 测试文件路径 |
| r_test_manager_atm_class_name | Text | 测试类名 |
| r_test_manager_atm_method_name | Text | 测试方法名 |
| r_test_manager_atm_module_path | Text | 模块路径 |
| r_test_manager_atm_framework | Text | 测试框架（如JUnit、TestNG等） |
| r_test_manager_atm_start_line | Number | 测试方法起始行号 |

## 使用流程

1. **Webhook接收阶段**：
   - 从Code的webhook payload中提取git_ssh_url、ref、full_path
   - 在同步测试用例时，将这些值保存到对应的自定义字段

2. **自动化执行阶段**：
   - 查询测试用例时包含这三个Git字段
   - 组装Pipe调用参数时，传递这些字段值：
     - GIT_CODE_CLONE_URL: r_test_manager_atm_git_clone_url
     - GIT_CODE_BRANCH: r_test_manager_atm_git_branch  
     - GIT_CODE_PATH: r_test_manager_atm_git_path

## 注意事项

- 所有字段类型均为Text，确保能存储较长的路径和URL
- 字段命名遵循 `r_test_manager_atm_` 前缀规范，表示测试管理自动化相关字段
- 这些字段需要在Proxima系统的字段管理中手动添加，不是通过manifest.yml定义