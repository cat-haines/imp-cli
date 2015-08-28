#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var imp;

program
  .option("-u, --url [baseUrl]", "overrides base URL for the API (e.g. -u canary-api.electricimp.com)")

program.parse(process.argv);

function apiKeyPrompt(apiKey) {
  var promptText = "Build Api-Key";
  if (apiKey) {
    promptText += " (" + apiKey + "): ";
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val) {
    if (apiKey && !val) val = apiKey;

    var url = "build.electricimp.com";
    if ("url" in program) url = program.url;

    config.setGlobal("apiKey", val);
    config.setGlobal("apiBase", url);
    imp = config.createImpWithConfig();

    //For Login, is { "device_id": "garbage" } the intended set of options, or is this left over from testing?
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(apiKey);
        return;
      }

      config.saveGlobalConfig(function(err) {
        if (err) {
          console.log("ERROR: " + err);
          return;
        }

        console.log("Success! Wrote configuration to ~/.impconfig.");
        console.log("To create a new project run: imp init");
      });

    });
  });
}

config.init(null, function(err, success) {
    apiKeyPrompt(config.getGlobal("apiKey"));
});
