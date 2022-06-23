/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Select } from 'antd';
import { CheckboxValueType } from 'antd/lib/checkbox/Group';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { useRequest } from 'ahooks';

// 接受参数：
// 1、所选测试用例库信息 selectedNode
// 2、当前测试计划下已关联用例 ignoreTestDetailIds

// 返回数据
// 1、选中目标测试用例 selectedTestDetailIds

// 实现交互
// 1、切换当前用例库和当前用例库的子用例库交互
// 2、全选交互，全选选择所有用例库，选择用例库全选用例库下的测试用例，选择测试用例半选用例库，半选全选

// 左侧树交互优化：
// 1、折叠和点击交互分开

interface TestDetailsSelectorListProps {
  workspaceKey?: string;
  selectedNode?: any;
  ignoreTestDetailIds?: string[];
  selectedTestDetailIds: string[];
  setSelectedTestDetailIds: (val: any) => void;
}

const reportTreeToArray = (datas: any[], parent?: any, ignoreIds = []) => {
  return datas?.reduce((prev, cur) => {
    const _cur = {
      ...cur,
      value: cur.key,
      label: cur.name,
      testIds: filterIgnoreIds(cur.testDetailIds ?? [], ignoreIds),
      path: `${parent?.path ? parent?.path + '/' : ''}` + cur.name,
    };
    prev = prev.concat(_cur);

    if (_cur.children?.length) {
      prev = prev.concat(reportTreeToArray(_cur.children, _cur));
    }

    return prev;
  }, []);
};

const getReportData = datas => reportTreeToArray([datas ?? {}]);

const getTestDetailIdsByReport = (datas, filed = 'testIds') =>
  datas.map(d => d[filed] ?? []).flat();

const getCheckedValue = (checkData: any[], checkTestValue: string[], type = 'checked') => {
  if (!checkTestValue.length) return false;

  const allTestIds = getTestDetailIdsByReport(checkData, 'testDetailIds');
  const _allTestIds = allTestIds.filter(id => !checkTestValue.includes(id));

  if (type === 'checked') {
    return !_allTestIds.length;
  }

  return !!_allTestIds.length && allTestIds.length !== _allTestIds.length;
};

const filterIgnoreIds = (ids: string[], ignoreIds: string[]) =>
  ids?.filter(d => !ignoreIds.includes(d)) ?? [];

const getReportCheckedValue = (testIds: any[], checkTestValue: string[], type = 'checked') => {
  const _testIds = testIds.filter(id => !checkTestValue.includes(id));
  if (type === 'checked') {
    return !_testIds.length;
  }

  return !!_testIds.length && testIds.length !== _testIds.length;
};

const selectOptions = [
  {
    value: 'showCur',
    label: '显示当前分组用例',
  },
  {
    value: 'showChild',
    label: '显示子分组用例',
  },
];

const TestDetailsSelectorList: React.FC<TestDetailsSelectorListProps> = ({
  workspaceKey,
  selectedNode,
  ignoreTestDetailIds,
  selectedTestDetailIds,
  setSelectedTestDetailIds,
}) => {
  const CheckboxGroup = Checkbox.Group;
  const [checkData, setCheckData] = useState([]);
  const [showType, setShowType] = useState('showChild');

  const curSelectIdsLength = useMemo(
    () => getTestDetailIdsByReport(checkData).filter(d => selectedTestDetailIds.includes(d)).length,
    [selectedTestDetailIds, checkData],
  );

  // 查询当前用例库下所有测试用例
  const { data: curTestList = [], loading: curTestListLoading } = useRequest(
    async () => {
      // 获取当前空间内所有的测试实体
      const { results: data } = await getTestEntitiesByQuery(
        {
          in: getTestDetailIdsByReport(getReportData(selectedNode), 'testDetailIds'),
          workspaceKey,
        },
        {
          limit: 99999,
          include: ['objectId', 'repository', 'reference'],
          select: ['objectId', 'repository', 'reference'],
        },
      );

      return data.map(d => ({
        ...d,
        label: d.reference.name,
        value: d.objectId,
        disabled: ignoreTestDetailIds?.includes(d.objectId) ?? false,
      }));
    },
    {
      ready: Boolean(selectedNode),
      refreshDeps: [selectedNode, ignoreTestDetailIds],
      cacheKey: `Repository_${selectedNode?.key ?? ''}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  useEffect(() => {
    if (!curTestListLoading && curTestList?.length) {
      const curTestListMap = new Map();

      curTestList.forEach(test => {
        curTestListMap.set(test.objectId, test);
      });
      const reportData =
        showType === 'showCur'
          ? [
              {
                ...selectedNode,
                children: [],
                testDetailList: selectedNode.testDetailIds?.map(d => curTestListMap.get(d)) ?? [],
              },
            ]
          : getReportData(selectedNode);

      const _checkData = reportData.map(report => ({
        ...report,
        testDetailList: report.testDetailIds?.map(d => curTestListMap.get(d)) ?? [],
      }));

      setCheckData(_checkData);
    }
  }, [curTestListLoading, curTestList, showType]);

  const checkAllTest = e => {
    const allTestIds = getTestDetailIdsByReport(checkData, 'testDetailIds');
    setSelectedTestDetailIds(val => [
      ...val.filter(d => !allTestIds.includes(d)),
      ...(e.target.checked ? allTestIds : []),
    ]);
  };

  const checkReport = (e, boxNode) => {
    setSelectedTestDetailIds(val => [
      [
        ...val.filter(d => !boxNode.testIds.includes(d)),
        ...(e.target.checked ? boxNode.testIds : []),
      ],
    ]);
  };

  const checkTest = (value: CheckboxValueType[], testIds: string[]) => {
    setSelectedTestDetailIds(val => [...val.filter(d => !testIds.includes(d)), ...value]);
  };

  return (
    <>
      <div>
        <Checkbox
          disabled={!selectedNode?.key}
          indeterminate={getCheckedValue(
            checkData,
            [...ignoreTestDetailIds, ...selectedTestDetailIds],
            'indeterminate',
          )}
          checked={getCheckedValue(
            checkData,
            [...ignoreTestDetailIds, ...selectedTestDetailIds],
            'checked',
          )}
          onChange={checkAllTest}
        >
          已选中
          <span>{curSelectIdsLength}</span>
          <span> / {getTestDetailIdsByReport(checkData).length}</span>
        </Checkbox>
        <div>
          <Select
            value={showType}
            options={selectOptions}
            onChange={val => setShowType(val)}
          ></Select>
        </div>
      </div>
      {checkData.map(box => (
        <div key={box.value}>
          <Checkbox
            indeterminate={getReportCheckedValue(
              box.testDetailIds,
              [...ignoreTestDetailIds, ...selectedTestDetailIds],
              'indeterminate',
            )}
            checked={getReportCheckedValue(
              box.testDetailIds,
              [...ignoreTestDetailIds, ...selectedTestDetailIds],
              'checked',
            )}
            onChange={e => checkReport(e, box)}
          >
            {box.path}
          </Checkbox>
          {box.testDetailList.length && (
            <CheckboxGroup
              options={box.testDetailList}
              value={[...ignoreTestDetailIds, ...selectedTestDetailIds]}
              onChange={val => checkTest(val, box.testIds)}
            ></CheckboxGroup>
          )}
        </div>
      ))}
    </>
  );
};

export default TestDetailsSelectorList;
