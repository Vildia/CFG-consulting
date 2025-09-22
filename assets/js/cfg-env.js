(function(){
  var DEF_URL = 'https://script.google.com/macros/s/AKfycbwFOxaAtkPV4hsk3_gHGdrS4dlISHyVtj2f8TrxjTI_ZQP7j8cd2N8XVUdYpPzUNPv73A/exec';
  var cfg = window.__CFG || {};
  var envUrl = (cfg.APPS_SCRIPT_URL && /^https?:\/\//.test(cfg.APPS_SCRIPT_URL)) ? cfg.APPS_SCRIPT_URL : DEF_URL;
  window.__CFG = Object.assign({}, cfg, {
    APPS_SCRIPT_URL: envUrl,
    GA_ID: cfg.GA_ID || 'G-D7QRTPW2F3',
    CFG_KEY: cfg.CFG_KEY || '',
    CFG_SECRET: cfg.CFG_SECRET || ''
  });
})();