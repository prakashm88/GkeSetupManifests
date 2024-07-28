const sessions = {};

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function redirect(r) {
  const clientId = "YOUR_CLIENT_ID";
  const redirectUri = "http://localhost/callback";
  const state = Math.random().toString(36).substring(7);

  r.log(`Redirecting to GitHub for OIDC: ${state}`);
  r.headersOut[
    "Location"
  ] = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid&state=${state}`;
  r.status = 302;
  r.sendHeader();
}

function callback(r) {
  const url = require("url");
  const querystring = require("querystring");

  const parsedUrl = url.parse(r.uri, true);
  const code = parsedUrl.query.code;

  if (!code) {
    r.return(400, "Code not found");
    return;
  }

  const tokenEndpoint = "https://github.com/login/oauth/access_token";
  const userInfoEndpoint = "https://api.github.com/user";
  const clientId = "YOUR_CLIENT_ID";
  const clientSecret = "YOUR_CLIENT_SECRET";
  const redirectUri = "http://localhost/callback";

  const body = querystring.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body,
  };

  fetch(tokenEndpoint, request)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        r.return(500, `Error: ${data.error_description}`);
        return;
      }

      const accessToken = data.access_token;
      return fetch(userInfoEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "nginx-njs",
        },
      })
        .then((response) => response.json())
        .then((userInfo) => {
          const sessionId = generateSessionId();
          sessions[sessionId] = {
            accessToken: accessToken,
            userId: userInfo.id,
            userEmail: userInfo.email,
            userName: userInfo.login,
            created: Date.now(),
          };

          r.headersOut["Set-Cookie"] = `session_id=${sessionId}; HttpOnly; Secure`;
          r.return(200, `Authenticated. Session ID: ${sessionId}`);
        });
    })
    .catch((err) => {
      r.return(500, `Error: ${err.message}`);
    });
}

function auth_request(r) {
  const cookie = r.headersIn["Cookie"] || "";
  const sessionIdMatch = cookie.match(/session_id=([^;]+)/);
  if (!sessionIdMatch) {
    r.return(401, "No session");
    return;
  }

  const sessionId = sessionIdMatch[1];
  const session = sessions[sessionId];

  if (!session) {
    r.return(401, "Invalid session");
    return;
  }

  r.headersOut["X-User-Id"] = session.userId;
  r.headersOut["X-User-Email"] = session.userEmail;
  r.headersOut["X-User-Name"] = session.userName;

  r.return(200);
}

function validate(r) {
  const sessionId = r.headersIn["Cookie"].split("=")[1];

  if (!sessionId || !sessions[sessionId]) {
    r.return(401, "Invalid session");
    return;
  }

  const session = sessions[sessionId];
  r.return(200, `Valid session. Access Token: ${session.accessToken}`);
}

export default { redirect, callback, auth_request, validate };
