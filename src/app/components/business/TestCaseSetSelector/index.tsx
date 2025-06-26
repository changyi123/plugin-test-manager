/* eslint-disable react-hooks/exhaustive-deps */
import { useDebounce, useRequest } from 'ahooks';
import { Dropdown, Empty, Tooltip } from 'antd';
import _ from 'lodash';
import React, { useCallback, useState } from 'react';

import { DropDown } from '@/icons';
import emptyImg from '@/icons/svg/empty-data.png';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { usePageContext } from '@/pages/caseset/components/hook';

import SearchInput from '../SearchInput';
import cx from './index.less';

const TestCaseSelector: React.FC<{ hiddenCheckAll?: boolean }> = ({ hiddenCheckAll }) => {
  const { t } = useI18n();
  const { workspaceKey, selectedTestCaseSet, setTestCaseSet } = usePageContext();
  const [search, setSearch] = useState('');

  const searchValue = useDebounce(search, { wait: 500 });

  const { data } = useRequest(
    async () => {
      if (!workspaceKey) return [];

      const { list } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.CaseSet,
          name: searchValue,
        },
        select: ['id', 'name', 'key'],
        limit: 100,
      });

      const testcaseList = _.chain(list)
        .map(testset => {
          return {
            ...testset,
            status: testset.workflowStatus,
          };
        })
        .value();

      const data = hiddenCheckAll
        ? [
            {
              name: t('components.business.testCaseSetSelector.checkAllTestCaseSet'),
            },
            ...testcaseList,
          ]
        : testcaseList;

      return data;
    },
    {
      refreshDeps: [searchValue, workspaceKey],
    },
  );
  const handleClick = useCallback(caseset => {
    setTestCaseSet({
      ...caseset,
      objectId: caseset.id,
    });
  }, []);

  const menu = useCallback(() => {
    return (
      <div className={cx('selector-box')}>
        <div
          className={cx('search-box')}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <SearchInput
            showInput
            value={search}
            allowClear
            placeholder={t('components.business.testCaseSetSelector.placeholder')}
            onChange={value => setSearch(value)}
          />
        </div>
        <div className={cx('selector-list')}>
          {data?.length ? (
            data.map((d, index) => (
              <div
                className={cx(
                  'plan-name',
                  `${d.id === selectedTestCaseSet?.objectId ? 'actived' : ''}`,
                )}
                key={`${d.id}_${index}`}
                onClick={() => handleClick(d)}
              >
                <Tooltip
                  placement="topLeft"
                  title={d?.name ?? ''}
                  overlayClassName="global_arrow_tooltip_overflow"
                >
                  {d?.name}
                </Tooltip>
              </div>
            ))
          ) : (
            <Empty
              description={t('components.business.testCaseSetSelector.desc')}
              image={emptyImg}
              imageStyle={{
                height: 70,
                width: '100%',
                padding: '8px 0',
              }}
            ></Empty>
          )}
        </div>
        {!hiddenCheckAll && (
          <div
            className={cx('check-all')}
            onClick={() => {
              setTestCaseSet(undefined);
            }}
          >
            {t('components.business.testCaseSetSelector.checkAllTestCaseSet')}
          </div>
        )}
      </div>
    );
  }, [data, search, selectedTestCaseSet?.objectId]);

  return (
    <div className={cx('test-case-set-selector-container')}>
      <Dropdown trigger={['click']} dropdownRender={menu} autoAdjustOverflow>
        <div className={cx('title')}>
          <Tooltip
            title={selectedTestCaseSet?.name ?? ''}
            placement="topLeft"
            overlayClassName="global_arrow_tooltip_overflow"
          >
            <span className={cx('name')}>
              {selectedTestCaseSet?.name ??
                t('components.business.testCaseSetSelector.checkAllTestCaseSet')}
            </span>
          </Tooltip>
          <DropDown className={cx('icon')}>{''}</DropDown>
        </div>
      </Dropdown>
    </div>
  );
};

export default TestCaseSelector;
