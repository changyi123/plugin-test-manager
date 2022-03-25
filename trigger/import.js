// const triggerParams = {
//     data: [{
//             id: 'qATTCWHO4A',
//             name: '测试032201',
//             workspace: 'nF6ZkIdLox',
//             itemType: 'hqTQcpfaiO',
//             status: 'HqdG1eLkKc'
//         },
//         {
//             id: '5t2whqoHD11',
//             name: '测试032202',
//             workspace: 'nF6ZkIdLox',
//             itemType: 'hqTQcpfaiO',
//             status: 'HqdG1eLkKc'
//         }
//     ],
//     appFieldsData: [{
//             group: '44/234234/jyt1',
//             priority: '高',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: 'qATTCWHO4A'
//         },
//         {
//             group: '测试01/测试03/测试06',
//             priority: '中',
//             action: '1.xxx\r\n2.www',
//             result: '1.xxx\r\n2.www',
//             itemId: '5t2whqoHD1'
//         }
//     ]
// }

const {
    data,
    appFieldsData,
} = triggerParams;

const APP_KEY = 'test_manager';

const TEST_MANAGER_TEST = `${APP_KEY}_Test`;

const TEST_MANAGER_REPO = `${APP_KEY}_Repository`;

const splitGroup = group => group.split('/');

const clone = d => JSON.parse(JSON.stringify(d));

const isTwoChar = d => /[^\x00-\xff]/g.test(d);

const getCharNum = d => d.split('').reduce((prev, cur) => {

    prev = prev + isTwoChar(cur) ? 2 : 1;

    return prev;
}, 0)

// 根据事项数据获取 workspaceKey 
const getWorkspaceKey = async () => {
    const objectId = clone(data).find(d => d.workspace)?.workspace;

    const workspace = await apis.getData(false, 'Workspace', {
        objectId
    })

    return workspace.toJSON().key;
};

const workspaceKey = await getWorkspaceKey();

const getActionAndResultIndex = value => value.match(/^[0-9]+/)[0];

const getActionAndResultData = datas => (getCharNum(datas) > 500 ? '' : datas).replace(/^【\d+】/, '')

const splitData = datas => datas?.split(/[\r\n]+/g) ?? [];

const getStepsData = datas => {
    const stepsMap = new Map();

    splitData(datas.action).forEach((action, index) => {
        stepsMap.set(index, {
            action: getActionAndResultData(action),
            result: stepsMap.get(index)?.result,
        })
    })

    splitData(datas.result).forEach((result, index) => {
        stepsMap.set(index, {
            action: stepsMap.get(index)?.action,
            result: getActionAndResultData(result),
        })
    })

    return [...Object.values(stepsMap)];
}

// 创建测试用例数据，返回测试用例
const createTestMangerTest = async () => {
    const itemParseObj = await apis.getParseModel(false, 'Item');
    const testInstance = await apis.getParseObject(false, TEST_MANAGER_TEST);

    const _data = appFieldsData.map(_data => ({
            workspaceKey,
            type: 'TestDetail',
            reference: itemParseObj.createWithoutData(_data.itemId),
            detail: {
                precondition: getCharNum(_data.precondition) > 500 ? '' : _data.precondition,
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

const handleRroupPath = datas => {
    const getPath = (gro, _datas, path = []) => {
        path.push(gro.name);

        if (gro.parentId) {
            path = getPath(_datas.find(d => d.objectId === gro.parentId), _datas, path)
        }

        return path
    }

    return datas.map(d => ({
        ...d,
        path: getPath(d, datas).reverse().join('/')
    }))
}

// 根据空间 key 查询用例库数据
const getRepoData = async () => {
    const repoData = await apis.getAllData(false, TEST_MANAGER_REPO, {
        workspaceKey,
    });

    const newRepoData = repoData.map(d => {
        const _data = d.toJSON();

        return {
            name: _data.name,
            objectId: _data.objectId,
            testDetailIds: _data.testDetailIds ?? [],
            parentId: _data.parent?.objectId ?? null,
            workspaceKey: _data.workspaceKey,
        };
    });

    return handleRroupPath(newRepoData);
}

const getParent = (RepoParseObj, datas, repoData) => {
    const _data = datas.find(d => d.path === repoData.path.replace(`/${repoData.name}`, ''));

    return _data?.objectId && RepoParseObj.createWithoutData(_data.objectId)
}

const createRepoGroup = async (datas, i) => {
    const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);
    const newRepoData = await getRepoData();

    const repos = datas.map(gro => {
        const parent = i === 0 ? undefined : getParent(RepoParseObj, newRepoData, gro);

        const repo = new RepoParseObj({
            parent: parent,
            workspaceKey,
            name: gro.name,
        })

        return repo
    
    })

    return await apis.saveAllObject(repos)
}

const getImportGroupData = () => appFieldsData.map(d => d.group?.split('/').reduce((prev, cur, index) => {
    prev[index] = {
        name: cur,
        parent: index === 0 ? null : prev[index - 1].name,
        path: index === 0 ? cur : `${prev[index-1].path}/${cur}`,
        index,
    }

    return prev;
}, [])).flat();

const getToCreateGroupData = async () => {
    const newRepoData = await getRepoData();

    return getImportGroupData().filter(d => !newRepoData.some(g => g.path === d.path))
}

const handleFieldsData = async (testManagerTestData) => {
    const repoDatas = await getRepoData();
    const RepoParseObj = await apis.getParseModel(false, TEST_MANAGER_REPO);

    const newRepoObj = appFieldsData.map(field => {
        const repoData = repoDatas.find(gro => gro.path === field.group);

        const repository = new RepoParseObj({
            objectId: repoData?.objectId,
        });

        const getAddId = () => {
            const testMap = new Map()

            testManagerTestData.forEach(d => {
                const _data = d.toJSON();
                testMap.set(_data.reference.objectId, _data.objectId)
            })

            return testMap.get(field.itemId)
        }
        
        const getDetailIds = () => repoData.testDetailIds.concat(getAddId())

        repository.set('testDetailIds', getDetailIds())

        return repoData?.objectId ? repository : undefined;
    }).filter(Boolean)

    return await apis.saveAllObject(newRepoObj);
}

// 导入成功后，创建事项数据后的回调函数
const importCallBack = async () => {
    // 创建测试用例数据
    const testManagerTestData = await createTestMangerTest();

    // 得到需要创建的用例库数据
    const toCreateGroupData = await getToCreateGroupData();

    const newToCreateGroupData =  toCreateGroupData.reduce((prev, cur) => {
        prev.set(cur.index, (prev.get(cur.index) || []).concat([cur]))
        return prev;
    }, new Map());
    
    // 创建用例库
    for (let i = 0; i < 5; i++) {
        if (newToCreateGroupData.get(i)) {
            await createRepoGroup(newToCreateGroupData.get(i), i)
        }
    }

    // 绑定测试用例到用例库
    await handleFieldsData(testManagerTestData);

    const href = `osc/workspaces/${workspaceKey}`
    window.open(href)

    return {
        code: 200,
        message: '成功',
    }
}

return importCallBack()