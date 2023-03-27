/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, Empty, Select, Spin, Tooltip } from 'antd';
import { useRequest, useUpdateEffect } from 'ahooks';
import emptyImg from '@/icons/svg/empty-data.png';
import cx from './TestDetailsSelectorList.less';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import { FieldKey } from 'common/types/api';
import { SearchSelectors } from '@/lib/utils/iql';
import useI18n from '@/lib/hooks/useI18n';
import { getRepositoryQuery } from '@/lib/utils/tree';
import VirtualScrollList from './virtualScrollList';

interface TestDetailsSelectorListProps {
  workspaceKey?: string;
  selectedNode?: any;
  selectors?: string | SearchSelectors;
  ignoreTestDetailIds?: string[];
  selectedTestDetailIds?: string[];
  setSelectedTestDetailIds?: (val: any) => void;
  treeType?: string;
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

const TestDetailsSelectorList: React.FC<TestDetailsSelectorListProps> = ({
  workspaceKey,
  selectedNode,
  selectors,
  ignoreTestDetailIds,
  selectedTestDetailIds,
  setSelectedTestDetailIds,
  treeType,
}) => {
  const { t } = useI18n();
  const CheckboxGroup = Checkbox.Group;
  const [checkData, setCheckData] = useState([]);
  const [showType, setShowType] = useState('all');
  const [orderByCratedAt, setOrderByCratedAt] = useState<'asc' | 'desc'>('asc');
  const searchName = useMemo(() => (selectors?.[0] as any)?.name?.value, [selectors]);

  const curSelectIdsLength = useMemo(
    () =>
      getTestDetailIdsByReport(checkData, 'testDetailList')
        .filter(d => !ignoreTestDetailIds.includes(d.objectId))
        .filter(d => selectedTestDetailIds.includes(d.objectId)).length,
    [selectedTestDetailIds, checkData],
  );

  // 查询当前用例库下所有测试用例
  const {
    data: testCaseList = [],
    loading: testCaseListLoading,
    refresh,
  } = useRequest(
    async () => {
      if (!workspaceKey) return;
      const baseQueryOptions: {
        ascending?: FieldKey[];
        descending?: FieldKey[];
      } =
        orderByCratedAt === 'asc'
          ? {
              ascending: ['sortIndex', 'createdAt'],
            }
          : {
              descending: ['sortIndex', 'createdAt'],
            };
      const repository = getRepositoryQuery(selectedNode, showType);
      const { list: data } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          ...repository,
        },
        ...baseQueryOptions,
        limit: 9999,
        select: ['id', 'name', 'repository'],
        selector: selectors,
      });

      return data;
    },
    {
      refreshDeps: [workspaceKey, searchName, selectedNode, showType, orderByCratedAt],
      cacheKey: `Repository_${
        selectedNode?.key ?? ''
      }_${searchName}_${orderByCratedAt}${workspaceKey}`,
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  // const caseIds = testCaseList?.map(d => d.id);

  useUpdateEffect(() => {
    // if (treeType) {
    //   refresh();
    //   setSelectedTestDetailIds([]);
    // }
  }, [treeType]);

  useEffect(() => {
    if (!testCaseListLoading) {
      if (!testCaseList.length) return setCheckData([]);
      const reportData = getReportData(
        showType === 'current'
          ? {
              ...selectedNode,
              children: [],
            }
          : selectedNode,
        ignoreTestDetailIds,
      );

      // const _checkData = reportData.map(report => ({
      //   ...report,
      //   // testDetailList: testCaseList.filter(d => report.caseIds.includes(d.id)) ?? [],
      // }));

      setCheckData(reportData);
    }
  }, [testCaseListLoading, showType, ignoreTestDetailIds]);

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
    // if (data.length === 1) {
    //   return data[0].caseIds.length;
    // }

    return !data?.length;
  };

  // return <VirtualScrollList group={[selectedNode].filter(Boolean)} item={testCaseList} />;

  return (
    <Spin spinning={testCaseListLoading}>
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
              {t('common.checked')}
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
              style={{ width: 165 }}
              value={showType}
              options={[
                {
                  value: 'all',
                  label: t('page.plan.planPageLayout.right.showChild'),
                },
                {
                  value: 'current',
                  label: t('page.plan.planPageLayout.right.showCur'),
                },
              ]}
              getPopupContainer={e => e.parentNode}
              onChange={val => setShowType(val)}
            ></Select>
            <Tooltip title={t('components.business.testEntitySelectorModal.addTimeSort')}>
              <span
                className={cx('action')}
                onClick={() => {
                  setOrderByCratedAt(val => (val === 'asc' ? 'desc' : 'asc'));
                }}
              >
                <span>
                  {orderByCratedAt === 'asc'
                    ? t('components.business.testEntitySelectorModal.earliest')
                    : t('components.business.testEntitySelectorModal.latest')}
                </span>
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
              description={t('components.business.testEntitySelectorModal.notHaveCase')}
            />
          )}
        </div>
      </>
    </Spin>
  );
};

export default React.memo(TestDetailsSelectorList);
