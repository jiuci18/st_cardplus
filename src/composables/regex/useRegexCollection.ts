import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { RegexCategory, RegexScriptCollection, SillyTavernRegexScript } from './types';
import { v4 as uuidv4 } from 'uuid';
import {
  getSessionStorageItem,
  readLocalStorageJSON,
  setSessionStorageItem,
  writeLocalStorageJSON,
} from '@/utils/localStorageUtils';
import { nowIso } from '@/utils/datetime';

const STORAGE_KEY = 'regex-script-collection';
const ACTIVE_CATEGORY_KEY = 'regex-active-category-id';

export function useRegexCollection() {
  const regexCollection = ref<RegexScriptCollection>({
    categories: {},
    activeCategoryId: null,
  });

  const activeCategoryId = computed(() => regexCollection.value.activeCategoryId);

  const activeCategory = computed<RegexCategory | null>(() => {
    const categoryId = activeCategoryId.value;
    if (!categoryId) return null;
    return regexCollection.value.categories[categoryId] || null;
  });

  // 保存到 localStorage
  const saveToStorage = () => {
    try {
      writeLocalStorageJSON(STORAGE_KEY, regexCollection.value.categories);
      if (regexCollection.value.activeCategoryId) {
        setSessionStorageItem(ACTIVE_CATEGORY_KEY, regexCollection.value.activeCategoryId);
      }
    } catch (error) {
      console.error('保存正则脚本集合失败:', error);
    }
  };

  // 从 localStorage 加载
  const loadFromStorage = () => {
    try {
      const saved = readLocalStorageJSON<Record<string, RegexCategory>>(STORAGE_KEY);
      const savedActiveId = getSessionStorageItem(ACTIVE_CATEGORY_KEY);

      if (saved) {
        regexCollection.value.categories = saved;
        regexCollection.value.activeCategoryId = savedActiveId;
        return true;
      }
      return false;
    } catch (error) {
      console.error('加载正则脚本集合失败:', error);
      return false;
    }
  };

  const loadInitialData = () => {
    const loaded = loadFromStorage();

    if (!loaded) {
      // 创建默认类别
      const defaultCategoryId = uuidv4();
      const now = nowIso();

      const defaultCategory: RegexCategory = {
        id: defaultCategoryId,
        name: '默认类别',
        scripts: [],
        createdAt: now,
        updatedAt: now,
        order: 0,
      };

      regexCollection.value.categories = {
        [defaultCategoryId]: defaultCategory,
      };
      regexCollection.value.activeCategoryId = defaultCategoryId;
      saveToStorage();
    }
  };

  onMounted(loadInitialData);

  const handleSelectCategory = (categoryId: string) => {
    if (regexCollection.value.categories[categoryId]) {
      regexCollection.value.activeCategoryId = categoryId;
      setSessionStorageItem(ACTIVE_CATEGORY_KEY, categoryId);
    }
  };

  const handleCreateCategory = async () => {
    try {
      const createCategoryResult = await ElMessageBox.prompt('请输入新类别的名称：', '创建新类别', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: categoryName } = createCategoryResult as { value: string };

      const newCategoryId = uuidv4();
      const now = nowIso();
      const existingOrders = Object.values(regexCollection.value.categories).map((c) => c.order);
      const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

      const newCategory: RegexCategory = {
        id: newCategoryId,
        name: categoryName,
        scripts: [],
        createdAt: now,
        updatedAt: now,
        order: maxOrder + 1,
      };

      regexCollection.value.categories[newCategoryId] = newCategory;
      regexCollection.value.activeCategoryId = newCategoryId;
      saveToStorage();

      ElMessage.success(`类别 "${categoryName}" 已创建！`);
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('创建操作已取消');
      }
    }
  };

  const handleRenameCategory = async (categoryId: string) => {
    const category = regexCollection.value.categories[categoryId];
    if (!category) return;

    try {
      const renameCategoryResult = await ElMessageBox.prompt('请输入新的名称：', '重命名类别', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputValue: category.name,
        inputPattern: /.+/,
        inputErrorMessage: '名称不能为空',
      });
      const { value: newCategoryName } = renameCategoryResult as { value: string };

      category.name = newCategoryName;
      category.updatedAt = nowIso();
      saveToStorage();

      ElMessage.success('类别已重命名！');
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('重命名操作已取消');
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = regexCollection.value.categories[categoryId];
    if (!category) return;

    if (Object.keys(regexCollection.value.categories).length <= 1) {
      ElMessage.warning('不能删除最后一个类别');
      return;
    }

    try {
      await ElMessageBox.confirm(`确定要删除类别 "${category.name}" 吗？此类别下的所有脚本也会被删除！`, '删除类别', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });

      delete regexCollection.value.categories[categoryId];

      if (regexCollection.value.activeCategoryId === categoryId) {
        const newActiveId = Object.keys(regexCollection.value.categories)[0] || null;
        regexCollection.value.activeCategoryId = newActiveId;
      }

      saveToStorage();
      ElMessage.success(`类别 "${category.name}" 已删除`);
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('删除操作已取消');
      }
    }
  };

  const handleCreateScript = (scriptName: string = '新规则') => {
    if (!activeCategory.value) {
      ElMessage.error('请先选择一个类别');
      return null;
    }

    const newScript: SillyTavernRegexScript = {
      id: `script-${Date.now()}-${uuidv4()}`,
      scriptName,
      findRegex: '',
      replaceString: '',
      trimStrings: [],
      placement: [],
      disabled: false,
      markdownOnly: false,
      promptOnly: false,
      runOnEdit: false,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      categoryId: activeCategory.value.id,
    };

    activeCategory.value.scripts.push(newScript);
    activeCategory.value.updatedAt = nowIso();
    saveToStorage();

    return newScript;
  };

  const handleUpdateScript = (scriptId: string, updates: Partial<SillyTavernRegexScript>) => {
    // 在所有类别中查找该脚本
    for (const category of Object.values(regexCollection.value.categories)) {
      const scriptIndex = category.scripts.findIndex((s) => s.id === scriptId);
      if (scriptIndex !== -1) {
        Object.assign(category.scripts[scriptIndex], updates);
        category.updatedAt = nowIso();
        saveToStorage();
        return;
      }
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    // 在所有类别中查找该脚本
    let foundCategory: RegexCategory | null = null;
    let scriptIndex = -1;

    for (const category of Object.values(regexCollection.value.categories)) {
      const index = category.scripts.findIndex((s) => s.id === scriptId);
      if (index !== -1) {
        foundCategory = category;
        scriptIndex = index;
        break;
      }
    }

    if (!foundCategory || scriptIndex === -1) {
      ElMessage.error('未找到要删除的脚本');
      return;
    }

    const script = foundCategory.scripts[scriptIndex];

    try {
      await ElMessageBox.confirm(`确定要删除脚本 "${script.scriptName}" 吗？此操作不可恢复！`, '删除脚本', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });

      foundCategory.scripts.splice(scriptIndex, 1);
      foundCategory.updatedAt = nowIso();
      saveToStorage();

      ElMessage.success(`脚本 "${script.scriptName}" 已删除`);
    } catch (error) {
      if (error !== 'cancel' && error !== 'close') {
        ElMessage.info('删除操作已取消');
      }
    }
  };

  const moveScriptBetweenCategories = (
    scriptId: string,
    fromCategoryId: string,
    toCategoryId: string,
    insertIndex: number
  ) => {
    const fromCategory = regexCollection.value.categories[fromCategoryId];
    const toCategory = regexCollection.value.categories[toCategoryId];

    if (!fromCategory || !toCategory) {
      ElMessage.error('移动脚本失败：源或目标类别未找到');
      return false;
    }

    const scriptIndex = fromCategory.scripts.findIndex((s) => s.id === scriptId);
    if (scriptIndex === -1) {
      ElMessage.error('移动脚本失败：在源类别中未找到该脚本');
      return false;
    }

    const script = fromCategory.scripts[scriptIndex];
    fromCategory.scripts.splice(scriptIndex, 1);

    script.categoryId = toCategoryId;
    toCategory.scripts.splice(insertIndex, 0, script);

    const now = nowIso();
    fromCategory.updatedAt = now;
    toCategory.updatedAt = now;

    saveToStorage();
    return true;
  };

  const updateCategoryScripts = (categoryId: string, scripts: SillyTavernRegexScript[]) => {
    const category = regexCollection.value.categories[categoryId];
    if (category) {
      category.scripts = scripts;
      category.updatedAt = nowIso();
      saveToStorage();
    }
  };

  // 从角色卡导入正则脚本
  const handleImportFromCharacterCard = async (
    scripts: SillyTavernRegexScript[],
    characterCardId: string,
    characterName: string
  ): Promise<string | null> => {
    if (!scripts || scripts.length === 0) {
      ElMessage.warning('没有可导入的正则脚本');
      return null;
    }

    const proposedName = characterName || '未命名角色';

    // 检查是否存在同名分类
    const existingCategory = Object.values(regexCollection.value.categories).find((cat) => cat.name === proposedName);

    let targetCategoryId: string;
    let targetCategoryName = proposedName;

    if (existingCategory) {
      try {
        const { action } = await ElMessageBox.confirm(
          `检测到已存在名为 "${proposedName}" 的分类。\n\n请选择操作方式：`,
          '分类名称冲突',
          {
            distinguishCancelAndClose: true,
            confirmButtonText: '合并到已有分类',
            cancelButtonText: '创建新分类',
            type: 'warning',
          }
        )
          .then(() => ({ action: 'merge' as const }))
          .catch((error) => {
            if (error === 'cancel') {
              return { action: 'create' as const };
            }
            throw error;
          });

        if (action === 'merge') {
          targetCategoryId = existingCategory.id;

          // 合并脚本到已有分类
          const newScripts = scripts.map((script) => ({
            ...script,
            id: `script-${Date.now()}-${uuidv4()}`,
            categoryId: targetCategoryId,
          }));

          existingCategory.scripts.push(...newScripts);
          existingCategory.updatedAt = nowIso();

          // 更新 metadata
          if (!existingCategory.metadata) {
            existingCategory.metadata = {};
          }
          existingCategory.metadata.source = 'character-card';
          existingCategory.metadata.characterCardId = characterCardId;
          existingCategory.metadata.characterName = characterName;

          saveToStorage();
          ElMessage.success(`已将 ${scripts.length} 个正则脚本合并到分类 "${proposedName}"`);
          return targetCategoryId;
        } else {
          // 创建新分类 - 自动添加数字后缀
          let suffix = 1;
          let newName = `${proposedName}-${suffix}`;
          while (Object.values(regexCollection.value.categories).some((cat) => cat.name === newName)) {
            suffix++;
            newName = `${proposedName}-${suffix}`;
          }
          targetCategoryName = newName;
        }
      } catch (error) {
        if (error === 'close') {
          ElMessage.info('导入操作已取消');
          return null;
        }
        throw error;
      }
    }

    // 创建新分类
    targetCategoryId = uuidv4();
    const now = nowIso();
    const existingOrders = Object.values(regexCollection.value.categories).map((c) => c.order);
    const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : -1;

    const newScripts = scripts.map((script) => ({
      ...script,
      id: `script-${Date.now()}-${uuidv4()}`,
      categoryId: targetCategoryId,
    }));

    const newCategory: RegexCategory = {
      id: targetCategoryId,
      name: targetCategoryName,
      scripts: newScripts,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
      metadata: {
        source: 'character-card',
        characterCardId,
        characterName,
      },
    };

    regexCollection.value.categories[targetCategoryId] = newCategory;
    regexCollection.value.activeCategoryId = targetCategoryId;
    saveToStorage();

    ElMessage.success(`已创建分类 "${targetCategoryName}" 并导入 ${scripts.length} 个正则脚本`);
    return targetCategoryId;
  };

  return {
    regexCollection,
    activeCategoryId,
    activeCategory,
    handleSelectCategory,
    handleCreateCategory,
    handleRenameCategory,
    handleDeleteCategory,
    handleCreateScript,
    handleUpdateScript,
    handleDeleteScript,
    moveScriptBetweenCategories,
    updateCategoryScripts,
    saveToStorage,
    handleImportFromCharacterCard,
  };
}
