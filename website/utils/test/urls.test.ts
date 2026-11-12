import { describe, expect, it } from "vitest";

import { isValidUrl, normalizeFilePathSlashes } from "../urls";

describe("normalizeFilePathSlashes", () => {
  it("ignores HTTPS and other valid URL paths", () => {
    const paths = [
      "http://example.com/path/to/data.zarr",
      "https://example.com/path/to/data.zarr",
      "s3://example-bucket/path/to/data.zarr",
      "gs://example-bucket/path/to/data.zarr",
    ];

    paths.forEach((path) => {
      expect(normalizeFilePathSlashes(path)).toBe(path);
      expect(isValidUrl(path), `Expected ${path} to be a valid URL`).toBe(true);
    });
  });

  it("ignores forward-slash VAST paths", () => {
    const paths = [
      "/allen/aics/path/to/data.zarr",
      "/allen/aics/another/path/to/data.zarr",
      "/allen/aics/special path/with spaces/data.zarr",
    ];
    paths.forEach((path) => {
      expect(normalizeFilePathSlashes(path)).toBe(path);
      expect(isValidUrl(path), `Expected ${path} to be a valid URL`).toBe(true);
    });
  });

  it("replaces backwards slashes", () => {
    const paths: [string, string][] = [
      ["\\allen\\aics\\path\\to\\data.zarr", "/allen/aics/path/to/data.zarr"],
      ["\\allen\\aics\\another\\path\\to\\data.zarr", "/allen/aics/another/path/to/data.zarr"],
      ["\\allen\\aics\\special path\\with spaces\\data.zarr", "/allen/aics/special path/with spaces/data.zarr"],
    ];
    paths.forEach((path) => {
      const normalizedPath = normalizeFilePathSlashes(path[0]);
      expect(normalizedPath).toBe(path[1]);
      expect(isValidUrl(normalizedPath), `Expected ${normalizedPath} to be a valid URL`).toBe(true);
    });
  });

  it("handles UNC-style Windows paths", () => {
    const paths: [string, string][] = [
      ["\\\\allen\\aics\\path\\to\\data.zarr", "/allen/aics/path/to/data.zarr"],
      ["\\\\allen\\aics\\another\\path\\to\\data.zarr", "/allen/aics/another/path/to/data.zarr"],
      ["\\\\allen\\aics\\path\\with spaces\\data.zarr", "/allen/aics/path/with spaces/data.zarr"],
    ];

    paths.forEach((path) => {
      const normalizedPath = normalizeFilePathSlashes(path[0]);
      expect(normalizedPath).toBe(path[1]);
    });
  });
});
