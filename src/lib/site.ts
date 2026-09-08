/**
 * Zentrale Betreiberdaten. Alle {{...}}-Werte sind Platzhalter und müssen vor
 * dem ersten Deploy durch die echten Angaben ersetzt werden. Sie stehen hier
 * und nicht in .env, weil sie im Impressum öffentlich sichtbar sein müssen.
 */
export const site = {
  name: "Güler.dev Website-Check",
  kurzname: "Website-Check",
  marke: "Güler.dev",
  beschreibung:
    "Kostenloser Ehrlichkeits-Check für Ihre Website: Technik, Recht, Sichtbarkeit bei Google und in KI-Suchen — verständlich erklärt.",

  /** Subdomain, unter der das Tool läuft, z. B. check.gueler.dev */
  domain: "{{TOOL_DOMAIN}}",
  url: "https://{{TOOL_DOMAIN}}",
  /** Hauptauftritt, auf den der Report am Ende verweist */
  hauptseite: "https://{{HAUPTSEITE_URL}}",
  kontaktSeite: "https://{{HAUPTSEITE_URL}}/kontakt",

  betreiber: {
    name: "{{BETREIBER_NAME}}",
    strasse: "{{BETREIBER_STRASSE}}",
    plzOrt: "{{BETREIBER_PLZ_ORT}}",
    land: "Deutschland",
    telefon: "{{BETREIBER_TELEFON}}",
    email: "{{BETREIBER_EMAIL}}",
    umsatzsteuerId: "{{BETREIBER_USTID}}",
  },
} as const;
