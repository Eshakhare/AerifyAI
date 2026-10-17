/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - API Client Entry Point
 */

import { ApiClient } from './ApiClient';
import { FixtureApi } from './FixtureApi';
import { HttpApi } from './HttpApi';

export * from './ApiClient';
export * from './FixtureApi';
export * from './HttpApi';

// Determine default client based on environment (defaults to HTTP connected to FastAPI + Cloud SQL)
const apiMode = (import.meta.env.VITE_API_MODE || 'HTTP').toUpperCase();

export const defaultApiClient: ApiClient =
  apiMode === 'FIXTURE' ? new FixtureApi() : new HttpApi();

