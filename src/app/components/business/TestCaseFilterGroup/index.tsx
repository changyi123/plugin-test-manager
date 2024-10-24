/* eslint-disable react-hooks/exhaustive-deps */
import { useDebounce, useRequest } from 'ahooks';
import { Dropdown, Empty, Form, Input, Menu, message, Modal, Radio, Space, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import FilterSearch from '@/components/common/FilterSearch';
import { getFilterFields } from '@/components/common/FilterSearch/utils';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { CustomMore, DropDown } from '@/icons';
import AddFilterIcon from '@/icons/svg/add-filter.svg';
import emptyImg from '@/icons/svg/empty-data.png';
import QuestionIcon from '@/icons/svg/question.svg';
import { checkFilterGroupName, getCaseViewFilter } from '@/lib/api/case';
import { useCurrentUser } from '@/lib/api/user';
import { getExtendFields, RepositoryModel, TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import Parse from '@/lib/parse';
import { getRootContainer } from '@/lib/utils/helper';
import { FilterGroup } from '@/services/models';

import SearchInput from '../SearchInput';
import cx from './index.less';

const ViewModal = ({
  loading,
  modalVisible,
  initialValues,
  handleSubmit,
  handleCloseModal,
  workspaceKey,
}) => {
  const { t } = useI18n();
  const [form] = Form.useForm();

  const { testCaseFieldKeys } = useBaseAction();

  const title = useMemo(() => {
    return initialValues?.objectId
      ? t('page.repository.view.filterGroup.modal.editTitle')
      : t('page.repository.view.filterGroup.modal.addTitle');
  }, [initialValues, t]);

  // 处理筛选器搜索
  const handleSelectorSearch = async selectors => {
    const selector = selectors?.[0];
    form.setFieldValue('selector', selector ? selector : null);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      handleSubmit(Object.assign(initialValues, values));
    } catch (error) {
      console.info('validateFields-error', error);
    }
  };

  const checkNameUniq = async name => {
    const isExist = await checkFilterGroupName({
      name,
      workspaceKey,
      currentId: initialValues?.objectId,
    });

    console.info('isExist', isExist);

    if (isExist) {
      return Promise.reject(t('page.repository.view.filterGroup.modal.nameDuplicate'));
    }
  };

  const nameValidator = async (validator, value) => {
    if (!value) return;
    if (!/^\S(.*\S)?$/.test(value)) {
      return Promise.reject(t('page.repository.view.filterGroup.modal.nameVerifySpace'));
    }

    return checkNameUniq(value);
  };

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues]);

  return (
    <Modal
      confirmLoading={loading}
      maskClosable={false}
      destroyOnClose
      title={
        <div className={cx('title-wrapper')}>
          {title}
          <Tooltip
            getPopupContainer={getRootContainer}
            title={t('page.repository.view.filterGroup.modal.tip')}
          >
            <QuestionIcon style={{ marginLeft: 6 }} className={cx('tip-icon')} />
          </Tooltip>
        </div>
      }
      open={modalVisible}
      onOk={onSubmit}
      onCancel={handleCloseModal}
    >
      <Form
        form={form}
        initialValues={initialValues}
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label={t('page.repository.view.filterGroup.modal.name')}
          validateTrigger="onBlur"
          rules={[
            {
              required: true,
              type: 'string',
              whitespace: true,
              message: t('page.repository.view.filterGroup.modal.namePlaceholder'),
            },
            {
              type: 'string',
              min: 1,
              max: 32,
              message: t('validate.nameLength', {
                min: 1,
                max: 32,
              }),
            },
            { validator: nameValidator },
          ]}
        >
          <Input
            placeholder={t('page.repository.view.filterGroup.modal.namePlaceholder')}
            maxLength={32}
          />
        </Form.Item>
        <Form.Item
          name="selector"
          label={t('page.repository.view.filterGroup.modal.filterCondition')}
        >
          <FilterSearch
            className={cx('filter-search-box')}
            onSearch={handleSelectorSearch}
            fields={getFilterFields([].concat(SystemFieldKeys, testCaseFieldKeys))}
            extendFields={getExtendFields(t)?.filter(field => field.key === RepositoryModel)}
            testType={TestType.Case}
            hiddenSearchInput
            initSelector={initialValues?.selector}
            filterId="filter-group-btn"
            storageKey="filter-group-selector"
            selectTagId="filter-group-search-selector"
          />
        </Form.Item>

        <Form.Item
          required
          name="permissionType"
          label={t('page.repository.view.filterGroup.modal.permission')}
        >
          <Radio.Group>
            <Space direction="vertical">
              <Radio value={1}>
                {t('page.repository.view.filterGroup.modal.publicPermission')}
                <span className={cx('permission-desc')}>
                  （{t('page.repository.view.filterGroup.modal.publicPermissionTip')}）
                </span>
              </Radio>
              <Radio value={2}>
                {t('page.repository.view.filterGroup.modal.privatePermission')}
                <span className={cx('permission-desc')}>
                  （{t('page.repository.view.filterGroup.modal.privatePermissionTip')}）
                </span>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const TestPlanSelector: React.FC<{
  selectFilterView: any;
  setSelectFilterView: any;
  workspaceKey: string;
}> = ({ selectFilterView, setSelectFilterView, workspaceKey }) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState();
  const { data: currentUser } = useCurrentUser();

  const searchValue = useDebounce(search, { wait: 500 });

  const { data, refresh } = useRequest(
    async () => {
      if (!workspaceKey || !currentUser?.id) return [];

      const isAdmin = (currentUser as any)?.isAdmin;

      console.info('--isAdmin', isAdmin, currentUser);

      const list = await getCaseViewFilter(workspaceKey, searchValue, currentUser);

      list.forEach(item => {
        if (!isAdmin && item.createdBy?.object !== currentUser.id) {
          item.disabled = true;
        }
      });
      list.unshift({ name: t('page.repository.view.filterGroup.defaultName'), disabled: true });
      return list;
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [searchValue, workspaceKey, currentUser?.id],
    },
  );

  const handleClick = filterView => {
    setSelectFilterView(filterView);
    setOpen(false);
  };

  const add = () => {
    setInitialValues({ permissionType: 1, name: '', selector: null, workspaceKey } as any);
    setModalVisible(true);
  };

  const handleSubmit = async values => {
    try {
      setLoading(true);

      let view;
      const obj: any = {};

      const isCreate = !values.objectId;
      if (isCreate) {
        view = new FilterGroup({ objectId: values.objectId });
        obj.updatedBy = Parse.User.createWithoutData(currentUser.id);
      } else {
        view = new FilterGroup();
        obj.createdBy = Parse.User.createWithoutData(currentUser.id);
      }

      const { name, selector, permissionType } = values;

      const result = await view.save({ name, permissionType, selector, workspaceKey, ...obj });

      message.success(
        t(`page.repository.view.filterGroup.modal.${isCreate ? 'addSuccess' : 'editSuccess'}`),
      );

      setModalVisible(false);
      refresh();

      if (isCreate) {
        setSelectFilterView(result.toJSON());
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleMenuClick = ({ item, key, keyPath, domEvent }, view) => {
    console.info({ item, key, keyPath, domEvent }, view);
    domEvent.stopPropagation();

    if (key === 'edit') {
      editFilterView(view);
    } else {
      deleteFilterView(view);
    }
  };

  const editFilterView = async view => {
    setOpen(false);

    setModalVisible(true);
    setInitialValues(view);
  };

  const deleteFilterView = async view => {
    Modal.confirm({
      title: t('page.repository.view.filterGroup.dropdown.deleteTitle'),
      content: `${t('page.repository.view.filterGroup.dropdown.deleteContent')}?`,
      okType: 'danger',
      onOk: async () => {
        try {
          const object = new FilterGroup({ objectId: view.objectId });
          await object.destroy();
          message.success(t('common.deleteSuccess'));
          refresh();
          if (selectFilterView?.objectId === view.objectId) {
            setSelectFilterView();
          }
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

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
            placeholder={t('components.business.testPlanSelector.placeholder')}
            onChange={value => setSearch(value)}
          />
        </div>
        <div className={cx('view-list')}>
          {data?.length ? (
            data.map((d, index) => (
              <div
                className={cx(
                  'view-item',
                  `${d.objectId === selectFilterView?.objectId ? 'actived' : ''}`,
                )}
                key={`${d.objectId}_${index}`}
                onClick={() => handleClick(d)}
              >
                <div className={cx('view-name')}>
                  <Tooltip
                    placement="topLeft"
                    title={d?.name ?? ''}
                    overlayClassName="global_arrow_tooltip_overflow"
                  >
                    {d?.name}
                  </Tooltip>
                </div>
                {!d.disabled && (
                  <Dropdown
                    dropdownRender={() => {
                      return (
                        <Menu onClick={e => handleMenuClick(e, d)}>
                          <Menu.Item key="edit">{t('common.editor')}</Menu.Item>
                          <Menu.Item key="delete" danger>
                            {t('common.delete')}
                          </Menu.Item>
                        </Menu>
                      );
                    }}
                  >
                    <CustomMore
                      title=""
                      alt=""
                      onClick={e => e.stopPropagation()}
                      className={cx('view-actions')}
                    />
                  </Dropdown>
                )}
              </div>
            ))
          ) : (
            <Empty
              description={t('components.business.testPlanSelector.desc')}
              image={emptyImg}
              imageStyle={{
                height: 70,
                width: '100%',
                padding: '8px 0',
              }}
            ></Empty>
          )}
        </div>
        <div
          className={cx('add-filter')}
          onClick={() => {
            setOpen(false);
            add();
          }}
        >
          <AddFilterIcon className={cx('add-filter-icon')} />
          {t('page.repository.view.filterGroup.dropdown.addFilter')}
        </div>
      </div>
    );
  }, [data, search, selectFilterView?.objectId]);

  return (
    <div className={cx('filter-selector-container')}>
      <Dropdown
        trigger={['click']}
        dropdownRender={menu}
        autoAdjustOverflow
        onOpenChange={open => setOpen(open)}
        open={open}
        destroyPopupOnHide
      >
        <div className={cx('title')}>
          <OverflowTooltip
            title={selectFilterView?.name ?? ''}
            placement="topLeft"
            overlayClassName="global_arrow_tooltip_overflow"
          >
            <span className={cx('name')}>
              {selectFilterView?.name ?? t('page.repository.view.filterGroup.defaultName')}
            </span>
          </OverflowTooltip>
          <DropDown className={cx('icon')}></DropDown>
        </div>
      </Dropdown>
      <ViewModal
        loading={loading}
        modalVisible={modalVisible}
        initialValues={initialValues}
        handleSubmit={handleSubmit}
        handleCloseModal={handleCloseModal}
        workspaceKey={workspaceKey}
      />
    </div>
  );
};

export default TestPlanSelector;
