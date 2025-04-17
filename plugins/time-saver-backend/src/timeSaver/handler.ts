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
import { ScaffolderClient, TemplateTask } from '../api/scaffolderClient';
import {
  LoggerService,
  RootConfigService,
  AuthService,
} from '@backstage/backend-plugin-api';
import { TimeSaverStore } from '../database/TimeSaverDatabase';
import { TemplateTimeSavings } from '../database/types';
import { DateTime } from 'luxon';

export class TimeSaverHandler {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: RootConfigService,
    private readonly auth: AuthService,
    private readonly db: TimeSaverStore,
  ) {}

  async fetchTemplates(): Promise<'SUCCESS' | 'FAIL'> {
    const pageSize =
      this.config.getOptionalNumber('ts.scheduler.parallelProcessing') ?? 100;
    this.logger.debug(`SET parallelProcessing of tasks to: ${pageSize}`);
    const client = new ScaffolderClient(this.logger, this.config, this.auth);

    this.logger.info('START – Collecting Time Savings data from templates');
    // exclusions
    let excludedSet = new Set<string>();
    try {
      const excluded = await this.db.getTasksToExclude();
      if (Array.isArray(excluded)) excludedSet = new Set(excluded);
    } catch (e) {
      this.logger.error('Failed to load exclusion list', e as Error);
      return 'FAIL';
    }

    await this.db.truncate(); // cleanup table

    // fetching templates for scaffolder using PAGE_SIZE
    for (let page = 0; ; page++) {
      this.logger.debug(`Fetching page ${page} (size=${pageSize})`);
      const tasks: TemplateTask[] = await client.fetchTemplatesFromScaffolder({
        page,
        pageSize,
      });
      if (tasks.length === 0) break;

      const rows: TemplateTimeSavings[] = [];
      for (const tpl of tasks) {
        if (tpl.status !== 'completed' || excludedSet.has(tpl.id)) {
          continue;
        }
        const subs =
          tpl.spec.templateInfo.entity.metadata.substitute?.engineering;
        if (!subs) {
          continue;
        }

        const createdAt = DateTime.fromISO(tpl.createdAt, { setZone: true });
        if (!createdAt.isValid) {
          this.logger.error(
            `Invalid createdAt for template ${tpl.id}: ${tpl.createdAt}`,
          );
          continue;
        }

        for (const [team, timeSaved] of Object.entries<number>(subs)) {
          rows.push({
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

      if (rows.length) {
        this.logger.debug(`Inserting ${rows.length} rows`);
        await this.db.bulkInsertTimeSavings(rows); // one bulk insert per page
      }
    }

    this.logger.info('STOP – Collecting Time Savings data from templates');
    return 'SUCCESS';
  }
}
