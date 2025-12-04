import { Modal, Tag, Timeline } from 'antd';
import React, { useState } from 'react';
import changelog from '../../../changelog.json';

interface ChangeItem {
  type: string;
  content: string;
}

interface VersionLog {
  version: string;
  date: string;
  changes: ChangeItem[];
}

interface VersionModalProps {
  children: React.ReactElement;
}

export const VersionModal: React.FC<VersionModalProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const getTagColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'feat':
        return 'blue';
      case 'bugfix':
        return 'red';
      case 'opt':
        return 'green';
      default:
        return 'default';
    }
  };

  const renderContent = () => {
    return (
      <Timeline
        items={(changelog as VersionLog[]).map((item) => ({
          children: (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                {item.version} <span style={{ color: '#999', fontWeight: 'normal', fontSize: '12px', marginLeft: 8 }}>{item.date}</span>
              </div>
              <div>
                {item.changes.map((change, index) => (
                  <div key={index} style={{ marginBottom: 4 }}>
                    <Tag color={getTagColor(change.type)}>{change.type}</Tag>
                    <span>{change.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        }))}
      />
    );
  };

  return (
    <>
      <div onClick={showModal} style={{ display: 'inline-block', cursor: 'pointer' }}>
        {children}
      </div>
      <Modal
        title="版本更新记录"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <div style={{ marginTop: 24, maxHeight: '60vh', overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </Modal>
    </>
  );
};
