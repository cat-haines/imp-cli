#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var Imp = require("imp-api");
var imp;

var config; // the global config

program.parse(process.argv);

function apiKeyPrompt(apiKey) {
  var promptText = "Dev Tools Api-Key";
  if (apiKey) {
    promptText += " (" + apiKey + "): ";
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val) {
    if (apiKey && !val) val = apiKey;

    imp = new Imp({ apiKey: val });
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(apiKey, next);
        return;
      }

      // set API Key, and move on to next
      config.setGlobal("apiKey", val);
      config.saveGlobalConfig(function(err) {
        if (err) {
          console.log("ERROR: " + err);
          return;
        }

        console.log("Success! To create a new project run:");
        console.log("   imp init");
      });

    });
  });
}

config.init(null, function(err, success) {
    apiKeyPrompt(config.getGlobal("apiKey"));
});
