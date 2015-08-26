#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var colors = require("colors");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var messageFormat = {
  "agent.log":    { message: "[Agent]", color: colors.cyan },
  "agent.error":  { message: "[Agent]", color: colors.red },

  "server.log":   { message: "[Device]", color: colors.blue },
  "server.error": { message: "[Device]", color: colors.red },
  "server.sleep": { message: "[Device]", color: colors.blue },
  "powerstate":   { message: "[Device]", color: colors.blue },
  "lastexitcode": { message: "[Device]", color: colors.blue },
  "firmware":     { message: "[Device]", color: colors.blue },

  "status":       { message: "[Status]", color: colors.yellow }
};

program
  .option("-d, --device [device_id]", "the deviceId you would like to see logs for")

program.parse(process.argv);

if (!("device" in program)) {
    console.log("ERROR: You must specify a device with -d");
    return;
}

function formatDate(d) {
  var pad = function(num, size) {
    if (!size) size = 2;
    var s = "000000000" + num;
    return s.substr(s.length-size);
  };

  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDay()) + " "
          + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + " "
          + "UTC" + (d.getTimezoneOffset() / -60)
}

function formatMessage(log) {
  var format = messageFormat[log.type];

  return colors.grey(formatDate(new Date(log.timestamp))) + " "
         + format.color(format.message) + "\t"
         + colors.grey(log.message);
}

config.init(["apiKey"], function(err, succhess) {
  if (err) {
    console.log("ERROR: Could not find an API-Key");
    console.log("   Run `imp login` to set global API-Key");
    return;
  }

  imp = config.createImpWithConfig();
  console.log("Opening stream..");

  imp.streamDeviceLogs(program.device, function(err, data) {
    if (err) {
        console.log("ERROR: " + err.message_short);
        return;
    }

    if ("logs" in data) {
        data.logs.forEach(function(log) {
            console.log(formatMessage(log));
        });
    }
  });
});
