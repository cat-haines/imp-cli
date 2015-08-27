#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var Table = require("cli-table");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

program
  .option("--active", "filters list to only display active models")
  .option("--inactive", "filters list to only display inactive models")

program.parse(process.argv);

config.init(["apiKey"], function(err, success) {
  if (err) {
    console.log("ERROR: Could not find an API-Key");
    console.log("   Run `imp login` to set global API-Key");
    return;
  }

  imp = config.createImpWithConfig();

  if ("active" in program && "inactive" in program) {
    console.log("ERROR: You cannot specify --active AND --inactive");
    return;
  }

  var activeState = null;
  if ("active" in program) activeState = true;
  if ("inactive" in program) activeState = false;

  imp.getModels(null, function(err, modelData) {
    if (err) {
      console.log("ERROR: " + err.message_short);
      return;
    }

    imp.getDevices(null, function(err, deviceData) {
      if (err) {
        console.log("ERROR: " + err.message_short);
        return;
      };

      var filteredModels = [];

      modelData.models.some(function(model) {
        if (activeState == null) {
          filteredModels.push(model);
        } else if (activeState) {
          deviceData.devices.some(function(device) {
            if(device.model_id == model.id) {
              filteredModels.push(model);
              return true;
            }
          });
        } else {
          var found = false;
          deviceData.devices.some(function(device) {
            if(device.model_id == model.id) {
              found = true;
              return true;
            }
          });
          if (!found) filteredModels.push(model);
        }
      });

    var table = new Table({
        head: ['model_id', 'model_name']
      , colWidths: [20, 30]
    });

    filteredModels.forEach(function(model) {
      table.push([model.id, model.name]);
    })

    console.log(table.toString());


    });
  });
});
