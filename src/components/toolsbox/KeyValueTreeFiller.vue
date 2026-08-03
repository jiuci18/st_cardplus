<script setup lang="ts">
import KeyValueTreeNode from '@/components/toolsbox/KeyValueTreeNode.vue';
import type { KeyValueNode } from '@/types/key-value-tree';
import { readLocalStorageJSON, localStorageStore, writeLocalStorageJSON } from '@/utils/localStorageUtils';
import { saveFile } from '@/utils/system/fileSave';
import { Icon } from '@iconify/vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { dump as dumpYaml } from 'js-yaml';
import { computed, ref, watch } from 'vue';

type ExportFormat = 'json' | 'yaml';

interface KeyValueTreeDraft {
  version: 1;
  nodes: KeyValueNode[];
  fileName: string;
  previewFormat: ExportFormat;
}

const DRAFT_STORAGE_KEY = 'toolbox.keyValueTreeFiller.draft';

let fallbackId = 0;

function createNodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  fallbackId += 1;
  return `key-value-node-${Date.now()}-${fallbackId}`;
}

function createFieldNode(): KeyValueNode {
  return { id: createNodeId(), key: '新节点', value: '' };
}

function isKeyValueNode(value: unknown): value is KeyValueNode {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KeyValueNode>;
  if (typeof candidate.id !== 'string' || typeof candidate.key !== 'string' || typeof candidate.value !== 'string') {
    return false;
  }
  return candidate.children === undefined || (Array.isArray(candidate.children) && candidate.children.every(isKeyValueNode));
}

function readDraft(): KeyValueTreeDraft | null {
  const value = readLocalStorageJSON<unknown>(DRAFT_STORAGE_KEY);
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<KeyValueTreeDraft>;
  if (candidate.version !== 1 || !Array.isArray(candidate.nodes)) return null;
  if (typeof candidate.fileName !== 'string') return null;
  if (candidate.previewFormat !== 'json' && candidate.previewFormat !== 'yaml') return null;
  if (!candidate.nodes.every(isKeyValueNode)) return null;
  return candidate as KeyValueTreeDraft;
}

const restoredDraft = readDraft();
const nodes = ref<KeyValueNode[]>(restoredDraft?.nodes ?? []);
const fileName = ref(restoredDraft?.fileName ?? 'worldbuilding');
const previewFormat = ref<ExportFormat>(restoredDraft?.previewFormat ?? 'json');

const errors = computed(() => {
  const result: Record<string, string> = {};
  const visit = (siblings: readonly KeyValueNode[]): void => {
    const byKey = new Map<string, KeyValueNode[]>();
    for (const node of siblings) {
      const key = node.key.trim();
      if (!key) result[node.id] = '键不能为空';
      else byKey.set(key, [...(byKey.get(key) ?? []), node]);
      if (node.children) visit(node.children);
    }
    for (const [key, matches] of byKey) {
      if (matches.length > 1) matches.forEach((node) => (result[node.id] = `同级键“${key}”重复`));
    }
  };
  visit(nodes.value);
  return result;
});
const errorCount = computed(() => Object.keys(errors.value).length);
const canExport = computed(() => nodes.value.length > 0 && errorCount.value === 0);
const preview = computed(() => {
  if (errorCount.value > 0) return '请先修正左侧标记的问题。';
  return serializeTree(previewFormat.value);
});

watch(
  [nodes, fileName, previewFormat],
  () => {
    writeLocalStorageJSON(DRAFT_STORAGE_KEY, {
      version: 1,
      nodes: nodes.value,
      fileName: fileName.value,
      previewFormat: previewFormat.value,
    } satisfies KeyValueTreeDraft);
  },
  { deep: true },
);

function updateNode(nodeId: string, updater: (node: KeyValueNode) => KeyValueNode): void {
  const visit = (items: readonly KeyValueNode[]): KeyValueNode[] =>
    items.map((node) => {
      if (node.id === nodeId) return updater(node);
      if (node.children) return { ...node, children: visit(node.children) };
      return node;
    });

  nodes.value = visit(nodes.value);
}

function updateKey(nodeId: string, key: string): void {
  updateNode(nodeId, (node) => ({ ...node, key }));
}

function updateValue(nodeId: string, value: string): void {
  updateNode(nodeId, (node) => ({ ...node, value }));
}

function addRootNode(): void {
  nodes.value = [...nodes.value, createFieldNode()];
}

function addChildNode(nodeId: string): void {
  let discardedValue = false;
  updateNode(nodeId, (node) => {
    const child = createFieldNode();
    if (node.children) return { ...node, children: [...node.children, child] };
    discardedValue = node.value.length > 0;
    return { ...node, value: '', children: [child] };
  });
  if (discardedValue) ElMessage.info('该字段已转换为对象，原字段值已清除');
}

function removeNode(nodeId: string): void {
  const remove = (items: readonly KeyValueNode[]): KeyValueNode[] =>
    items
      .filter((node) => node.id !== nodeId)
      .map((node) => (node.children ? { ...node, children: remove(node.children) } : node));

  nodes.value = remove(nodes.value);
}

function normalizedFileName(): string {
  const withoutExtension = fileName.value.trim().replace(/\.(?:json|ya?ml)$/i, '');
  return withoutExtension.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'worldbuilding';
}

function treeToObject(items: readonly KeyValueNode[]): Record<string, unknown> {
  return Object.fromEntries(
    items.map((node) => [node.key.trim(), node.children ? treeToObject(node.children) : node.value]),
  );
}

