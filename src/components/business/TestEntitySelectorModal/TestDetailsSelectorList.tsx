/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { Checkbox, Empty } from 'antd';
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
  // selectedTestDetailIds: string[];
  setSelectedTestDetailIds: (val: string[]) => void;
}

const reportTreeToArray = (datas: any[], parent?: any) => {
  return datas?.reduce((prev, cur) => {
    const _cur = {
      ...cur,
      value: cur.key,
      label: cur.name,
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

const getTestDetailIdsByReport = datas => datas.map(d => d.testDetailIds ?? []).flat();

const TestDetailsSelectorList: React.FC<TestDetailsSelectorListProps> = ({
  workspaceKey,
  selectedNode,
  ignoreTestDetailIds,
  setSelectedTestDetailIds,
}) => {
  const CheckboxGroup = Checkbox.Group;

  const [checkedAllValue, setCheckedAllValue] = useState({});
  const [checkData, setCheckData] = useState([]);
  const [reportCheckedValue, setReportCheckedValue] = useState({});
  const [checkedTestValue, setCheckedTestValue] = useState({});

  const checkAllTest = e => {
    setCheckedAllValue(val => ({
      ...val,
      [selectedNode.key]: {
        checked: e.target.checked,
        indeterminate: false,
      },
    }));
    setReportCheckedValue(
      checkData.reduce((prev, cur) => {
        prev[cur.value] = {
          checked: e.target.checked,
          indeterminate: false,
        };
        return prev;
      }, {}),
    );
  };

  // 查询当前用例库下所有测试用例
  const { data: curTestList = [], loading: curTestListLoading } = useRequest(
    async () => {
      // 获取当前空间内所有的测试实体
      const { results: data } = await getTestEntitiesByQuery(
        {
          in: getTestDetailIdsByReport(getReportData(selectedNode)),
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
      }));
    },
    {
      ready: Boolean(selectedNode),
      refreshDeps: [selectedNode],
      cacheKey: `Repository_${selectedNode?.key ?? ''}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  // useEffect(() => {
  //   if (selectedNode) {
  //     if (!checkedAllValue[selectedNode.key]) {
  //       const ids = getTestDetailIdsByReport(getReportData(selectedNode));
  //       const newIds = ids.filter(d => ![...Object.values(checkedTestValue)].flat().includes(d));

  //       console.log(11111, ids, newIds);

  //       setCheckedAllValue(val => ({
  //         ...val,
  //         [selectedNode.key]: {
  //           checked: !newIds.length,
  //           indeterminate: !!newIds.length && newIds.length !== ids.length,
  //         },
  //       }));
  //     }
  //   }
  // }, [selectedNode]);

  // useEffect(() => {
  //   if (ignoreTestDetailIds?.length && selectedNode) {
  //     const
  //     setCheckedTestValue();
  //   }
  // }, [ignoreTestDetailIds, selectedNode]);

  useEffect(() => {
    if (!curTestListLoading && curTestList?.length) {
      const curTestListMap = new Map();

      curTestList.forEach(test => {
        curTestListMap.set(test.objectId, test);
      });
      const _checkData = getReportData(selectedNode).map(report => ({
        ...report,
        testDetailList: report.testDetailIds?.map(d => curTestListMap.get(d)) ?? [],
      }));

      setCheckData(_checkData);
    }
  }, [curTestListLoading, curTestList]);

  useEffect(() => {
    if ([...Object.keys(reportCheckedValue)].length) {
      const selectedReport = [...Object.values(reportCheckedValue)].filter((d: any) => d.checked);
      const indeterminateReport = [...Object.values(reportCheckedValue)].filter(
        (d: any) => d.indeterminate,
      );

      const getIndeterminate = () => {
        if (selectedReport.length && selectedReport.length !== checkData.length) {
          return true;
        }
        if (indeterminateReport.length) {
          return true;
        }
        if (!selectedReport.length && !indeterminateReport.length) {
          return false;
        }
        return false;
      };
      const curChecked = selectedReport.length === checkData.length;

      setCheckedAllValue(val => ({
        ...val,
        [selectedNode.key]: {
          checked: curChecked,
          indeterminate: getIndeterminate(),
        },
      }));

      const checkedTestValue = [...Object.entries(reportCheckedValue)].reduce(
        (prev, [key, value]: any[]) => {
          const delValue = checkData.find(d => d.value === key)?.testDetailList.map(d => d.value);
          if (value.checked && delValue) {
            prev[key] = delValue;
          }
          if (!value.checked && !value.indeterminate) {
            prev[key] = [];
          }
          return prev;
        },
        {},
      );

      setCheckedTestValue(val => ({
        ...val,
        ...checkedTestValue,
      }));
    }
  }, [reportCheckedValue]);

  const checkReport = (e, type: string) => {
    const delValue = checkData.find(d => d.value === type)?.testDetailList.map(d => d.value);
    setReportCheckedValue(value => ({
      ...value,
      [type]: {
        checked: e.target.checked,
        indeterminate: false,
      },
    }));
    setCheckedTestValue(value => ({
      ...value,
      [type]: e.target.checked ? delValue : [],
    }));
  };

  const checkTest = (val: CheckboxValueType[], type: string) => {
    setCheckedTestValue(value => ({
      ...value,
      [type]: val,
    }));
    const delValue = checkData.find(d => d.value === type)?.testDetailList.map(d => d.value);
    if (delValue.length) {
      setReportCheckedValue(value => ({
        ...value,
        [type]: {
          checked: delValue.length === val.length,
          indeterminate: delValue.length !== val.length && !!val.length,
        },
      }));
    }
  };

  return (
    <>
      <Checkbox
        disabled={!selectedNode?.key}
        indeterminate={checkedAllValue?.[selectedNode?.key]?.indeterminate ?? false}
        checked={checkedAllValue?.[selectedNode?.key]?.checked ?? false}
        onChange={checkAllTest}
      >
        全选
      </Checkbox>
      {checkData.map(box => (
        <div key={box.value}>
          <Checkbox
            indeterminate={reportCheckedValue?.[box.value]?.indeterminate ?? false}
            checked={reportCheckedValue?.[box.value]?.checked ?? false}
            onChange={e => checkReport(e, box.value)}
          >
            {box.path}
          </Checkbox>
          {box.testDetailList.length ? (
            <CheckboxGroup
              options={box.testDetailList}
              value={[...Object.values(checkedTestValue)].flat() as string[]}
              onChange={val => checkTest(val, box.value)}
            ></CheckboxGroup>
          ) : (
            <Empty description="当前用例库未关联测试用例" />
          )}
        </div>
      ))}
    </>
  );
};

export default TestDetailsSelectorList;
