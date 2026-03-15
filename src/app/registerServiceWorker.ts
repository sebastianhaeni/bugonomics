export function registerServiceWorker(
  windowObject: Window & typeof globalThis = window,
): void {
  if (!import.meta.env.PROD || !("serviceWorker" in windowObject.navigator)) {
    return;
  }

  windowObject.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("sw.js", document.baseURI);
    const serviceWorkerScope = new URL("./", document.baseURI).pathname;
    windowObject.navigator.serviceWorker
      .register(serviceWorkerUrl, {
        scope: serviceWorkerScope,
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  });
}
