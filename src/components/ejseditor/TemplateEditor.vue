<template>
  <div ref="editorContainer" class="template-editor"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const props = defineProps<{ code: string }>();
const editorContainer = ref<HTMLDivElement>();
let editorView: EditorView | undefined;

onMounted(() => {
  editorView = new EditorView({
    parent: editorContainer.value,
    state: EditorState.create({
      doc: props.code,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ tabindex: '0', 'aria-label': 'EJS 代码预览（只读）' }),
        EditorView.lineWrapping,
      ],
    }),
  });
});

watch(
  () => props.code,
  (code) => {
    if (!editorView || code === editorView.state.doc.toString()) return;
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: code },
    });
  }
);

onUnmounted(() => {
  editorView?.destroy();
});
</script>

<style scoped>
.template-editor {
  height: 100%;
  min-height: 0;
  min-width: 0;
}

:deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

:deep(.cm-scroller) {
  overflow: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
