// 运行时配置
import { VersionModal } from '@/components/VersionModal';
import { App } from 'antd';
import React from 'react';
import logo from './assets/logo.svg';
import version from './assets/version.svg';

// 全局初始化数据配置,用于 Layout 用户信息和权限初始化
// 更多信息见文档:https://umijs.org/docs/api/runtime-config#getinitialstate
// export async function getInitialState(): Promise<{ name: string }> {
//   return { name: 'V1.0.0-alpha' };
// }

export const layout = () => {
  return {
    logo,
    menu: {
      locale: false,
    },
    siderFooter: (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <img
          src={version}
          alt="version icon"
          style={{ width: '32px', height: '32px' }}
        />
      </div>
    ),
    menuFooterRender: () => (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 0',
          cursor: 'pointer',
        }}
      >
        <VersionModal>
          <img
            src={version}
            alt="version icon"
            style={{
              width: '14px',
              height: '14px',
              marginRight: '8px',
            }}
          />
          <span>{app_version}</span>
        </VersionModal>
      </div>
    ),

    // avatarProps:{
    //       src: 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
    //       title: '七妮妮',
    //       size: 'small',
    // },
    avatarProps: false,
    // actionsRender:()=>[1,2,3]
  };
};

// 使用 antd App 包裹根容器，提供上下文以支持 message/notification/modal 动态主题
export function rootContainer(container: React.ReactNode) {
  return <App>{container}</App>;
}

// 过滤特定的控制台警告信息
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  // 过滤 findDOMNode 相关的错误和警告
  console.error = (...args: any[]) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('findDOMNode')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('findDOMNode')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}
