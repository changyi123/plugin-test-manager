监听code的webhook事件，得到用户代码提交信息，并触发用例维护等流程
webhook触发事件接收数据详情示例：
{
  "action": "push_code",
  "after": "26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34",
  "before": "5020c195b25171bc0d9d9e4ccb59d1f19f1cc281",
  "branch_issue_ids": [],
  "commits": [
    {
      "added": [],
      "added_line": 5,
      "author": {
        "avatar": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
        "avatar_url": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
        "created_at": "2023-02-09T18:31:16.739000+08:00",
        "email": "admin@admin.com",
        "html_url": "",
        "id": 2,
        "locale": "zh-CN",
        "login": "osc-admin",
        "name": "超管",
        "remark": "超管",
        "time": "2025-09-01T15:31:14.000000+08:00",
        "updated_at": "2025-09-01T15:30:07.000000+08:00",
        "url": "",
        "user_name": "osc-admin",
        "user_uuid": "1",
        "username": "osc-admin",
        "uuid": "1"
      },
      "authored_date": "2025-09-01T15:31:14.000000+08:00",
      "committer": {
        "avatar": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
        "avatar_url": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
        "created_at": "2023-02-09T18:31:16.739000+08:00",
        "email": "admin@admin.com",
        "html_url": "",
        "id": 2,
        "locale": "zh-CN",
        "login": "osc-admin",
        "name": "超管",
        "remark": "超管",
        "updated_at": "2025-09-01T15:30:07.000000+08:00",
        "url": "",
        "user_name": "osc-admin",
        "user_uuid": "1",
        "username": "osc-admin",
        "uuid": "1"
      },
      "distinct": true,
      "html_url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/commit/26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34",
      "id": "26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34",
      "issue_ids": [],
      "message": "更新文件: atmTest",
      "modified": [
        "atmTest"
      ],
      "parent_ids": [
        "5020c195b25171bc0d9d9e4ccb59d1f19f1cc281"
      ],
      "removed": [],
      "removed_line": 2,
      "timestamp": "2025-09-01T15:31:14.000000+08:00",
      "tree_id": "88f6e0ba93fa7855d290c24e097bab051f6ff22a",
      "url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/commit/26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34"
    }
  ],
  "compare": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/compare/5020c195b25171bc0d9d9e4ccb59d1f19f1cc281/26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34",
  "created": false,
  "deleted": false,
  "enterprise": {
    "description": "",
    "name": "dce生产",
    "url": "https://dce1-dev.gitee.work/DCE3",
    "uuid": "DCE3"
  },
  "event_name": "push",
  "head_commit": {
    "added": [],
    "author": {
      "email": "admin@admin.com",
      "id": 2,
      "name": "超管",
      "time": "2025-09-01T15:31:14.000000+08:00",
      "user_name": "osc-admin",
      "user_uuid": "1",
      "username": "osc-admin"
    },
    "committer": {
      "email": "admin@admin.com",
      "id": 2,
      "name": "超管",
      "user_name": "osc-admin",
      "user_uuid": "1",
      "username": "osc-admin"
    },
    "distinct": true,
    "id": "26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34",
    "issue_ids": [],
    "message": "更新文件: atmTest",
    "modified": [
      "atmTest"
    ],
    "parent_ids": [
      "5020c195b25171bc0d9d9e4ccb59d1f19f1cc281"
    ],
    "removed": [],
    "timestamp": "2025-09-01T15:31:14.000000+08:00",
    "tree_id": "88f6e0ba93fa7855d290c24e097bab051f6ff22a",
    "url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/commit/26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34"
  },
  "hook_id": "140",
  "hook_name": "push_hooks",
  "hook_title": "test",
  "hook_url": "https://webhook.site/e9b77d8e-18ed-4d74-9e39-e5bd3726c957",
  "password": "",
  "ping": false,
  "project": {
    "category": "0",
    "clone_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "compare_url": "",
    "created_at": "2025-09-01T15:00:42.864317+08:00",
    "default_branch": "master",
    "description": "",
    "enterprise_name": "dce生产",
    "enterprise_uuid": "DCE3",
    "fork": false,
    "full_name": "dce生产/atmTest/atmTestCode",
    "full_path": "DCE3/atmTest/atmTestCode",
    "git_http_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "git_ssh_url": "ssh://git@dce.dev.gitee.work:32235/DCE3/atmTest/atmTestCode.git",
    "git_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "homepage": "",
    "html_url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/code",
    "id": 1652,
    "language": "Java",
    "language_name": "Java",
    "last_push_at": "2025-09-01T15:04:59.000000+08:00",
    "name": "atmTestCode",
    "name_with_namespace": "dce生产/atmTest/atmTestCode",
    "namespace": "atmTest",
    "namespace_name": "atmTest",
    "namespace_path": "atmTest",
    "owner": {
      "avatar_url": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
      "created_at": "2023-02-09T18:31:16.739000+08:00",
      "email": "admin@admin.com",
      "id": 2,
      "login": "osc-admin",
      "name": "超管",
      "site_admin": false,
      "type": "User",
      "updated_at": "2025-09-01T15:30:07.000000+08:00",
      "user_name": "osc-admin",
      "user_uuid": "1",
      "username": "osc-admin"
    },
    "path": "atmTestCode",
    "path_with_namespace": "DCE3/atmTest/atmTestCode",
    "private": true,
    "program_name": "规划空间",
    "program_uuid": "GH",
    "pushed_at": "",
    "ssh_url": "ssh://git@dce.dev.gitee.work:32235/DCE3/atmTest/atmTestCode.git",
    "updated_at": "2025-09-01T15:24:10.687277+08:00",
    "url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/code",
    "urls": {
      "git_http_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
      "git_ssh_url": "ssh://git@dce.dev.gitee.work:32235/DCE3/atmTest/atmTestCode.git",
      "html_url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/code"
    }
  },
  "pusher": {
    "email": "admin@admin.com",
    "id": 2,
    "name": "超管",
    "user_name": "osc-admin",
    "user_uuid": "1",
    "username": "osc-admin"
  },
  "ref": "refs/heads/master",
  "ref_html_url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/tree/heads%2Fmaster",
  "repository": {
    "clone_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "compare_url": "",
    "created_at": "2025-09-01T15:00:42.864317+08:00",
    "default_branch": "master",
    "description": "",
    "fork": false,
    "full_name": "DCE3/atmTest/atmTestCode",
    "git_http_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "git_ssh_url": "ssh://git@dce.dev.gitee.work:32235/DCE3/atmTest/atmTestCode.git",
    "git_url": "https://dce1-dev.gitee.work/DCE3/atmTest/atmTestCode.git",
    "homepage": "",
    "html_url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/code",
    "id": 1652,
    "language": "Java",
    "name": "atmTestCode",
    "name_with_namespace": "dce生产/atmTest/atmTestCode",
    "namespace": "atmTest",
    "owner": {
      "avatar_url": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
      "email": "admin@admin.com",
      "id": 2,
      "login": "osc-admin",
      "name": "超管",
      "site_admin": false,
      "type": "User",
      "user_name": "osc-admin",
      "user_uuid": "1",
      "username": "osc-admin"
    },
    "path": "atmTestCode",
    "path_with_namespace": "DCE3/atmTest/atmTestCode",
    "private": true,
    "program_uuid": "GH",
    "pushed_at": "2025-09-01T15:04:59.000000+08:00",
    "ssh_url": "ssh://git@dce.dev.gitee.work:32235/DCE3/atmTest/atmTestCode.git",
    "tags": [],
    "updated_at": "2025-09-01T15:24:10.687277+08:00",
    "url": "https://dce1-dev.gitee.work/DCE3/_code/DCE3/atmTest/atmTestCode/-/code"
  },
  "sender": {
    "avatar_url": "https://dce1-dev.gitee.work/api/facade/rest/v1/companies/DCE3/users/logo/avatar/user/1",
    "created_at": "2023-02-09T18:31:16.739000+08:00",
    "email": "admin@admin.com",
    "id": 2,
    "login": "osc-admin",
    "name": "超管",
    "site_admin": false,
    "type": "User",
    "updated_at": "2025-09-01T15:30:07.000000+08:00",
    "user_name": "osc-admin",
    "user_uuid": "1",
    "username": "osc-admin"
  },
  "timestamp": "2025-09-01T15:28:42.043534+08:00",
  "total_commits_count": 1,
  "user": {
    "email": "admin@admin.com",
    "id": 2,
    "name": "超管",
    "user_name": "osc-admin",
    "user_uuid": "1",
    "username": "osc-admin"
  },
  "user_id": 2,
  "user_name": "超管",
  "user_uuid": "1",
  "uuid": "6e978263-32d5-4293-a9da-8d946be8c00f"
}


