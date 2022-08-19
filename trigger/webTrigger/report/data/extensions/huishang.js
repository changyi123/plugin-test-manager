/**
 * @file huishang 测试报告模板数据
 * */

const data = {
  planStats: [
    {
      key: 'onjectId',
      allTestCases: [
        {
          createdAt: '2022-08-15T02:18:28.352Z',
          updatedAt: '2022-08-15T02:18:28.352Z',
          reference: {
            createdAt: '2022-08-15T02:18:21.058Z',
            updatedAt: '2022-08-15T02:18:21.058Z',
            key: 'TEST_TEST_0002-528',
            name: '222',
            status: {
              __type: 'Pointer',
              className: 'Status',
              objectId: 'HqdG1eLkKc',
            },
            values: {
              assignee: [],
              priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            },
            itemType: {
              __type: 'Pointer',
              className: 'ItemType',
              objectId: '3Jvny7Qoxm',
            },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: {
              __type: 'Pointer',
              className: '_User',
              objectId: 'jasPZZVVEQ',
            },
            ACL: {
              jasPZZVVEQ: {
                read: true,
              },
              'itemRole:5vUN0jYwmy': {
                read: true,
              },
              '*': {
                write: true,
              },
            },
            objectId: 'ZN3tF1ZQFC',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          detail: {},
          sortIndex: 1660529906000001,
          createdBy: {
            __type: 'Pointer',
            className: '_User',
            objectId: 'jasPZZVVEQ',
          },
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: '0c32qd6u1j',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08:01:04.197Z',
          updatedAt: '2022-08-02T14:11:44.610Z',
          reference: {
            createdAt: '2022-08-02T08:00:30.557Z',
            updatedAt: '2022-08-02T14:10:44.899Z',
            key: 'TEST_TEST_0002-4',
            name: '首页-导航栏-用户修改密码后登录',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            updatedBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'DpcyuP46Un',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'PASSED',
          detail: {
            steps: [
              {
                id: '3592f751-f0e8-4324-8447-d263e01e9abf',
                data: '',
                action: '修改密码后，页面立即要求用户重新登录',
                result: '页面退出，要求重新登录',
              },
              {
                id: 'b573b85e-e2a9-4140-87c1-04934f4c5258',
                data: '',
                action: '使用旧密码登录',
                result: '无法登录',
              },
              {
                id: '75fca68d-7e22-4ac9-a9a9-3601d9010f97',
                data: '',
                action: '使用新密码登录',
                result: '登录成功',
              },
              {
                id: 'fabde171-1717-47a8-adae-2a14a814fd79',
                data: '',
                action: '再次修改密码，填写密码后，点击取消按钮',
                result: '密码没有被修改，系统没有自动退出',
              },
              {
                id: 'c4c791a8-9566-49b1-9dbb-b414c1898353',
                data: '',
                action: '手动后退出系统',
                result: '退出成功',
              },
              {
                id: '0c0813ed-0051-464e-ac38-b55870df3472',
                data: '',
                action: '使用新密码登录',
                result: '无法登录',
              },
              {
                id: '7105a036-6334-4800-b1f5-031251347e1a',
                data: '',
                action: '使用旧密码登录',
                result: '登录成功',
              },
            ],
            precondition: '打开浏览器，登录管理员账号',
          },
          sortIndex: 1659427264000002,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: '4DGTo6gbWs',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08:01:04.197Z',
          updatedAt: '2022-08-02T14:11:44.610Z',
          reference: {
            createdAt: '2022-08-02T08:00:30.558Z',
            updatedAt: '2022-08-02T14:10:44.935Z',
            key: 'TEST_TEST_0002-6',
            name: '首页-导航栏-用户修改密码',
            status: {
              __type: 'Pointer',
              className: 'Status',
              objectId: 'HqdG1eLkKc',
            },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
            },
            itemType: {
              __type: 'Pointer',
              className: 'ItemType',
              objectId: '3Jvny7Qoxm',
            },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: {
              __type: 'Pointer',
              className: '_User',
              objectId: 'jasPZZVVEQ',
            },
            updatedBy: {
              __type: 'Pointer',
              className: '_User',
              objectId: 'jasPZZVVEQ',
            },
            ACL: {
              jasPZZVVEQ: {
                read: true,
              },
              'itemRole:5vUN0jYwmy': {
                read: true,
              },
              '*': {
                write: true,
              },
            },
            objectId: 'WqGwYluBrb',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'PASSED',
          detail: {
            steps: [
              {
                id: '87577cfa-c19e-4804-8778-67f837272a17',
                data: '',
                action: '点击用户名，点击修改密码按钮',
                result: '进入修改密码弹窗',
              },
              {
                id: '5e44a1f1-ab4c-4f5a-a63a-844b65b97579',
                data: '',
                action: '检查弹窗中展示的用户名是否正确，且不可修改',
                result: '弹窗中用户名正确，且不可修改',
              },
              {
                id: '74df3dd4-abb9-411b-bf04-18fa50914919',
                data: '',
                action: '依次将旧密码、新密码、确认密码留空，点击提交',
                result: '无法提交',
              },
              {
                id: '1817bbfb-6308-43d0-b82f-b727b8c829c4',
                data: '',
                action: '输入错误的旧密码，并输入其它信息',
                result: '无法修改密码',
              },
              {
                id: '27572836-9c6f-44e3-b810-ab14ed5bac61',
                data: '',
                action:
                  '输入正确的旧密码，输入新密码不符合密码规则（规则为：8-32个字符，必须包含大小写字母和数字，支持英文特殊字符!"$%()*+,-./:;<=>?@[]^_`{|}~。输入小于8、大于32个字符；输入不支持的特殊字符；输入仅数字、仅小写字母、仅大写字母）',
                result: '无法通过规则校验，无法修改密码',
              },
              {
                id: '5aa227c5-a0a4-41c1-b4b0-b940f1e40322',
                data: '',
                action: '输入正确的旧密码，输入新密码符合规则，确认密码与新密码输入不一致',
                result: '无法通过规则校验，无法修改密码',
              },
              {
                id: 'e07f9a93-e399-4661-8d09-550a57bfb2aa',
                data: '',
                action: '输入正确的旧密码，输入新密码符合规则，确认密码与新密码输入一致',
                result: '可输入',
              },
              {
                id: '2685321f-8e3e-499c-8c18-ce7e57e6d6d9',
                data: '',
                action: '点击保存',
                result: '保存修改',
              },
              {
                id: 'e9432b4e-6527-43d9-8154-00a5f840a408',
                data: '',
                action: '重复上述步骤，点击取消',
                result: '密码没有被修改',
              },
            ],
            precondition: '打开浏览器，登录管理员账号',
          },
          sortIndex: 1659427264000003,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'KseL5JhKH8',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08: 01: 04.197Z',
          updatedAt: '2022-08-02T14: 11: 44.610Z',
          reference: {
            createdAt: '2022-08-02T08: 00: 30.557Z',
            updatedAt: '2022-08-10T06: 40: 13.365Z',
            key: 'TEST_TEST_0002-5',
            name: '首页-导航栏-退出',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
              priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
              __screen_type: 'view',
            },
            itemType: {
              __type: 'Pointer',
              className: 'ItemType',
              objectId: '3Jvny7Qoxm',
            },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: {
              __type: 'Pointer',
              className: '_User',
              objectId: 'jasPZZVVEQ',
            },
            updatedBy: {
              __type: 'Pointer',
              className: '_User',
              objectId: 'jasPZZVVEQ',
            },
            ACL: {
              jasPZZVVEQ: {
                read: true,
              },
              'itemRole:5vUN0jYwmy': {
                read: true,
              },
              '*': {
                write: true,
              },
            },
            objectId: 'YYmDIRsktC',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'PASSED',
          detail: {
            steps: [
              {
                id: 'dad4933c-196c-4096-8287-7756ade2e305',
                data: '',
                action: '登录后在浏览器中打开多个DEMP页面',
                result: '可打开多个页面且无需重新登录',
              },
              {
                id: 'cac06909-380c-4e8f-9772-75cb4db98480',
                data: '',
                action: '点击右上角用户头像',
                result: '展示用户登录信息，有退出按钮',
              },
              {
                id: '6c96b5ec-1347-4896-8cff-cf78194e6dd0',
                data: '',
                action: '点击退出按钮',
                result: '多页面同步退出DEMP系统，需重新登录',
              },
            ],
            precondition: '打开浏览器，登录管理员账号',
          },
          sortIndex: 1659427264000001,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'PfQMnyjBhr',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08: 01: 04.197Z',
          updatedAt: '2022-08-02T14: 11: 44.611Z',
          reference: {
            createdAt: '2022-08-02T08: 00: 30.570Z',
            updatedAt: '2022-08-02T14: 10: 44.931Z',
            key: 'TEST_TEST_0002-8',
            name: '首页-导航栏-用户信息展示',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            updatedBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'FKhjicyPiV',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'PASSED',
          detail: {
            steps: [
              {
                id: '328a0c66-f7c0-4b1e-890e-ae0e760de452',
                data: '',
                action: '检查右上角用户登录信息',
                result: '用户登录信息正确',
              },
              {
                id: 'ad68f074-2da3-411f-9fd6-ab8408322dc5',
                data: '',
                action: '鼠标点击用户名',
                result: '展示用户名、邮箱信息正确，有修改密码、退出按钮',
              },
              {
                id: 'e24c7587-dad9-4427-aa7a-d8df2bafb0e7',
                data: '',
                action: '点击修改密码按钮',
                result: '进入修改密码界面',
              },
            ],
            precondition: '打开浏览器，登录管理员账号',
          },
          sortIndex: 1659427264000004,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'ZDpmIcNslH',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08: 01: 04.197Z',
          updatedAt: '2022-08-16T07: 18: 07.832Z',
          reference: {
            createdAt: '2022-08-02T08: 00: 30.556Z',
            updatedAt: '2022-08-10T09: 07: 25.257Z',
            key: 'TEST_TEST_0002-3',
            name: '首页-登录页面',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
              priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            updatedBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'xk6wUw38RL',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'FAILED',
          detail: {
            steps: [
              {
                id: '93183819-5850-40f9-873e-f3b0163cb290',
                data: '',
                action: '进入产品登录页面',
                result: '登录页面布局合理',
              },
              {
                id: '17dcd5fb-c3b9-40ea-863b-974dbb294614',
                data: '',
                action: '输入错误的用户名，输入密码',
                result: '无法登录，有合理提示',
              },
              {
                id: '09100cc0-7853-42f3-b4e9-6b12fee6b718',
                data: '',
                action: '输入正确的用户名、错误的密码',
                result: '无法登录，有合理提示',
              },
              {
                id: 'a0988a8d-d371-4ebb-9385-5ef5cf7fa9d6',
                data: '',
                action: '输入正确的用户名、正确的密码',
                result: '登录成功',
              },
            ],
            precondition: '',
          },
          sortIndex: 1659427264000000,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          detailStatus: {
            planId: 'FAILED',
            JjIzu5xHUg: 'PASSED',
            j5RbVYXaLC: 'EXECUTING',
            tVIij89BLN: 'EXECUTING',
          },
          objectId: 'cyJ2ErU0lw',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-02T08: 01: 04.197Z',
          updatedAt: '2022-08-02T14: 11: 44.611Z',
          reference: {
            createdAt: '2022-08-02T08: 00: 30.585Z',
            updatedAt: '2022-08-02T14: 10: 44.933Z',
            key: 'TEST_TEST_0002-10',
            name: '首页-导航栏-报警列表按钮',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [
                {
                  label: 'osc-admin',
                  value: 'jasPZZVVEQ',
                  deleted: false,
                  username: 'osc-admin',
                },
              ],
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            updatedBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'uNI942YMAA',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          status: 'PASSED',
          detail: {
            steps: [
              {
                id: '8592d036-8437-4c35-8133-479e1cebc916',
                data: '',
                action: '登录后点击上方报警按钮',
                result: '右上角展示最近5条报警信息',
              },
              {
                id: '4d058d64-96b5-4ab4-8796-88bd1c0f04b9',
                data: '',
                action: '点击上方查看更多按钮',
                result: '页面跳转至报警列表页面',
              },
              {
                id: '4e3adf71-a1a9-4b87-9120-8cc8b1977189',
                data: '',
                action: '插入新的报警数据',
                result: '查看右上角是否有红点提示，展示的5条报警信息是否更新到最新的',
              },
              {
                id: '12acc30e-c7c9-4ccd-9993-981898a34f15',
                data: '',
                action: '新的报警信息确认后',
                result: '报警信确认后，右上角无红点提示',
              },
            ],
            precondition: '打开浏览器，登录管理员账号',
          },
          sortIndex: 1659427264000005,
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'dTWploiydU',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-15T03: 52: 44.332Z',
          updatedAt: '2022-08-15T03: 52: 44.332Z',
          reference: {
            createdAt: '2022-08-15T03: 52: 40.461Z',
            updatedAt: '2022-08-15T03: 52: 40.461Z',
            key: 'TEST_TEST_0002-530',
            name: '是打发点',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'z1d6hIvQP4',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          detail: {},
          sortIndex: 1660535562000001,
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'fJi341lXMf',
          __type: 'Object',
          className: 'test_manager_Test',
        },
        {
          createdAt: '2022-08-15T02: 18: 28.352Z',
          updatedAt: '2022-08-15T02: 18: 28.352Z',
          reference: {
            createdAt: '2022-08-15T02: 18: 26.264Z',
            updatedAt: '2022-08-15T02: 18: 26.264Z',
            key: 'TEST_TEST_0002-529',
            name: '333',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: '3Jvny7Qoxm' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'EhcwCrK9tJ',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestDetail',
          detail: {},
          sortIndex: 1660529906000002,
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          repository: {
            __type: 'Pointer',
            className: 'test_manager_Repository',
            objectId: '2ngxOPGNzB',
          },
          objectId: 'pCxFahkShR',
          __type: 'Object',
          className: 'test_manager_Test',
        },
      ],
      reference: {
        createdAt: '2022-08-16T02: 37: 32.304Z',
        updatedAt: '2022-08-16T02: 37: 32.304Z',
        key: 'TEST_TEST_0002-532',
        name: '隔离测试计划用例状态测试',
        status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
        values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
        itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'e6aGBW8f0r' },
        ancestors: [],
        itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
        workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
        createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
        ACL: {
          jasPZZVVEQ: { read: true },
          'itemRole: 5vUN0jYwmy': { read: true },
          '*': { write: true },
        },
        isWatching: false,
        objectId: 'bxjQFgd5Cr',
        __type: 'Object',
        className: 'Item',
      },
      // 伦次
      allTestExecutions: [
        {
          createdAt: '2022-08-16T03: 12: 25.506Z',
          updatedAt: '2022-08-16T03: 12: 25.506Z',
          reference: {
            createdAt: '2022-08-16T03: 12: 24.965Z',
            updatedAt: '2022-08-16T03: 12: 24.965Z',
            key: 'TEST_TEST_0002-534',
            name: '22',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [],
              priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
              finishAt: 1660579200000,
              inProgressAt: 1661443200000,
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'sbGhpRIaM7' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'IUYvwpD1Pi',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestExecution',
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          objectId: 'j5RbVYXaLC',
          __type: 'Object',
          className: 'test_manager_Test',
          testRun: [
            {
              createdAt: '2022-08-16T03: 12: 26.048Z',
              updatedAt: '2022-08-17T10: 08: 45.420Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              status: 'PASSED',
              runDetail: {
                steps: [
                  {
                    id: '93183819-5850-40f9-873e-f3b0163cb290',
                    data: '',
                    action: '进入产品登录页面',
                    result: '登录页面布局合理',
                  },
                  {
                    id: '17dcd5fb-c3b9-40ea-863b-974dbb294614',
                    data: '',
                    action: '输入错误的用户名，输入密码',
                    result: '无法登录，有合理提示',
                  },
                  {
                    id: '09100cc0-7853-42f3-b4e9-6b12fee6b718',
                    data: '',
                    action: '输入正确的用户名、错误的密码',
                    result: '无法登录，有合理提示',
                  },
                  {
                    id: 'a0988a8d-d371-4ebb-9385-5ef5cf7fa9d6',
                    data: '',
                    action: '输入正确的用户名、正确的密码',
                    result: '登录成功',
                  },
                ],
                precondition: '',
                defectItemIds: ['IKv4SBCB6z'],
              },
              sortIndex: 1659427264000000,
              executor: [{ __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' }],
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              updatedBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-16T07: 18: 07.832Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.556Z',
                  updatedAt: '2022-08-10T09: 07: 25.257Z',
                  key: 'TEST_TEST_0002-3',
                  name: '首页-登录页面',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                    priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'xk6wUw38RL',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'FAILED',
                detail: {
                  steps: [
                    {
                      id: '93183819-5850-40f9-873e-f3b0163cb290',
                      data: '',
                      action: '进入产品登录页面',
                      result: '登录页面布局合理',
                    },
                    {
                      id: '17dcd5fb-c3b9-40ea-863b-974dbb294614',
                      data: '',
                      action: '输入错误的用户名，输入密码',
                      result: '无法登录，有合理提示',
                    },
                    {
                      id: '09100cc0-7853-42f3-b4e9-6b12fee6b718',
                      data: '',
                      action: '输入正确的用户名、错误的密码',
                      result: '无法登录，有合理提示',
                    },
                    {
                      id: 'a0988a8d-d371-4ebb-9385-5ef5cf7fa9d6',
                      data: '',
                      action: '输入正确的用户名、正确的密码',
                      result: '登录成功',
                    },
                  ],
                  precondition: '',
                },
                sortIndex: 1659427264000000,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                detailStatus: {
                  planId: 'FAILED',
                  JjIzu5xHUg: 'PASSED',
                  j5RbVYXaLC: 'EXECUTING',
                  tVIij89BLN: 'EXECUTING',
                },
                objectId: 'cyJ2ErU0lw',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'FSkGYw7vok',
              __type: 'Object',
              className: 'test_manager_Test',
            },
          ],
        },
        {
          createdAt: '2022-08-17T10: 08: 34.976Z',
          updatedAt: '2022-08-17T10: 08: 34.976Z',
          reference: {
            createdAt: '2022-08-17T10: 08: 34.349Z',
            updatedAt: '2022-08-17T10: 08: 34.349Z',
            key: 'TEST_TEST_0002-538',
            name: '333',
            status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
            values: {
              assignee: [],
              priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
              __screen_type: 'create',
              finishAt: 1660579200000,
              inProgressAt: 1661443200000,
            },
            itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'sbGhpRIaM7' },
            ancestors: [],
            itemGroup: {
              __type: 'Pointer',
              className: 'ItemGroup',
              objectId: 'yFKYultKWl',
            },
            workspace: {
              __type: 'Pointer',
              className: 'Workspace',
              objectId: 'B8y9uem89z',
            },
            createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
            ACL: {
              jasPZZVVEQ: { read: true },
              'itemRole: 5vUN0jYwmy': { read: true },
              '*': { write: true },
            },
            objectId: 'd8SQyabn5z',
            __type: 'Object',
            className: 'Item',
          },
          workspaceKey: 'TEST_TEST_0002',
          type: 'TestExecution',
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          objectId: 'j9zigN8C7h',
          __type: 'Object',
          className: 'test_manager_Test',
          testRun: [
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1659427264000004,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-02T14: 11: 44.611Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.570Z',
                  updatedAt: '2022-08-02T14: 10: 44.931Z',
                  key: 'TEST_TEST_0002-8',
                  name: '首页-导航栏-用户信息展示',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'FKhjicyPiV',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'PASSED',
                detail: {
                  steps: [
                    {
                      id: '328a0c66-f7c0-4b1e-890e-ae0e760de452',
                      data: '',
                      action: '检查右上角用户登录信息',
                      result: '用户登录信息正确',
                    },
                    {
                      id: 'ad68f074-2da3-411f-9fd6-ab8408322dc5',
                      data: '',
                      action: '鼠标点击用户名',
                      result: '展示用户名、邮箱信息正确，有修改密码、退出按钮',
                    },
                    {
                      id: 'e24c7587-dad9-4427-aa7a-d8df2bafb0e7',
                      data: '',
                      action: '点击修改密码按钮',
                      result: '进入修改密码界面',
                    },
                  ],
                  precondition: '打开浏览器，登录管理员账号',
                },
                sortIndex: 1659427264000004,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'ZDpmIcNslH',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: '1TWlJrx9CQ',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1660529906000002,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-15T02: 18: 28.352Z',
                updatedAt: '2022-08-15T02: 18: 28.352Z',
                reference: {
                  createdAt: '2022-08-15T02: 18: 26.264Z',
                  updatedAt: '2022-08-15T02: 18: 26.264Z',
                  key: 'TEST_TEST_0002-529',
                  name: '333',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'EhcwCrK9tJ',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                detail: {},
                sortIndex: 1660529906000002,
                createdBy: {
                  __type: 'Pointer',
                  className: '_User',
                  objectId: 'jasPZZVVEQ',
                },
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'pCxFahkShR',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: '4c9HJHrhBU',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1659427264000003,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-02T14: 11: 44.610Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.558Z',
                  updatedAt: '2022-08-02T14: 10: 44.935Z',
                  key: 'TEST_TEST_0002-6',
                  name: '首页-导航栏-用户修改密码',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'WqGwYluBrb',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'PASSED',
                detail: {
                  steps: [
                    {
                      id: '87577cfa-c19e-4804-8778-67f837272a17',
                      data: '',
                      action: '点击用户名，点击修改密码按钮',
                      result: '进入修改密码弹窗',
                    },
                    {
                      id: '5e44a1f1-ab4c-4f5a-a63a-844b65b97579',
                      data: '',
                      action: '检查弹窗中展示的用户名是否正确，且不可修改',
                      result: '弹窗中用户名正确，且不可修改',
                    },
                    {
                      id: '74df3dd4-abb9-411b-bf04-18fa50914919',
                      data: '',
                      action: '依次将旧密码、新密码、确认密码留空，点击提交',
                      result: '无法提交',
                    },
                    {
                      id: '1817bbfb-6308-43d0-b82f-b727b8c829c4',
                      data: '',
                      action: '输入错误的旧密码，并输入其它信息',
                      result: '无法修改密码',
                    },
                    {
                      id: '27572836-9c6f-44e3-b810-ab14ed5bac61',
                      data: '',
                      action:
                        '输入正确的旧密码，输入新密码不符合密码规则（规则为：8-32个字符，必须包含大小写字母和数字，支持英文特殊字符!"$%()*+,-./:;<=>?@[]^_`{|}~。输入小于8、大于32个字符；输入不支持的特殊字符；输入仅数字、仅小写字母、仅大写字母）',
                      result: '无法通过规则校验，无法修改密码',
                    },
                    {
                      id: '5aa227c5-a0a4-41c1-b4b0-b940f1e40322',
                      data: '',
                      action: '输入正确的旧密码，输入新密码符合规则，确认密码与新密码输入不一致',
                      result: '无法通过规则校验，无法修改密码',
                    },
                    {
                      id: 'e07f9a93-e399-4661-8d09-550a57bfb2aa',
                      data: '',
                      action: '输入正确的旧密码，输入新密码符合规则，确认密码与新密码输入一致',
                      result: '可输入',
                    },
                    {
                      id: '2685321f-8e3e-499c-8c18-ce7e57e6d6d9',
                      data: '',
                      action: '点击保存',
                      result: '保存修改',
                    },
                    {
                      id: 'e9432b4e-6527-43d9-8154-00a5f840a408',
                      data: '',
                      action: '重复上述步骤，点击取消',
                      result: '密码没有被修改',
                    },
                  ],
                  precondition: '打开浏览器，登录管理员账号',
                },
                sortIndex: 1659427264000003,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'KseL5JhKH8',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'A3roHuWZbk',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1660535562000001,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-15T03: 52: 44.332Z',
                updatedAt: '2022-08-15T03: 52: 44.332Z',
                reference: {
                  createdAt: '2022-08-15T03: 52: 40.461Z',
                  updatedAt: '2022-08-15T03: 52: 40.461Z',
                  key: 'TEST_TEST_0002-530',
                  name: '是打发点',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'z1d6hIvQP4',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                detail: {},
                sortIndex: 1660535562000001,
                createdBy: {
                  __type: 'Pointer',
                  className: '_User',
                  objectId: 'jasPZZVVEQ',
                },
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'fJi341lXMf',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'Aw7vfxvFU2',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1660529906000001,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-15T02: 18: 28.352Z',
                updatedAt: '2022-08-15T02: 18: 28.352Z',
                reference: {
                  createdAt: '2022-08-15T02: 18: 21.058Z',
                  updatedAt: '2022-08-15T02: 18: 21.058Z',
                  key: 'TEST_TEST_0002-528',
                  name: '222',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'ZN3tF1ZQFC',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                detail: {},
                sortIndex: 1660529906000001,
                createdBy: {
                  __type: 'Pointer',
                  className: '_User',
                  objectId: 'jasPZZVVEQ',
                },
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: '0c32qd6u1j',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'F0m5EN8uZL',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1659427264000001,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-02T14: 11: 44.610Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.557Z',
                  updatedAt: '2022-08-10T06: 40: 13.365Z',
                  key: 'TEST_TEST_0002-5',
                  name: '首页-导航栏-退出',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                    priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
                    __screen_type: 'view',
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: {
                      read: true,
                    },
                    'itemRole:5vUN0jYwmy': {
                      read: true,
                    },
                    '*': {
                      write: true,
                    },
                  },
                  objectId: 'YYmDIRsktC',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'PASSED',
                detail: {
                  steps: [
                    {
                      id: 'dad4933c-196c-4096-8287-7756ade2e305',
                      data: '',
                      action: '登录后在浏览器中打开多个DEMP页面',
                      result: '可打开多个页面且无需重新登录',
                    },
                    {
                      id: 'cac06909-380c-4e8f-9772-75cb4db98480',
                      data: '',
                      action: '点击右上角用户头像',
                      result: '展示用户登录信息，有退出按钮',
                    },
                    {
                      id: '6c96b5ec-1347-4896-8cff-cf78194e6dd0',
                      data: '',
                      action: '点击退出按钮',
                      result: '多页面同步退出DEMP系统，需重新登录',
                    },
                  ],
                  precondition: '打开浏览器，登录管理员账号',
                },
                sortIndex: 1659427264000001,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'PfQMnyjBhr',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'GG0C4kTEPA',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 09: 08.115Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              runDetail: {
                steps: [
                  {
                    id: '3592f751-f0e8-4324-8447-d263e01e9abf',
                    data: '',
                    action: '修改密码后，页面立即要求用户重新登录',
                    result: '页面退出，要求重新登录',
                  },
                  {
                    id: 'b573b85e-e2a9-4140-87c1-04934f4c5258',
                    data: '',
                    action: '使用旧密码登录',
                    result: '无法登录',
                  },
                  {
                    id: '75fca68d-7e22-4ac9-a9a9-3601d9010f97',
                    data: '',
                    action: '使用新密码登录',
                    result: '登录成功',
                  },
                  {
                    id: 'fabde171-1717-47a8-adae-2a14a814fd79',
                    data: '',
                    action: '再次修改密码，填写密码后，点击取消按钮',
                    result: '密码没有被修改，系统没有自动退出',
                  },
                  {
                    id: 'c4c791a8-9566-49b1-9dbb-b414c1898353',
                    data: '',
                    action: '手动后退出系统',
                    result: '退出成功',
                  },
                  {
                    id: '0c0813ed-0051-464e-ac38-b55870df3472',
                    data: '',
                    action: '使用新密码登录',
                    result: '无法登录',
                  },
                  {
                    id: '7105a036-6334-4800-b1f5-031251347e1a',
                    data: '',
                    action: '使用旧密码登录',
                    result: '登录成功',
                  },
                ],
                precondition: '打开浏览器，登录管理员账号',
                defectItemIds: [
                  'ZA4QPOeHUz',
                  'AZIcxiPNxj',
                  'EQBJcsjeCb',
                  'kYReLmc7eK',
                  'HAW6fdjl5r',
                  '9FfIHr3vJC',
                  'SvS2uJwnbS',
                  'PHOPDsD80Y',
                  'jJAsFFE0fT',
                ],
              },
              sortIndex: 1659427264000002,
              createdBy: {
                __type: 'Pointer',
                className: '_User',
                objectId: 'jasPZZVVEQ',
              },
              updatedBy: {
                __type: 'Pointer',
                className: '_User',
                objectId: 'jasPZZVVEQ',
              },
              runReferenceDetail: {
                createdAt: '2022-08-02T08:01:04.197Z',
                updatedAt: '2022-08-02T14:11:44.610Z',
                reference: {
                  createdAt: '2022-08-02T08:00:30.557Z',
                  updatedAt: '2022-08-02T14:10:44.899Z',
                  key: 'TEST_TEST_0002-4',
                  name: '首页-导航栏-用户修改密码后登录',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                  },
                  itemType: {
                    __type: 'Poin ter',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'DpcyuP46Un',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'PASSED',
                detail: {
                  steps: [
                    {
                      id: '3592f751-f0e8-4324-8447-d263e01e9abf',
                      data: '',
                      action: '修改密码后，页面立即要求用户重新登录',
                      result: '页面退出，要求重新登录',
                    },
                    {
                      id: 'b573b85e-e2a9-4140-87c1-04934f4c5258',
                      data: '',
                      action: '使用旧密码登录',
                      result: '无法登录',
                    },
                    {
                      id: '75fca68d-7e22-4ac9-a9a9-3601d9010f97',
                      data: '',
                      action: '使用新密码登录',
                      result: '登录成功',
                    },
                    {
                      id: 'fabde171-1717-47a8-adae-2a14a814fd79',
                      data: '',
                      action: '再次修改密码，填写密码后，点击取消按钮',
                      result: '密码没有被修改，系统没有自动退出',
                    },
                    {
                      id: 'c4c791a8-9566-49b1-9dbb-b414c1898353',
                      data: '',
                      action: '手动后退出系统',
                      result: '退出成功',
                    },
                    {
                      id: '0c0813ed-0051-464e-ac38-b55870df3472',
                      data: '',
                      action: '使用新密码登录',
                      result: '无法登录',
                    },
                    {
                      id: '7105a036-6334-4800-b1f5-031251347e1a',
                      data: '',
                      action: '使用旧密码登录',
                      result: '登录成功',
                    },
                  ],
                  precondition: '打开浏览器，登录管理员账号',
                },
                sortIndex: 1659427264000002,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: '4DGTo6gbWs',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'fjTDSGcHJF',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1659427264000000,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-16T07: 18: 07.832Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.556Z',
                  updatedAt: '2022-08-10T09: 07: 25.257Z',
                  key: 'TEST_TEST_0002-3',
                  name: '首页-登录页面',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                    priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'xk6wUw38RL',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'FAILED',
                detail: {
                  steps: [
                    {
                      id: '93183819-5850-40f9-873e-f3b0163cb290',
                      data: '',
                      action: '进入产品登录页面',
                      result: '登录页面布局合理',
                    },
                    {
                      id: '17dcd5fb-c3b9-40ea-863b-974dbb294614',
                      data: '',
                      action: '输入错误的用户名，输入密码',
                      result: '无法登录，有合理提示',
                    },
                    {
                      id: '09100cc0-7853-42f3-b4e9-6b12fee6b718',
                      data: '',
                      action: '输入正确的用户名、错误的密码',
                      result: '无法登录，有合理提示',
                    },
                    {
                      id: 'a0988a8d-d371-4ebb-9385-5ef5cf7fa9d6',
                      data: '',
                      action: '输入正确的用户名、正确的密码',
                      result: '登录成功',
                    },
                  ],
                  precondition: '',
                },
                sortIndex: 1659427264000000,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                detailStatus: {
                  planId: 'FAILED',
                  JjIzu5xHUg: 'PASSED',
                  j5RbVYXaLC: 'EXECUTING',
                  tVIij89BLN: 'EXECUTING',
                },
                objectId: 'cyJ2ErU0lw',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'fo10IoahWT',
              __type: 'Object',
              className: 'test_manager_Test',
            },
            {
              createdAt: '2022-08-17T10: 08: 35.651Z',
              updatedAt: '2022-08-17T10: 08: 35.651Z',
              workspaceKey: 'TEST_TEST_0002',
              type: 'TestRun',
              sortIndex: 1659427264000005,
              createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
              runReferenceDetail: {
                createdAt: '2022-08-02T08: 01: 04.197Z',
                updatedAt: '2022-08-02T14: 11: 44.611Z',
                reference: {
                  createdAt: '2022-08-02T08: 00: 30.585Z',
                  updatedAt: '2022-08-02T14: 10: 44.933Z',
                  key: 'TEST_TEST_0002-10',
                  name: '首页-导航栏-报警列表按钮',
                  status: {
                    __type: 'Pointer',
                    className: 'Status',
                    objectId: 'HqdG1eLkKc',
                  },
                  values: {
                    assignee: [
                      {
                        label: 'osc-admin',
                        value: 'jasPZZVVEQ',
                        deleted: false,
                        username: 'osc-admin',
                      },
                    ],
                  },
                  itemType: {
                    __type: 'Pointer',
                    className: 'ItemType',
                    objectId: '3Jvny7Qoxm',
                  },
                  ancestors: [],
                  itemGroup: {
                    __type: 'Pointer',
                    className: 'ItemGroup',
                    objectId: 'yFKYultKWl',
                  },
                  workspace: {
                    __type: 'Pointer',
                    className: 'Workspace',
                    objectId: 'B8y9uem89z',
                  },
                  createdBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  updatedBy: {
                    __type: 'Pointer',
                    className: '_User',
                    objectId: 'jasPZZVVEQ',
                  },
                  ACL: {
                    jasPZZVVEQ: { read: true },
                    'itemRole: 5vUN0jYwmy': { read: true },
                    '*': { write: true },
                  },
                  objectId: 'uNI942YMAA',
                  __type: 'Object',
                  className: 'Item',
                },
                workspaceKey: 'TEST_TEST_0002',
                type: 'TestDetail',
                status: 'PASSED',
                detail: {
                  steps: [
                    {
                      id: '8592d036-8437-4c35-8133-479e1cebc916',
                      data: '',
                      action: '登录后点击上方报警按钮',
                      result: '右上角展示最近5条报警信息',
                    },
                    {
                      id: '4d058d64-96b5-4ab4-8796-88bd1c0f04b9',
                      data: '',
                      action: '点击上方查看更多按钮',
                      result: '页面跳转至报警列表页面',
                    },
                    {
                      id: '4e3adf71-a1a9-4b87-9120-8cc8b1977189',
                      data: '',
                      action: '插入新的报警数据',
                      result: '查看右上角是否有红点提示，展示的5条报警信息是否更新到最新的',
                    },
                    {
                      id: '12acc30e-c7c9-4ccd-9993-981898a34f15',
                      data: '',
                      action: '新的报警信息确认后',
                      result: '报警信确认后，右上角无红点提示',
                    },
                  ],
                  precondition: '打开浏览器，登录管理员账号',
                },
                sortIndex: 1659427264000005,
                repository: {
                  __type: 'Pointer',
                  className: 'test_manager_Repository',
                  objectId: '2ngxOPGNzB',
                },
                objectId: 'dTWploiydU',
                __type: 'Object',
                className: 'test_manager_Test',
              },
              objectId: 'ta1kxOBeV7',
              __type: 'Object',
              className: 'test_manager_Test',
            },
          ],
        },
      ],
      // 缺陷
      defects: [
        {
          createdAt: '2022-08-02T08:06:48.040Z',
          updatedAt: '2022-08-02T08:06:48.040Z',
          key: 'TEST_TEST_0002-471',
          name: '4455555',
          status: {
            __type: 'Pointer',
            className: 'Status',
            objectId: 'HqdG1eLkKc',
          },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['1'],
          },
          itemType: {
            __type: 'Pointer',
            className: 'ItemType',
            objectId: 'UCsK2XMRLi',
          },
          ancestors: [],
          itemGroup: {
            __type: 'Pointer',
            className: 'ItemGroup',
            objectId: 'yFKYultKWl',
          },
          workspace: {
            __type: 'Pointer',
            className: 'Workspace',
            objectId: 'B8y9uem89z',
          },
          createdBy: {
            __type: 'Pointer',
            className: '_User',
            objectId: 'jasPZZVVEQ',
          },
          ACL: {
            'itemRole:5vUN0jYwmy': {
              read: true,
            },
            jasPZZVVEQ: {
              read: true,
            },
            '*': {
              write: true,
            },
          },
          objectId: 'PHOPDsD80Y',
        },
        {
          createdAt: '2022-08-02T08:33:55.780Z',
          updatedAt: '2022-08-02T08:33:55.780Z',
          key: 'TEST_TEST_0002-488',
          name: '111',
          status: {
            __type: 'Pointer',
            className: 'Status',
            objectId: 'HqdG1eLkKc',
          },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['2'],
          },
          itemType: {
            __type: 'Pointer',
            className: 'ItemType',
            objectId: 'UCsK2XMRLi',
          },
          ancestors: [],
          itemGroup: {
            __type: 'Pointer',
            className: 'ItemGroup',
            objectId: 'yFKYultKWl',
          },
          workspace: {
            __type: 'Pointer',
            className: 'Workspace',
            objectId: 'B8y9uem89z',
          },
          createdBy: {
            __type: 'Pointer',
            className: '_User',
            objectId: 'jasPZZVVEQ',
          },
          ACL: {
            jasPZZVVEQ: {
              read: true,
            },
            'itemRole:5vUN0jYwmy': {
              read: true,
            },
            '*': {
              write: true,
            },
          },
          objectId: 'jJAsFFE0fT',
        },
        {
          createdAt: '2022-08-03T02:20:40.738Z',
          updatedAt: '2022-08-03T02:20:40.738Z',
          key: 'TEST_TEST_0002-490',
          name: '1啥地方',
          status: {
            __type: 'Pointer',
            className: 'Status',
            objectId: 'HqdG1eLkKc',
          },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['3'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'SvS2uJwnbS',
        },
        {
          createdAt: '2022-08-03T02: 28: 54.992Z',
          updatedAt: '2022-08-03T02: 28: 54.992Z',
          key: 'TEST_TEST_0002-491',
          name: '东方闪电',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['4'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: '9FfIHr3vJC',
        },
        {
          createdAt: '2022-08-04T05: 56: 26.668Z',
          updatedAt: '2022-08-04T05: 56: 26.668Z',
          key: 'TEST_TEST_0002-503',
          name: '11111',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['1'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'HAW6fdjl5r',
        },
        {
          createdAt: '2022-08-04T05: 57: 24.248Z',
          updatedAt: '2022-08-04T05: 57: 24.248Z',
          key: 'TEST_TEST_0002-504',
          name: 'sdfaf1',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            __screen_type: 'create',
            Dropdown: ['2'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'kYReLmc7eK',
        },
        {
          createdAt: '2022-08-04T06: 08: 20.293Z',
          updatedAt: '2022-08-04T06: 08: 20.293Z',
          key: 'TEST_TEST_0002-505',
          name: 'sdfa',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['2'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'EQBJcsjeCb',
        },
        {
          createdAt: '2022-08-04T06: 08: 29.283Z',
          updatedAt: '2022-08-04T06: 08: 29.283Z',
          key: 'TEST_TEST_0002-506',
          name: 'sagasga',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            Dropdown: ['2'],
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'AZIcxiPNxj',
        },
        {
          createdAt: '2022-08-17T10: 08: 44.292Z',
          updatedAt: '2022-08-17T10: 08: 44.292Z',
          key: 'TEST_TEST_0002-539',
          name: '撒打发',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: {
            assignee: [],
            priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2',
            __screen_type: 'create',
          },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'IKv4SBCB6z',
        },
        {
          createdAt: '2022-08-10T08: 55: 26.916Z',
          updatedAt: '2022-08-10T08: 55: 26.916Z',
          key: 'TEST_TEST_0002-521',
          name: '1',
          status: { __type: 'Pointer', className: 'Status', objectId: 'HqdG1eLkKc' },
          values: { assignee: [], priority: '8f7912a5-9176-4a79-a269-2269ac42b5a2' },
          itemType: { __type: 'Pointer', className: 'ItemType', objectId: 'UCsK2XMRLi' },
          ancestors: [],
          itemGroup: { __type: 'Pointer', className: 'ItemGroup', objectId: 'yFKYultKWl' },
          workspace: { __type: 'Pointer', className: 'Workspace', objectId: 'B8y9uem89z' },
          createdBy: { __type: 'Pointer', className: '_User', objectId: 'jasPZZVVEQ' },
          ACL: {
            jasPZZVVEQ: { read: true },
            'itemRole: 5vUN0jYwmy': { read: true },
            '*': { write: true },
          },
          objectId: 'ZA4QPOeHUz',
        },
      ],
    },
  ],
  globalConfig: {},
};

// 日期格式化
function formatDate(timeStamp, formatstr) {
  if (!timeStamp) {
    return '暂无';
  }
  const date = new Date(timeStamp);
  var arrweek = ['日', '一', '二', '三', '四', '五', '六'];
  var str = formatstr
    .replace(/yyyy|YYYY/, date.getFullYear())
    .replace(/yy|YY/, $addZero(date.getFullYear() % 100, 2))
    .replace(/mm|MM/, $addZero(date.getMonth() + 1, 2))
    .replace(/m|M/g, date.getMonth() + 1)
    .replace(/dd|DD/, $addZero(date.getDate(), 2))
    .replace(/d|D/g, date.getDate())
    .replace(/hh|HH/, $addZero(date.getHours(), 2))
    .replace(/h|H/g, date.getHours())
    .replace(/ii|II/, $addZero(date.getMinutes(), 2))
    .replace(/i|I/g, date.getMinutes())
    .replace(/ss|SS/, $addZero(date.getSeconds(), 2))
    .replace(/s|S/g, date.getSeconds())
    .replace(/w|g/, $addZero(date.getDay(), 2))
    .replace(/W/g, arrweek[date.getDay()]);
  return str;
}
function $addZero(v, size) {
  for (var i = 0, len = size - (v + '').length; i < len; i++) {
    v = '0' + v;
  }
  return v + '';
}

const ParseBaseQueryOptions = {
  sessionToken: global.sessionToken,
};
const customFieldKey = 'Dropdown';

const executionInit = executions => {
  const executionResult = executions.map(ele => {
    return {
      objectId: ele.objectId,
      executionDateRange: `${formatDate(
        ele?.reference?.values?.finishAt,
        'YYYY.MM.DD',
      )} - ${formatDate(ele?.reference?.values?.inProgressAt, 'YYYY.MM.DD')}`,
      fixedDefectCount: 0,
      legacyDefectCount: 0,
    };
  });
  return executionResult;
};
// 饼图数据初始化
const levelPieInit = defects => {
  const fieldOption = field?.data?.customData?.map(ele => {
    return {
      ...ele,
      count: 0,
    };
  });
  defects.forEach(defect => {
    fieldOption.forEach(option => {
      if (defect?.values?.[customFieldKey]?.includes(option.value)) {
        option.count++;
      }
    });
  });
  return fieldOption.map(ele => {
    return {
      name: ele.label,
      value: ele.count,
    };
  });
};
// 查询缺陷字段详情，获取option
const appQuery = await apis.getParseQuery(false, 'CustomField');
const field = await appQuery
  .equalTo('key', customFieldKey)
  .first(ParseBaseQueryOptions)
  .then(item => item.toJSON());

const hsDataInit = data.planStats.map(plan => {
  return {
    execution: executionInit(plan?.allTestExecutions || []),
    defect: {
      charts: {
        levelPie: {
          title: {
            text: '缺陷严重程度统计表',
            left: 'center',
          },
          legend: {
            orient: 'vertical',
            left: 'left',
          },
          series: [
            {
              name: 'Access From',
              type: 'pie',
              radius: '50%',
              label: {
                normal: {
                  position: 'inner',
                  formatter: '{d}',
                },
              },
              data: levelPieInit(plan?.defects || []),
            },
          ],
        },
      },
    },
  };
});
console.info(JSON.stringify(hsDataInit));
return hsDataInit;
