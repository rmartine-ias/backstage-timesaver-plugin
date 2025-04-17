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

export interface TemplateTask {
  id: string;
  status: string;
  createdAt: string;
  createdBy: string;
  spec: {
    templateInfo: {
      [x: string]: any;
      entity: {
        metadata: {
          substitute?: { engineering: Record<string, number> };
        };
        entityRef: string;
      };
    };
  };
}

export class ScaffolderClient {
  constructor(
    private readonly logger: LoggerService,
    private readonly config: RootConfigService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Fetch a page of templates with pagination support.
   */
  async fetchTemplatesFromScaffolder(
    opts: { page?: number; pageSize?: number } = {},
  ): Promise<TemplateTask[]> {
    const { page = 0, pageSize = 50 } = opts;
    // Resolve backend URL and work around localhost binding
    let backendUrl =
      this.config.getOptionalString('ts.backendUrl') ?? 'http://127.0.0.1:7007';
    backendUrl = backendUrl.replace(
      /(http:\/\/)localhost(:\d+)/g,
      '$1127.0.0.1$2',
    );
    const templatePath = '/api/scaffolder/v2/tasks';
    const offset = page * pageSize;
    const callUrl = `${backendUrl}${templatePath}?limit=${pageSize}&offset=${offset}`;
    const token = await this.generateBackendToken();

    try {
      const response = await fetch(callUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      this.logger.debug(
        `Scaffolder API response (page=${page}, size=${pageSize}): ${JSON.stringify(
          data,
        )}`,
      );

      if (Object.hasOwn(data, 'error')) {
        this.logger.error('Error retrieving scaffolder tasks', data.error);
        return [];
      }
      if (!Array.isArray(data.tasks)) {
        this.logger.error('Unexpected response: tasks array missing');
        return [];
      }
      return data.tasks;
    } catch (error) {
      this.logger.error(`Failed to fetch from ${callUrl}`, error as Error);
      return [];
    }
  }

  /**
   * Stream all templates, page by page, yielding each task as it arrives.
   */
  async *streamTemplatesFromScaffolder(
    pageSize = 50,
  ): AsyncGenerator<TemplateTask> {
    let page = 0;
    while (true) {
      const batch = await this.fetchTemplatesFromScaffolder({ page, pageSize });
      if (!batch.length) break;
      for (const task of batch) {
        yield task;
      }
      page++;
    }
  }

  async generateBackendToken(): Promise<string> {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'scaffolder',
    });
    return token;
  }
}
