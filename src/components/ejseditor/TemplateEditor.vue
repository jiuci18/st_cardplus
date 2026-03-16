<template>
  <div class="template-editor">
    <div
      v-if="initError"
      class="error-container"
    >
      <el-alert
        title="编辑器初始化失败"
        :description="initError"
        type="error"
        :closable="false"
        class="mb-4"
      />
      <el-button
        @click="retryInit"
        type="primary"
      >
        重新初始化
      </el-button>
    </div>
    <div
      v-else
      class="editor-container"
      ref="editorContainer"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, onErrorCaptured } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';
import { useEjsEditorStore } from '@/composables/ejs/ejsEditor';
import { ElAlert, ElButton } from 'element-plus';

const store = useEjsEditorStore();
const editorContainer = ref<HTMLElement>();
const editorView = ref<EditorView>();
const isUpdatingFromStore = ref(false);
const isUpdatingFromEditor = ref(false);
const isEditorLocked = ref(false);
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const initError = ref<string>('');

onErrorCaptured((err) => {
  initError.value = `组件错误: ${err instanceof Error ? err.message : '未知错误'}`;
  return false;
});

function createEditorState(content: string) {
  return EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      javascript(),
      oneDark,
      keymap.of([
        {
          key: 'Ctrl-s',
          preventDefault: true,
          run: () => true,
        },
        {
          key: 'Ctrl-g',
          preventDefault: true,
          run: () => {
            store.generateEjsTemplate();
            return true;
          },
        },
        {
          key: 'F5',
          preventDefault: true,
          run: () => {
            store.generateEjsTemplate();
            return true;
          },
        },
      ]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || isUpdatingFromStore.value || isEditorLocked.value) {
          return;
        }

        if (debounceTimer.value) {
          clearTimeout(debounceTimer.value);
        }

        debounceTimer.value = setTimeout(() => {
          if (isUpdatingFromStore.value || isEditorLocked.value || !editorView.value) {
            return;
          }

          isUpdatingFromEditor.value = true;

          try {
            const newValue = update.state.doc.toString();
            if (newValue !== store.ejsTemplate) {
              store.ejsTemplate = newValue;
              store.previewCode = newValue;
            }
          } finally {
            isUpdatingFromEditor.value = false;
          }
        }, 50);
      }),
    ],
  });
}

async function initializeEditor(content = store.ejsTemplate || '') {
  try {
    initError.value = '';
    await nextTick();

    if (!editorContainer.value) {
      throw new Error('编辑器容器未找到');
    }

    if (editorView.value) {
      editorView.value.destroy();
      editorView.value = undefined;
    }

    editorView.value = new EditorView({
      state: createEditorState(content),
      parent: editorContainer.value,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    initError.value = `初始化失败: ${errorMsg}`;
  }
}

async function retryInit() {
  isEditorLocked.value = true;
  isUpdatingFromStore.value = true;

  try {
    if (editorView.value) {
      editorView.value.destroy();
      editorView.value = undefined;
    }
    await initializeEditor();
  } finally {
    isUpdatingFromStore.value = false;
    isEditorLocked.value = false;
  }
}

onMounted(() => {
  void initializeEditor();
});

onUnmounted(() => {
  isEditorLocked.value = true;

  if (editorView.value) {
    editorView.value.destroy();
  }
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value);
  }
});

watch(
  () => store.ejsTemplate,
  (newValue) => {
    if (isEditorLocked.value || isUpdatingFromEditor.value || !editorView.value) {
      return;
    }

    const targetDoc = newValue || '';
    const currentDoc = editorView.value.state.doc.toString();
    if (targetDoc === currentDoc) {
      return;
    }

    isUpdatingFromStore.value = true;

    try {
      editorView.value.dispatch({
        changes: {
          from: 0,
          to: editorView.value.state.doc.length,
          insert: targetDoc,
        },
      });
    } catch (error) {
      initError.value = '编辑器状态同步失败，请点击重新初始化';
    } finally {
      isUpdatingFromStore.value = false;
    }
  },
  { flush: 'post' }
);
</script>

<style scoped>
.template-editor {
  flex: 1;
  position: relative;
  min-height: 0;
}

.editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.error-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: var(--el-bg-color);
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

:deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

:deep(.cm-focused) {
  outline: none;
}

:deep(.cm-scroller) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
