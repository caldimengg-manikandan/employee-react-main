// backend/services/hikvision.js
const axios = require("axios");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // ⚠️ allow self-signed certs

const HIK_URL = "https://192.168.1.144/hikcentralapi";

async function loginHikvision() {
  const body = {
    userName: "admin",
    password: "Caldim@2025"
  };

  const res = await axios.post(`${HIK_URL}/v1/auth/login`, body, {
    timeout: 10000
  });

  return res.data.data.token; // access_token
}

module.exports = { loginHikvision };
