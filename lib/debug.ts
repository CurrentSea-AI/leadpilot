/**
 * Simple debug/test runner for sanity checking core utilities.
 * No heavy testing framework needed - just run via API endpoint.
 */

import { normalizeWebsiteUrl, normalizePhone, isValidPhone } from "./normalize";
import Papa from "papaparse";

type TestResult = {
  name: string;
  passed: boolean;
  message: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected "${expected}", got "${actual}"`);
  }
}

// ============ URL NORMALIZATION TESTS ============

function testNormalizeWebsiteUrl(): TestResult[] {
  const results: TestResult[] = [];

  const tests: { input: string; expected: string; name: string }[] = [
    // Basic normalization
    { input: "example.com", expected: "https://example.com", name: "adds https" },
    { input: "http://example.com", expected: "https://example.com", name: "converts http to https" },
    { input: "https://example.com", expected: "https://example.com", name: "keeps https" },
    
    // WWW removal
    { input: "www.example.com", expected: "https://example.com", name: "removes www" },
    { input: "https://www.example.com", expected: "https://example.com", name: "removes www with https" },
    
    // Trailing slashes
    { input: "https://example.com/", expected: "https://example.com", name: "removes trailing slash" },
    { input: "https://example.com///", expected: "https://example.com", name: "removes multiple trailing slashes" },
    
    // Query params and fragments
    { input: "https://example.com?foo=bar", expected: "https://example.com", name: "removes query params" },
    { input: "https://example.com#section", expected: "https://example.com", name: "removes fragment" },
    { input: "https://example.com/page?foo=bar#section", expected: "https://example.com/page", name: "removes query and fragment, keeps path" },
    
    // Case normalization
    { input: "HTTPS://EXAMPLE.COM", expected: "https://example.com", name: "lowercases hostname" },
    { input: "Example.COM", expected: "https://example.com", name: "lowercases without protocol" },
    
    // Paths
    { input: "https://example.com/about", expected: "https://example.com/about", name: "keeps path" },
    { input: "https://example.com/about/", expected: "https://example.com/about", name: "removes trailing slash from path" },
    
    // Complex cases
    { input: "  https://www.EXAMPLE.com/page/?query=1#hash  ", expected: "https://example.com/page", name: "full normalization with trim" },
  ];

  for (const test of tests) {
    try {
      const actual = normalizeWebsiteUrl(test.input);
      assertEqual(actual, test.expected, test.name);
      results.push({ name: `URL: ${test.name}`, passed: true, message: `"${test.input}" → "${actual}"` });
    } catch (err) {
      results.push({ name: `URL: ${test.name}`, passed: false, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return results;
}

// ============ PHONE NORMALIZATION TESTS ============

function testNormalizePhone(): TestResult[] {
  const results: TestResult[] = [];

  const tests: { input: string; expected: string; name: string }[] = [
    { input: "555-123-4567", expected: "5551234567", name: "strips dashes" },
    { input: "(555) 123-4567", expected: "5551234567", name: "strips parens and spaces" },
    { input: "555.123.4567", expected: "5551234567", name: "strips dots" },
    { input: "5551234567", expected: "5551234567", name: "keeps clean number" },
    { input: "1-555-123-4567", expected: "5551234567", name: "strips leading 1" },
    { input: "+1 555 123 4567", expected: "5551234567", name: "strips +1 and spaces" },
    { input: "15551234567", expected: "5551234567", name: "strips leading 1 from 11 digits" },
  ];

  for (const test of tests) {
    try {
      const actual = normalizePhone(test.input);
      assertEqual(actual, test.expected, test.name);
      results.push({ name: `Phone: ${test.name}`, passed: true, message: `"${test.input}" → "${actual}"` });
    } catch (err) {
      results.push({ name: `Phone: ${test.name}`, passed: false, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  // Phone validation tests
  const validationTests = [
    { input: "555-123-4567", expected: true, name: "valid 10 digit" },
    { input: "1-555-123-4567", expected: true, name: "valid 11 digit with leading 1" },
    { input: "555-1234", expected: false, name: "invalid 7 digit" },
    { input: "12345", expected: false, name: "invalid 5 digit" },
  ];

  for (const test of validationTests) {
    try {
      const actual = isValidPhone(test.input);
      assertEqual(actual, test.expected, test.name);
      results.push({ name: `Phone valid: ${test.name}`, passed: true, message: `"${test.input}" → ${actual}` });
    } catch (err) {
      results.push({ name: `Phone valid: ${test.name}`, passed: false, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return results;
}

// ============ DEDUPE COMPARISON TESTS ============

function testDedupeComparisons(): TestResult[] {
  const results: TestResult[] = [];

  // Test that different variations normalize to the same value
  const urlGroups: { urls: string[]; name: string }[] = [
    {
      urls: [
        "example.com",
        "www.example.com",
        "https://example.com",
        "http://example.com",
        "https://www.example.com/",
        "HTTPS://WWW.EXAMPLE.COM",
      ],
      name: "all variations of example.com should match",
    },
    {
      urls: [
        "mysite.com/about",
        "https://mysite.com/about/",
        "http://www.mysite.com/about?ref=google",
        "https://WWW.MYSITE.COM/about#contact",
      ],
      name: "all variations of mysite.com/about should match",
    },
  ];

  for (const group of urlGroups) {
    try {
      const normalized = group.urls.map(normalizeWebsiteUrl);
      const allMatch = normalized.every((n) => n === normalized[0]);
      assert(allMatch, `Not all URLs matched: ${JSON.stringify(normalized)}`);
      results.push({
        name: `Dedupe: ${group.name}`,
        passed: true,
        message: `All ${group.urls.length} URLs normalize to "${normalized[0]}"`,
      });
    } catch (err) {
      results.push({
        name: `Dedupe: ${group.name}`,
        passed: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Test phone deduplication
  const phoneGroups: { phones: string[]; name: string }[] = [
    {
      phones: ["555-123-4567", "(555) 123-4567", "5551234567", "1-555-123-4567", "+1 555 123 4567"],
      name: "all variations of same phone should match",
    },
  ];

  for (const group of phoneGroups) {
    try {
      const normalized = group.phones.map(normalizePhone);
      const allMatch = normalized.every((n) => n === normalized[0]);
      assert(allMatch, `Not all phones matched: ${JSON.stringify(normalized)}`);
      results.push({
        name: `Dedupe: ${group.name}`,
        passed: true,
        message: `All ${group.phones.length} phones normalize to "${normalized[0]}"`,
      });
    } catch (err) {
      results.push({
        name: `Dedupe: ${group.name}`,
        passed: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

// ============ CSV PARSING VALIDATION TESTS ============

function testCsvParsing(): TestResult[] {
  const results: TestResult[] = [];

  // Test valid CSV
  try {
    const validCsv = `name,websiteUrl,city,phone
ABC Medical,https://abcmedical.com,Miami,555-123-4567
XYZ Clinic,xyzclnic.com,Tampa,`;

    const parsed = Papa.parse(validCsv, { header: true, skipEmptyLines: true });
    assert(parsed.data.length === 2, `Expected 2 rows, got ${parsed.data.length}`);
    assert(parsed.errors.length === 0, `Unexpected errors: ${JSON.stringify(parsed.errors)}`);
    
    const row1 = parsed.data[0] as Record<string, string>;
    assertEqual(row1.name, "ABC Medical", "row 1 name");
    assertEqual(row1.websiteUrl, "https://abcmedical.com", "row 1 websiteUrl");
    
    results.push({
      name: "CSV: valid parsing",
      passed: true,
      message: `Parsed ${parsed.data.length} rows successfully`,
    });
  } catch (err) {
    results.push({
      name: "CSV: valid parsing",
      passed: false,
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }

  // Test CSV with missing required fields
  try {
    const csvMissingFields = `name,city
ABC Medical,Miami`;

    const parsed = Papa.parse(csvMissingFields, { header: true, skipEmptyLines: true });
    const row = parsed.data[0] as Record<string, string>;
    const hasWebsiteUrl = "websiteUrl" in row && row.websiteUrl;
    
    assert(!hasWebsiteUrl, "Should detect missing websiteUrl");
    results.push({
      name: "CSV: missing field detection",
      passed: true,
      message: "Correctly detects missing websiteUrl field",
    });
  } catch (err) {
    results.push({
      name: "CSV: missing field detection",
      passed: false,
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }

  // Test CSV with various delimiters
  try {
    const tsvData = `name\twebsiteUrl
ABC Medical\thttps://abc.com`;

    const parsed = Papa.parse(tsvData, { header: true, skipEmptyLines: true });
    assert(parsed.data.length === 1, `Expected 1 row`);
    
    results.push({
      name: "CSV: tab delimiter",
      passed: true,
      message: "Papaparse auto-detects tab delimiter",
    });
  } catch (err) {
    results.push({
      name: "CSV: tab delimiter",
      passed: false,
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }

  // Test empty CSV
  try {
    const emptyCsv = `name,websiteUrl
`;
    const parsed = Papa.parse(emptyCsv, { header: true, skipEmptyLines: true });
    assert(parsed.data.length === 0, `Expected 0 rows for empty CSV`);
    
    results.push({
      name: "CSV: empty data",
      passed: true,
      message: "Correctly handles empty CSV (headers only)",
    });
  } catch (err) {
    results.push({
      name: "CSV: empty data",
      passed: false,
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }

  return results;
}

// ============ RUN ALL TESTS ============

export function runAllTests(): {
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const allResults: TestResult[] = [
    ...testNormalizeWebsiteUrl(),
    ...testNormalizePhone(),
    ...testDedupeComparisons(),
    ...testCsvParsing(),
  ];

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  return { passed, failed, results: allResults };
}

export type { TestResult };

