import { describe, expect, it } from "@jest/globals";

import { remapMultisceneUrls, remapUrl } from "../urls";

describe("remapUrl", () => {
  it("does not map HTTP URLs", () => {
    expect(remapUrl("http://example.com/image.tif")).toBe("http://example.com/image.tif");
  });

  it("does not map HTTPS URLs", () => {
    expect(remapUrl("https://example.com/image.tif")).toBe("https://example.com/image.tif");
  });

  it("trims whitespace from the URL", () => {
    expect(remapUrl(" https://example.com/image.tif ")).toBe("https://example.com/image.tif");
  });

  it("maps S3 URLs", () => {
    expect(remapUrl("s3://allencell/aics/example/data.zarr")).toBe(
      "https://allencell.s3.amazonaws.com/aics/example/data.zarr"
    );
  });

  it("maps GCS URLs", () => {
    expect(remapUrl("gs://my-bucket/path/to/data.ome.tif")).toBe(
      "https://storage.googleapis.com/my-bucket/path/to/data.ome.tif"
    );
  });

  it("maps example Human Organ Atlas GCS URL", () => {
    expect(
      remapUrl(
        "gs://ucl-hip-ct-35a68e99feaae8932b1d44da0358940b/A186/lung-right/24.132um_complete-organ_bm18.ome.zarr/"
      )
    ).toBe(
      "https://storage.googleapis.com/ucl-hip-ct-35a68e99feaae8932b1d44da0358940b/A186/lung-right/24.132um_complete-organ_bm18.ome.zarr/"
    );
  });
});

describe("remapMultisceneUrls", () => {
  it("handles empty scenes array", () => {
    expect(remapMultisceneUrls([])).toEqual([]);
  });

  it("maps single scene", () => {
    expect(remapMultisceneUrls(["s3://bucket/key"])).toEqual(["https://bucket.s3.amazonaws.com/key"]);
  });

  it("maps multiscene arrays", () => {
    expect(remapMultisceneUrls([["s3://bucket1/key1", "gs://bucket2/key2"], "https://example.com/image.tif"])).toEqual([
      ["https://bucket1.s3.amazonaws.com/key1", "https://storage.googleapis.com/bucket2/key2"],
      "https://example.com/image.tif",
    ]);
  });
});
