import React, { useEffect, useState } from 'react';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Spin, Result, Button, message, Select, Space, Input, List, Empty, Tooltip } from 'antd';
import { useSearchParams } from '@umijs/max';
import { SearchOutlined, ReloadOutlined, SaveOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import { getWikiTree, getWikiContent, getWikiRelations, saveWikiRelations } from '@/services/wiki';
import { getProjects } from '@/services/formDesign';
import styles from './index.less';

export default function ProjectWiki() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentKey = searchParams.get('key') || '';
  const currentProjectParam = searchParams.get('project') || '';
  
  // 状态管理
  const [wikiTree, setWikiTree] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [error404, setError404] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [currentProject, setCurrentProject] = useState<string>('');
  
  // 关联项目状态
  const [relatedProjects, setRelatedProjects] = useState<number[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);
  const [savingRelations, setSavingRelations] = useState(false);

  // 1. 初始化拉取目录树与项目列表
  const initTreeAndProjects = async (isRefresh = false) => {
    setLoadingTree(true);
    try {
      const treeRes = await getWikiTree(currentProjectParam || undefined, isRefresh);
      if (treeRes.success) {
        setWikiTree(treeRes.data || []);
        const projectsList = treeRes.projects || [];
        const resolvedProject = treeRes.currentProject || '';
        setProjects(projectsList);
        setCurrentProject(resolvedProject);
        
        // 同步默认或确定的 project 到 URL query
        if (currentProjectParam !== resolvedProject && resolvedProject) {
          setSearchParams({
            project: resolvedProject,
            key: currentKey || undefined
          });
        }
      } else {
        message.error('获取 Wiki 目录失败');
      }
      
      const projRes = await getProjects();
      if (projRes.success) {
        setAllProjects(projRes.data || []);
      }
    } catch (err) {
      console.error('初始化数据发生异常', err);
      message.error('拉取数据服务异常');
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    initTreeAndProjects();
  }, [currentProjectParam]);

  // 2. 监听 URL 的 key 变化，自动拉取 Wiki 文档内容
  useEffect(() => {
    if (wikiTree.length === 0) return;

    // 检查当前 URL 里的 key 是否属于当前的树
    const keyExists = wikiTree.some(item => item.wiki_key === currentKey);

    // 如果当前没有 key，或者 key 在当前目录树中不存在，就默认选中树的第一项
    if (!currentKey || !keyExists) {
      setSearchParams({
        project: currentProject,
        key: wikiTree[0].wiki_key
      });
      return;
    }

    const fetchContent = async () => {
      setLoadingContent(true);
      setError404(false);
      try {
        const res = await getWikiContent(currentKey);
        if (res.success) {
          setContent(res.data.content);
        } else {
          setError404(true);
        }
      } catch (err: any) {
        // 捕获 404 异常
        if (err.response?.status === 404 || err.statusCode === 404 || err.message?.includes('WIKI_FILE_NOT_FOUND')) {
          setError404(true);
        } else {
          message.error('加载 Wiki 正文失败');
        }
      } finally {
        setLoadingContent(false);
      }
    };

    fetchContent();
  }, [currentKey, wikiTree, currentProject]);

  // 3. 监听当前选中的 Wiki 变化，拉取它对应的项目关联关系
  useEffect(() => {
    if (!currentKey) return;
    const fetchRelations = async () => {
      setLoadingRelations(true);
      try {
        const res = await getWikiRelations({ wiki_key: currentKey });
        if (res.success) {
          setRelatedProjects((res.data as number[]) || []);
        }
      } catch (err) {
        console.error('拉取关联关系出错', err);
      } finally {
        setLoadingRelations(false);
      }
    };
    fetchRelations();
  }, [currentKey]);

  // 4. 保存多对多关联关系
  const handleSaveRelations = async () => {
    if (!currentKey) return;
    setSavingRelations(true);
    try {
      const res = await saveWikiRelations({
        wiki_key: currentKey,
        project_ids: relatedProjects,
      });
      if (res.success) {
        message.success('双向关联项目配置已更新保存');
      } else {
        message.error('保存关联关系失败');
      }
    } catch (err) {
      console.error('保存关联异常', err);
      message.error('保存关联服务异常');
    } finally {
      setSavingRelations(false);
    }
  };

  // 5. 过滤左侧目录
  const filteredTree = wikiTree.filter(item => {
    const text = filterText.toLowerCase();
    return (
      item.title.toLowerCase().includes(text) ||
      (item.desc && item.desc.toLowerCase().includes(text))
    );
  });

  // 6. 处理 Markdown 内链接点击事件，实现页面内平滑跳转
  const handleMarkdownClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/form-design/wiki?key=')) {
        e.preventDefault();
        const url = new URL(href, window.location.origin);
        const key = url.searchParams.get('key');
        if (key) {
          // 根据去后缀匹配，在目录树中还原完整的带有 .md 后缀的物理 wiki_key
          const matched = wikiTree.find(item => {
            const keyWithoutMd = item.wiki_key.endsWith('.md')
              ? item.wiki_key.slice(0, -3)
              : item.wiki_key;
            return keyWithoutMd === key;
          });
          setSearchParams({ key: matched ? matched.wiki_key : key + '.md' });
        }
      }
    }
  };

  // 将 Markdown 正文解析为 HTML
  const getHtmlContent = () => {
    try {
      return { __html: marked.parse(content) };
    } catch (e) {
      console.error('Markdown 编译错误', e);
      return { __html: `<p style="color:red">Markdown 渲染失败</p><pre>${content}</pre>` };
    }
  };

  const selectedItem = wikiTree.find(item => item.wiki_key === currentKey);

  return (
    <PageContainer
      title="项目Wiki知识库"
      subTitle="直接映射与多对多关联评估项目的 Obsidian 文档阅读系统"
      extra={[
        <Tooltip key="refresh" title="强制物理扫描及解析并清除缓存">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => initTreeAndProjects(true)}
            loading={loadingTree}
          >
            强制刷新
          </Button>
        </Tooltip>
      ]}
    >
      <div className={styles['wiki-container']}>
        <ProCard split="vertical" bordered headerBordered style={{ borderRadius: '8px', overflow: 'hidden' }}>
          {/* 左栏：菜单树与检索 */}
          <ProCard colSpan="320px" ghost style={{ padding: '8px' }}>
            <div style={{ padding: '0 8px 12px 8px' }}>
              <div style={{ marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#595959' }}>知识库项目：</div>
              <Select
                style={{ width: '100%', marginBottom: '12px' }}
                value={currentProject}
                onChange={(value) => {
                  // 切换项目时，更新 URL 参数，清除文档选中 key 触发自动载入新项目首篇
                  setSearchParams({ project: value });
                }}
                options={projects.map(p => ({ label: p, value: p }))}
              />
              <Input
                placeholder="搜索标题或简要描述..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                allowClear
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                style={{ borderRadius: '6px' }}
              />
            </div>
            
            <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', padding: '0 8px' }}>
              {loadingTree ? (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                  <Spin size="default" tip="扫描知识库..." />
                </div>
              ) : filteredTree.length > 0 ? (
                filteredTree.map(item => (
                  <div
                    key={item.wiki_key}
                    onClick={() => setSearchParams({ key: item.wiki_key })}
                    className={currentKey === item.wiki_key ? styles['wiki-menu-item-active'] : styles['wiki-menu-item']}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FileTextOutlined style={{ marginRight: '8px', color: currentKey === item.wiki_key ? '#1677ff' : '#8c8c8c' }} />
                      <span style={{ fontWeight: 500, fontSize: '14px' }}>{item.title}</span>
                      {!item.inIndex && (
                        <span style={{
                          fontSize: '10px',
                          color: '#faad14',
                          backgroundColor: '#fffbe6',
                          border: '1px solid #ffe58f',
                          padding: '0 4px',
                          borderRadius: '4px',
                          marginLeft: '8px'
                        }}>
                          未索引
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <div style={{ fontSize: '12px', color: currentKey === item.wiki_key ? 'rgba(0, 0, 0, 0.65)' : '#8c8c8c', marginTop: '6px', lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <Empty description="没有匹配的知识文档" style={{ marginTop: '40px' }} />
              )}
            </div>
          </ProCard>

          {/* 右栏：富文本查阅及双向关联 */}
          <ProCard ghost style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {loadingContent ? (
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                <Spin size="large" tip="高精解析 Markdown 渲染中..." />
              </div>
            ) : error404 ? (
              <Result
                status="404"
                title="WIKI_FILE_NOT_FOUND"
                subTitle="您访问的 Markdown 文档不存在，或者可能已被删除、重命名。"
                extra={
                  <Button type="primary" onClick={() => initTreeAndProjects(true)}>
                    刷新列表并重试
                  </Button>
                }
              />
            ) : selectedItem ? (
              <div style={{ padding: '8px 24px 24px 24px' }}>
                {/* 顶层关联配置区 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600 }}>{selectedItem.title}</h2>
                    <span style={{ fontSize: '12px', color: '#bfbfbf' }}>路径: {selectedItem.wiki_key}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px', fontSize: '13px', color: '#595959' }}>
                      <LinkOutlined style={{ marginRight: '4px' }} /> 关联项目评估:
                    </span>
                    <Space size="small">
                      <Select
                        mode="multiple"
                        placeholder="绑定项目评估记录..."
                        style={{ minWidth: '220px', maxWidth: '360px' }}
                        value={relatedProjects}
                        onChange={value => setRelatedProjects(value)}
                        loading={loadingRelations}
                        options={allProjects.map(p => ({ label: p.name, value: p.id }))}
                        maxTagCount="responsive"
                      />
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={savingRelations}
                        onClick={handleSaveRelations}
                      >
                        保存关联
                      </Button>
                    </Space>
                  </div>
                </div>

                {/* Markdown 渲染正文 */}
                <div
                  className={styles['markdown-body']}
                  dangerouslySetInnerHTML={getHtmlContent()}
                  onClick={handleMarkdownClick}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '100px' }}>
                <Empty description="请从左侧选择需要查阅的文档" />
              </div>
            )}
          </ProCard>
        </ProCard>
      </div>
    </PageContainer>
  );
}