function serializeTree(format: ExportFormat): string {
  const data = treeToObject(nodes.value);
  return format === 'json'
    ? `${JSON.stringify(data, null, 2)}\n`
    : dumpYaml(data, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
}

async function exportFile(format: ExportFormat): Promise<void> {
  if (!canExport.value) {
    ElMessage.warning(nodes.value.length === 0 ? '请先添加节点' : '请先修正无效的键');
    return;
  }

  const extension = format === 'json' ? 'json' : 'yml';
  const content = serializeTree(format);
  const result = await saveFile({
    data: new TextEncoder().encode(content),
    fileName: `${normalizedFileName()}.${extension}`,
    mimeType: format === 'json' ? 'application/json' : 'application/yaml',
    rememberDirKey: 'save.keyValueTreeFillerDir',
  });
  if (!result.canceled) ElMessage.success(`${extension.toUpperCase()} 文件已保存`);
}

async function clearDraft(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定清空当前树和本地草稿吗？', '确认清空', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  nodes.value = [];
  fileName.value = 'worldbuilding';
  previewFormat.value = 'json';
  localStorageStore.remove(DRAFT_STORAGE_KEY);
  ElMessage.success('已清空');
}
</script>

<template>
  <div class="key-value-filler">
    <header class="page-header">
      <el-button type="primary" plain class="back-button" @click="$router.push('/toolbox')">
        <Icon icon="material-symbols:arrow-back" width="16" height="16" />
        返回工具箱
      </el-button>
      <div class="title-row">
        <h1>树状键值填写器</h1>
        <el-tag type="warning" effect="dark" size="small">Beta</el-tag>
      </div>
    </header>

    <el-alert class="description" type="info" :closable="false" title="用节点树整理嵌套键值；叶节点的值始终按字符串导出。给字段添加子节点会将它转换为对象。" />

    <div class="export-bar">
      <el-input v-model="fileName" class="file-name" placeholder="文件名" aria-label="导出文件名" />
      <el-button type="primary" :disabled="!canExport" @click="exportFile('json')">
        <Icon icon="material-symbols:download" />
        下载 JSON
      </el-button>
      <el-button type="success" :disabled="!canExport" @click="exportFile('yaml')">
        <Icon icon="material-symbols:download" />
        下载 YAML
      </el-button>
      <el-button type="danger" plain @click="clearDraft">清空</el-button>
    </div>

    <div class="workspace">
      <section class="tree-panel">
        <div class="panel-header tree-panel-header">
          <strong>节点树</strong>
          <el-button type="primary" size="small" @click="addRootNode">
            <Icon icon="material-symbols:add" />
            添加根节点
          </el-button>
        </div>

        <div class="tree-content">
          <div v-if="nodes.length === 0" class="empty-tree">
            <Icon icon="material-symbols:account-tree-outline" width="44" height="44" />
            <span>暂无节点</span>
            <el-button type="primary" plain size="small" @click="addRootNode">添加第一个节点</el-button>
          </div>
          <KeyValueTreeNode v-for="node in nodes" v-else :key="node.id" :node="node" :errors="errors"
            @update-key="updateKey" @update-value="updateValue" @add-child="addChildNode" @remove="removeNode" />
        </div>
      </section>

      <el-card class="preview-panel" shadow="never">
        <template #header>
          <div class="panel-header">
            <strong>实时预览</strong>
            <el-radio-group v-model="previewFormat" size="small">
              <el-radio-button value="json">JSON</el-radio-button>
              <el-radio-button value="yaml">YAML</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <el-alert v-if="errorCount > 0" class="validation-alert" type="error" :closable="false"
          :title="`发现 ${errorCount} 个键名问题，修正后即可导出。`" />
        <pre class="preview" :class="{ invalid: errorCount > 0 }">{{ preview }}</pre>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.key-value-filler {
  width: 100%;
  max-width: 1440px;
  min-height: 100%;
  margin: 0 auto;
  padding: 20px;
}

.page-header,
.title-row,
.export-bar,
.panel-header {
  display: flex;
  align-items: center;
}

.page-header {
  gap: 16px;
  margin-bottom: 16px;
}

.title-row {
  gap: 10px;
}

.title-row h1 {
  margin: 0;
}

.description {
  margin-bottom: 16px;
}

.export-bar {
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.file-name {
  width: 260px;
  margin-right: auto;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
  gap: 16px;
  align-items: stretch;
}

.tree-panel,
.preview-panel {
  min-width: 0;
}

.tree-panel-header {
  min-height: 52px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-light);
}

.tree-content {
  padding: 14px 0;
}

.panel-header {
  justify-content: space-between;
  gap: 12px;
}

.empty-tree {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--el-text-color-secondary);
}

.validation-alert {
  margin-bottom: 10px;
}

.preview {
  min-height: 420px;
  max-height: calc(100vh - 340px);
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 6px;
  background: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
  font: 13px/1.55 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.preview.invalid {
  color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .preview {
    min-height: 280px;
    max-height: 480px;
  }
}

@media (max-width: 600px) {
  .key-value-filler {
    padding: 12px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .title-row h1 {
    font-size: 1.55rem;
  }

  .file-name {
    width: 100%;
    margin-right: 0;
  }

  .export-bar :deep(.el-button) {
    flex: 1;
    margin-left: 0;
  }
}
</style>
