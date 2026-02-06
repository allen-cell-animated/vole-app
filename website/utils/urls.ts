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

function isURIComponentEncoded(uriComponent: string): boolean {
  try {
    const decoded = decodeURIComponent(uriComponent);
    // extra regex test for a few reserved characters, to try to catch the case
    // where the URI *contains* encoded query params but is not itself encoded
    return uriComponent !== decoded && !/[/,+]/.test(uriComponent);
  } catch {
    return false;
  }
}

/** Wrapper around `encodeURIComponent` that tries to guess whether the input is already encoded before encoding it. */
function ensureURIComponentIsEncoded(uriComponent: string): string {
  return isURIComponentEncoded(uriComponent) ? uriComponent : encodeURIComponent(uriComponent);
}

export function encodeImageUrlProp(imageUrl: string | MultisceneUrls): string {
  // work with an array of scenes, even if there's only one scene
  const scenes = (imageUrl as MultisceneUrls).scenes ?? [imageUrl];
  // join urls in multi-source images with commas, and encode each url
  const sceneUrls = scenes.map((scene) => {
    if (Array.isArray(scene)) {
      return scene.map(ensureURIComponentIsEncoded).join(",");
    } else {
      return ensureURIComponentIsEncoded(scene);
    }
  });
  // join scenes with `+`
  return sceneUrls.join("+");
}
