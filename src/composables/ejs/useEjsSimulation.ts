import { ref } from 'vue';
import type { Ref } from 'vue';
import ejs from 'ejs';
import type { LogicBlock } from '@/types/ejs-editor';
import { matchesStage } from '@/composables/ejs/stageConditions';

export function useEjsSimulation(ejsTemplate: Ref<string>, logicBlocks: Ref<LogicBlock[]>) {
  const simulationValues = ref<Record<string, any>>({});
  const testResult = ref('');

  function testSimulation() {
    if (!ejsTemplate.value) {
      testResult.value = '';
      return;
    }
    try {
      const mockGetvar = (path: string) => {
        // 确保返回的值类型正确，特别是数字
        const simValue = simulationValues.value[path];
        if (simValue === undefined || simValue === null || simValue === '') return simValue;
        const numValue = Number(simValue);
        return !isNaN(numValue) ? numValue : simValue;
      };

      const result = ejs.render(ejsTemplate.value, { getvar: mockGetvar });
      const trimmedResult = result.trim();

      if (trimmedResult) {
        testResult.value = trimmedResult;
      } else {
        const anyMatch = logicBlocks.value.some((block) =>
          block.stages.some((stage) => matchesStage(stage, simulationValues.value))
        );

        if (anyMatch) {
          testResult.value = '';
        } else {
          const defaultContent = logicBlocks.value.find((b) => b.enabled)?.defaultStageContent;
          testResult.value = defaultContent || '// 默认情况';
        }
      }
    } catch (error) {
      testResult.value = `测试错误: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  return {
    simulationValues,
    testResult,
    testSimulation,
  };
}
