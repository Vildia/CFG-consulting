
module.exports = (req, res) => {
  const hasURL = !!(process.env.APPS_SCRIPT_URL || '').trim();
  const hasKey = !!(process.env.CFG_KEY || '').trim();
  const origin = String(req.headers.origin || ('https://' + (req.headers.host || '')));
  res.status(200).json({
    ok: true,
    env: {
      has_APPS_SCRIPT_URL: hasURL,
      has_CFG_KEY: hasKey,
      origin,
      ORIGIN: String(process.env.ORIGIN || '').trim(),
      ORIGIN_PREVIEW: String(process.env.ORIGIN_PREVIEW || '').trim()
    }
  });
};
