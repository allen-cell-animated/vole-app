import type { MultisceneUrls } from "../../src/aics-image-viewer/components/App/types";

const S3_URL_PREFIX = "s3://";
const GCS_URL_PREFIX = "gs://";
const HTTP_URL_PREFIX = "http://";
const HTTPS_URL_PREFIX = "https://";
const HTTP_REGEX = /^https?:\/\//i;

export function isValidUrl(url: string): boolean {
  return HTTP_REGEX.test(url) || url.startsWith(S3_URL_PREFIX) || url.startsWith(GCS_URL_PREFIX);
}

export function encodeImageUrlProp(imageUrl: string | MultisceneUrls): string {
  // work with an array of scenes, even if there's only one scene
  const scenes = (imageUrl as MultisceneUrls).scenes ?? [imageUrl];
  // join urls in multi-source images with commas, and encode each url
  const sceneUrls = scenes.map((scene) => encodeURIComponent(Array.isArray(scene) ? scene.join(",") : scene));
  // join scenes with `+`
  return sceneUrls.join("+");
}

export function remapUrl(url: string): string {
  url = url.trim();
  if (url.startsWith(S3_URL_PREFIX)) {
    // remap s3://bucket/key to https://bucket.s3.amazonaws.com/key
    const s3Path = url.slice(S3_URL_PREFIX.length);
    const pathSegments = s3Path.split("/");
    url = `https://${pathSegments[0]}.s3.amazonaws.com/${pathSegments.slice(1).join("/")}`;
  } else if (url.startsWith(GCS_URL_PREFIX)) {
    // remap gs://bucket/key to https://storage.googleapis.com/bucket/key
    url = url.replace(GCS_URL_PREFIX, "https://storage.googleapis.com/");
  }
  return url;
}

/**
 * Remaps S3 (s3://) and Google Cloud Storage (gs://) URLs to HTTPS URLs.
 */
export function remapMultisceneUrls(imageUrls: MultisceneUrls["scenes"]): MultisceneUrls["scenes"] {
  return imageUrls.map((scene) => {
    if (Array.isArray(scene)) {
      return scene.map(remapUrl);
    } else {
      return remapUrl(scene);
    }
  });
}
