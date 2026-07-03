<template>
  <el-drawer
    v-model="visible"
    title="连接 Barkeep"
    direction="rtl"
    :size="drawerSize"
    class="barkeep-drawer"
    data-testid="barkeep-connection-drawer"
  >
    <div class="connection-form">
      <div class="field-group">
        <span class="field-label">连接方式</span>
        <el-segmented
          v-model="mode"
          :options="modeOptions"
          class="mode-selector"
        />
      </div>

      <el-input
        v-model="baseUrl"
        aria-label="Barkeep 服务地址"
        :placeholder="
          mode === 'sillytavern'
            ? 'http://127.0.0.1:8000'
            : 'http://127.0.0.1:10024'
        "
      >
        <template #prepend>服务地址</template>
      </el-input>

      <div class="option-grid">
        <el-checkbox v-model="multiUser">多用户模式</el-checkbox>
        <el-checkbox
          v-if="mode === 'sillytavern'"
          v-model="basicAuthEnabled"
        >
          HTTP 基础验证
        </el-checkbox>
        <el-checkbox v-model="savePassword">保存密码</el-checkbox>
      </div>

      <template v-if="multiUser">
        <el-input
          v-model="handle"
          aria-label="用户 Handle"
          placeholder="SillyTavern 用户 Handle"
        />
        <el-input
          v-model="password"
          aria-label="用户密码"
          placeholder="SillyTavern 用户密码"
          type="password"
          show-password
        />
      </template>

      <el-input
        v-else-if="mode === 'standalone'"
        v-model="password"
        aria-label="Barkeep API 密码"
        placeholder="Barkeep API 密码"
        type="password"
        show-password
      />

      <template v-if="mode === 'sillytavern' && basicAuthEnabled">
        <el-divider content-position="left">HTTP Basic</el-divider>
        <el-input
          v-model="basicUsername"
          aria-label="HTTP Basic 用户名"
          placeholder="HTTP Basic 用户名"
        />
        <el-input
          v-model="basicPassword"
          aria-label="HTTP Basic 密码"
          placeholder="HTTP Basic 密码"
          type="password"
          show-password
        />
      </template>

      <p class="connection-hint">
        {{
          mode === "sillytavern"
            ? "通过 SillyTavern 会话、CSRF 与可选 Basic Auth 访问插件。"
            : "直接访问 Barkeep 独立 HTTP 服务并使用 Bearer Token。"
        }}
      </p>

      <el-alert
        v-if="authenticationWarning"
        title="服务未启用认证"
        description="当前独立 Barkeep 接受未认证请求，不建议暴露到公网。"
        type="warning"
        :closable="false"
        show-icon
      />

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
        data-testid="barkeep-error"
      />

      <div
        v-if="status"
        class="status-card"
        data-testid="barkeep-status"
      >
        <div class="status-heading">
          <span class="status-dot"></span>
          <strong>连接正常</strong>
          <el-tag size="small" type="success">
            {{ status.mode === "multi-user" ? "多用户" : "单用户" }}
          </el-tag>
        </div>
        <p class="status-user">{{ status.user }}</p>
        <div class="count-grid">
          <div>
            <strong>{{ status.counts.characters }}</strong>
            <span>角色</span>
          </div>
          <div>
            <strong>{{ status.counts.worlds }}</strong>
            <span>世界书</span>
          </div>
          <div>
            <strong>{{ status.counts.presets }}</strong>
            <span>预设</span>
          </div>
          <div>
            <strong>{{ status.counts.chats }}</strong>
            <span>聊天</span>
          </div>
        </div>
      </div>

      <div class="connection-actions">
        <el-button
          v-if="status"
          type="danger"
          plain
          @click="logout"
        >
          <Icon icon="material-symbols:logout-rounded" />
          断开
        </el-button>
        <el-button
          :loading="busyAction === 'login'"
          :disabled="isBusy"
          @click="login"
        >
          <Icon icon="material-symbols:login-rounded" />
          登录
        </el-button>
        <el-button
          type="primary"
          :loading="busyAction === 'ping'"
          :disabled="!canPing"
          @click="ping"
        >
          <Icon icon="material-symbols:network-ping" />
          Ping
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { useDevice } from "@/composables/useDevice";
import { useBarkeepConnection } from "@/composables/useBarkeepConnection";

const visible = defineModel<boolean>({ required: true });
const { isMobile } = useDevice();
const drawerSize = computed(() => (isMobile.value ? "100%" : "460px"));
const modeOptions = [
  { label: "SillyTavern 内嵌", value: "sillytavern" },
  { label: "独立 HTTP mode", value: "standalone" },
];

const connection = useBarkeepConnection();
const {
  mode,
  baseUrl,
  multiUser,
  basicAuthEnabled,
  basicUsername,
  basicPassword,
  handle,
  password,
  savePassword,
  status,
  errorMessage,
  busyAction,
  isBusy,
  canPing,
  authenticationWarning,
} = connection.state;
const { initialize, login, ping, logout } = connection.actions;

onMounted(initialize);
</script>

<style scoped>
.connection-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
}

.mode-selector {
  width: 100%;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
}

.connection-hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.status-card {
  padding: 14px;
  border: 1px solid var(--el-color-success-light-5);
  border-radius: 10px;
  background: var(--el-color-success-light-9);
}

.status-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-success);
  box-shadow: 0 0 0 4px var(--el-color-success-light-7);
}

.status-user {
  margin: 8px 0 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
  font-size: 12px;
}

.count-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.count-grid > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.count-grid strong {
  font-size: 18px;
}

.count-grid span {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.connection-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.connection-actions :deep(.el-button span) {
  gap: 6px;
}

@media (max-width: 480px) {
  .option-grid {
    grid-template-columns: 1fr;
  }

  .connection-actions .el-button {
    flex: 1;
  }
}
</style>
