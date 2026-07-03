//! Owns Barkeep connection form state, persistence, authentication, and ping state.

import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import {
  BARKEEP_CONFIG_STORAGE_KEY,
  BARKEEP_SESSION_STORAGE_KEY,
} from "@/config/dataSyncConfig";
import {
  localStorageStore,
  readLocalStorageJSON,
  writeLocalStorageJSON,
} from "@/utils/localStorageUtils";
import { loginToBarkeep, pingBarkeep } from "@/utils/cloud/barkeep";
import type {
  BarkeepConnectionConfig,
  BarkeepConnectionMode,
  BarkeepSession,
  BarkeepStatus,
} from "@/types/barkeep";

interface PersistedBarkeepConfig {
  mode: BarkeepConnectionMode;
  baseUrl: string;
  multiUser: boolean;
  basicAuthEnabled: boolean;
  basicUsername: string;
  basicPassword?: string;
  handle: string;
  password?: string;
  savePassword: boolean;
}

interface PersistedBarkeepSession {
  fingerprint: string;
  session: BarkeepSession;
}

function readMode(value: unknown): BarkeepConnectionMode {
  return value === "standalone" ? "standalone" : "sillytavern";
}

function defaultSillyTavernUrl(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:8000";
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1"
    ? `http://${host}:8000`
    : "http://127.0.0.1:8000";
}

// Module-level shared state for Barkeep connection
const mode = ref<BarkeepConnectionMode>("sillytavern");
const baseUrl = ref(defaultSillyTavernUrl());
const multiUser = ref(true);
const basicAuthEnabled = ref(false);
const basicUsername = ref("");
const basicPassword = ref("");
const handle = ref("");
const password = ref("");
const savePassword = ref(false);
const session = ref<BarkeepSession | null>(null);
const status = ref<BarkeepStatus | null>(null);
const errorMessage = ref("");
const busyAction = ref<"login" | "ping" | null>(null);
const initialized = ref(false);

const config = computed<BarkeepConnectionConfig>(() => {
  const common = {
    baseUrl: baseUrl.value,
    multiUser: multiUser.value,
    handle: handle.value,
    password: password.value,
  };
  if (mode.value === "standalone") {
    return {
      ...common,
      mode: "standalone",
      basicAuth: { enabled: false },
    };
  }
  return {
    ...common,
    mode: "sillytavern",
    basicAuth: basicAuthEnabled.value
      ? {
          enabled: true,
          username: basicUsername.value,
          password: basicPassword.value,
        }
      : { enabled: false },
  };
});

const fingerprint = computed(() =>
  JSON.stringify({
    mode: mode.value,
    baseUrl: baseUrl.value.trim().replace(/\/+$/, ""),
    multiUser: multiUser.value,
    handle: multiUser.value ? handle.value.trim() : "default-user",
    basicAuthEnabled:
      mode.value === "sillytavern" && basicAuthEnabled.value,
    basicUsername:
      mode.value === "sillytavern" && basicAuthEnabled.value
        ? basicUsername.value
        : "",
  }),
);

const isBusy = computed(() => busyAction.value !== null);
const canPing = computed(() => session.value !== null && !isBusy.value);
const authenticationWarning = computed(
  () =>
    session.value?.mode === "standalone" &&
    !session.value.authenticationEnabled,
);

const persistConfig = () => {
  const persisted: PersistedBarkeepConfig = {
    mode: mode.value,
    baseUrl: baseUrl.value,
    multiUser: multiUser.value,
    basicAuthEnabled: basicAuthEnabled.value,
    basicUsername: basicUsername.value,
    handle: handle.value,
    savePassword: savePassword.value,
    ...(savePassword.value
      ? {
          basicPassword: basicPassword.value,
          password: password.value,
        }
      : {}),
  };
  writeLocalStorageJSON(BARKEEP_CONFIG_STORAGE_KEY, persisted);
};

const clearSession = () => {
  session.value = null;
  status.value = null;
  errorMessage.value = "";
  localStorageStore.remove(BARKEEP_SESSION_STORAGE_KEY);
};

