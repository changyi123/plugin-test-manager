import { Popover, Typography } from 'antd/lib';
import { TestType } from 'common/constant';
import React, { cloneElement, isValidElement, PropsWithChildren, useMemo } from 'react';

import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey, isInOne } from '@/lib/utils/helper';

const { Link } = Typography;

const Content: React.FC = () => {
  const tenant = getTenantKey();
  const basePath = getProximaBasePath();
  const { t } = useI18n();
  const url = useMemo(() => {
    const searchParams = new URLSearchParams('selectKey=TestConfigInitialization').toString();
    return isInOne()
      ? `/${tenant}/_settings/proxima/system/settings/plugin/test_manager_test-config?${searchParams}`
      : `${basePath}/${tenant}/settings/plugin/test_manager_test-config?${searchParams}`;
  }, [basePath, tenant]);
  return (
    <div style={{ maxWidth: '600px' }}>
      {t('common.createPermissionTip')}
      <Link href={url} target="_blank">
        {t('page.config.testConfigInitialization.title')}
      </Link>
    </div>
  );
};

const CreatePermission: React.FC<PropsWithChildren<{ type: TestType }>> = props => {
  const { config } = useTestConfig();
  const { getCreatePermission } = useBaseAction();
  const { children, type } = props;
  const hasTestType = useMemo(() => config?.itemTypeMap?.[type], [config, type]);
  const disabled = useMemo(() => getCreatePermission(type), [getCreatePermission, type]);
  if (disabled && hasTestType) return null;
  if (!disabled) return <>{children}</>;
  return (
    <Popover content={Content} trigger="hover" arrow={false}>
      <>{isValidElement(children) ? cloneElement(children, { disabled } as unknown) : children}</>
    </Popover>
  );
};

export default CreatePermission;
