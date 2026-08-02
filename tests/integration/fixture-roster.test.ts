import { describe, expect, it } from 'vitest';
import { models } from '../../src/data/models';
import { FixtureAdapter } from '../../scripts/benchmark/adapters/fixture';
import { publicCases } from '../../scripts/benchmark/prompts/index';
import { evaluateCase } from '../../scripts/benchmark/score';

describe('fixture pipeline for every launch model', () => {
  for (const model of models) {
    it(`runs ${model.displayName} through every public automated case`, async () => {
      const adapter = new FixtureAdapter();
      for (const testCase of publicCases) {
        const response = await adapter.complete({ testId: testCase.id, model: model.canonicalId, messages: testCase.messages, temperature: 0.2, topP: 0.9, maxTokens: testCase.maxTokens, seed: 1701 });
        expect(response.returnedModelId).toBe(model.canonicalId);
        expect(response.content.length).toBeGreaterThan(0);
        const evaluation = evaluateCase(testCase.expectedBehavior, response.content, testCase.requiredTerms);
        expect(['passed', 'manual-review']).toContain(evaluation.status);
      }
    });
  }
});