const persistSession = () => {
  if (!session.value) {
    localStorageStore.remove(BARKEEP_SESSION_STORAGE_KEY);
    return;
  }
  writeLocalStorageJSON(BARKEEP_SESSION_STORAGE_KEY, {
    fingerprint: fingerprint.value,
    session: session.value,
  } satisfies PersistedBarkeepSession);
};

const ping = async (silent = false): Promise<boolean> => {
  if (!session.value || isBusy.value) return false;
  busyAction.value = "ping";
  errorMessage.value = "";
  try {
    status.value = await pingBarkeep(config.value, session.value);
    if (!silent) ElMessage.success("Barkeep Ping 成功");
    return true;
  } catch (error) {
    status.value = null;
    errorMessage.value =
      error instanceof Error ? error.message : "Barkeep Ping 失败";
    if (!silent) ElMessage.error(errorMessage.value);
    return false;
  } finally {
    busyAction.value = null;
  }
};

const login = async (silent = false): Promise<boolean> => {
  if (isBusy.value) return false;
  busyAction.value = "login";
  errorMessage.value = "";
  status.value = null;
  try {
    session.value = await loginToBarkeep(config.value);
    persistConfig();
    persistSession();
    if (!silent) ElMessage.success("Barkeep 登录成功，正在 Ping");
  } catch (error) {
    session.value = null;
    localStorageStore.remove(BARKEEP_SESSION_STORAGE_KEY);
    errorMessage.value =
      error instanceof Error ? error.message : "Barkeep 登录失败";
    if (!silent) ElMessage.error(errorMessage.value);
    busyAction.value = null;
    return false;
  }

  busyAction.value = null;
  return ping(silent);
};

const logout = () => {
  clearSession();
  ElMessage.success("已断开 Barkeep 连接");
};

const initialize = () => {
  const saved = readLocalStorageJSON<PersistedBarkeepConfig>(
    BARKEEP_CONFIG_STORAGE_KEY,
  );
  if (saved) {
    mode.value = readMode(saved.mode);
    baseUrl.value =
      typeof saved.baseUrl === "string" ? saved.baseUrl : baseUrl.value;
    multiUser.value = saved.multiUser !== false;
    basicAuthEnabled.value = saved.basicAuthEnabled === true;
    basicUsername.value =
      typeof saved.basicUsername === "string" ? saved.basicUsername : "";
    handle.value = typeof saved.handle === "string" ? saved.handle : "";
    savePassword.value = saved.savePassword === true;
    if (savePassword.value) {
      basicPassword.value =
        typeof saved.basicPassword === "string" ? saved.basicPassword : "";
      password.value =
        typeof saved.password === "string" ? saved.password : "";
    }
  }

  const savedSession =
    readLocalStorageJSON<PersistedBarkeepSession>(
      BARKEEP_SESSION_STORAGE_KEY,
    );
  if (
    savedSession?.fingerprint === fingerprint.value &&
    savedSession.session
  ) {
    if (savedSession.session.mode === "standalone") {
      if (
        savedSession.session.expiresAt === null ||
        savedSession.session.expiresAt > Date.now()
      ) {
        session.value = savedSession.session;
      } else {
        localStorageStore.remove(BARKEEP_SESSION_STORAGE_KEY);
      }
    } else {
      // sillytavern session doesn't have expiresAt, we just restore it
      session.value = savedSession.session;
    }
  } else {
    localStorageStore.remove(BARKEEP_SESSION_STORAGE_KEY);
  }
  initialized.value = true;
};

watch(
  [
    mode,
    baseUrl,
    multiUser,
    basicAuthEnabled,
    basicUsername,
    basicPassword,
    handle,
    password,
  ],
  () => {
    if (!initialized.value) return;
    clearSession();
    persistConfig();
  },
  { flush: "sync" },
);

watch(
  savePassword,
  () => {
    if (!initialized.value) return;
    persistConfig();
  },
  { flush: "sync" },
);

/** Create state and actions for the new-home Barkeep connection panel. */
export function useBarkeepConnection() {
  return {
    state: {
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
    },
    actions: {
      initialize,
      login,
      ping,
      logout,
    },
  };
}
