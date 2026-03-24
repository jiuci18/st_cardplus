import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { registerBundledIconifyIcons } from '../generated/iconify-icons';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './css/dark.css';
import './style.css';
import './css/mobile.css';
import './css/mobile-bookmarks.css';

registerBundledIconifyIcons();

const app = createApp(App);
const pinia = createPinia();

app.use(ElementPlus);
app.use(pinia);
app.use(router);
app.mount('#app');
