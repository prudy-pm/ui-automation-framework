import { test, expect } from '@playwright/test';

// TEMPORARY -- verifies the CI Teams failure alert actually fires.
// Delete this file once confirmed working.
test('temp: deliberate failure to verify CI alert @temp', () => {
  expect(true).toBe(false);
});