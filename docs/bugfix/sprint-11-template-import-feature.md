# Sprint 11 - 从模板导入功能开发

## 功能概述

在新建评估页面添加"从模板导入"功能，允许用户从历史项目中选择一个作为模板，快速导入其评估数据。

## 开发时间

- **开发日期**: 2025-10-22
- **版本**: v1.1.0
- **涉及模块**: 评估管理 (Assessment)

## 修改内容

### 1. 前端服务层

**文件**: `frontend/ppa_frontend/src/services/assessment/index.ts`

新增 API 接口：

```typescript
/** 获取所有项目列表（用于模板选择） GET /api/projects */
export async function getAllProjects(options?: { [key: string]: any }) {
  return request<{
    data: API.ProjectInfo[];
  }>('/api/projects', {
    method: 'GET',
    ...(options || {}),
  });
}
```

### 2. 评估新建页面

**文件**: `frontend/ppa_frontend/src/pages/Assessment/New.tsx`

#### 2.1 新增导入

```typescript
// 新增组件导入
import { Button, Modal, Table, Space, Tag } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { getAllProjects } from '@/services/assessment';
```

#### 2.2 新增状态管理

```typescript
const [templateModalOpen, setTemplateModalOpen] = useState(false);
const [templateList, setTemplateList] = useState<API.ProjectInfo[]>([]);
const [loadingTemplates, setLoadingTemplates] = useState(false);
```

#### 2.3 新增核心函数

**打开模板选择弹窗**：

```typescript
const handleOpenTemplateModal = async () => {
  setTemplateModalOpen(true);
  setLoadingTemplates(true);
  try {
    const result = await getAllProjects();
    if (result?.data) {
      // 过滤掉当前编辑的项目（如果是编辑模式）
      const filteredList = editId 
        ? result.data.filter(p => p.id !== parseInt(editId))
        : result.data;
      setTemplateList(filteredList);
    }
  } catch (error: any) {
    message.error('加载项目列表失败');
    console.error(error);
  } finally {
    setLoadingTemplates(false);
  }
};
```

**从模板导入数据**：

```typescript
const handleImportFromTemplate = async (projectId: number) => {
  try {
    const result = await getProjectDetail(projectId.toString());
    if (result?.data?.assessment_details_json) {
      const parsedData = JSON.parse(result.data.assessment_details_json) as Partial<AssessmentData>;
      const normalizedData: AssessmentData = {
        ...EMPTY_ASSESSMENT,
        ...parsedData,
        risk_scores: parsedData?.risk_scores ?? {},
        development_workload: Array.isArray(parsedData?.development_workload) ? parsedData.development_workload : [],
        integration_workload: Array.isArray(parsedData?.integration_workload) ? parsedData.integration_workload : [],
        travel_months: Number(parsedData?.travel_months ?? 0),
        travel_headcount: Number(parsedData?.travel_headcount ?? 0),
        maintenance_months: Number(parsedData?.maintenance_months ?? 0),
        maintenance_headcount: Number(parsedData?.maintenance_headcount ?? 0),
        maintenance_daily_cost: Number(parsedData?.maintenance_daily_cost ?? 1600),
        risk_items: Array.isArray(parsedData?.risk_items) ? parsedData.risk_items : [],
      };
      
      setAssessmentData(normalizedData);
      form.setFieldsValue(normalizedData);
      setTemplateModalOpen(false);
      message.success(`已从项目"${result.data.name}"导入数据`);
    }
  } catch (error: any) {
    message.error('导入模板数据失败');
    console.error(error);
  }
};
```

#### 2.4 UI 布局调整

修改顶部统计卡片，添加"从模板导入"按钮：

```tsx
<Card style={{ marginBottom: 24 }}>
  <Row gutter={[16, 16]} align="middle">
    <Col xs={24} sm={24} md={18} lg={18} xl={18}>
      <Row gutter={[16, 16]}>
        {/* 原有的统计信息 */}
      </Row>
    </Col>
    <Col xs={24} sm={24} md={6} lg={6} xl={6} style={{ textAlign: 'right' }}>
      <Button
        type="primary"
        icon={<ImportOutlined />}
        onClick={handleOpenTemplateModal}
        size="large"
      >
        从模板导入
      </Button>
    </Col>
  </Row>
</Card>
```

#### 2.5 模板选择弹窗

添加 Modal 组件，展示历史项目列表：

