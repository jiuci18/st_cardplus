<template>
  <div
    v-if="showBanner"
    class="system-banner"
  >
    <span class="banner-message">{{ bannerMessage }}</span>
    <div class="banner-actions">
      <ExternalLink
        v-if="bannerLink"
        :href="bannerLink"
        class="banner-link"
      >
        {{ bannerLinkText }}
      </ExternalLink>
      <button
        v-if="props.dismissible"
        class="banner-dismiss"
        @click="dismissBanner"
      >
        不再显示
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import ExternalLink from '@/components/common/ExternalLink.vue';
import { now, toDateSafe } from '@/utils/datetime';
import { onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    dismissible?: boolean;
    bannerId: string;
    startDate: string;
    endDate: string;
    message: string;
    link?: string;
    linkText?: string;
  }>(),
  {
    dismissible: true,
    link: '',
    linkText: '了解更多',
  }
);

const showBanner = ref(false);
const bannerMessage = ref(props.message);
const bannerLink = ref(props.link);
const bannerLinkText = ref(props.linkText);

const bannerStartDate = toDateSafe(props.startDate);
const bannerEndDate = toDateSafe(props.endDate);

const DISMISSED_KEY = 'systemBannerDismissed';

onMounted(() => {
  const currentTime = now();
  if (!bannerStartDate || !bannerEndDate) return;

  if (currentTime >= bannerStartDate && currentTime < bannerEndDate) {
    if (props.dismissible) {
      const dismissedBannersRaw = localStorage.getItem(DISMISSED_KEY);
      const dismissedBanners = dismissedBannersRaw ? JSON.parse(dismissedBannersRaw) : {};
      const dismissedTimestamp = dismissedBanners[props.bannerId];

      if (dismissedTimestamp) {
        const dismissedTime = toDateSafe(Number(dismissedTimestamp));
        if (!dismissedTime || dismissedTime < bannerStartDate) {
          showBanner.value = true;
        }
      } else {
        showBanner.value = true;
      }
    } else {
      showBanner.value = true;
    }
  }
});

const dismissBanner = () => {
  showBanner.value = false;
  const dismissedBannersRaw = localStorage.getItem(DISMISSED_KEY);
  const dismissedBanners = dismissedBannersRaw ? JSON.parse(dismissedBannersRaw) : {};
  dismissedBanners[props.bannerId] = now().getTime();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedBanners));
};
</script>

<style scoped>
.system-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  background-color: #f0f8ff;
  color: #333;
}

.banner-message {
  text-align: center;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.banner-link {
  color: #007bff;
  text-decoration: none;
}

.banner-link:hover {
  text-decoration: underline;
}

.banner-dismiss {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  background: none;
  border: 1px solid #ccc;
}

.banner-dismiss:hover {
  background-color: #e9ecef;
}

@media (max-width: 640px) {
  .system-banner {
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .banner-message {
    text-align: center;
    width: 100%;
  }

  .banner-actions {
    width: 100%;
    justify-content: center;
  }
}

:global(.dark) .system-banner {
  background-color: #1a365d;
  color: #e2e8f0;
}

:global(.dark) .banner-link {
  color: #63b3ed;
}

:global(.dark) .banner-dismiss {
  border-color: #4a5568;
  color: #a0aec0;
}

:global(.dark) .banner-dismiss:hover {
  background-color: #2d3748;
}
</style>
