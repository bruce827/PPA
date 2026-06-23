/**
 * 表单设计模块 - 枚举配置
 * 所有下拉选项集中管理，便于维护
 *
 * 注意：以下枚举值与后端 formDesignService.js 中的校验规则手动保持同步，
 * 但两端不共享同一数据源。新增/修改输入类型时需同时更新两端。
 * 后端校验位置：server/services/formDesignService.js → validateField()
 */

// 字段类型
export const FIELD_TYPE_OPTIONS = [
  { label: '字符', value: '字符' },
  { label: '固定字符', value: '固定字符' },
  { label: '整型', value: '整型' },
  { label: '长整型', value: '长整型' },
  { label: '单精度数字', value: '单精度数字' },
  { label: '双精度数字', value: '双精度数字' },
  { label: '文本', value: '文本' },
  { label: '短文本', value: '短文本' },
  { label: '日期', value: '日期' },
  { label: '日期时间', value: '日期时间' },
];

// 输入控件类型
export const INPUT_TYPE_OPTIONS = [
  { label: '文本框', value: '文本框', code: 'text', component: 'Input' },
  { label: '文本域', value: '文本域', code: 'textArea', component: 'Input.TextArea' },
  { label: '数字框', value: '数字框', code: 'number', component: 'InputNumber' },
  { label: '下拉选择器', value: '下拉选择器', code: 'selectorDropdown', component: 'Select' },
  { label: '下拉树形选择器', value: '下拉树形选择器', code: 'selectorDropdownTree', component: 'TreeSelect' },
  { label: '弹出选择器', value: '弹出选择器', code: 'selectorPopup', component: 'Modal' },
  { label: '弹出选择器(可输入)', value: '弹出选择器(可输入)', code: 'selectorPopupInput', component: 'AutoComplete' },
  { label: '日期选择器', value: '日期选择器', code: 'selectorDate', component: 'DatePicker' },
  { label: '时间选择器', value: '时间选择器', code: 'selectorTime', component: 'TimePicker' },
  { label: '日期区间', value: '日期区间', code: 'selectorDateInterval', component: 'DatePicker.RangePicker' },
  { label: '时间区间', value: '时间区间', code: 'selectorTimeInterval', component: 'TimePicker.RangePicker' },
  { label: '年份选择器', value: '年份选择器', code: 'selectorYear', component: 'DatePicker' },
  { label: '年月选择器', value: '年月选择器', code: 'selectorYearMonth', component: 'DatePicker' },
  { label: '单选框', value: '单选框', code: 'radioBox', component: 'Radio.Group' },
  { label: '复选框', value: '复选框', code: 'checkBox', component: 'Checkbox.Group' },
  { label: '图片上传', value: '图片上传', code: 'uploadImage', component: 'Upload' },
  { label: '文件上传', value: '文件上传', code: 'uploadFile', component: 'Upload' },
  { label: '附件上传（Word）', value: '附件上传（Word）', code: 'uploadFile(word)', component: 'Upload' },
  { label: '表格', value: '表格', code: 'table', component: 'Table' },
  { label: 'Json编辑器', value: 'Json编辑器', code: 'textJson', component: 'Input.TextArea' },
  { label: '图标选择器', value: '图标选择器', code: 'selectorIcon', component: 'IconPicker' },
  { label: '富文本（本地图片）', value: '富文本（本地图片）', code: 'richTextLocal', component: 'RichTextEditor' },
  { label: '富文本（网络图片）', value: '富文本（网络图片）', code: 'richTextURL', component: 'RichTextEditor' },
];

// 卡片宽度
export const CARD_WIDTH_OPTIONS = [
  { label: '四分之一行', value: '四分之一行', span: 6 },
  { label: '三分之一行', value: '三分之一行', span: 8 },
  { label: '半行', value: '半行', span: 12 },
  { label: '整行', value: '整行', span: 24 },
];

// 控制状态
export const CONTROL_OPTIONS = [
  { label: '读写', value: '读写' },
  { label: '只读', value: '只读' },
  { label: '隐藏', value: '隐藏' },
  { label: '禁用', value: '禁用' },
];

// 是否选项
export const YES_NO_OPTIONS = [
  { label: '是', value: 1 },
  { label: '否', value: 0 },
];

// 过滤方式
export const FILTER_MODE_OPTIONS = [
  { label: '等于', value: '等于', code: 'eq' },
  { label: '不等于', value: '不等于', code: 'ne' },
  { label: '小于', value: '小于', code: 'lt' },
  { label: '小于等于', value: '小于等于', code: 'le' },
  { label: '大于', value: '大于', code: 'gt' },
  { label: '大于等于', value: '大于等于', code: 'ge' },
  { label: '包含', value: '包含', code: 'like' },
  { label: '不包含', value: '不包含', code: 'notLike' },
  { label: '开始以', value: '开始以', code: 'likeLeft' },
  { label: '结束以', value: '结束以', code: 'likeRight' },
  { label: '在列表', value: '在列表', code: 'in' },
  { label: '精确包含', value: '精确包含', code: 'find_in_set' },
];

// 列表控制
export const LIST_CONTROL_OPTIONS = [
  { label: '显示', value: '显示' },
  { label: '隐藏', value: '隐藏' },
  { label: '只读', value: '只读' },
];

// 来源系统
export const SOURCE_SYSTEM_OPTIONS = [
  { label: 'Hse监督助手', value: 'Hse监督助手' },
  { label: '数字化安全管控平台', value: '数字化安全管控平台' },
  { label: 'hse体系审核助手', value: 'hse体系审核助手' },
  { label: '督导检查（Excel）', value: '督导检查（Excel）' },
  { label: '附件来源（Excel）', value: '附件来源（Excel）' },
  { label: '健康安全环保智能管控', value: '健康安全环保智能管控' },
  { label: '共有', value: '共有' },
];

// 常用卡片分组（建议值，但允许自由输入）
export const CARD_GROUP_SUGGESTIONS = [
  '基本信息',
  '基础信息',
  '详细信息',
  '评价信息',
  '风险评估',
  '原因信息',
  '整改信息',
  '验证信息',
  '问责信息',
  '措施落实',
  '隐患信息',
  '系统信息',
];

// 根据编码获取中文名
export const getInputTypeLabelByCode = (code: string): string => {
  const option = INPUT_TYPE_OPTIONS.find((item) => item.code === code);
  return option?.label || code;
};

// 根据中文名获取编码
export const getInputTypeCodeByLabel = (label: string): string => {
  const option = INPUT_TYPE_OPTIONS.find((item) => item.label === label);
  return option?.code || label;
};

// 根据输入类型获取对应的组件
export const getComponentByInputType = (inputType: string): string => {
  const option = INPUT_TYPE_OPTIONS.find(
    (item) => item.value === inputType || item.label === inputType || item.code === inputType
  );
  return option?.component || 'Input';
};