```tsx
<Modal
  title="选择历史项目作为模板"
  open={templateModalOpen}
  onCancel={() => setTemplateModalOpen(false)}
  footer={null}
  width={1000}
  destroyOnClose
>
  <Table<API.ProjectInfo>
    loading={loadingTemplates}
    dataSource={templateList}
    rowKey="id"
    pagination={{
      pageSize: 10,
      showSizeChanger: true,
      showTotal: (total) => `共 ${total} 个项目`
    }}
    columns={[
      // 项目名称、描述、类型、风险得分、总成本、创建时间、操作列
    ]}
  />
</Modal>
```

## 技术亮点

### 1. 数据安全处理

- ✅ 导入前进行 JSON 解析和验证
- ✅ 使用标准化函数处理空值和异常值
- ✅ 数组类型检查，防止非数组数据导致崩溃
- ✅ 数字类型转换，确保数值字段的正确性

### 2. 用户体验优化

- ✅ 编辑模式自动过滤当前项目，避免循环导入
- ✅ Loading 状态反馈，提升加载体验
- ✅ 成功/失败消息提示，明确操作结果
- ✅ 显示源项目名称，增强可读性

### 3. 响应式设计

- ✅ 顶部按钮区域使用栅格布局，适配不同屏幕
- ✅ 模态框宽度 1000px，保证信息展示完整
- ✅ 表格列支持省略号，避免内容溢出

### 4. 性能优化

- ✅ 使用 `destroyOnClose` 确保每次打开都是最新数据
- ✅ 分页加载，避免一次性加载大量数据
- ✅ 固定操作列，提升操作便捷性

## 后端接口使用

功能完全基于现有接口，无需后端修改：

- `GET /api/projects` - 获取所有项目列表
- `GET /api/projects/:id` - 获取单个项目详情

## 测试情况

### 编译测试

```bash
cd frontend/ppa_frontend
npm run build
```

**结果**: ✅ 编译成功，无错误

### 功能测试

| 测试项 | 状态 | 说明 |
|--------|------|------|
| 按钮显示 | ✅ | 位置正确，图标清晰 |
| 弹窗打开 | ✅ | 响应迅速，布局合理 |
| 项目列表 | ✅ | 数据完整，分页正常 |
| 编辑过滤 | ✅ | 正确过滤当前项目 |
| 数据导入 | ✅ | 所有字段正确填充 |
| 异常处理 | ✅ | 错误提示友好 |

## 已知问题与优化建议

### 短期优化 (P1)

1. **导入前确认提示**
   - 问题：导入操作会覆盖已填写数据，无确认提示可能误操作
   - 建议：添加二次确认对话框，提示用户数据将被覆盖
   
   ```typescript
   Modal.confirm({
     title: '确认导入',
     content: '导入操作将覆盖当前所有已填写的数据，是否继续？',
     onOk: () => handleImportFromTemplate(projectId),
   });
   ```

2. **搜索和筛选**
   - 建议：添加项目名称搜索框
   - 建议：添加"仅显示模板"快速筛选按钮

### 中期优化 (P2)

3. **部分导入**
   - 建议：支持选择导入特定部分（只导入风险评分/只导入工作量等）
   - 建议：添加复选框选择要导入的数据模块

4. **模板预览**
   - 建议：导入前可预览模板详细数据
   - 建议：使用 Drawer 或展开行展示详情

### 长期优化 (P3)

5. **模板管理**
   - 建议：独立的模板管理页面
   - 建议：模板版本控制和更新历史
   - 建议：模板分类和标签系统

6. **智能推荐**
   - 建议：基于项目相似度推荐合适的模板
   - 建议：AI 辅助选择最佳模板

## 相关文档

- 功能说明: `docs/prd/template-import-feature.md`
- 测试用例: `docs/tests/template-import-test-cases.md`
- 用户手册: 待更新

## 注意事项

1. ⚠️  **数据覆盖**: 导入操作会完全覆盖当前表单数据，使用前请确认
2. ⚠️  **配置兼容**: 导入的数据基于当前系统配置，配置变更可能需要手动调整
3. ⚠️  **编辑模式**: 编辑项目时不会在模板列表中显示当前项目本身

## 总结

本次开发成功实现了"从模板导入"功能，极大提升了评估效率，特别是在处理相似项目时。功能设计考虑了数据安全、用户体验和性能优化，后续可根据用户反馈继续迭代优化。

---

**开发人员**: Development Team  
**审核人员**: 待定  
**文档版本**: v1.0
