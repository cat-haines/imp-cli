#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var colors = require("colors");
var fs = require("fs");

var Imp = require("imp-api");
var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var messageFormat = {
  "agent.log": { message: "[Agent]", color: colors.cyan },
  "agent.error": { message: "[Agent]", color: colors.red },

  "server.log": { message: "[Device]", color: colors.blue },
  "server.error": { message: "[Device]", color: colors.red },
  "server.sleep": { message: "[Device]", color: colors.blue },
  "powerstate": { message: "[Device]", color: colors.blue },
  "lastexitcode": { message: "[Device]", color: colors.blue },
  "firmware": { message: "[Device]", color: colors.blue },

  "status": { message: "[Status]", color: colors.yellow }
};

program
  .option("-d, --device [device_id]", "The deviceId you would like to see logs for")

program.parse(process.argv);

if (!("device" in program)) {
    console.log("ERROR: You must specify a device with -d");
    return;
}

var i = 0;

function formatMessage(log) {
  var format = messageFormat[log.type];

  return colors.grey(log.timestamp) + " "
         + format.color(format.message) + "\t"
         + colors.grey(log.message);
}

config.init(["apiKey"], function(err, succhess) {
  if (err) {
    console.log("ERROR: Could not find an API-Key");
    console.log("   Run `imp login` to set global API-Key");
    return;
  }

  var imp = new Imp({ apiKey: config.get("apiKey") });
  console.log("Opening stream..");

  imp.streamDeviceLogs(program.device, function(err, data) {
    if (err) {
        console.log("ERROR: " + err.message_short);
        return;
    }

    if ("logs" in data) {
        data.logs.forEach(function(log) {
            //formatMessage(log);
            console.log(formatMessage(log));
        });
    }
  });
});
