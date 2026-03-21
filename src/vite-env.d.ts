/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

declare const __APP_SEMVER__: string;
declare const __APP_VERSION__: string;
declare const __APP_COMMIT_COUNT__: string;
declare const __APP_CHANNEL__: 'stable' | 'dev';
