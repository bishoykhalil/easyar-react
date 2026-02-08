import type { PriceListItemDTO } from '@/services/pricelist';
import {
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import React, { useMemo } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValues?: PriceListItemDTO;
  onFinish: (values: PriceListItemDTO) => Promise<boolean>;
};

const PriceItemForm: React.FC<Props> = ({
  open,
  onOpenChange,
  initialValues,
  onFinish,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  const initialValuesUi = useMemo(() => {
    if (!initialValues) return initialValues;
    const vat = initialValues.vatRate;
    // Backend stores VAT as a fraction (e.g. 0.19). UI accepts whole percent (e.g. 19).
    const vatPercent =
      vat === null || vat === undefined
        ? undefined
        : vat <= 1
        ? vat * 100
        : vat;
    return { ...initialValues, vatRate: vatPercent };
  }, [initialValues]);

  return (
    <ModalForm<PriceListItemDTO>
      title={
        initialValues?.id
          ? t('modal.priceItemEdit', 'Edit Item')
          : t('modal.priceItemNew', 'New Item')
      }
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValuesUi}
      layout="vertical"
      grid
      rowProps={{ gutter: 16 }}
      colProps={{ span: 12 }}
      modalProps={{ destroyOnClose: true }}
      onFinish={async (values) => {
        const vat = values.vatRate;
        const normalizedVat =
          vat === null || vat === undefined ? undefined : Number(vat) / 100;
        return onFinish({ ...values, vatRate: normalizedVat });
      }}
    >
      <ProFormText
        name="name"
        label={t('label.name', 'Name')}
        rules={[
          {
            required: true,
            message: t('message.nameRequired', 'Please enter name'),
          },
        ]}
      />
      <ProFormText
        name="unit"
        label={t('label.unit', 'Unit')}
        placeholder={t('placeholder.unitExample', 'e.g. hour, pc')}
      />
      <ProFormDigit
        name="priceNet"
        label={t('label.netPrice', 'Net Price')}
        min={0}
        fieldProps={{ step: 0.01, prefix: '€' }}
        colProps={{ span: 12 }}
      />
      <ProFormDigit
        name="vatRate"
        label={t('label.vatRate', 'VAT Rate')}
        min={0}
        max={100}
        fieldProps={{ step: 1, precision: 0, addonAfter: '%' }}
        colProps={{ span: 12 }}
        tooltip={t('hint.vatRate', 'Enter VAT as percent (e.g. 19)')}
      />
      <ProFormTextArea
        name="description"
        label={t('label.description', 'Description')}
        colProps={{ span: 24 }}
        fieldProps={{ rows: 3 }}
      />
    </ModalForm>
  );
};

export default PriceItemForm;
