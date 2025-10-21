
# Sprint #1 问题报告：处理 `findDOMNode is deprecated` 警告

## 1. 问题描述

在 Sprint #1 完成前后端框架搭建和联调后，启动前端开发服务器 (`yarn start`)，浏览器控制台会出现以下警告信息：

```
Warning: findDOMNode is deprecated and will be removed in the next major release...
```

此警告源于 `antd` 或 `@ant-design/pro-components` 中的某些组件（如 `Tooltip`）在 React 18 的严格模式下使用了不被推荐的 `findDOMNode` API。

该警告不影响应用正常运行，但会对开发过程中的控制台输出造成干扰。

## 2. 失败的解决方案尝试

为了屏蔽此警告，进行了多次尝试，但均因与当前项目使用的 UmiJS v4+ 版本的配置方案不兼容而失败。

*   **尝试 1: 修改 `.umirc.ts` 添加 `react-strict-mode: false`**
    *   **结果:** 失败。UmiJS 抛出 `Invalid config keys: react-strict-mode` 错误。

*   **尝试 2: 修改 `.umirc.ts` 添加 `strictMode: { react: false }`**
    *   **结果:** 失败。UmiJS 抛出 `Invalid config keys: strictMode` 错误。

*   **尝试 3: 修改 `.umirc.ts` 添加 `chainWebpack` 和 `IgnorePlugin`**
    *   **结果:** 失败。此方案思路错误，`IgnorePlugin` 用于在打包时忽略文件模块，而不是屏蔽运行时警告。

*   **尝试 4: 修改 `.umirc.ts` 添加 `stats.warningsFilter`**
    *   **结果:** 失败。UmiJS 抛出 `Invalid config keys: stats` 错误。

*   **尝试 5: 寻找并修改 `src/app.tsx`**
    *   **结果:** 失败。Ant Design Pro 脚手架默认未生成此文件，无法通过移除 `<React.StrictMode>` 标签来解决。

## 3. 最终决策与临时方案 (Workaround)

鉴于 UmiJS v4+ 对配置的严格校验以及默认强制开启严格模式，所有通过修改配置来屏蔽警告的尝试均告失败。

**最终决策：**

1.  **接受现状**：将该警告视为开发环境下的已知、无害问题。
2.  **恢复配置**：撤销所有对 `.umirc.ts` 的相关修改，确保项目可稳定启动。
3.  **继续开发**：不再将解决此警告作为阻塞性任务，继续推进后续功能模块的开发。

此问题留待未来 Ant Design 或 UmiJS 版本更新，或在项目后期有专门优化需求时再行审视。