返回体payload中的commits代表本次触发的变更中的commit,是个对象数组，对象中的id为commit的id，
payload中的repository对象的id为仓库id
根据以上两个信息去查询具体的diff内容,接口如下

根据commitid和仓库id获取diff接口
- GET /projects/:id/repository/commits/:sha/diff
id: 仓库id，见
:sha:  The commit hash or name of a repository branch or tag
请求示例：
curl --location 'https://dce1-dev.gitee.work/api/v8/projects/1652/repository/commits/26cbed8c9ac3d01c23b5efe75fbdb5dc616f3e34/diff' \ 
--header 'Private-Token: NmE4NjA2MDQtY2NmMC00MGJlLWE0NjYtMTk5MTMyMmQwM2Yw' // 私人token,可以写死 \
--header 'enterprise: DCE3' //租户key \
--data ''

response:
[
    {
        "old_path": "atmTest",
        "new_path": "atmTest",
        "a_mode": null,
        "b_mode": "100644",
        "diff": "@@ -14,7 +14,9 @@ public class TaskResourceWorkflowImpl extends TaskResourceImpl{\n     public TaskResourceWorkflowImpl(ProcessEngine engine, String taskId, String rootResourcePath, ObjectMapper objectMapper) {\n         super(engine, taskId, rootResourcePath, objectMapper);\n     }\n-\n+    public TaskResourceWorkflowImpl(ProcessEngine engine, String taskId, String rootResourcePath, ObjectMapper objectMapper) {\n+        super(engine, taskId, rootResourcePath, objectMapper);\n+    }\n     @Override\n     public VariableResource getVariables() {\n         return super.getVariables();\n@@ -28,7 +30,8 @@ public class TaskResourceWorkflowImpl extends TaskResourceImpl{\n \n         front_evidenceChainTempCode=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30;\n         front_MultiNodeCode=Constants_Fep.NODE_TEMPCODE_pdf_APPROVE_STATUS_30;\n-\n+        front_evidenceChainTempCode=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30;\n+        front_MultiNodeCode=Constants_Fep.NODE_TEMPCODE_pdf_APPROVE_STATUS_30;\n         for(int i=0;i<front_MultiNodeCode.length;i++) {\n             evidenceTemplateNodeCode=front_MultiNodeCode[i];\n             evidenceChainTemplateVersion=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30_VERSION;\n",
        "diff_download_url": "",
        "new_file": false,
        "renamed_file": false,
        "deleted_file": false
    }
]


