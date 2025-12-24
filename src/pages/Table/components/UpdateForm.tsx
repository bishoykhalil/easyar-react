import {
  ProFormDateTimePicker,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  StepsForm,
} from '@ant-design/pro-components';
import { Modal } from 'antd';
import React from 'react';

export interface FormValueType extends Partial<API.UserInfo> {
  target?: string;
  template?: string;
  type?: string;
  time?: string;
  frequency?: string;
}

export interface UpdateFormProps {
  onCancel: (flag?: boolean, formVals?: FormValueType) => void;
  onSubmit: (values: FormValueType) => Promise<void>;
  updateModalVisible: boolean;
  values: Partial<API.UserInfo>;
}

const UpdateForm: React.FC<UpdateFormProps> = (props) => (
  <StepsForm
    stepsProps={{
      size: 'small',
    }}
    stepsFormRender={(dom, submitter) => {
      return (
        <Modal
          width={640}
          bodyStyle={{ padding: '32px 40px 48px' }}
          destroyOnClose
          title="Rule Configuration"
          open={props.updateModalVisible}
          footer={submitter}
          onCancel={() => props.onCancel()}
        >
          {dom}
        </Modal>
      );
    }}
    onFinish={props.onSubmit}
  >
    <StepsForm.StepForm
      initialValues={{
        name: props.values.name,
        nickName: props.values.nickName,
      }}
      title="Basic Info"
    >
      <ProFormText
        width="md"
        name="name"
        label="Rule Name"
        rules={[{ required: true, message: 'Please enter rule name' }]}
      />
      <ProFormTextArea
        name="desc"
        width="md"
        label="Rule Description"
        placeholder="Enter at least five characters"
        rules={[
          {
            required: true,
            message: 'Enter a description of at least five characters',
            min: 5,
          },
        ]}
      />
    </StepsForm.StepForm>
    <StepsForm.StepForm
      initialValues={{
        target: '0',
        template: '0',
      }}
      title="Configure Rule Properties"
    >
      <ProFormSelect
        width="md"
        name="target"
        label="Monitoring Object"
        valueEnum={{
          0: 'Table 1',
          1: 'Table 2',
        }}
      />
      <ProFormSelect
        width="md"
        name="template"
        label="Rule Template"
        valueEnum={{
          0: 'Rule Template 1',
          1: 'Rule Template 2',
        }}
      />
      <ProFormRadio.Group
        name="type"
        width="md"
        label="Rule Type"
        options={[
          {
            value: '0',
            label: 'Strong',
          },
          {
            value: '1',
            label: 'Weak',
          },
        ]}
      />
    </StepsForm.StepForm>
    <StepsForm.StepForm
      initialValues={{
        type: '1',
        frequency: 'month',
      }}
      title="Set Schedule"
    >
      <ProFormDateTimePicker
        name="time"
        label="Start Time"
        rules={[{ required: true, message: 'Please select start time' }]}
      />
      <ProFormSelect
        name="frequency"
        label="Frequency"
        width="xs"
        valueEnum={{
          month: 'Month',
          week: 'Week',
        }}
      />
    </StepsForm.StepForm>
  </StepsForm>
);

export default UpdateForm;
