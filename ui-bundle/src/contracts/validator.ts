/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Dev-only Contract & Fixture Validator
 * Validates schema_version === "0.9" and SHA-256 geometry_hash for ZoneVersion.
 */

import { ZoneVersion } from './types';

export interface ValidationIssue {
  fixtureName: string;
  field: string;
  expected: string;
  actual: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationReport {
  passed: boolean;
  totalChecks: number;
  errorCount: number;
  issues: ValidationIssue[];
}

/**
 * Computes SHA-256 hex string from compact JSON of GeoJSON geometry:
 * Compact format: {"type":...,"coordinates":...}
 */
export async function computeGeometryHash(geometryData: {
  type: string;
  coordinates: any;
}): Promise<string> {
  const compactJson = JSON.stringify({
    type: geometryData.type,
    coordinates: geometryData.coordinates
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(compactJson);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hashHex}`;
}

/**
 * Validates a ZoneVersion object for schema compliance and geometry hash match
 */
export async function validateZoneVersion(
  zoneVersion: ZoneVersion,
  fixtureName = 'ZoneVersion'
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!zoneVersion.geometry?.data) {
    issues.push({
      fixtureName,
      field: 'geometry.data',
      expected: 'Valid GeoJSON geometry object',
      actual: 'null or undefined',
      severity: 'ERROR'
    });
    return issues;
  }

  const computedHash = await computeGeometryHash(zoneVersion.geometry.data);
  if (zoneVersion.geometry_hash !== computedHash) {
    issues.push({
      fixtureName,
      field: 'geometry_hash',
      expected: computedHash,
      actual: zoneVersion.geometry_hash,
      severity: 'ERROR'
    });
  }

  return issues;
}

/**
 * Validates an object that must carry schema_version === "0.9"
 */
export function validateSchemaVersion(
  obj: any,
  fixtureName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!obj) {
    issues.push({
      fixtureName,
      field: 'object',
      expected: 'Non-null object',
      actual: 'null or undefined',
      severity: 'ERROR'
    });
    return issues;
  }

  if (obj.schema_version !== '0.9') {
    issues.push({
      fixtureName,
      field: 'schema_version',
      expected: '0.9',
      actual: String(obj.schema_version),
      severity: 'ERROR'
    });
  }

  return issues;
}

/**
 * Checks causation claims in nearby sources (Non-negotiable Domain Rule 5)
 */
export function validateProximityCausality(
  nearbySources: any[],
  fixtureName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (Array.isArray(nearbySources)) {
    for (const source of nearbySources) {
      if (source.causation_claimed === true) {
        issues.push({
          fixtureName,
          field: `nearby_sources[${source.id}].causation_claimed`,
          expected: 'false (Proximity context only; never claim emissions causality)',
          actual: 'true',
          severity: 'ERROR'
        });
      }
    }
  }
  return issues;
}
