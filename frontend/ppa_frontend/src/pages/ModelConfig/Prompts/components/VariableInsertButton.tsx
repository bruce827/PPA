import type { PromptVariable } from '@/services/promptTemplate';
import { PlusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Button, Dropdown, Empty, Input } from 'antd';
import React, { useState } from 'react';

interface VariableInsertButtonProps {
  variables: PromptVariable[];
  onInsert: (variableName: string) => void;
  disabled?: boolean;
}

const VariableInsertButton: React.FC<VariableInsertButtonProps> = ({
  variables,
  onInsert,
  disabled = false,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredVariables = variables.filter(
    (v) =>
      v.name.toLowerCase().includes(searchText.toLowerCase()) ||
      v.description.toLowerCase().includes(searchText.toLowerCase()),
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'search',
      label: (
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索变量"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...(filteredVariables.length > 0
      ? filteredVariables.map((v) => ({
          key: v.name,
          label: (
            <div>
              <strong>{`{{${v.name}}}`}</strong> - {v.description}
            </div>
          ),
          onClick: () => {
            onInsert(v.name);
            setSearchText('');
          },
        }))
      : [
          {
            key: 'empty',
            label: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="无匹配变量"
              />
            ),
            disabled: true,
          },
        ]),
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      disabled={disabled || variables.length === 0}
    >
      <Button
        icon={<PlusCircleOutlined />}
        disabled={disabled || variables.length === 0}
      >
        插入变量
      </Button>
    </Dropdown>
  );
};

export default VariableInsertButton;
