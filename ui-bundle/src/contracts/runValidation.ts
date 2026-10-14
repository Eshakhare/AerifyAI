/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Comprehensive Fixture & Schema 0.9 Validation Suite
 */

import {
  computeGeometryHash,
  validateSchemaVersion,
  validateZoneVersion,
  validateProximityCausality,
  ValidationReport,
  ValidationIssue
} from './validator';

import actionOverlap from './fixtures/action-overlap.synthetic.json';
import cameraEvent from './fixtures/camera-event.synthetic.json';
import locationContext from './fixtures/location-context.synthetic.json';
import observation from './fixtures/observation.synthetic.json';
import publicIntervention from './fixtures/public-intervention.synthetic.json';
import scenarioProjectionConfounded from './fixtures/scenario-projection.confounded.synthetic.json';
import scenarioRun from './fixtures/scenario-run.synthetic.json';
import sessionOfficer from './fixtures/session.officer.synthetic.json';
import zoneCatalog from './fixtures/zone-catalog.synthetic.json';
import zoneVersionPalam from './fixtures/zone-version.palam-dwarka.placeholder.json';
import legendBands from './fixtures/legend-bands.v1.json';
import scenarioCatalog from './fixtures/scenario-catalog.v1.json';
import { ZoneVersion } from './types';

export async function runAllFixtureValidations(): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];
  let totalChecks = 0;

  // 1. Schema version checks
  totalChecks++;
  issues.push(...validateSchemaVersion(locationContext, 'location-context.synthetic.json'));
  totalChecks++;
  issues.push(...validateSchemaVersion(publicIntervention, 'public-intervention.synthetic.json'));
  totalChecks++;
  issues.push(...validateSchemaVersion(sessionOfficer, 'session.officer.synthetic.json'));

  // 2. Geometry hash checks for ZoneVersions
  totalChecks++;
  issues.push(...(await validateZoneVersion(zoneVersionPalam as unknown as ZoneVersion, 'zone-version.palam-dwarka.placeholder.json')));
  
  if (Array.isArray(publicIntervention.zone_versions)) {
    for (const zv of publicIntervention.zone_versions) {
      totalChecks++;
      issues.push(...(await validateZoneVersion(zv as unknown as ZoneVersion, `public-intervention -> ${zv.id}`)));
    }
  }

  // 3. Proximity causality check (Domain Rule 5)
  totalChecks++;
  issues.push(...validateProximityCausality(locationContext.nearby_sources, 'location-context.synthetic.json'));

  // 4. Catalog count checks (12 cases S01 - S12)
  totalChecks++;
  if (!Array.isArray(scenarioCatalog.cases) || scenarioCatalog.cases.length !== 12) {
    issues.push({
      fixtureName: 'scenario-catalog.v1.json',
      field: 'cases.length',
      expected: '12 cases (S01–S12)',
      actual: `${scenarioCatalog.cases?.length ?? 0}`,
      severity: 'ERROR'
    });
  }

  totalChecks++;
  if (!Array.isArray(zoneCatalog) || zoneCatalog.length !== 12) {
    issues.push({
      fixtureName: 'zone-catalog.synthetic.json',
      field: 'length',
      expected: '12 zones',
      actual: `${zoneCatalog.length}`,
      severity: 'ERROR'
    });
  }

  // 5. Legends check (must contain 3 standard CPCB legends)
  totalChecks++;
  const legendIds = Array.isArray(legendBands) ? legendBands.map((l: any) => l.id) : [];
  for (const requiredId of ['cpcb_pm25_conc_v1', 'cpcb_pm10_conc_v1', 'cpcb_aqi_v1']) {
    if (!legendIds.includes(requiredId)) {
      issues.push({
        fixtureName: 'legend-bands.v1.json',
        field: 'legends',
        expected: `Must contain ${requiredId}`,
        actual: `Missing from [${legendIds.join(', ')}]`,
        severity: 'ERROR'
      });
    }
  }

  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  return {
    passed: errorCount === 0,
    totalChecks,
    errorCount,
    issues
  };
}
