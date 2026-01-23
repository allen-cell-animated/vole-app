import type { MultisceneUrls } from "../../src/aics-image-viewer/components/App/types";

export function isValidUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/allen/aics/") ||
    url.startsWith("s3://") ||
    url.startsWith("gs://")
  );
}

export function encodeImageUrlProp(imageUrl: string | MultisceneUrls): string {
  // work with an array of scenes, even if there's only one scene
  const scenes = (imageUrl as MultisceneUrls).scenes ?? [imageUrl];
  // join urls in multi-source images with commas, and encode each url
  const sceneUrls = scenes.map((scene) => encodeURIComponent(Array.isArray(scene) ? scene.join(",") : scene));
  // join scenes with `+`
  return sceneUrls.join("+");
}