解析diff接口返回的diff内容：
返回体是个数组每个对象代表一个修改文件内容，其中new_path为文件地址路径，diff字段内容为具体代码，diff为git的标准diff
new_file为true时代表本文件为新增，renamed_file代表是否修改了名字，deleted_file代表是否删除文件

但是有个问题是我们需要拿到修改的代码涉及的用例名称，即函数名称，以及函数的注解，特别是@TestId("ess-Code6001Test-fail_CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_0")这种注解
函数名称代表测试管理中维护的用例名称，注解@TestId中的值为用例的唯一标识，用测试管理的自定义字段承接
但是这个diff接口返回的diff中可能会把未修改的内容折叠起来，不返回未修改内容，所有这个接口的diff我们可能不能确定funciton name和注解，故我们需要再次调用文件内容获取接口去拿到该文件全量的代码，结合diff和fileContent全文，去解析修改和新增涉及到哪些用例的增删改

根据仓库id以及文件路径获取文件内容的接口如下：
curl --location 'https://dce1-dev.gitee.work/api/v8/projects/1652/repository/files/src%2Ftest%2Fjava%2Fcom%2Fcfca%2Ftest%2FESS_V4%2Ftestcase%2FCode6601Test.java/raw?ref=master' \
--header 'Private-Token: NmE4NjA2MDQtY2NmMC00MGJlLWE0NjYtMTk5MTMyMmQwM2Yw' \
--header 'enterprise: DCE3'

其中url为：
 projects/:id/repository/files/:path/raw
 id为仓库id
 path为encode后的文件路径，例如：src%2Ftest%2Fjava%2Fcom%2Fcfca%2Ftest%2FESS_V4%2Ftestcase%2FCode6601Test.java
enterprise为租户key
Private-Token用插件的环境变量声明吧，所有的接口估计都要用

返回体示例：
package org.camunda.bpm.engine.rest.sub.task.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.camunda.bpm.engine.ProcessEngine;
import org.camunda.bpm.engine.rest.sub.VariableResource;
import org.camunda.bpm.engine.rest.sub.task.TaskResource;

