<template>
  <div class="about-page">
    <!-- 头部信息 -->
    <div class="hero-card">
      <h1 class="hero-title">
        ST CardPlus
        <span
          v-if="isDevDomain"
          class="dev-badge"
        >
          DEV
        </span>
      </h1>
      <p class="hero-description">SillyTavern 角色卡编辑工具</p>
      <p class="hero-version">
        <code v-if="appCommitCount === '1'">在线版_{{ appVersion }}</code>
        <code v-else>dev_{{ appVersion }} ({{ appCommitCount }})</code>
        <code class="version-tag">v{{ appSemver }}</code>
      </p>
    </div>

    <!-- 公告横幅 -->
    <SystemBanner
      bannerId="docsContributionBanner2026"
      startDate="2026-01-01"
      endDate="2027-01-01"
      message="想要贡献？来贡献文档吧！"
      link="https://github.com/awaae001/doc"
      linkText="参与文档贡献"
      :dismissible="false"
    />

    <!-- 快速链接 -->
    <div class="links-card">
      <h2 class="section-title">链接</h2>
      <div class="links-row">
        <a
          href="https://github.com/awaae001/st_cardplus"
          target="_blank"
          class="link-item"
        >
          <Icon
            icon="mdi:github"
            width="16"
            height="16"
          />
          <span>
            GitHub
            <small>查看源码与贡献</small>
          </span>
        </a>
        <a
          href="https://doc.awaae001.top/"
          target="_blank"
          class="link-item"
        >
          <Icon
            icon="mdi:book-open-page-variant-outline"
            width="16"
            height="16"
          />
          <span>
            文档站
            <small>查看使用文档</small>
          </span>
        </a>
        <a
          href="https://discord.gg/KH6rHAGBXD"
          target="_blank"
          class="link-item"
        >
          <Icon
            icon="qlementine-icons:discord-fill-16"
            width="16"
            height="16"
          />
          <span>
            Discord
            <small>获取帮助与反馈</small>
          </span>
        </a>
        <template v-if="isMainDomain">
          <a
            href="https://autopatchcn.yuanshen.com/client_app/download/launcher/20241225164539_9oyGHAOXvzP4uaBW/mihoyo/yuanshen_setup_202412201736.exe"
            target="_blank"
            class="link-item"
          >
            <Icon
              icon="material-symbols:key-vertical-outline"
              width="16"
              height="16"
            />
            <span>
              高级版
              <small>解锁更多功能</small>
            </span>
          </a>
          <a
            href="https://dev.st-cardplus-1kl.pages.dev/"
            target="_blank"
            class="link-item"
          >
            <Icon
              icon="material-symbols:build-circle-outline"
              width="16"
              height="16"
            />
            <span>
              测试版
              <small>抢先体验新功能</small>
            </span>
          </a>
        </template>
      </div>
    </div>

    <!-- 更新日志卡片 -->
    <div class="changelog-card">
      <div class="changelog-header">
        <h2 class="section-title">更新日志</h2>
        <div class="branch-selector">
          <span class="branch-label">分支:</span>
          <el-select
            v-model="selectedBranch"
            placeholder="选择分支"
            size="small"
            class="branch-select"
          >
            <el-option
              v-for="branch in branches"
              :key="branch.name"
              :label="branch.name"
              :value="branch.name"
            />
          </el-select>
        </div>
      </div>

      <div class="commits-list">
        <!-- 使用 el-skeleton 骨架屏：单行布局匹配 commit-item 结构 -->
        <el-skeleton
          :loading="gitLogs.length === 0 && loading"
          animated
          :count="10"
          :throttle="{ initVal: true, leading: 300, trailing: 200 }"
          style="display: flex; flex-direction: column; gap: 0.375rem"
        >
          <template #template>
            <div class="commit-item commit-skeleton">
              <div class="commit-main">
                <el-skeleton-item
                  variant="text"
                  style="width: 60%; height: 0.85rem"
                />
                <div class="commit-meta">
                  <el-skeleton-item
                    variant="text"
                    style="width: 3.5rem; height: 0.75rem"
                  />
                  <el-skeleton-item
                    variant="text"
                    style="width: 5rem; height: 0.75rem"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #default>
            <div
              v-for="(log, index) in gitLogs"
              :key="index"
              class="commit-item"
              @click="log.expanded = !log.expanded"
            >
              <div class="commit-main">
                <span class="commit-message">{{ log.message }}</span>
                <div class="commit-meta">
                  <a
                    :href="log.html_url"
                    target="_blank"
                    class="commit-hash"
                    @click.stop
                  >
                    {{ log.sha.substring(0, 7) }}
                  </a>
                  <span class="commit-date">{{ formatDate(log.date) }}</span>
                </div>
              </div>
              <transition name="expand">
                <div
                  v-if="log.expanded"
                  class="commit-details"
                >
                  <pre>{{ log.fullMessage }}</pre>
                </div>
              </transition>
            </div>
          </template>
        </el-skeleton>
      </div>

      <button
        @click="() => loadMore()"
        :disabled="!hasMore || loading"
        class="load-more-btn"
        :class="{ 'is-loading': loading }"
      >
        <Icon
          v-if="loading"
          icon="eos-icons:loading"
          width="18"
          height="18"
          class="loading-icon"
        />
        <span>{{ loading ? '加载中...' : hasMore ? '加载更多' : '没有更多了' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import SystemBanner from '@/components/SystemBanner.vue';
import { formatDate } from '@/utils/datetime';
import { Icon } from '@iconify/vue';
import { ElMessage, ElOption, ElSelect, ElSkeleton, ElSkeletonItem } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';

const appVersion = __APP_VERSION__;
const appCommitCount = __APP_COMMIT_COUNT__;
const appSemver = __APP_SEMVER__;
const gitLogs = ref<any[]>([]);
const page = ref(1);
const hasMore = ref(true);
const loading = ref(true);
const branches = ref<any[]>([]);
const selectedBranch = ref('');

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  html_url: string;
}

const isMainDomain = computed(() => {
  return window.location.hostname === 'cardplus.jiuci.top';
});

const isDevDomain = computed(() => {
  return window.location.hostname === 'dev.st-cardplus-1kl.pages.dev';
});

const loadMore = async (isBranchChange = false) => {
  if ((!hasMore.value || loading.value) && !isBranchChange) return;

  loading.value = true;
  if (isBranchChange) {
    page.value = 1;
    hasMore.value = true;
  }

  try {
    if (!selectedBranch.value) return;
    const response = await fetch(
      `https://api.github.com/repos/awaae001/st_cardplus/commits?sha=${selectedBranch.value}&per_page=10&page=${page.value}`
    );
    const commits: Commit[] = await response.json();

    if (commits.length < 10) {
      hasMore.value = false;
    }

    const newLogs = commits.map((commit) => {
      const lines = commit.commit.message.split('\n');
      return {
        sha: commit.sha,
        message: lines[0],
        fullMessage: commit.commit.message,
        date: commit.commit.author.date,
        html_url: commit.html_url,
        expanded: false,
      };
    });

    // 分支切换时原子替换数据，加载更多时追加
    gitLogs.value = isBranchChange ? newLogs : [...gitLogs.value, ...newLogs];
    page.value++;

    // 成功反馈
    if (!isBranchChange && newLogs.length > 0) {
      ElMessage.success(`已加载 ${newLogs.length} 条记录`);
    }
  } catch (error) {
    console.error('Failed to fetch git logs:', error);
    ElMessage.error('加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const fetchBranches = async () => {
  try {
    const response = await fetch('https://api.github.com/repos/awaae001/st_cardplus/branches');
    if (response.ok) {
      branches.value = await response.json();
      selectedBranch.value = isMainDomain.value ? 'main' : 'dev';
    }
  } catch (error) {
    console.error('Error fetching branches:', error);
  }
};

onMounted(() => {
  fetchBranches();
});

watch(selectedBranch, (newBranch) => {
  if (newBranch) {
    loadMore(true);
  }
});
</script>

<style scoped>
.about-page {
  padding: 1rem;
  margin-left: auto;
  margin-right: auto;
  max-width: 48rem;
  width: 100%;
  min-height: 100%;
}

.about-page > * + * {
  margin-top: 1rem;
}

/* 头部信息卡片 */
.hero-card {
  border-radius: 0.25rem;
  padding: 1.25rem 1.5rem;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.hero-title {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--el-text-color-primary);
}

.dev-badge {
  font-size: 0.625rem;
  line-height: 1;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: var(--el-color-warning);
  color: white;
  letter-spacing: 0.05em;
}

.hero-description {
  font-size: 0.9rem;
  line-height: 1.5rem;
  margin: 0.25rem 0 0;
  color: var(--el-text-color-secondary);
}

.hero-version {
  margin: 0.5rem 0 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hero-version code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.hero-version .version-tag {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

@media (min-width: 768px) {
  .about-page {
    padding: 1.5rem;
  }
}

/* 链接区域 */
.links-card {
  border-radius: 0.25rem;
  padding: 1rem 1.5rem;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.section-title {
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--el-text-color-primary);
}

.links-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.link-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  transition:
    background 150ms ease,
    border-color 150ms ease;
}

.link-item:hover {
  background: var(--el-color-primary-light-8);
  border-color: var(--el-color-primary-light-5);
}

.link-item small {
  opacity: 0.65;
  font-weight: 400;
  margin-left: 0.125rem;
}

/* 更新日志 */
.changelog-card {
  border-radius: 0.25rem;
  padding: 1rem 1.5rem;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.changelog-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.branch-selector {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: var(--el-text-color-secondary);
}

.branch-select {
  width: 10rem;
}

.commits-list {
  max-height: 50vh;
  overflow-y: auto;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* 骨架屏 */
.commit-skeleton {
  cursor: default;
  pointer-events: none;
}

/* 提交项 */
.commit-item {
  padding: 0.625rem 0.75rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 150ms ease;
  background: var(--el-fill-color-light);
}

.commit-item:hover {
  background: var(--el-fill-color);
}

.commit-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
}

.commit-message {
  font-size: 0.85rem;
  flex: 1 1 0%;
  color: var(--el-text-color-primary);
}

.commit-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.commit-hash {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  text-decoration: none;
}

.commit-hash:hover {
  text-decoration: underline;
}
.commit-date {
  white-space: nowrap;
}

.commit-details {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  background: var(--el-fill-color-lighter);
  border-left: 2px solid var(--el-color-primary-light-7);
}

.commit-details pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.25rem;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
}

/* 加载更多 */
.load-more-btn {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  border: 1px solid var(--el-border-color);
  transition: background 150ms ease;
}

.load-more-btn:hover:not(:disabled),
.load-more-btn.is-loading {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-7);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
