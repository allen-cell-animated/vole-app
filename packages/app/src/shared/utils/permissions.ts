/**
 * Try to determine whether attempting to access the clipboard will immediately fail.
 *
 * When this function returns `false`, accessing the clipboard *may* be successful, though some browsers require users
 * to confirm every paste. When it returns `true`, access to the clipboard is definitely blocked.
 */
export const queryPasteDenied = async (): Promise<boolean> => {
  try {
    // Chromium browsers: we can query permissions to learn whether a clipboard read will succeed
    const permission = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    // If we're here, the `clipboard-read` permission is supported. Its state may be `denied`, `granted`, or `prompt`.
    return permission.state === "denied";
  } catch {
    // Non-Chromium browsers: clipboard reads don't have stateful permissions and will always require a prompt
    return false;
  }
};
