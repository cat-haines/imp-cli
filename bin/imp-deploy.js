#! /usr/bin/env node

var program = require("commander");
var Imp = require("imp-api");
var fs = require("fs");
var ImpConfig = require("../lib/impConfig.js");

var config = new ImpConfig();

program
  .option("-t, --tag [tag]", "Adds a tag to the revision")

program.parse(process.argv);

config.init(["apiKey", "modelId", "agentFile", "deviceFile", "devices"], function(err, success) {
  var model = {
    device_code: null,
    agent_code: null
  }

  // Make sure the code files exist
  if (!fs.existsSync(config.get("agentFile"))) {
    console.log("ERROR: Could not find agent code file: " + config.get("deviceFile"));
    return;
  }
  if (!fs.existsSync(config.get("deviceFile"))) {
    console.log("ERROR: Could not find device code file: " + config.get("deviceFile"));
    return;
  }

  model.agent_code = fs.readFileSync(config.get("agentFile"), "utf8")
  model.device_code = fs.readFileSync(config.get("deviceFile"), "utf8")

  // Add the tag (if one was specified)
  if ("tag" in program) model["marker"] = program.tag;

  var imp = new Imp({ apiKey: config.get("apiKey") });
  imp.createModelRevision(config.get("modelId"), model, function(err, data) {
    if (err) {
      if (err.code != "CompileFailed") {
        console.log("ERROR: " + err.message_short);
        return;
      }

      if (err.details.agent_errors) {
        for(var i = 0; i < err.details.agent_errors.length; i ++) {
          var thisErr = err.details.agent_errors[i]
          console.log("   ERROR: " + thisErr.error);
          console.log("     at " + config.get("agentFile") +":" + thisErr.column + " (col "+thisErr.row+")");
        }
      }

      if (err.details.device_errors) {
        for(var i = 0; i < err.details.device_errors.length; i ++) {
          var thisErr = err.details.device_errors[i]
          console.log("   ERROR: " + thisErr.error);
          console.log("     at " + config.get("deviceFile") +":" + thisErr.column + " (col "+thisErr.row+")");
        }
      }

      return;
    }

    imp.restartModel(config.get("modelId"), function(err, restartData) {
      if (err) {
        console.log("Warning: Could not restart model");
      }

      console.log("Successfully created revision " + data.revision.version);
    });
  });

});
