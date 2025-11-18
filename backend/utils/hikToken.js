const crypto = require("crypto");

function generateHikToken() {
  const keyParam = process.env.HIK_KEY_PARAM;
  const keySlat = process.env.HIK_KEY_SLAT;

  return crypto
    .createHash("sha256")
    .update(keyParam + keySlat)
    .digest("hex");
}

module.exports = generateHikToken;
