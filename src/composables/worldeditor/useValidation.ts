import { reactive } from 'vue';
import type { ValidationRule } from '@/types/worldeditor/world-editor';
import { ValidationType } from '@/types/worldeditor/world-editor';

export function useValidation() {
  const errors = reactive<Record<string, string>>({});

  const validate = (item: any, rules: ValidationRule[]): boolean => {
    // Clear previous errors
    Object.keys(errors).forEach((key) => delete errors[key]);

    let isValid = true;
    for (const rule of rules) {
      const value = item[rule.field];

      switch (rule.rule) {
        case ValidationType.REQUIRED:
          if (!value) {
            errors[rule.field] = rule.message;
            isValid = false;
          }
          break;
        case ValidationType.MIN_LENGTH:
          if (value && value.length < rule.params.min) {
            errors[rule.field] = rule.message;
            isValid = false;
          }
          break;
        case ValidationType.MAX_LENGTH:
          if (value && value.length > rule.params.max) {
            errors[rule.field] = rule.message;
            isValid = false;
          }
          break;
        // Other rules like UNIQUE, PATTERN can be added here
      }
    }
    return isValid;
  };

  return { errors, validate };
}

export const forceValidationRules: ValidationRule[] = [
  {
    field: 'name',
    rule: ValidationType.REQUIRED,
    message: '势力名称不能为空',
  },
  {
    field: 'description',
    rule: ValidationType.MIN_LENGTH,
    message: '描述至少需要10个字符',
    params: { min: 10 },
  },
];
