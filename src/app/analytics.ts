interface WindowWithGtag extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics(
  measurementId: string | undefined,
  windowObject: WindowWithGtag = window,
  documentObject: Document = document,
): void {
  if (!measurementId || !import.meta.env.PROD) {
    return;
  }

  const normalizedMeasurementId = measurementId.trim();
  if (!normalizedMeasurementId) {
    return;
  }

  if (
    documentObject.querySelector(
      `script[data-ga-measurement-id="${normalizedMeasurementId}"]`,
    )
  ) {
    return;
  }

  const script = documentObject.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(normalizedMeasurementId)}`;
  script.dataset.gaMeasurementId = normalizedMeasurementId;
  documentObject.head.append(script);

  windowObject.dataLayer = windowObject.dataLayer || [];
  windowObject.gtag = function gtag() {
    windowObject.dataLayer?.push(arguments);
  };

  windowObject.gtag("js", new Date());
  windowObject.gtag("config", normalizedMeasurementId, {
    send_page_view: true,
  });
}
