import { test } from '@playwright/test';
import { description, epic, feature, story, severity, issue } from 'allure-js-commons';

type AllureTags = { epic: string; feature: string; story: string };

// Call once inside a test.describe: every test in it gets these Allure labels
// (they drive the report's Behaviors tab). Severity comes from the title tag --
// @smoke = critical, everything else = normal -- so it stays in step with what
// is already treated as the release-critical set.
export function tagAllure(tags: AllureTags): void {
  test.beforeEach(async () => {
    await epic(tags.epic);
    await feature(tags.feature);
    await story(tags.story);
    const level = test.info().title.includes('@smoke') ? 'critical' : 'normal';
    await severity(level);

    // Same values as Playwright annotations: Monocart (visitor + columns in
    // playwright.config.ts) and the Playwright HTML report read these.
    test.info().annotations.push(
      { type: 'epic', description: tags.epic },
      { type: 'feature', description: tags.feature },
      { type: 'story', description: tags.story },
      { type: 'severity', description: level },
    );
  });
}

// Plain-English "what this test proves", shown on the test's Allure page.
export async function describeTest(text: string): Promise<void> {
  await description(text);
}

// Placeholder -- no bug tracker yet. Change this base URL when one exists.
const ISSUE_URL = 'https://tracker.example.com/issues/';

// Links a test to a bug so a failure in the report points at its ticket.
export async function linkIssue(id: string): Promise<void> {
  await issue(ISSUE_URL + id, id);
}
