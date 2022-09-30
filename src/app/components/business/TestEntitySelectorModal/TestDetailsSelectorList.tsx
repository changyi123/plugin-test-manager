/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Empty, Select, Spin, Tooltip } from 'antd';
import { useRequest } from 'ahooks';
import emptyImg from '@/icons/svg/empty-data.png';
import cx from './TestDetailsSelectorList.less';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { FieldKey } from 'common/types/api';

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
      testIds: filterIgnoreIds(cur.caseIds ?? [], ignoreIds),
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

  const allTestIds = getTestDetailIdsByReport(checkData, 'testDetailList').map(d => d.objectId);
  const _allTestIds = allTestIds.filter(id => !checkTestValue.includes(id));

  if (type === 'checked') {
    return !!allTestIds.length && !_allTestIds.length;
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
    value: 'showChild',
    label: '显示子分组用例',
  },
  {
    value: 'showCur',
    label: '显示当前分组用例',
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
    () =>
      getTestDetailIdsByReport(checkData, 'testDetailList')
        .filter(d => !ignoreTestDetailIds.includes(d.objectId))
        .filter(d => selectedTestDetailIds.includes(d.objectId)).length,
    [selectedTestDetailIds, checkData],
  );

  // 查询当前用例库下所有测试用例
  const { data: curTestList = [], loading: curTestListLoading } = useRequest(
    async () => {
      const baseQueryOptions: {
        ascending?: FieldKey[];
        descending?: FieldKey[];
      } =
        orderByCratedAt === 'asc'
          ? {
              ascending: ['createdAt'],
            }
          : {
              descending: ['createdAt'],
            };
      const { list: data } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          name: detailSearchValue,
          id: getTestDetailIdsByReport(getReportData(selectedNode), 'caseIds'),
        },
        ...baseQueryOptions,
        limit: 9999,
        select: ['id', 'name', 'repository'],
      });

      return data.map(d => ({
        ...d,
        label: d.name,
        value: d.objectId,
      }));
    },
    {
      refreshDeps: [detailSearchValue, orderByCratedAt, selectedNode, workspaceKey],
      cacheKey: `Repository_${selectedNode?.key ?? ''}${selectedNode?.caseIds.join('_') ?? ''}${
        detailSearchValue ?? ''
      }${orderByCratedAt}${workspaceKey}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  useEffect(() => {
    if (!curTestListLoading) {
      if (!curTestList.length) return setCheckData([]);
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
        testDetailList: curTestList.filter(d => report.caseIds.includes(d.objectId)) ?? [],
      }));

      setCheckData(_checkData);
    }
  }, [curTestListLoading, curTestList, showType, ignoreTestDetailIds]);

  const checkAllTest = e => {
    const allTestIds = getTestDetailIdsByReport(checkData, 'testDetailList').map(d => d.objectId);
    setSelectedTestDetailIds(val => [
      ...val.filter(d => !allTestIds.includes(d)),
      ...(e.target.checked ? allTestIds : []),
    ]);
  };

  const checkReport = (e, boxNode) => {
    const checkedIds = boxNode?.testDetailList.map(d => d.objectId) ?? [];
    setSelectedTestDetailIds(val => [
      ...val.filter(d => !checkedIds.includes(d)),
      ...(e.target.checked ? checkedIds : []),
    ]);
  };

  const checkTest = (checked: boolean, value: string) => {
    setSelectedTestDetailIds(val => [
      ...val.filter(d => ![value].includes(d)),
      ...(checked ? [value] : []),
    ]);
  };

  const isNotData = data => {
    if (data.length === 1) {
      return data[0].caseIds.length;
    }

    return data.length;
  };

  return (
    <Spin spinning={curTestListLoading}>
      <>
        <div className={cx('detail-selector-header')}>
          <Checkbox
            disabled={
              getCheckedValue(checkData, ignoreTestDetailIds, 'checked') ||
              !getTestDetailIdsByReport(checkData, 'testDetailList').filter(
                d => !ignoreTestDetailIds.includes(d.objectId),
              ).length
            }
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
            <span className={cx('check-all-title')}>
              已选中
              <span className={cx('num')}> {curSelectIdsLength}</span>
              <span>
                {' / '}
                {
                  getTestDetailIdsByReport(checkData, 'testDetailList').filter(
                    d => !ignoreTestDetailIds.includes(d.objectId),
                  ).length
                }
              </span>
            </span>
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
        <div className={cx('detail-selector-body')}>
          {isNotData(checkData) ? (
            checkData.map(box => (
              <>
                {box.testDetailList.length ? (
                  <div className={cx('detail-list')} key={box.value}>
                    <div className={cx('detail-list-box')}>
                      <Checkbox
                        indeterminate={getReportCheckedValue(
                          box.testDetailList.map(d => d.objectId),
                          [...ignoreTestDetailIds, ...selectedTestDetailIds],
                          'indeterminate',
                        )}
                        checked={getReportCheckedValue(
                          box.testDetailList.map(d => d.objectId),
                          [...ignoreTestDetailIds, ...selectedTestDetailIds],
                          'checked',
                        )}
                        disabled={getReportCheckedValue(
                          box.testDetailList.map(d => d.objectId),
                          ignoreTestDetailIds,
                          'checked',
                        )}
                        onChange={e => checkReport(e, box)}
                      >
                        <Tooltip title={box.path}>
                          <span className={cx('flex-box')}>
                            {box.path !== box.name && (
                              <span className={cx('path')}>
                                {box.path
                                  .split('/')
                                  .slice(0, box.path.split('/').length - 1)
                                  .map((name, index) => (
                                    <span key={index}>
                                      {`${name} `}
                                      {' / '}
                                    </span>
                                  ))}
                              </span>
                            )}
                            <span className={cx('cur-path')}>{box.name}</span>
                          </span>
                        </Tooltip>
                      </Checkbox>
                    </div>
                    <div className={cx('detail-list-group')}>
                      <CheckboxGroup value={[...ignoreTestDetailIds, ...selectedTestDetailIds]}>
                        {box.testDetailList
                          .map(d => ({
                            ...d,
                            disabled: ignoreTestDetailIds?.includes(d.objectId) ?? false,
                          }))
                          .map(box => (
                            <div key={box.value}>
                              <Checkbox
                                disabled={box.disabled}
                                value={box.value}
                                onChange={e => checkTest(e.target.checked, e.target.value)}
                              >
                                <Tooltip title={box.label}>
                                  <span className={cx('group-title')}>{box.label}</span>
                                </Tooltip>
                              </Checkbox>
                            </div>
                          ))}
                      </CheckboxGroup>
                    </div>
                  </div>
                ) : null}
              </>
            ))
          ) : (
            <Empty
              className={cx('empty-test')}
              image={emptyImg}
              description={'当前用例库暂无用例'}
            />
          )}
        </div>
      </>
    </Spin>
  );
};

export default React.memo(TestDetailsSelectorList);
