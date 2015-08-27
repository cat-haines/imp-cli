#! /usr/bin/env node

var program = require("commander");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var imp;

program
  .option("-r, --revision [revision]", "pulls the specified revision")
  .option("-d, --devices", "pulls and syncs device list")

program.parse(process.argv);

function getVersion(ver, cb) {
  imp.getModelRevision(config.get("modelId"), ver, cb);
}

function done(err, data) {
  if (err) {
    console.log("ERROR: " + err.message_short);
    return;
  }
  else {
    if ("revision" in data) {
      fs.writeFile(config.get("deviceFile"), data.revision.device_code);
      fs.writeFile(config.get("agentFile"), data.revision.agent_code);

      console.log("Success! Pulled version " + data.revision.version + "..");
    }
  }
}

config.init(["apiKey", "modelId", "devices", "agentFile", "deviceFile"], function(err, success) {
  if (err) {
    console.log("ERROR: " + err);
    return;
  }

  imp = config.createImpWithConfig();

  if ("devices" in program) {
    imp.getDevices( { "model_id": config.get("modelId") }, function(err, data) {
      if (err) {
        console.log(err);
        return;
      } else {
        var devices = [];
        data.devices.forEach(function(device) {
          devices.push(device.id);
        });
        config.setLocal("devices", devices);
        config.saveLocalConfig(function(err, success) {
          if (err) {
            console.log("ERROR: " + err);
            return;
          }
          console.log("Success! Pulled devices from model " + config.get("modelId"));
        });
      }
    });
  } else {
    if ("revision" in program) {
      getVersion(program.revision, done);
    } else {
      imp.getModelRevisions(config.get("modelId"), null, function(err, data) {
        if (err) {
          console.log("ERROR: Something went horribly wrong..");
          return;
        }
        if ("revisions" in data && data.revisions.length > 0) {
          getVersion(data.revisions[0].version, done);
        }
      });
    }
  }
});
