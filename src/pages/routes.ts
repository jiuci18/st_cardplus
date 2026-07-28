import type { RouteRecordRaw } from 'vue-router';

import { aboutRoute } from './about/route';
import { cardRoute } from './card/route';
import { cardManagerRoute } from './card-manager/route';
import { ejsEditorRoute } from './ejs-editor/route';
import { homeRoute } from './home/route';
import { notFoundRoute } from './not-found/route';
import { presetRoute } from './preset/route';
import { regexEditorRoute } from './regex-editor/route';
import { settingsRoute } from './settings/route';
import { toolboxRoutes } from './toolbox/routes';
import { worldRoute } from './world/route';
import { worldBookRoute } from './world-book/route';

/** Application routes assembled from page-owned route modules. */
export const appRoutes = [
  homeRoute,
  cardRoute,
  worldRoute,
  cardManagerRoute,
  worldBookRoute,
  aboutRoute,
  settingsRoute,
  presetRoute,
  ...toolboxRoutes,
  regexEditorRoute,
  ejsEditorRoute,
  notFoundRoute,
] satisfies RouteRecordRaw[];
