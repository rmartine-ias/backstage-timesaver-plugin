/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';
import {
  PageBlueprint,
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import TimerIcon from '@material-ui/icons/Timer';
import { rootRouteRef } from './routes';

const timeSaverPage = PageBlueprint.make({
  params: {
    path: '/time-saver',
    title: 'Time Saver',
    icon: <TimerIcon />,
    routeRef: rootRouteRef,
    loader: () =>
      import('./components/TimeSaverPageComponent').then(m => (
        <m.TimeSaverPageComponent />
      )),
  },
});

/**
 * The Time Saver plugin for the new Backstage frontend system.
 *
 * @alpha
 */
export default createFrontendPlugin({
  pluginId: 'time-saver',
  extensions: [timeSaverPage],
  routes: {
    root: rootRouteRef,
  },
});
