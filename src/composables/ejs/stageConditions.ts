import type { Condition, ConditionGroup, Stage } from '@/types/ejs-editor';

type SimulationValues = Record<string, unknown>;

function formatConditionDisplayValue(value: unknown): string {
  return typeof value === 'string' ? `'${value}'` : String(value);
}

function formatSingleCondition(condition: Condition): string {
  const { variableAlias, type, value, endValue } = condition;
  const variableName = variableAlias || '变量';
  const valueLabel = formatConditionDisplayValue(value);

  switch (type) {
    case 'less':
      return `${variableName} < ${valueLabel}`;
    case 'lessEqual':
      return `${variableName} <= ${valueLabel}`;
    case 'equal':
      return `${variableName} == ${valueLabel}`;
    case 'greater':
      return `${variableName} > ${valueLabel}`;
    case 'greaterEqual':
      return `${variableName} >= ${valueLabel}`;
    case 'range':
      return `${variableName} in [${valueLabel}, ${formatConditionDisplayValue(endValue)})`;
    case 'is':
      return `${variableName} is ${valueLabel}`;
    case 'isNot':
      return `${variableName} is not ${valueLabel}`;
    default:
      return '未知条件';
  }
}

export function formatStageConditions(stage: Stage): string {
  if (!stage.conditionGroups?.length) {
    return '无条件 (始终激活)';
  }

  const groupStrings = stage.conditionGroups
    .map((group) => {
      if (!group.conditions?.length) {
        return null;
      }

      return `(${group.conditions.map(formatSingleCondition).join(' AND ')})`;
    })
    .filter((group): group is string => Boolean(group));

  return groupStrings.length > 0 ? groupStrings.join(' OR ') : '无条件 (始终激活)';
}

function getSimulationValue(variablePath: string, simulationValues: SimulationValues): unknown {
  const fullPath = variablePath.startsWith('stat_data.') ? variablePath : `stat_data.${variablePath}`;

  if (Object.prototype.hasOwnProperty.call(simulationValues, fullPath)) {
    return simulationValues[fullPath];
  }

  if (Object.prototype.hasOwnProperty.call(simulationValues, variablePath)) {
    return simulationValues[variablePath];
  }

  return undefined;
}

function matchesCondition(condition: Condition, simulationValues: SimulationValues): boolean {
  const simValue = getSimulationValue(condition.variablePath, simulationValues);
  if (simValue === undefined) {
    return false;
  }

  const numSimValue = Number(simValue);
  const numCondValue = Number(condition.value);

  if (!Number.isNaN(numSimValue) && !Number.isNaN(numCondValue)) {
    switch (condition.type) {
      case 'less':
        return numSimValue < numCondValue;
      case 'lessEqual':
        return numSimValue <= numCondValue;
      case 'equal':
        return numSimValue == numCondValue;
      case 'greater':
        return numSimValue > numCondValue;
      case 'greaterEqual':
        return numSimValue >= numCondValue;
      case 'range': {
        const numCondEndValue = Number(condition.endValue);
        if (Number.isNaN(numCondEndValue)) {
          return false;
        }
        return numSimValue >= numCondValue && numSimValue < numCondEndValue;
      }
      case 'is':
        return simValue === condition.value;
      case 'isNot':
        return simValue !== condition.value;
    }
  }

  const strSimValue = String(simValue);
  const strCondValue = String(condition.value);

  switch (condition.type) {
    case 'equal':
      return strSimValue == strCondValue;
    case 'is':
      return strSimValue === strCondValue;
    case 'isNot':
      return strSimValue !== strCondValue;
    default:
      return false;
  }
}

function matchesConditionGroup(group: ConditionGroup, simulationValues: SimulationValues): boolean {
  if (!group.conditions?.length) {
    return true;
  }

  return group.conditions.every((condition) => matchesCondition(condition, simulationValues));
}

export function matchesStage(stage: Stage, simulationValues: SimulationValues): boolean {
  if (!stage.conditionGroups?.length) {
    return true;
  }

  return stage.conditionGroups.some((group) => matchesConditionGroup(group, simulationValues));
}
