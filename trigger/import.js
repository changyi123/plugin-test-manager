const triggerParams = {
    data: [{
            id: 'qATTCWHO4A',
            name: '测试032201',
            workspace: 'LPT1',
            itemType: 'hqTQcpfaiO',
            status: 'HqdG1eLkKc'
        },
        {
            id: '5t2whqoHD11',
            name: '测试032202',
            workspace: 'LPT1',
            itemType: 'hqTQcpfaiO',
            status: 'HqdG1eLkKc'
        }
    ],
    appFieldsData: [{
            group: '44/234234/jyt',
            priority: '高',
            action: '1.xxx\r\n2.www',
            result: '1.xxx\r\n2.www',
            itemId: 'qATTCWHO4A'
        },
        {
            group: '',
            priority: '中',
            action: '1.xxx\r\n2.www',
            result: '1.xxx\r\n2.www',
            itemId: '5t2whqoHD1'
        }
    ]
}

const {
    data,
    appFieldsData,
} = triggerParams;


const APP_KEY = 'test_manager';

const TEST_MANAGER_TEST = `${APP_KEY}_Test`;

const TEST_MANAGER_REPO = `${APP_KEY}_Repository`;

const arrayToTree = treeArray => {
    const r = [],
        tmpMap = {};

    for (let i = 0, l = treeArray.length; i < l; i++) {
        // 以每条数据的id作为obj的key值，数据作为value值存入到一个临时对象里面
        tmpMap[treeArray[i].key] = treeArray[i];
    }

    for (let i = 0, l = treeArray.length; i < l; i++) {
        const key = tmpMap[treeArray[i].parentId];

        // 循环每一条数据的pid，假如这个临时对象有这个key值，就代表这个key对应的数据有children，需要Push进去
        if (key) {
            if (!key.children) {
                key.children = [];
                key.children.push(treeArray[i]);
            } else {
                key.children.push(treeArray[i]);
            }
        } else {
            // 如果没有这个Key值，那就代表没有父级,直接放在最外层
            r.push(treeArray[i]);
        }
    }
    return r;
}


// 根据事项数据获取 workspaceKey 
const getWorkspaceKey = datas => datas.find(d => d.workspace)?.workspace;

const getActionAndResultIndex = value => value.match(/^[0-9]+/)[0];

const getResultData = (action, results) =>
    results.split(/\r\n/g).find(r => getActionAndResultIndex(r) === getActionAndResultIndex(action))


const getStepsData = datas => {
    if (!datas.action) return [];

    return datas.action.split(/\r\n/g).map(d => ({
        action: d,
        result: getResultData(d, datas.result)
    }))
}

// 创建测试用例数据，返回测试用例
const createTestMangerTest = async () => {
    const itemParseObj = await apis.getParseModel(false, 'Item');
    const testInstance = await apis.getParseObject(false, TEST_MANAGER_TEST);

    const workspaceKey = getWorkspaceKey(data);

    const _data = appFieldsData.map(_data => ({
            workspaceKey,
            type: 'TestDetail',
            reference: itemParseObj.createWithoutData(_data.itemId),
            detail: {
                precondition: _data.precondition,
                steps: getStepsData(_data)
            }
        }))
        .map(row => {
            const newTestInstance = testInstance.clone()
            newTestInstance.set(row);
            return newTestInstance
        })

    const newData = await apis.saveAllObject(_data);

    return newData;
}

// 导入成功后，创建事项数据后的回调函数
const importCallBack = async () => {
    const testManagerTestData = await createTestMangerTest();

    const testDataList = testManagerTestData.map(d => ({
        itemId: d.get('reference').id,
        data: d,
    }))

    const repoData = await apis.getAllData(false, TEST_MANAGER_REPO, {
        workspaceKey: getWorkspaceKey(data)
    });

    const newRepoData = repoData.map(d => {
        const _data = d.toJSON();
        return {
            name: _data.name,
            key: _data.objectId,
            testDetailIds: _data.testDetailIds ?? [],
            parentId: _data.parent?.objectId ?? null,
            workspaceKey: _data.workspaceKey,
        };
    })

    console.log(222, testDataList, arrayToTree(newRepoData))
}

importCallBack()

return {
    code: 200,
    message: '成功',
};