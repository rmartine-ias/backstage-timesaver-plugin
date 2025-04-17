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
import {
  AuthService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { TimeSaverStore } from '../database/TimeSaverDatabase';
import { ScaffolderClient } from '../api/scaffolderClient';
import { dateTimeFromIsoDate } from '../utils';

export class TimeSaverHandler {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: RootConfigService,
    private readonly auth: AuthService,
    private readonly db: TimeSaverStore,
  ) {}

  async fetchTemplates() {
    const scaffolderClient = new ScaffolderClient(
      this.logger,
      this.config,
      this.auth,
    );
    this.logger.info(`START - Collecting Time Savings data from templates...}`);

    let excludedSet = new Set<string>();
    try {
      const excluded = await this.db.getTasksToExclude();
      if (Array.isArray(excluded)) {
        excludedSet = new Set(excluded);
      }
    } catch (e) {
      this.logger.error('Failed to load exclusion list', e as Error);
      return 'FAIL';
    }

    this.logger.debug('Truncating database');
    await this.db.truncate(); // cleaning table

    for await (const tpl of scaffolderClient.streamTemplatesFromScaffolder(
      50,
    )) {
      // only completed & not excluded
      if (tpl.status !== 'completed' || excludedSet.has(tpl.id)) {
        continue;
      }

      this.logger.debug(`Parsing template task ${tpl.id}`);

      const subs =
        tpl.spec.templateInfo.entity.metadata.substitute?.engineering;
      if (!subs) {
        this.logger.debug(`Template ${tpl.id} has no substitute fields`);
        continue;
      }

      const createdAt = dateTimeFromIsoDate(tpl.createdAt);
      if (!createdAt) {
        this.logger.error(
          `Invalid createdAt for template ${tpl.id}: ${tpl.createdAt}`,
        );
        continue;
      }

      // insert one row per team
      for (const [team, timeSaved] of Object.entries<number>(subs)) {
        await this.db.insert({
          team,
          role: '',
          timeSaved,
          createdAt,
          createdBy: tpl.createdBy,
          templateName: tpl.spec.templateInfo.entityRef,
          templateTaskStatus: tpl.status,
          templateTaskId: tpl.id,
        });
      }
    }

    this.logger.info('STOP  - Collecting Time Savings data from templates…');
    return 'SUCCESS';
  }
}
