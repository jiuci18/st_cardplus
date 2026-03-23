import { getSidebarConfig, type SidebarConfig } from '@/utils/localStorageUtils';
import { ref } from 'vue';

export function usePersonalization() {
  const sidebarConfig = ref<SidebarConfig>(getSidebarConfig());

  const refreshSidebarConfig = () => {
    sidebarConfig.value = getSidebarConfig();
  };

  return {
    sidebarConfig,
    refreshSidebarConfig,
  };
}
