# Sending long URL lists and/or image metadata with `postMessage`

Including more than a few URLs in a list as described in the
[URL specification] can quickly lead to an unreasonably long viewer URL.
Additionally, Vol-E features a metadata view for displaying arbitrary JSON data
associated with an image, but no way to inject image metadata through a URL
query parameter, since including non-trivial JSON data could quickly lead to an
unreasonably long viewer URL, even when describing a single scene. To transfer
large collections of image URLs and/or metadata from external applications,
Vol-E provides an alternative to including everything in query parameters. This
process requires the external application to send the additional data using
[`postMessage`], and happens in three steps:

## Step 1: Open Vol-E

Using [`window.open`], the external application opens a Vol-E window with the
additional query parameter `msgorigin`. `msgorgigin` identifies the _origin_ of
the app that just opened Vol-E. The origin is the segment of the URL from the
beginning through the hostname and (optional) port. For instance, the origin of
`https://example.com/index.html?foo=bar` is `https://example.com`. The origin
for the current context can be easily learned using `window.location.origin`.

The Vol-E URL should ideally also include a `url` parameter containing a single
scene as a fallback in case any of the steps below fail.

The external application code will want to hold onto the [`WindowProxy`] object
returned from [`window.open`] for the following steps.

## Step 2: Wait for Vol-E to load

On load, if the `msgorigin` query parameter is present, Vol-E will send a
message back to the opening application. The external application code should
wait for this message before moving to the next step, to ensure that the Vol-E
window is open and ready to receive data. It should also check that the
message's `source` property matches the [`WindowProxy`] object it saved in step
1, to ensure it's sending data to the right Vol-E window (in case the user
opened multiple windows one right after the other).

## Step 3: Send data

Once the external application knows that the Vol-E window it opened is ready
and waiting for a message, it can send additional data by calling
[`postMessage`] on the [`WindowProxy`] object from Step 1. The message data
must be an object, and can include any of the following optional properties:

| Message property | Type (TypeScript)                     | Description                                                     | Default                             |
| ---------------- | ------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| `scenes`         | `string`                              | A list of URLs, encoded as described in the [URL specification] | Value of `url` query parameter      |
| `sceneIndex`     | `number`                              | The index of the scene to open first                            | `0`                                 |
| `meta`           | `Record<string, Record<string, any>>` | A collection of metadata records, keyed by scene URL            | None (scenes will have no metadata) |

When it receives this message, Vol-E will remove the `msgorigin` parameter from
its URL and save the transferred data in the browser's local storage. Image
metadata is stored based on the URL it describes, meaning that if the user
later opens a different session that includes a scene for which Vol-E
previously received metadata, that metadata record will be used in the new
session. Scene URLs are identified in storage by a UUID generated for each
message, which is stored in the URL using the `collectionid` query parameter so
that the user can return to the same URL later and restore the same multi-scene
collection. (If the external application does not send `scenes` as part of its
message, Vol-E will not insert `collectionid` into the URL.)

Vol-E tracks which records in local storage were least recently used, and if
the user opens many more image collections using this method, it will
eventually evict stored metadata and scenes to keep its local storage use under
the browser's quota.

## Example code (TypeScript)

```typescript
function openScenesInVolE(scenes: string[], meta: Record<string, Record<string, any>>, startingScene: number) {
  // STEP 1: generate a Vol-E URL and open it in a new browsing context
  const url = new URL("https://vole.allencell.org/viewer");
  url.searchParams.append("msgorigin", window.location.origin);
  // included only as a fallback in case the message fails
  url.searchParams.append("url", scenes[startingScene]);

  const handle = window.open(url);

  // STEP 2: set up a handler for the "I'm ready!" message from Vol-E
  const loadHandler = (event: MessageEvent) => {
    // check that this is the message we're waiting for
    if (event.origin !== url.origin || event.source !== handle) {
      return;
    }

    // STEP 3: send over the scenes and metadata as a message
    const message = {
      scenes: scenes.join("+"),
      sceneIndex: startingScene,
      meta,
    };
    handle?.postMessage(message, url.origin);
    // this event listener has served its purpose and we can get rid of it
    window.removeEventListener("message", loadHandler);
  };

  window.addEventListener("message", loadHandler);
}
```

[URL specification]: ./URL_SPEC.md#data-source-url
[`postMessage`]: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
[`window.open`]: https://developer.mozilla.org/en-US/docs/Web/API/Window/open
[`WindowProxy`]: https://developer.mozilla.org/en-US/docs/Glossary/WindowProxy
