const express = require("express");

const morgan = require("morgan");

const app = express();

const port = 8080;

app.use(morgan("common"));
app.use(express.json());


app.get("/healthz", function(req, res) {
  res.send("ok");
});

app.all('*', (req, res) => {
  const headers = req.headers;
  const params = req.query;
  const cookies = req.cookies;
  const body = req.body;
  const url = req.url;
  const oUrl = req.originalUrl;
  

  const response = {
    headers,
    params,
    cookies,
    body,
	url,
	oUrl
  };

  res.json(response);
});
 
const server = app.listen(port, function() {
  console.log("Webserver is ready ");
});

process.on("SIGINT", function onSigint() {
  console.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// quit properly on docker stop
process.on("SIGTERM", function onSigterm() {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// shut down server
function shutdown() {
  server.close(function onServerClosed(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
}