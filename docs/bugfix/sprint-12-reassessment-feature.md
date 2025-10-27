# Sprint 12: 重新评估功能实现

## 修改时间
2025年10月22日

## 需求背景
- 历史项目不允许直接编辑
- 用户希望以现有项目为基础创建新的评估项目
- 将"编辑"改为"重新评估"，语义更符合业务场景

## 业务规则
1. **历史项目只读**：所有已保存的项目不允许修改
2. **重新评估**：可以基于任何历史项目创建新项目
3. **模板导入**：重新评估功能与"从模板导入"功能相同，都是导入数据后创建新项目

## 修改内容

### 1. 详情页按钮修改 (`Detail.tsx`)

**修改前**：
```tsx
<Button key="edit" type="primary" onClick={() => history.push(`/assessment/new?edit_id=${project.id}`)}>
  编辑
</Button>
```

**修改后**：
```tsx
<Button 
  key="reassess" 
  type="primary" 
  onClick={() => history.push(`/assessment/new?template_id=${project.id}`)}
>
  重新评估
</Button>
```

### 2. 历史项目列表操作栏修改 (`History.tsx`)

**修改前**：
```tsx
<Link key="edit" to={`/assessment/new?edit_id=${record.id}`}>编辑</Link>
```

**修改后**：
```tsx
<Link key="reassess" to={`/assessment/new?template_id=${record.id}`}>重新评估</Link>
```

### 3. 新建评估页面参数修改 (`New.tsx`)

**修改前**：
- 使用 `edit_id` 参数加载项目进行编辑
- 过滤模板列表时排除当前编辑的项目

**修改后**：
- 使用 `template_id` 参数加载项目作为模板
- 加载成功后显示提示信息：`已导入项目"xxx"的数据作为模板`
- 移除模板列表过滤逻辑

**关键代码**：
```tsx
const NewAssessmentPage = () => {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template_id'); // 用于重新评估

  useEffect(() => {
    const loadInitialData = async () => {
      // ...
      if (templateId) {
        const projectResult = await getProjectDetail(templateId);
        // 加载并规范化数据
        message.success(`已导入项目"${projectResult.data.name}"的数据作为模板`);
      }
    };
    loadInitialData();
  }, [templateId, form]);
}
```

## 用户使用流程

### 场景一：从详情页重新评估
1. 用户访问历史项目详情页
2. 点击"重新评估"按钮
3. 跳转到新建评估页面，自动导入该项目的所有数据
4. 显示提示信息："已导入项目"xxx"的数据作为模板"
5. 用户可以修改数据并保存为新项目

### 场景二：从模板选择弹窗导入
1. 用户在新建评估页面点击"从模板导入"
2. 从列表中选择项目
3. 点击"导入"
4. 自动填充所有评估数据
5. 用户可以修改数据并保存为新项目

## 技术实现细节

### URL 参数
- `template_id`: 用于重新评估功能，从详情页跳转时携带
- 移除了 `edit_id` 参数（不再支持编辑功能）

### 数据处理
1. **加载数据**：通过 `getProjectDetail(template_id)` 获取项目详情
2. **解析 JSON**：将 `assessment_details_json` 解析为对象
3. **数据规范化**：确保所有字段类型正确
4. **表单填充**：通过 `form.setFieldsValue()` 自动填充表单

### 用户提示
- 成功导入：显示绿色 success 消息提示
- 解析失败：显示红色 error 消息提示，并加载空表单

## 测试要点

### 功能测试
- [ ] 详情页显示"重新评估"按钮（而非"编辑"）
- [ ] 历史项目列表操作栏显示"重新评估"（而非"编辑"）
- [ ] 点击"重新评估"跳转到新建评估页面
- [ ] 所有评估数据正确导入
- [ ] 显示导入成功提示消息
- [ ] 可以修改导入的数据
- [ ] 保存后创建新项目（不覆盖原项目）

### 边界测试
- [ ] 导入数据为空时的处理
- [ ] 导入数据格式错误时的处理
- [ ] 网络请求失败的错误处理

### 用户体验
- [ ] 加载时显示 Loading 状态
- [ ] 成功/失败都有明确提示
- [ ] 按钮文案符合业务语义

## 影响范围
- ✅ 不影响现有保存功能
- ✅ 不影响配置管理功能
- ✅ 不影响历史项目列表功能
- ✅ 移除了编辑功能（按需求）

## 编译状态
✅ 编译成功，无错误或警告

## 相关文档
- 模板导入功能 PRD: `/docs/prd/template-import-feature.md`
- 模板导入开发记录: `/docs/bugfix/sprint-11-template-import-feature.md`
