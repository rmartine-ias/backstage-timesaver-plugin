import { PageBlueprint, createFrontendPlugin } from '@backstage/frontend-plugin-api';
import TimeLapseIcon from '@material-ui/icons/TimeLapse';

import { rootRouteRef } from './routes';

const timeSaverPage = PageBlueprint.make({
  params: {
    path: '/time-saver',
    title: 'Template Metrics',
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
  title: 'Time Saver',
  icon: <TimeLapseIcon fontSize="inherit" />,
  extensions: [timeSaverPage],
  routes: {
    root: rootRouteRef,
  },
});
