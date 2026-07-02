import {
  batchUpdateFields,
  createField,
  createForm,
  createFormDesignProject,
  deleteField,
  deleteForm,
  deleteFormDesignProject,
  getAppsByProjectId,
  getFieldsByFormId,
  getFormDesignProjects,
  getFormsByAppId,
  getProjects,
  updateField,
  updateForm,
  validateField,
  validateForm,
} from '@/services/formDesign';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import ProForm, {
  ProFormCheckbox,
  ProFormDatePicker,
  ProFormDateRangePicker,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormTimePicker,
  ProFormTreeSelect,
} from '@ant-design/pro-form';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CARD_WIDTH_OPTIONS,
  CONTROL_OPTIONS,
  FIELD_TYPE_OPTIONS,
  FILTER_MODE_OPTIONS,
  INPUT_TYPE_OPTIONS,
  LIST_CONTROL_OPTIONS,
  YES_NO_OPTIONS,
} from './constants';

type ViewMode = 'daily' | 'excel';
type DrawerMode = 'create' | 'edit' | 'copy';
type ValidationStatus = 'unchecked' | 'normal' | 'warning' | 'error';

interface FormProject {
  id: number;
  project_name: string;
  project_desc: string;
  linked_project_id: number | null;
  app_count: number;
  form_count: number;
}

interface FormApp {
  id: number;
  app_name: string;
  app_code: string;
  project_id: number;
  form_count: number;
}

interface FormDefinition {
  id: number;
  app_id: number;
  form_name: string;
  form_code: string;
  filter_condition: string;
  description: string;
  sort_order?: number;
}

interface FormField {
  id: number;
  form_id: number;
  field_name: string;
  field_code: string;
  is_primary_key: number;
  is_virtual: number;
  field_type: string;
  field_length: number;
  field_precision: number;
  default_value: string;
  input_type: string;
  input_type_code: string;
  input_component: string;
  input_params: string;
  is_required: number;
  is_unique: number;
  placeholder: string;
  remark: string;
  card_group: string;
  card_sort: number;
  card_width: string;
  card_width_span: number;
  add_control: string;
  update_control: string;
  detail_control: string;
  list_width: number;
  list_control: string;
  list_sort: number;
  list_formatter: string;
  is_filter: number;
  filter_mode: string;
  filter_default: string;
  filter_placeholder: string;
  source_system: string;
  sort_order?: number;
}

interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

interface FieldFilters {
  keyword?: string;
  cardGroup?: string;
  inputType?: string;
  isRequired?: number;
  isFilter?: number;
  validationStatus?: ValidationStatus;
}

const MODE_STORAGE_KEY = 'ppa.formDesign.viewMode';

const EMPTY_VALIDATION: ValidationResult = {
  status: 'unchecked',
  errors: [],
  warnings: [],
};

const fieldTypeDefaultLength: Record<string, number | undefined> = {
  字符: 255,
  固定字符: 50,
  整型: 10,
  长整型: 20,
  单精度数字: 10,
  双精度数字: 10,
  文本: 1000,
  短文本: 255,
  日期: 10,
  日期时间: 19,
};

const toSelectOptions = (items: { label: string; value: any }[]) =>
  items.map((item) => ({ label: item.label, value: item.value }));

const uniqueOptions = (items: { label: string; value: any }[]) => {
  const seen = new Set<any>();
  return items.filter((item) => {
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });
};

const filterModeSelectOptions = uniqueOptions(
  FILTER_MODE_OPTIONS.flatMap((item) => [
    { label: item.label, value: item.code },
    { label: item.label, value: item.value },
  ]),
);

const listControlSelectOptions = uniqueOptions([
  ...toSelectOptions(LIST_CONTROL_OPTIONS),
  { label: '禁用', value: '禁用' },
]);

const validationMeta: Record<
  ValidationStatus,
  { text: string; color: string }
> = {
  unchecked: { text: '未校验', color: 'default' },
  normal: { text: '正常', color: 'success' },
  warning: { text: '警告', color: 'warning' },
  error: { text: '错误', color: 'error' },
};

const getInputTypeOption = (inputType?: string) =>
  INPUT_TYPE_OPTIONS.find(
    (item) =>
      item.value === inputType ||
      item.label === inputType ||
      item.code === inputType,
  );

const getCardWidthSpan = (cardWidth?: string) =>
  CARD_WIDTH_OPTIONS.find((item) => item.value === cardWidth)?.span || 12;

const normalizeBoolean = (value: any) => (value ? 1 : 0);

const safeJsonParse = (value?: string) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const summarizeInputParams = (value?: string) => {
  const parsed = safeJsonParse(value);
  if (!parsed) {
    return value ? '原始配置' : '无';
  }

  if (parsed.type === 'dict') {
    const code = parsed.dict_code || parsed?.param?.code;
    return code ? `字典：${code}` : '字典';
  }

  if (parsed.type === 'enum' && Array.isArray(parsed.options)) {
    const labels = parsed.options
      .map((item: any) => item?.label || item?.value)
      .filter(Boolean)
      .slice(0, 4);
    return labels.length ? `枚举：${labels.join(' / ')}` : '枚举';
  }

  if (parsed.type === 'literal') {
    return parsed.value ? `配置：${parsed.value}` : '原始配置';
  }

  return '原始配置';
};

const parseInputParamsToForm = (value?: string) => {
  const parsed = safeJsonParse(value);
  if (!value) {
    return {
      input_params_mode: 'none',
      input_params_dict_code: undefined,
      input_params_enum_text: undefined,
      input_params_raw: undefined,
    };
  }

  if (parsed?.type === 'dict') {
    return {
      input_params_mode: 'dict',
      input_params_dict_code: parsed.dict_code || parsed?.param?.code,
      input_params_enum_text: undefined,
      input_params_raw: undefined,
    };
  }

  if (parsed?.type === 'enum') {
    const text = Array.isArray(parsed.options)
      ? parsed.options
          .map((item: any) => item?.label || item?.value)
          .filter(Boolean)
          .join('\n')
      : '';
    return {
      input_params_mode: 'enum',
      input_params_dict_code: undefined,
      input_params_enum_text: text,
      input_params_raw: undefined,
    };
  }

  return {
    input_params_mode: 'raw',
    input_params_dict_code: undefined,
    input_params_enum_text: undefined,
    input_params_raw: value,
  };
};

