const axios = require("axios");

async function getAccessToken() {
  const response = await axios.post(
    "https://accounts.zoho.in/oauth/v2/token",
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    }
  );

  return response.data.access_token;
}

async function sendZohoMail({ to, subject, content }) {
  const accessToken = await getAccessToken();

  return axios.post(
    `https://mail.zoho.in/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`,
    {
      fromAddress: "support@caldimengg.in",
      toAddress: to,
      subject,
      content,
    },
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    }
  );
}

module.exports = { sendZohoMail };
