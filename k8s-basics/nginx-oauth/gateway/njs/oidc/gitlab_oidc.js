const sessions = {};

const SEC_KEY = "prakashm88";
const authEndpoint = "https://gitlab.com/oauth/authorize";
const tokenEndpoint = "https://gitlab.com/oauth/token";
const userInfoEndpoint = "https://gitlab.com/oauth/userinfo";
const clientId = "hhhhhhhhhhhhhhhhhhhhhhhhh";
const clientSecret = "gloas-jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj";
const redirectUri = "https://nginx-route-apps-dev.apps.openshiftapps.com/callback";
const redirectUrl = "http://192.168.1.14:8080/callback";

function jwt(data) {
  // TODO add signature validation later
  var parts = data
    .split(".")
    .slice(0, 2)
    .map((v) => Buffer.from(v, "base64url").toString())
    .map(JSON.parse);
  return { headers: parts[0], payload: parts[1] };
}

async function generate_hs256_jwt(init_claims, key, valid) {
  let header = { typ: "JWT", alg: "HS256" };
  let claims = Object.assign(init_claims, { exp: Math.floor(Date.now() / 1000) + valid });

  let s = [header, claims]
    .map(JSON.stringify)
    .map((v) => Buffer.from(v).toString("base64url"))
    .join(".");

  let wc_key = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  let sign = await crypto.subtle.sign({ name: "HMAC" }, wc_key, s);

  return s + "." + Buffer.from(sign).toString("base64url");
}

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function decodeJWT(token) {
  const parts = token.split(".");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  return payload;
}

function get_auth_url(r) {
  const state = Math.random().toString(36).substring(7);
  const authorizeUrl = `${authEndpoint}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUrl}&scope=openid&state=${state}`;

  r.log(`Redirecting to Gitlab for OIDC: ${authorizeUrl}`);

  return authorizeUrl;
}

function redirect(r) {
  const state = Math.random().toString(36).substring(7);
  const authorizeUrl = `${authEndpoint}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUrl}&scope=openid&state=${state}`;

  r.log(`Redirecting to Gitlab for OIDC: ${authorizeUrl}`);

  r.headersOut["Location"] = authorizeUrl;
  //r.sendHeader();
  //r.status = 302;
  //r.return(302); // Use r	.return() to send the redirect response
  //	r.return(301);
  //	r.sendHeader();
  r.return(302);
}

function parseQuery(query) {
  //var url = location.search;
  //var query = url.substr(1);
  if (query == null || query == undefined) throw new Error("No Query params found !! - " + query);
  var result = {};
  query.split("&").forEach(function (part) {
    var item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

async function callback(r) {
  try {
    //const uriParts = r.uri.split("?");

    //r.log("uriParts " + uriParts + " - " + uriParts.length );

    const qs = r.args;

    if (qs.length < 1) {
      r.return(400, "Missing query string");
      return;
    }

    //const qs = parseQuery(uriParts[1]);
    const code = qs.code;

    r.log("code " + code);

    if (!code) {
      r.return(400, "Code not found");
      return;
    }

    const body = `client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUrl}&grant_type=authorization_code`;

    r.log("body " + body);
    r.log("########################### Invoke Token creation ###########################");

    r.subrequest(
      "/internal/token",
      {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      },
      async function (res) {
        if (res.status != 200) {
          r.return(500, `Error getting token: ${res.responseText}`);
          return;
        }

        r.log("data obtained from resp " + res.responseText);

        try {
          const parsedResponse = JSON.parse(JSON.parse(res.responseText));
          r.log("Parsed response: " + JSON.stringify(parsedResponse));
          r.log("ID Token: " + parsedResponse.id_token);
        } catch (e) {
          r.log("Parsing error: " + e.message);
        }

        const respData = JSON.parse(JSON.parse(res.responseText));

        const keys = Object.keys(respData);
        r.log("Keys in respData: " + keys.join(", "));
        r.log("id_token value: " + respData.id_token);

        r.log("data obtained from resp as parsed " + respData);

        if (respData.error) {
          r.return(500, `Error: ${respData.error_description}`);
          return;
        }

        const id_token = respData.id_token;

        r.log("id_token " + id_token);

        const user_data = decodeJWT(id_token);

        const sessionId = generateSessionId();
        const claims = {
          iss: "nginx",
          sub: user_data.sub,
          userId: user_data.sub,
          nickname: user_data.nickname,
          username: user_data.preferred_username,
          groups: user_data.groups_direct,
          created: Date.now(),
        };
        const jwtv = await generate_hs256_jwt(claims, SEC_KEY, 600);
        r.log("#######################  jwtv " + jwtv);
        // r.headersOut["Set-Cookie"] = `session_token=${jwtv}; HttpOnly; Secure; SameSite=Strict;`;
        r.headersOut["Set-Cookie"] = `session_token=${jwtv}; HttpOnly; SameSite=Strict;`;
        r.return(200, `Authenticated. Session token: ${jwtv}`);
      }
    );
  } catch (e) {
    r.return(500, `Error: ${e.message}`);
  }
}

function auth_request(r) {
  r.log("in auth_request ");
  const cookie = r.headersIn["Cookie"] || "";
  const sessionTknMatch = cookie.match(/session_token=([^;]+)/);

  r.log("in auth_request sessionTknMatch: " + sessionTknMatch);

  if (!sessionTknMatch) {
    r.return(401, "No session");
    return;
  }

  const sessionTkn = sessionTknMatch[1];

  r.log("Validating sessionTkn: " + sessionTkn);

  /*
    sessions[sessionId] = {
	  userId: "prak",
	  userEmail: "email",
	  userName: "userName"
  };
  
  const session = sessions[sessionId];
  
  if (!session) {
    r.return(401, "Invalid session");
    return;
  } 

  r.headersOut["X-User-Id"] = session.userId;
  r.headersOut["X-User-Email"] = session.userEmail;
  r.headersOut["X-User-Name"] = session.userName;  
  
  r.headersOut["X-User-token"] = sessionTkn ; 
  
//	return ;
  // r.return(200); */

  return sessionTkn;
}

function validate(r) {
  const cookie = r.headersIn["Cookie"] || "";
  const sessionIdMatch = cookie.match(/session_id=([^;]+)/);
  if (!sessionIdMatch) {
    r.return(401, "Invalid session");
    return;
  }

  const sessionId = sessionIdMatch[1];
  const session = sessions[sessionId];

  if (!session) {
    r.return(401, "Invalid session");
    return;
  }

  r.return(200, `Valid session. Access Token: ${session.accessToken}`);
}

export default { redirect, callback, auth_request, validate, get_auth_url };
