/**
 * Übergabe des Reports an die Druckansicht.
 *
 * Es gibt bewusst keine Datenbank, und der Report lebt im React-State der
 * Session. Damit `/report/print` in einem neuen Tab denselben Report zeigen
 * kann, wird er kurz in den sessionStorage gelegt. Der Inhalt verlässt den
 * Browser nicht und verschwindet mit dem Schließen des Tabs.
 */
export const DRUCK_SPEICHER_SCHLUESSEL = "guelerdev-websitecheck-report";