/**
 * @author JoeChang
 * @date 2021/5/14 9:50
 */
public class Code6601Test extends TaskResourceImpl{

    public TaskResourceWorkflowImpl(ProcessEngine engine, String taskId, String rootResourcePath, ObjectMapper objectMapper) {
        super(engine, taskId, rootResourcePath, objectMapper);
    }
    public TaskResourceWorkflowImpl(ProcessEngine engine, String taskId, String rootResourcePath, ObjectMapper objectMapper) {
        super(engine, taskId, rootResourcePath, objectMapper);
    }
    @Override
    public VariableResource getVariables() {
        return super.getVariables();
    }

//以下是一个示例case
    @Test(timeout = Constants.TIMEOUT)
    @TestId("ess-Code6001Test-fail_CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_0") // @TestId("【用例ID】")
    public void fail_CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_0() throws Exception {//public void 【测试方法名称】() throws Exception {

        front_evidenceChainTempCode=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30;
        front_MultiNodeCode=Constants_Fep.NODE_TEMPCODE_pdf_APPROVE_STATUS_30;
        front_evidenceChainTempCode=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30;
        front_MultiNodeCode=Constants_Fep.NODE_TEMPCODE_pdf_APPROVE_STATUS_30;
        for(int i=0;i<front_MultiNodeCode.length;i++) {
            evidenceTemplateNodeCode=front_MultiNodeCode[i];
            evidenceChainTemplateVersion=Constants_Fep.CHAIN_TEMPCODEOne_pdf_APPROVE_STATUS_30_VERSION;
            Map evidenceSourceMap = SourceMap6011Builder.setevidenceSourceMap(evidenceTemplateNodeCode);
            sourceMap= SourceMap6001Builder.setSourceMap6001_6011("6001",branchCode,applicationCode,frontBranchCode,frontApplicationCode,stubNo,serialNo,
                      businessId, front_evidenceChainTempCode, evidenceChainTemplateVersion, evidenceTemplateNodeCode,
                    fileList,evidenceSourceMap, isFinished);
            tx6001Resp = BusinessProcessor.tx6001(sourceMap);
            assertEquals("01010021",tx6001Resp.get("resultCode"));
            assertEquals("模板还未审核通过，无法进行存证",tx6001Resp.get("resultMessage"));
        }
    }
}

拿到文件后
根据diff中具体修改的行找到全文中对样的行，向上找到function函数名和注解，注意注解不一定紧挨函数这一行，可能中间还有别的注解

另外，还有个情况是
我们会在仓库的根目录放一个配置文件，文件名：automation-test-map.json
其中结构如下：
{
    "testingFramework": "JUnit", //或testNg
    "mappings":{
        "src/test/java/com/cfca/test/ESS_V4/testcase/Code6601Test.java":"全部用例库/用户认证",
        "src/test/java/com/cfca/test/ESS_V4/testcase/Code6602Test.java":"全部用例库/工作台"
    }
}
其中：
testingFramework表示测试框架
mappings对象中的键值对，key代表用例文件在仓库的路径，value为测试管理中对应用例的所属目录路径，所以我们上面接收webhook去拿diff，其实可以先过滤下，是否维护的自动化测试用例代码，如果是才去搞这个文件，如果不是就忽略（这块逻辑要等等客户澄清，可以先留作一个扩展点，这样应该能提升性能）


解析出来commit的diff中，涉及正删改的用例的以下信息，组成一个数组：
[
  {
    name:string,//名称
    automationCaseId:string,//自动化测试用例id
    automationModule:string,//自动化用例代码目录
    module:string// 测试管理中用例所属模块（要根据配置文件中的键值对的值去查对应测试管理的目录id吧）
    //测试框架（从配置文件automation-test-map.json中获取）
    测试框架版本（从配置文件automation-test-map.json）
    测试类名（用例所在的代码class名称）
    测试方法名（用例的函数方法名称）
    代码库名称（仓库名称，从webhook的payload的repository的name）
    代码文件地址（用例所在文件的路径，上文中diff接口已经拿到，为new_path的值）
    分支名称（webhook的payload.ref）
  },
]

然后调用测试管理的用例创建接口，进行用例的增删改，根据automationCaseId确定唯一性，重复的用例，同文件代码行数大的覆盖行数小的，其余的重复场景直接覆盖