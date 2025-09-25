CFG • Environment & Secrets (canonical)

Vercel (Production & Preview):
  ORIGIN = https://cfg-consulting.vercel.app
  ORIGIN_PREVIEW = (optional) leave blank; API accepts *.vercel.app
  APPS_SCRIPT_URL = https://script.google.com/macros/s/AKfycbwFOxaAtkPV4hsk3_gHGdrS4dlISHyVtj2f8TrxjTI_ZQP7j8cd2N8XVUdYpPzUNPv73A/exec
  CFG_KEY = ******** (must match Script Properties CFG_KEY)
  (optional) CFG_KEY_V2 = ******** (second rotation key)

Apps Script — Script Properties:
  BOT_TOKEN, CHAT_ID, EMAIL_TO, SPREADSHEET_ID
  CFG_KEY, CFG_KEY_V2 (must match Vercel), CFG_SECRET (for GET /exec?test=config&token=...)

GitHub › Actions › Secrets:
  VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
  ORIGIN, APPS_SCRIPT_URL, CFG_KEY  (used by .github/workflows/vercel-env-deploy.yml)

GA4:
  Measurement ID = G-D7QRTPW2F3 (already hard‑coded in analytics/ga-init.js)