const toFieldFormValues = (field: FormField) => ({
  ...field,
  is_primary_key: !!field.is_primary_key,
  is_virtual: !!field.is_virtual,
  is_required: !!field.is_required,
  is_unique: !!field.is_unique,
  is_filter: !!field.is_filter,
  ...parseInputParamsToForm(field.input_params),
});

const buildInputParams = (values: any) => {
  switch (values.input_params_mode) {
    case 'dict': {
      const dictCode = values.input_params_dict_code?.trim();
      if (!dictCode) return null;
      return JSON.stringify(
        {
          type: 'dict',
          dict_code: dictCode,
          raw: JSON.stringify({ type: 'dict', param: { code: dictCode } }),
        },
        null,
        0,
      );
    }
    case 'enum': {
      const options = String(values.input_params_enum_text || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({ label: item, value: item }));
      if (options.length === 0) return null;
      return JSON.stringify({
        type: 'enum',
        options,
        raw: options.map((item) => item.label).join(','),
      });
    }
    case 'raw':
      return values.input_params_raw?.trim() || null;
    default:
      return null;
  }
};

const buildValidationResult = (
  errors: string[] = [],
  warnings: string[] = [],
): ValidationResult => {
  if (errors.length > 0) {
    return { status: 'error', errors, warnings };
  }
  if (warnings.length > 0) {
    return { status: 'warning', errors, warnings };
  }
  return { status: 'normal', errors, warnings };
};

const getIssueMessages = (
  result: ValidationResult | undefined,
  dataIndex?: string,
) => {
  if (!result || result.status === 'normal' || result.status === 'unchecked')
    return [];
  const messages = [...result.errors, ...result.warnings];
  if (!dataIndex) return messages;

  const map: Record<string, string[]> = {
    field_type: ['R1', 'R2', 'R4', '字段类型'],
    input_type: ['R1', 'R2', 'R3', 'W1', '输入类型', '控件'],
    input_params: ['R3', '输入参数'],
    field_length: ['R4', 'W1', '字段长度'],
    field_precision: ['R8', 'W6', '精度'],
    is_primary_key: ['R5', '主键'],
    field_code: ['R6', '系统字段'],
    add_control: ['R5', 'R6', 'R9', '新增'],
    update_control: ['R5', 'R6', 'R9', '更新'],
    detail_control: ['R5', 'R6', '详情'],
    list_control: ['R5', 'R6', 'W4', 'W5', '列表控制'],
    list_sort: ['W5', '列表排序'],
    is_filter: ['R7', '过滤器'],
    filter_mode: ['R7', '过滤方式'],
    placeholder: ['R9', 'W7', '提示信息'],
  };

  const keywords = map[dataIndex];
  if (!keywords) return [];
  return messages.filter((messageText) =>
    keywords.some((keyword) => messageText.includes(keyword)),
  );
};

