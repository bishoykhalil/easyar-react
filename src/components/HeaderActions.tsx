import { getLocale, setLocale, useIntl } from '@umijs/max';
import { Button, Select, Space, Tooltip } from 'antd';
import React from 'react';

type Props = {
  onLogout: () => void;
};

const HeaderActions: React.FC<Props> = ({ onLogout }) => {
  const intl = useIntl();
  const current = getLocale();
  const options = [
    {
      value: 'en-US',
      label: intl.formatMessage({ id: 'settings.language.en' }),
    },
    {
      value: 'de-DE',
      label: intl.formatMessage({ id: 'settings.language.de' }),
    },
  ];

  return (
    <Space size={12}>
      <Tooltip title={intl.formatMessage({ id: 'layout.language' })}>
        <Select
          size="small"
          value={current}
          options={options}
          onChange={(val) => setLocale(val, false)}
          style={{ minWidth: 120 }}
        />
      </Tooltip>
      <Button type="link" onClick={onLogout}>
        {intl.formatMessage({ id: 'layout.logout' })}
      </Button>
    </Space>
  );
};

export default HeaderActions;
