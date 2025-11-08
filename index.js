/* eslint-disable no-console */
"use strict";

process.on("uncaughtException", (error) => console.log(error));
const app = require("./src/Application.js");

app
  .register()
  .then(() => {
    app.connect();
  })
  .catch((error) => {
    console.log(error);
  });
