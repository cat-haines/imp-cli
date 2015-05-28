#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var fs = require("fs");

var Imp = require("imp-api");
var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

program
  .option("-d, --device [device_id]", "The deviceId you would like to see logs for")

program.parse(process.argv);

if (!("device" in program)) {
    console.log("ERROR: You must specify a device with -d");
    return;
}

config.init(["apiKey"], function(err, succhess) {
  if (err) {
    console.log("ERROR: Could not find an API-Key");
    console.log("   Run `imp login` to set global API-Key");
    return;
  }

  var imp = new Imp({ apiBase: "canary-api.electricimp.com", apiKey: config.get("apiKey") });
  imp.streamDeviceLogs(program.device, function(err, data) {
    if (err) {
        console.log("ERROR: " + err.message_short);
        return;
    }

    if ("logs" in data) {
        for(var idx in data.logs) {
            console.log(data.logs[idx]);
        }
    }
  });
});