const FormDesign: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<FormProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<
    number | undefined
  >();
  const [apps, setApps] = useState<FormApp[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | undefined>();
  const [fields, setFields] = useState<FormField[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored === 'excel' ? 'excel' : 'daily';
  });
  const [filters, setFilters] = useState<FieldFilters>({});
  const [validationMap, setValidationMap] = useState<
    Record<number, ValidationResult>
  >({});
  const [dirtyRows, setDirtyRows] = useState<Record<number, FormField>>({});
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('edit');
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewField, setPreviewField] = useState<FormField | null>(null);
  const [formPreviewVisible, setFormPreviewVisible] = useState(false);
  const [createProjectVisible, setCreateProjectVisible] = useState(false);
  const [createFormVisible, setCreateFormVisible] = useState(false);
  const [formSettingsVisible, setFormSettingsVisible] = useState(false);

  const [createProjectForm] = Form.useForm();
  const [createFormForm] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const [formSettingsForm] = Form.useForm();

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId),
    [forms, selectedFormId],
  );

  const hasDirtyRows = Object.keys(dirtyRows).length > 0;
  const dirtyCount = Object.keys(dirtyRows).length;

  const mergedFields = useMemo(
    () => fields.map((field) => dirtyRows[field.id] || field),
    [dirtyRows, fields],
  );

  const cardGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    fields.forEach((field) => {
      if (field.card_group) groups.add(field.card_group);
    });
    return Array.from(groups).map((group) => ({ label: group, value: group }));
  }, [fields]);

  const filteredFields = useMemo(() => {
    return mergedFields.filter((field) => {
      if (filters.keyword && !field.field_name?.includes(filters.keyword))
        return false;
      if (filters.cardGroup && field.card_group !== filters.cardGroup)
        return false;
      if (filters.inputType && field.input_type !== filters.inputType)
        return false;
      if (
        filters.isRequired !== undefined &&
        field.is_required !== filters.isRequired
      )
        return false;
      if (
        filters.isFilter !== undefined &&
        field.is_filter !== filters.isFilter
      )
        return false;
      if (
        filters.validationStatus &&
        (validationMap[field.id]?.status || 'unchecked') !==
          filters.validationStatus
      ) {
        return false;
      }
      return true;
    });
  }, [filters, mergedFields, validationMap]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFormDesignProjects();
      if (res.code === 200) {
        setProjects(res.data);
        if (res.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(res.data[0].id);
        }
      }
    } catch (error) {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const loadApps = useCallback(async (projectId: number) => {
    try {
      const res = await getAppsByProjectId(projectId);
      if (res.code === 200) {
        setApps(res.data);
      }
    } catch (error) {
      message.error('加载应用列表失败');
    }
  }, []);

  const loadForms = useCallback(
    async (appId: number) => {
      try {
        const res = await getFormsByAppId(appId);
        if (res.code === 200) {
          setForms(res.data);
          if (res.data.length > 0) {
            const isSelectedFormInNewForms = res.data.some(
              (form: FormDefinition) => form.id === selectedFormId,
            );
            if (!selectedFormId || !isSelectedFormInNewForms) {
              setSelectedFormId(res.data[0].id);
            }
          } else {
            setSelectedFormId(undefined);
            setFields([]);
          }
        }
      } catch (error) {
        message.error('加载表单列表失败');
      }
    },
    [selectedFormId],
  );

  const loadFields = useCallback(async (formId: number) => {
    setLoading(true);
    try {
      const res = await getFieldsByFormId(formId);
      if (res.code === 200) {
        setFields(res.data);
        setValidationMap({});
        setDirtyRows({});
      }
    } catch (error) {
      message.error('加载字段列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistoryProjects = useCallback(async () => {
    try {
      const res = await getProjects();
      if (res.data) {
        setHistoryProjects(res.data);
      }
    } catch (error) {
      console.error('加载历史项目失败', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadHistoryProjects();
  }, [loadHistoryProjects, loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadApps(selectedProjectId);
    }
  }, [loadApps, selectedProjectId]);

  useEffect(() => {
    if (apps.length > 0) {
      loadForms(apps[0].id);
    } else {
      setForms([]);
      setSelectedFormId(undefined);
      setFields([]);
    }
  }, [apps, loadForms]);

  useEffect(() => {
    if (selectedFormId) {
      loadFields(selectedFormId);
    }
  }, [loadFields, selectedFormId]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasDirtyRows) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDirtyRows]);

  const confirmDiscardDirty = (next: () => void) => {
    if (!hasDirtyRows) {
      next();
      return;
    }
    Modal.confirm({
      title: '存在未保存修改',
      content: 'Excel 全量模式中有暂存修改，继续操作会丢弃这些修改。',
      okText: '继续',
      cancelText: '取消',
      onOk: () => {
        setDirtyRows({});
        next();
      },
    });
  };

  const handleProjectChange = (projectId: number) => {
    confirmDiscardDirty(() => setSelectedProjectId(projectId));
  };

  const handleFormChange = (formId: number) => {
    confirmDiscardDirty(() => setSelectedFormId(formId));
  };

  const handleModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    confirmDiscardDirty(() => setViewMode(mode));
  };

  const handleCreateProject = async (values: any) => {
    try {
      const res = await createFormDesignProject(values);
      if (res.code === 200) {
        message.success('创建成功');
        setCreateProjectVisible(false);
        createProjectForm.resetFields();
        loadProjects();
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleLinkHistoryProject = (projectId: number) => {
    const project = historyProjects.find((item) => item.id === projectId);
    if (project) {
      createProjectForm.setFieldsValue({
        project_name: project.name || project.project_name,
        project_desc: project.description || project.project_desc,
        linked_project_id: project.id,
      });
    }
  };

  const handleDeleteProject = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将同时删除其下的所有应用、表单和字段，确定要删除吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteFormDesignProject(id);
          message.success('删除成功');
          loadProjects();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleCreateForm = async (values: any) => {
    if (!apps.length) {
      message.error('请先创建应用');
      return;
    }
    try {
      const res = await createForm({
        ...values,
        app_id: apps[0].id,
      });
      if (res.code === 200) {
        message.success('创建成功');
        setCreateFormVisible(false);
        createFormForm.resetFields();
        loadForms(apps[0].id);
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  const handleDeleteForm = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除表单将同时删除其下的所有字段，确定要删除吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteForm(id);
          message.success('删除成功');
          if (apps.length > 0) {
            loadForms(apps[0].id);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const buildDefaultField = (): FormField => {
    const inputType = INPUT_TYPE_OPTIONS[0];
    return {
      id: 0,
      form_id: selectedFormId || 0,
      field_name: '',
      field_code: '',
      is_primary_key: 0,
      is_virtual: 0,
      field_type: '字符',
      field_length: 255,
      field_precision: undefined as any,
      default_value: '',
      input_type: inputType.value,
      input_type_code: inputType.code,
      input_component: inputType.component,
      input_params: '',
      is_required: 0,
      is_unique: 0,
      placeholder: '',
      remark: '',
      card_group: fields[0]?.card_group || '基本信息',
      card_sort: (fields.length + 1) * 10,
      card_width: '半行',
      card_width_span: 12,
      add_control: '读写',
      update_control: '读写',
      detail_control: '读写',
      list_width: 120,
      list_control: '显示',
      list_sort: fields.length + 1,
      list_formatter: '',
      is_filter: 0,
      filter_mode: '',
      filter_default: '',
      filter_placeholder: '',
      source_system: '',
      sort_order: fields.length,
    };
  };

  const openFieldDrawer = (mode: DrawerMode, field?: FormField) => {
    const baseField =
      mode === 'create'
        ? buildDefaultField()
        : {
            ...(field || buildDefaultField()),
            ...(mode === 'copy'
              ? {
                  id: 0,
                  field_name: '',
                  field_code: '',
                  is_primary_key: 0,
                  sort_order: field
                    ? (field.sort_order || fields.indexOf(field)) + 1
                    : fields.length,
                }
              : {}),
          };

    setDrawerMode(mode);
    setActiveField(baseField);
    setFieldDrawerOpen(true);
    fieldForm.setFieldsValue(toFieldFormValues(baseField));
  };

  const closeFieldDrawer = () => {
    setFieldDrawerOpen(false);
    setActiveField(null);
    fieldForm.resetFields();
  };

  const buildFieldFromFormValues = (values: any): FormField => {
    const inputOption = getInputTypeOption(values.input_type);
    const fieldType = values.field_type;
    const fieldName = values.field_name || '';
    const cardWidthSpan = getCardWidthSpan(values.card_width);

    return {
      ...(activeField || buildDefaultField()),
      ...values,
      form_id: selectedFormId || activeField?.form_id || 0,
      is_primary_key: normalizeBoolean(values.is_primary_key),
      is_virtual: normalizeBoolean(values.is_virtual),
      is_required: normalizeBoolean(values.is_required),
      is_unique: normalizeBoolean(values.is_unique),
      is_filter: normalizeBoolean(values.is_filter),
      field_length: values.field_length ?? fieldTypeDefaultLength[fieldType],
      field_precision: values.field_precision,
      placeholder:
        values.placeholder ||
        (values.add_control === '读写' || values.update_control === '读写'
          ? `请输入${fieldName}`
          : ''),
      input_type_code:
        inputOption?.code || values.input_type_code || values.input_type,
      input_component:
        inputOption?.component || values.input_component || 'Input',
      input_params: buildInputParams(values),
      card_width_span: cardWidthSpan,
    };
  };

  const refreshSingleValidation = async (field: FormField) => {
    try {
      const validateRes = await validateField(field);
      if (validateRes.code === 200) {
        const result = buildValidationResult(
          validateRes.data.errors,
          validateRes.data.warnings,
        );
        if (field.id) {
          setValidationMap((prev) => ({ ...prev, [field.id]: result }));
        }
        return result;
      }
    } catch (error) {
      console.error('字段校验失败', error);
    }
    return EMPTY_VALIDATION;
  };

  const handleSubmitField = async () => {
    try {
      const values = await fieldForm.validateFields();
      const nextField = buildFieldFromFormValues(values);
      const validation = await validateField(nextField);
      if (validation.code === 200) {
        const { errors, warnings } = validation.data;
        if (errors.length > 0) {
          Modal.error({
            title: '字段校验失败',
            content: (
              <ul>
                {errors.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          });
          return;
        }
        if (warnings.length > 0) {
          message.warning(`警告：${warnings.join('；')}`, 5);
        }
      }

      const res =
        drawerMode === 'edit' && activeField?.id
          ? await updateField(activeField.id, nextField)
          : await createField(nextField);

      if (res.code === 200) {
        message.success(drawerMode === 'edit' ? '保存成功' : '字段已创建');
        closeFieldDrawer();
        if (selectedFormId) {
          await loadFields(selectedFormId);
        }
        if (res.data?.id) {
          refreshSingleValidation(res.data);
        }
      }
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error(drawerMode === 'edit' ? '保存失败' : '创建失败');
    }
  };

  const handleDeleteField = (field: FormField) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除字段「${field.field_name}」吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteField(field.id);
          message.success('删除成功');
          closeFieldDrawer();
          if (selectedFormId) {
            loadFields(selectedFormId);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handlePreview = (field: FormField) => {
    setPreviewField(field);
    setPreviewVisible(true);
  };

  const handleValidateForm = async () => {
    if (!selectedFormId) return;
    try {
      const res = await validateForm(selectedFormId);
      if (res.code === 200) {
        const nextMap: Record<number, ValidationResult> = {};
        fields.forEach((field) => {
          nextMap[field.id] = buildValidationResult([], []);
        });
        res.data.details.forEach((item: any) => {
          nextMap[item.field_id] = buildValidationResult(
            item.errors,
            item.warnings,
          );
        });
        setValidationMap(nextMap);

        if (res.data.failed_fields === 0) {
          message.success(`校验通过，共 ${res.data.total_fields} 个字段`);
          return;
        }

        Modal.warning({
          title: '表单校验结果',
          width: 720,
          content: (
            <div>
              {res.data.details.map((item: any) => (
                <div key={item.field_id} style={{ marginBottom: 12 }}>
                  <strong>
                    {item.field_name} ({item.field_code})
                  </strong>
                  {item.errors.length > 0 && (
                    <ul style={{ color: '#cf1322', margin: '4px 0' }}>
                      {item.errors.map((errorText: string) => (
                        <li key={errorText}>{errorText}</li>
                      ))}
                    </ul>
                  )}
                  {item.warnings.length > 0 && (
                    <ul style={{ color: '#d48806', margin: '4px 0' }}>
                      {item.warnings.map((warningText: string) => (
                        <li key={warningText}>{warningText}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ),
        });
      }
    } catch (error) {
      message.error('校验失败');
    }
  };

  const openFormSettings = () => {
    if (!selectedForm) return;
    formSettingsForm.setFieldsValue({
      form_name: selectedForm.form_name,
      form_code: selectedForm.form_code,
      filter_condition: selectedForm.filter_condition,
    });
    setFormSettingsVisible(true);
  };

  const handleSaveFormSettings = async () => {
    if (!selectedForm || !apps.length) return;
    try {
      const values = await formSettingsForm.validateFields();
      const res = await updateForm(selectedForm.id, {
        form_name: selectedForm.form_name,
        form_code: selectedForm.form_code,
        description: selectedForm.description,
        sort_order: selectedForm.sort_order,
        filter_condition: values.filter_condition,
      });
      if (res.code === 200) {
        message.success('数据权限已保存');
        setFormSettingsVisible(false);
        loadForms(apps[0].id);
      }
    } catch (error) {
      if ((error as any)?.errorFields) return;
      message.error('保存数据权限失败');
    }
  };

  const handleExcelCellChange = (
    record: FormField,
    key: keyof FormField,
    value: any,
  ) => {
    const current = dirtyRows[record.id] || record;
    const next: FormField = {
      ...current,
      [key]: value,
    };

    if (key === 'input_type') {
      const option = getInputTypeOption(value);
      if (option) {
        next.input_type_code = option.code;
        next.input_component = option.component;
      }
    }

    if (key === 'card_width') {
      next.card_width_span = getCardWidthSpan(value);
    }

    if (key === 'field_type' && !next.field_length) {
      next.field_length = fieldTypeDefaultLength[String(value)] as number;
    }

    setDirtyRows((prev) => ({
      ...prev,
      [record.id]: next,
    }));
  };

  const handleDiscardExcelChanges = () => {
    if (!hasDirtyRows) return;
    Modal.confirm({
      title: '放弃暂存修改',
      content: '确定要放弃 Excel 全量模式中的所有未保存修改吗？',
      okText: '放弃',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => setDirtyRows({}),
    });
  };

  const handleSaveAllDirtyRows = async () => {
    const changedFields = Object.values(dirtyRows);
    if (changedFields.length === 0) {
      message.info('没有未保存修改');
      return;
    }

    const nextValidationMap = { ...validationMap };
    const hardErrors: { field: FormField; errors: string[] }[] = [];

    for (const field of changedFields) {
      const validation = await validateField(field);
      if (validation.code === 200) {
        const result = buildValidationResult(
          validation.data.errors,
          validation.data.warnings,
        );
        nextValidationMap[field.id] = result;
        if (validation.data.errors.length > 0) {
          hardErrors.push({ field, errors: validation.data.errors });
        }
      }
    }

    setValidationMap(nextValidationMap);

    if (hardErrors.length > 0) {
      Modal.error({
        title: '批量保存失败',
        width: 720,
        content: (
          <div>
            <p>以下字段存在硬错误，请修正后再保存：</p>
            {hardErrors.map((item) => (
              <div key={item.field.id} style={{ marginBottom: 8 }}>
                <strong>
                  {item.field.field_name || item.field.field_code}
                </strong>
                <ul>
                  {item.errors.map((errorText) => (
                    <li key={errorText}>{errorText}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ),
      });
      return;
    }

    try {
      const res = await batchUpdateFields(changedFields);
      if (res.code === 200) {
        message.success(`已保存 ${changedFields.length} 个字段`);
        setDirtyRows({});
        if (selectedFormId) {
          loadFields(selectedFormId);
        }
      }
    } catch (error) {
      message.error('批量保存失败');
    }
  };

  const renderValidationTag = (field: FormField) => {
    const result = validationMap[field.id] || EMPTY_VALIDATION;
    const meta = validationMeta[result.status];
    const content =
      result.errors.length || result.warnings.length ? (
        <div>
          {result.errors.map((item) => (
            <div key={item} style={{ color: '#cf1322' }}>
              {item}
            </div>
          ))}
          {result.warnings.map((item) => (
            <div key={item} style={{ color: '#d48806' }}>
              {item}
            </div>
          ))}
        </div>
      ) : (
        meta.text
      );

    return (
      <Tooltip title={content}>
        <Tag color={meta.color}>{meta.text}</Tag>
      </Tooltip>
    );
  };

  const renderFormControl = (field: FormField) => {
    const component = field.input_component;
    const required = field.is_required === 1;
    const disabled =
      field.add_control === '隐藏' ||
      field.update_control === '隐藏' ||
      field.detail_control === '隐藏';

    const commonProps = {
      name: field.field_code,
      label: field.field_name,
      placeholder: field.placeholder || `请输入${field.field_name}`,
      rules: required
        ? [{ required: true, message: `请输入${field.field_name}` }]
        : [],
      disabled,
    };

    const parsedParams = safeJsonParse(field.input_params);
    const options = Array.isArray(parsedParams?.options)
      ? parsedParams.options
      : [];

    switch (component) {
      case 'Input':
        return <ProFormText {...commonProps} />;
      case 'Input.TextArea':
      case 'JsonEditor':
        return <ProFormTextArea {...commonProps} />;
      case 'InputNumber':
        return <ProFormDigit {...commonProps} />;
      case 'Select':
        return <ProFormSelect {...commonProps} options={options} />;
      case 'TreeSelect':
        return (
          <ProFormTreeSelect
            {...commonProps}
            fieldProps={{ treeData: options }}
          />
        );
      case 'DatePicker':
        return <ProFormDatePicker {...commonProps} />;
      case 'TimePicker':
        return <ProFormTimePicker {...commonProps} />;
      case 'DatePicker.RangePicker':
        return <ProFormDateRangePicker {...commonProps} />;
      case 'Radio.Group':
        return <ProFormRadio.Group {...commonProps} options={options} />;
      case 'Checkbox.Group':
        return <ProFormCheckbox.Group {...commonProps} options={options} />;
      case 'Switch':
        return <ProFormSwitch {...commonProps} />;
      default:
        return <ProFormText {...commonProps} />;
    }
  };

  const renderBooleanTag = (value: number) =>
    value ? <Tag color="blue">是</Tag> : <Tag>否</Tag>;

  const dailyColumns: ColumnsType<FormField> = [
    {
      title: '字段名称',
      dataIndex: 'field_name',
      width: 160,
      fixed: 'left',
      render: (value, record) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => openFieldDrawer('edit', record)}
        >
          {value}
        </Button>
      ),
    },
    { title: '字段编码', dataIndex: 'field_code', width: 160 },
    { title: '字段类型', dataIndex: 'field_type', width: 110 },
    { title: '字段长度', dataIndex: 'field_length', width: 90 },
    { title: '输入类型', dataIndex: 'input_type', width: 140 },
    {
      title: '必填',
      dataIndex: 'is_required',
      width: 80,
      render: renderBooleanTag,
    },
    {
      title: '唯一',
      dataIndex: 'is_unique',
      width: 80,
      render: renderBooleanTag,
    },
    { title: '卡片分组', dataIndex: 'card_group', width: 130 },
    { title: '卡片宽度', dataIndex: 'card_width', width: 110 },
    {
      title: '卡片控制',
      width: 180,
      render: (_, record) =>
        `${record.add_control}/${record.update_control}/${record.detail_control}`,
    },
    { title: '列表控制', dataIndex: 'list_control', width: 100 },
    {
      title: '查询条件',
      dataIndex: 'is_filter',
      width: 90,
      render: renderBooleanTag,
    },
    {
      title: '校验状态',
      width: 110,
      render: (_, record) => renderValidationTag(record),
    },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="编辑详情">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openFieldDrawer('edit', record)}
            />
          </Tooltip>
          <Tooltip title="复制字段">
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => openFieldDrawer('copy', record)}
            />
          </Tooltip>
          <Tooltip title="预览字段">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="删除字段">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteField(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const renderEditableCell = (
    record: FormField,
    key: keyof FormField,
    editor: 'text' | 'number' | 'select' | 'boolean',
    options: { label: string; value: any }[] = [],
  ) => {
    const result = validationMap[record.id];
    const issueMessages = getIssueMessages(result, String(key));
    const isDirty =
      !!dirtyRows[record.id] &&
      dirtyRows[record.id][key] !==
        fields.find((item) => item.id === record.id)?.[key];
    const statusStyle =
      issueMessages.length > 0
        ? {
            border: `1px solid ${
              result?.status === 'error' ? '#ff4d4f' : '#faad14'
            }`,
            borderRadius: 4,
            padding: 2,
          }
        : undefined;

    const value = record[key] as any;
    const content = (() => {
      if (editor === 'select') {
        return (
          <Select
            value={value}
            options={options}
            size="small"
            style={{ width: '100%' }}
            onChange={(nextValue) =>
              handleExcelCellChange(record, key, nextValue)
            }
          />
        );
      }
      if (editor === 'boolean') {
        return (
          <Switch
            checked={!!value}
            size="small"
            checkedChildren="是"
            unCheckedChildren="否"
            onChange={(checked) =>
              handleExcelCellChange(record, key, checked ? 1 : 0)
            }
          />
        );
      }
      if (editor === 'number') {
        return (
          <InputNumber
            value={value}
            size="small"
            style={{ width: '100%' }}
            onChange={(nextValue) =>
              handleExcelCellChange(record, key, nextValue)
            }
          />
        );
      }
      return (
        <Input
          value={value}
          size="small"
          onChange={(event) =>
            handleExcelCellChange(record, key, event.target.value)
          }
        />
      );
    })();

    return (
      <Tooltip title={issueMessages.join('；') || undefined}>
        <div
          style={{
            ...statusStyle,
            background: isDirty ? '#fff7e6' : undefined,
          }}
        >
          {content}
        </div>
      </Tooltip>
    );
  };

  const excelColumns: ColumnsType<FormField> = [
    {
      title: '数据库信息',
      children: [
        {
          title: '字段名称',
          dataIndex: 'field_name',
          width: 180,
          fixed: 'left',
          render: (_, record) =>
            renderEditableCell(record, 'field_name', 'text'),
        },
        {
          title: '字段编码',
          dataIndex: 'field_code',
          width: 180,
          fixed: 'left',
          render: (_, record) =>
            renderEditableCell(record, 'field_code', 'text'),
        },
        {
          title: '主键',
          dataIndex: 'is_primary_key',
          width: 90,
          render: (_, record) =>
            renderEditableCell(record, 'is_primary_key', 'boolean'),
        },
        {
          title: '虚拟字段',
          dataIndex: 'is_virtual',
          width: 100,
          render: (_, record) =>
            renderEditableCell(record, 'is_virtual', 'boolean'),
        },
        {
          title: '字段类型',
          dataIndex: 'field_type',
          width: 140,
          render: (_, record) =>
            renderEditableCell(
              record,
              'field_type',
              'select',
              toSelectOptions(FIELD_TYPE_OPTIONS),
            ),
        },
        {
          title: '字段长度',
          dataIndex: 'field_length',
          width: 110,
          render: (_, record) =>
            renderEditableCell(record, 'field_length', 'number'),
        },
        {
          title: '字段精度',
          dataIndex: 'field_precision',
          width: 110,
          render: (_, record) =>
            renderEditableCell(record, 'field_precision', 'number'),
        },
        {
          title: '默认值',
          dataIndex: 'default_value',
          width: 140,
          render: (_, record) =>
            renderEditableCell(record, 'default_value', 'text'),
        },
      ],
    },
    {
      title: '输入信息',
      children: [
        {
          title: '输入类型',
          dataIndex: 'input_type',
          width: 160,
          render: (_, record) =>
            renderEditableCell(
              record,
              'input_type',
              'select',
              toSelectOptions(INPUT_TYPE_OPTIONS),
            ),
        },
        {
          title: '选项配置',
          dataIndex: 'input_params',
          width: 180,
          render: (_, record) => (
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => openFieldDrawer('edit', record)}
            >
              {summarizeInputParams(record.input_params)}
            </Button>
          ),
        },
        {
          title: '必填',
          dataIndex: 'is_required',
          width: 90,
          render: (_, record) =>
            renderEditableCell(record, 'is_required', 'boolean'),
        },
        {
          title: '唯一',
          dataIndex: 'is_unique',
          width: 90,
          render: (_, record) =>
            renderEditableCell(record, 'is_unique', 'boolean'),
        },
        {
          title: '提示信息',
          dataIndex: 'placeholder',
          width: 180,
          render: (_, record) =>
            renderEditableCell(record, 'placeholder', 'text'),
        },
        {
          title: '备注',
          dataIndex: 'remark',
          width: 180,
          render: (_, record) => renderEditableCell(record, 'remark', 'text'),
        },
      ],
    },
    {
      title: '卡片页面信息',
      children: [
        {
          title: '卡片分组',
          dataIndex: 'card_group',
          width: 150,
          render: (_, record) =>
            renderEditableCell(record, 'card_group', 'text'),
        },
        {
          title: '卡片排序',
          dataIndex: 'card_sort',
          width: 110,
          render: (_, record) =>
            renderEditableCell(record, 'card_sort', 'number'),
        },
        {
          title: '卡片宽度',
          dataIndex: 'card_width',
          width: 140,
          render: (_, record) =>
            renderEditableCell(
              record,
              'card_width',
              'select',
              toSelectOptions(CARD_WIDTH_OPTIONS),
            ),
        },
        {
          title: '新增控制',
          dataIndex: 'add_control',
          width: 120,
          render: (_, record) =>
            renderEditableCell(
              record,
              'add_control',
              'select',
              toSelectOptions(CONTROL_OPTIONS),
            ),
        },
        {
          title: '更新控制',
          dataIndex: 'update_control',
          width: 120,
          render: (_, record) =>
            renderEditableCell(
              record,
              'update_control',
              'select',
              toSelectOptions(CONTROL_OPTIONS),
            ),
        },
        {
          title: '详情控制',
          dataIndex: 'detail_control',
          width: 120,
          render: (_, record) =>
            renderEditableCell(
              record,
              'detail_control',
              'select',
              toSelectOptions(CONTROL_OPTIONS),
            ),
        },
      ],
    },
    {
      title: '列表页面信息',
      children: [
        {
          title: '列表宽度',
          dataIndex: 'list_width',
          width: 110,
          render: (_, record) =>
            renderEditableCell(record, 'list_width', 'number'),
        },
        {
          title: '列表控制',
          dataIndex: 'list_control',
          width: 120,
          render: (_, record) =>
            renderEditableCell(
              record,
              'list_control',
              'select',
              listControlSelectOptions,
            ),
        },
        {
          title: '列表排序',
          dataIndex: 'list_sort',
          width: 110,
          render: (_, record) =>
            renderEditableCell(record, 'list_sort', 'number'),
        },
        {
          title: '列表格式化',
          dataIndex: 'list_formatter',
          width: 150,
          render: (_, record) =>
            renderEditableCell(record, 'list_formatter', 'text'),
        },
      ],
    },
    {
      title: '过滤条件',
      children: [
        {
          title: '查询条件',
          dataIndex: 'is_filter',
          width: 100,
          render: (_, record) =>
            renderEditableCell(record, 'is_filter', 'boolean'),
        },
        {
          title: '过滤方式',
          dataIndex: 'filter_mode',
          width: 140,
          render: (_, record) =>
            renderEditableCell(
              record,
              'filter_mode',
              'select',
              filterModeSelectOptions,
            ),
        },
        {
          title: '过滤器默认值',
          dataIndex: 'filter_default',
          width: 150,
          render: (_, record) =>
            renderEditableCell(record, 'filter_default', 'text'),
        },
        {
          title: '过滤器提示信息',
          dataIndex: 'filter_placeholder',
          width: 170,
          render: (_, record) =>
            renderEditableCell(record, 'filter_placeholder', 'text'),
        },
        {
          title: '来源系统',
          dataIndex: 'source_system',
          width: 180,
          render: (_, record) =>
            renderEditableCell(record, 'source_system', 'text'),
        },
      ],
    },
    {
      title: '校验状态',
      width: 110,
      fixed: 'right',
      render: (_, record) => renderValidationTag(record),
    },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="复制行">
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => openFieldDrawer('copy', record)}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => openFieldDrawer('edit', record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteField(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const renderToolbar = () => (
    <Space
      wrap
      style={{
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}
    >
      <Space wrap>
        <Segmented
          value={viewMode}
          options={[
            { label: '日常维护', value: 'daily' },
            { label: 'Excel 全量', value: 'excel' },
          ]}
          onChange={(value) => handleModeChange(value as ViewMode)}
        />
        <Input.Search
          allowClear
          placeholder="搜索字段名称"
          style={{ width: 220 }}
          onSearch={(value) =>
            setFilters((prev) => ({ ...prev, keyword: value || undefined }))
          }
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              keyword: event.target.value || undefined,
            }))
          }
        />
        <Select
          allowClear
          placeholder="卡片分组"
          options={cardGroupOptions}
          style={{ width: 150 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, cardGroup: value }))
          }
        />
        <Select
          allowClear
          placeholder="控件类型"
          options={toSelectOptions(INPUT_TYPE_OPTIONS)}
          style={{ width: 150 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, inputType: value }))
          }
        />
        <Select
          allowClear
          placeholder="必填"
          options={YES_NO_OPTIONS}
          style={{ width: 110 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, isRequired: value }))
          }
        />
        <Select
          allowClear
          placeholder="查询条件"
          options={YES_NO_OPTIONS}
          style={{ width: 120 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, isFilter: value }))
          }
        />
        <Select
          allowClear
          placeholder="校验状态"
          options={[
            { label: '正常', value: 'normal' },
            { label: '错误', value: 'error' },
            { label: '警告', value: 'warning' },
            { label: '未校验', value: 'unchecked' },
          ]}
          style={{ width: 130 }}
          onChange={(value) =>
            setFilters((prev) => ({ ...prev, validationStatus: value }))
          }
        />
      </Space>
      <Space wrap>
        <Button
          icon={<SettingOutlined />}
          onClick={openFormSettings}
          disabled={!selectedForm}
        >
          数据权限
        </Button>
        <Button
          icon={<EyeOutlined />}
          onClick={handleValidateForm}
          disabled={!selectedFormId}
        >
          校验表单
        </Button>
        <Button
          icon={<PlusOutlined />}
          onClick={() => openFieldDrawer('create')}
          disabled={!selectedFormId}
        >
          新增字段
        </Button>
        {viewMode === 'excel' && (
          <>
            <Button
              onClick={handleDiscardExcelChanges}
              disabled={!hasDirtyRows}
            >
              放弃修改
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAllDirtyRows}
              disabled={!hasDirtyRows}
            >
              保存全部{dirtyCount > 0 ? `（${dirtyCount}）` : ''}
            </Button>
          </>
        )}
      </Space>
    </Space>
  );

  const renderFieldDrawer = () => (
    <Drawer
      title={
        drawerMode === 'create'
          ? '新增字段'
          : drawerMode === 'copy'
          ? '复制字段'
          : '字段详情'
      }
      placement="right"
      width={760}
      open={fieldDrawerOpen}
      onClose={closeFieldDrawer}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={closeFieldDrawer}>取消</Button>
          {drawerMode === 'edit' && activeField?.id ? (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteField(activeField)}
            >
              删除字段
            </Button>
          ) : null}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmitField}
          >
            保存
          </Button>
        </Space>
      }
    >
      <Form form={fieldForm} layout="vertical">
        <Divider orientation="left">数据库信息</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="field_name"
              label="字段名称"
              rules={[{ required: true, message: '请输入字段名称' }]}
            >
              <Input placeholder="请输入字段名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="field_code"
              label="字段编码"
              rules={[{ required: true, message: '请输入字段编码' }]}
            >
              <Input placeholder="请输入字段编码" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="is_primary_key"
              label="是否主键"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="is_virtual"
              label="是否虚拟字段"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="field_type"
              label="字段类型"
              rules={[{ required: true, message: '请选择字段类型' }]}
            >
              <Select
                options={toSelectOptions(FIELD_TYPE_OPTIONS)}
                onChange={(value) => {
                  const currentLength = fieldForm.getFieldValue('field_length');
                  if (!currentLength) {
                    fieldForm.setFieldValue(
                      'field_length',
                      fieldTypeDefaultLength[value],
                    );
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="field_length" label="字段长度">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="field_precision" label="字段精度">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="default_value" label="默认值">
              <Input placeholder="请输入默认值" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">输入信息</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="input_type"
              label="输入类型"
              rules={[{ required: true, message: '请选择输入类型' }]}
            >
              <Select options={toSelectOptions(INPUT_TYPE_OPTIONS)} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="is_required"
              label="是否必填"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="is_unique"
              label="是否唯一"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="选项配置（输入参数）">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item name="input_params_mode" noStyle>
                  <Segmented
                    options={[
                      { label: '无', value: 'none' },
                      { label: '字典', value: 'dict' },
                      { label: '枚举', value: 'enum' },
                      { label: '原始配置', value: 'raw' },
                    ]}
                  />
                </Form.Item>
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue }) => {
                    const mode = getFieldValue('input_params_mode');
                    if (mode === 'dict') {
                      return (
                        <Form.Item name="input_params_dict_code" noStyle>
                          <Input placeholder="字典编码，例如 dict_severity" />
                        </Form.Item>
                      );
                    }
                    if (mode === 'enum') {
                      return (
                        <Form.Item name="input_params_enum_text" noStyle>
                          <Input.TextArea rows={4} placeholder="一行一个选项" />
                        </Form.Item>
                      );
                    }
                    if (mode === 'raw') {
                      return (
                        <Form.Item name="input_params_raw" noStyle>
                          <Input.TextArea
                            rows={4}
                            placeholder="输入原始 JSON 或配置文本"
                          />
                        </Form.Item>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="placeholder" label="提示信息">
              <Input placeholder="请输入提示信息" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="remark" label="备注">
              <Input placeholder="请输入备注" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">卡片页面信息</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="card_group"
              label="卡片分组"
              rules={[{ required: true, message: '请输入卡片分组' }]}
            >
              <Input placeholder="例如：基本信息" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="card_sort" label="卡片排序">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="card_width"
              label="卡片宽度"
              rules={[{ required: true, message: '请选择卡片宽度' }]}
            >
              <Select options={toSelectOptions(CARD_WIDTH_OPTIONS)} />
            </Form.Item>
          </Col>
          <Col span={12} />
          <Col span={8}>
            <Form.Item name="add_control" label="新增控制">
              <Select options={toSelectOptions(CONTROL_OPTIONS)} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="update_control" label="更新控制">
              <Select options={toSelectOptions(CONTROL_OPTIONS)} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="detail_control" label="详情控制">
              <Select options={toSelectOptions(CONTROL_OPTIONS)} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">列表页面信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="list_width" label="列表宽度">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="list_control" label="列表控制">
              <Select options={listControlSelectOptions} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="list_sort" label="列表排序">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="list_formatter" label="列表格式化">
              <Input placeholder="请输入列表格式化配置" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">过滤条件</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="is_filter"
              label="是否查询条件"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name="filter_mode" label="过滤方式">
              <Select allowClear options={filterModeSelectOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="filter_default" label="过滤器默认值">
              <Input placeholder="请输入过滤器默认值" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="filter_placeholder" label="过滤器提示信息">
              <Input placeholder="请输入过滤器提示信息" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="source_system" label="来源系统">
              <Input placeholder="请输入来源系统" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );

  return (
    <PageContainer
      header={{
        title: '表单设计',
        breadcrumb: {
          items: [{ title: '项目详细设计' }, { title: '表单设计' }],
        },
      }}
    >
      <Card>
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <span>选择项目：</span>
            <Select
              style={{ width: 300 }}
              placeholder="请选择项目"
              value={selectedProjectId}
              onChange={handleProjectChange}
              loading={loading}
            >
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.project_name} ({project.form_count} 个表单)
                </Select.Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadProjects}>
              刷新
            </Button>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateProjectVisible(true)}
            >
              新建项目
            </Button>
            {selectedProjectId && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteProject(selectedProjectId)}
              >
                删除项目
              </Button>
            )}
          </Space>
        </div>

        {apps.length > 0 && (
          <Tabs
            type="card"
            activeKey={selectedFormId?.toString()}
            onChange={(key) => handleFormChange(Number(key))}
            tabBarExtraContent={
              <Space>
                <Button
                  type="default"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setFormPreviewVisible(true)}
                >
                  预览表单
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateFormVisible(true)}
                >
                  新建表单
                </Button>
              </Space>
            }
            items={forms.map((form) => ({
              key: form.id.toString(),
              label: (
                <span>
                  {form.form_name}
                  <Tag style={{ marginLeft: 8 }}>{form.form_code}</Tag>
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteForm(form.id);
                    }}
                  />
                </span>
              ),
            }))}
          />
        )}

        {selectedFormId && renderToolbar()}

        {selectedFormId && viewMode === 'daily' && (
          <Table
            columns={dailyColumns}
            dataSource={filteredFields}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1750 }}
            size="middle"
          />
        )}

        {selectedFormId && viewMode === 'excel' && (
          <Table
            columns={excelColumns}
            dataSource={filteredFields}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 3900 }}
            size="small"
            rowClassName={(record) =>
              dirtyRows[record.id] ? 'form-design-dirty-row' : ''
            }
          />
        )}

        {apps.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>暂无数据，请先选择或创建项目</p>
          </div>
        )}
      </Card>

      <Modal
        title="新建项目"
        open={createProjectVisible}
        onCancel={() => {
          setCreateProjectVisible(false);
          createProjectForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createProjectForm}
          onFinish={handleCreateProject}
          layout="vertical"
        >
          <Form.Item
            name="project_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item name="project_desc" label="项目描述">
            <Input.TextArea placeholder="请输入项目描述" />
          </Form.Item>
          <Form.Item name="linked_project_id" label="关联历史项目">
            <Select
              placeholder="选择历史项目（可选）"
              allowClear
              onChange={handleLinkHistoryProject}
            >
              {historyProjects.map((project: any) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => setCreateProjectVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建表单"
        open={createFormVisible}
        onCancel={() => {
          setCreateFormVisible(false);
          createFormForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createFormForm}
          onFinish={handleCreateForm}
          layout="vertical"
        >
          <Form.Item
            name="form_name"
            label="表单名称"
            rules={[{ required: true, message: '请输入表单名称' }]}
          >
            <Input placeholder="请输入表单名称" />
          </Form.Item>
          <Form.Item
            name="form_code"
            label="表单编码"
            rules={[{ required: true, message: '请输入表单编码' }]}
          >
            <Input placeholder="请输入表单编码（英文）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => setCreateFormVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="数据权限"
        open={formSettingsVisible}
        onCancel={() => setFormSettingsVisible(false)}
        onOk={handleSaveFormSettings}
        okText="保存"
        cancelText="取消"
      >
        <Form form={formSettingsForm} layout="vertical">
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 16 }}
            message="数据权限是当前表单的全局数据范围约束"
            description="系统加载这张表单数据时，会默认附加这里配置的条件；它适用于本表单所有字段，不是页面查询区里的临时筛选条件。留空表示不额外限制数据范围。"
          />
          <Form.Item name="form_name" label="表单名称">
            <Input disabled />
          </Form.Item>
          <Form.Item name="form_code" label="表单编码">
            <Input disabled />
          </Form.Item>
          <Form.Item name="filter_condition" label="数据权限条件">
            <Input.TextArea
              rows={4}
              placeholder="请输入当前表单的全局数据范围条件"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="字段预览"
        placement="right"
        width={600}
        open={previewVisible}
        onClose={() => setPreviewVisible(false)}
      >
        {previewField && (
          <ProForm layout="vertical" submitter={false}>
            {renderFormControl(previewField)}
          </ProForm>
        )}
      </Drawer>

      {formPreviewVisible && (
        <Modal
          title={`表单预览 - ${selectedForm?.form_name || ''}`}
          open={formPreviewVisible}
          onCancel={() => setFormPreviewVisible(false)}
          width={1000}
          destroyOnHidden
          footer={[
            <Button
              key="close"
              type="primary"
              onClick={() => setFormPreviewVisible(false)}
            >
              关闭
            </Button>,
          ]}
        >
          <ProForm layout="vertical" submitter={false}>
            {(() => {
              const groups: Record<string, FormField[]> = {};
              fields.forEach((field) => {
                const groupName = field.card_group || '默认分组';
                if (!groups[groupName]) {
                  groups[groupName] = [];
                }
                groups[groupName].push(field);
              });

              Object.keys(groups).forEach((groupName) => {
                groups[groupName].sort(
                  (a, b) => (a.card_sort || 0) - (b.card_sort || 0),
                );
              });

              return Object.entries(groups).map(([groupName, groupFields]) => (
                <Card
                  key={groupName}
                  title={groupName}
                  style={{ marginBottom: 16 }}
                  size="small"
                  styles={{ body: { padding: '16px 24px 8px 24px' } }}
                >
                  <Row gutter={16}>
                    {groupFields.map((field) => (
                      <Col
                        span={
                          field.card_width_span ||
                          getCardWidthSpan(field.card_width)
                        }
                        key={field.id}
                      >
                        {renderFormControl(field)}
                      </Col>
                    ))}
                  </Row>
                </Card>
              ));
            })()}
          </ProForm>
        </Modal>
      )}

      {renderFieldDrawer()}
    </PageContainer>
  );
};

export default FormDesign;
