/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Select, Spin, Tooltip } from 'antd';
import { CheckboxValueType } from 'antd/lib/checkbox/Group';
import { getTestEntitiesByQuery } from '@/lib/api/common';
import { useRequest } from 'ahooks';

import cx from './TestDetailsSelectorList.less';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';

interface TestDetailsSelectorListProps {
  workspaceKey?: string;
  selectedNode?: any;
  detailSearchValue?: string;
  ignoreTestDetailIds?: string[];
  selectedTestDetailIds?: string[];
  setSelectedTestDetailIds?: (val: any) => void;
}

const reportTreeToArray = (datas: any[], parent?: any, ignoreIds = []) => {
  return datas?.reduce((prev, cur) => {
    const _cur = {
      ...cur,
      value: cur.key,
      label: cur.name,
      testIds: filterIgnoreIds(cur.testDetailIds ?? [], ignoreIds),
      path: `${parent?.path ? parent?.path + '/' : ''}${cur.name}`,
    };
    prev = prev.concat(_cur);

    if (_cur.children?.length) {
      prev = prev.concat(reportTreeToArray(_cur.children, _cur, ignoreIds));
    }

    return prev;
  }, []);
};

const getReportData = (datas, ignoreIds = []) => reportTreeToArray([datas ?? {}], null, ignoreIds);

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

const getPath = (path: string, name: string) => {
  const reg = new RegExp(`(${name})$`, 'g');
  return path.replace(reg, '');
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
  detailSearchValue,
  ignoreTestDetailIds,
  selectedTestDetailIds,
  setSelectedTestDetailIds,
}) => {
  const CheckboxGroup = Checkbox.Group;
  const [checkData, setCheckData] = useState([]);
  const [showType, setShowType] = useState('showChild');
  const [orderByCratedAt, setOrderByCratedAt] = useState<'asc' | 'desc'>('asc');

  const curSelectIdsLength = useMemo(
    () => getTestDetailIdsByReport(checkData).filter(d => selectedTestDetailIds.includes(d)).length,
    [selectedTestDetailIds, checkData],
  );

  // 查询当前用例库下所有测试用例
  const { data: curTestList = [], loading: curTestListLoading } = useRequest(
    async () => {
      const baseQueryOptions = {
        ascendingBy: orderByCratedAt === 'asc' ? ['sortIndex', 'createdAt'] : null,
        descendingBy: orderByCratedAt === 'desc' ? ['sortIndex', 'createdAt'] : null,
      };
      // 获取当前空间内所有的测试实体
      const { results: data } = await getTestEntitiesByQuery(
        {
          nameLike: detailSearchValue,
          in: getTestDetailIdsByReport(getReportData(selectedNode), 'testDetailIds'),
          workspaceKey,
        },
        {
          limit: 99999,
          include: ['objectId', 'repository', 'reference'],
          select: ['objectId', 'repository', 'reference'],
          ...baseQueryOptions,
        },
      );

      return data.map(d => ({
        ...d,
        label: d.reference.name,
        value: d.objectId,
      }));
    },
    {
      refreshDeps: [detailSearchValue, orderByCratedAt, selectedNode],
      cacheKey: `Repository_${selectedNode?.key ?? ''}${detailSearchValue ?? ''}${orderByCratedAt}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  useEffect(() => {
    if (!curTestListLoading) {
      if (!curTestList.length) return setCheckData([]);
      // const curTestListMap = new Map();

      // curTestList?.forEach(test => {
      //   curTestListMap.set(test.objectId, test);
      // });
      const reportData = getReportData(
        showType === 'showCur'
          ? {
              ...selectedNode,
              children: [],
            }
          : selectedNode,
        ignoreTestDetailIds,
      );

      const _checkData = reportData.map(report => ({
        ...report,
        // testDetailList: report.testDetailIds?.map(d => curTestListMap.get(d) ?? []) ?? [],
        testDetailList: curTestList.filter(d => report.testDetailIds.includes(d.objectId)) ?? [],
      }));

      setCheckData(_checkData);
    }
  }, [curTestListLoading, curTestList, showType, ignoreTestDetailIds]);

  const checkAllTest = e => {
    const allTestIds = getTestDetailIdsByReport(checkData, 'testIds');
    setSelectedTestDetailIds(val => [
      ...val.filter(d => !allTestIds.includes(d)),
      ...(e.target.checked ? allTestIds : []),
    ]);
  };

  const checkReport = (e, boxNode) => {
    setSelectedTestDetailIds(val => [
      ...val.filter(d => !boxNode.testIds.includes(d)),
      ...(e.target.checked ? boxNode.testIds : []),
    ]);
  };

  const checkTest = (value: CheckboxValueType[], testIds: string[]) => {
    setSelectedTestDetailIds(val => [
      ...new Set([...val.filter(d => !testIds.includes(d)), ...value]),
    ]);
  };

  return (
    <Spin spinning={curTestListLoading}>
      <>
        <div className={cx('detail-selector-header')}>
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
            <span> {curSelectIdsLength}</span>
            <span> / {getTestDetailIdsByReport(checkData).length}</span>
          </Checkbox>
          <div className={cx('detail-header-right')}>
            <Select
              value={showType}
              options={selectOptions}
              onChange={val => setShowType(val)}
            ></Select>
            <Tooltip title="创建时间排序">
              <span
                className={cx('action')}
                onClick={() => {
                  setOrderByCratedAt(val => (val === 'asc' ? 'desc' : 'asc'));
                }}
              >
                <span>{orderByCratedAt === 'asc' ? '最早' : '最晚'}</span>
                <span className={cx('icon')}>
                  <CaretUpOutlined className={cx(orderByCratedAt === 'asc' && 'activity')} />
                  <CaretDownOutlined className={cx(orderByCratedAt === 'desc' && 'activity')} />
                </span>
              </span>
            </Tooltip>
          </div>
        </div>
        <div
          className={cx('detail-selector-body')}
          style={{
            overflow: 'hidden auto',
            height: 'calc(100% - 40px)',
          }}
        >
          {checkData.map(box => (
            <>
              {box.testDetailList.length ? (
                <div className={cx('detail-list')} key={box.value}>
                  <div className={cx('detail-list-box')}>
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
                      {getPath(box.path, box.name)}
                      <strong>{box.name}</strong>
                    </Checkbox>
                  </div>
                  <div className={cx('detail-list-group')}>
                    <CheckboxGroup
                      options={box.testDetailList.map(d => ({
                        ...d,
                        disabled: ignoreTestDetailIds?.includes(d.objectId) ?? false,
                      }))}
                      value={[...ignoreTestDetailIds, ...selectedTestDetailIds]}
                      onChange={val =>
                        checkTest(
                          val.filter(d => !ignoreTestDetailIds.includes(d as string)),
                          box.testIds,
                        )
                      }
                    ></CheckboxGroup>
                  </div>
                </div>
              ) : null}
            </>
          ))}
        </div>
      </>
    </Spin>
  );
};

export default React.memo(TestDetailsSelectorList);
