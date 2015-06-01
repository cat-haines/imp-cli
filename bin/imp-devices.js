#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var Table = require("cli-table");

var Imp = require("imp-api");
var fs = require("fs");
var ImpConfig = require("../lib/impConfig.js");

var config = new ImpConfig();

program
  .option("-a, --add [device_id]", "Adds a device to the current project")
  .option("-r, --remove [device_id]", "Removes a device to the current project")
  .option("--online", "Filters list to only display online devices")
  .option("--offline", "Filters list to only display offline devices")
  .option("--assigned", "Filters list to only display assigned devices")
  .option("--unassigned", "Filters list to only display unassigned devices")

program.parse(process.argv);

config.init(["apiKey"], function(err, success) {
  if (err) {
    console.log("ERROR: Could not find an API-Key");
    console.log("   Run `imp login` to set global API-Key");
    return;
  }

  if ("add" in program && "remove" in program) {
    console.log("ERROR: You cannot specifiy -a AND -d");
    return;
  }

  var imp = new Imp({ apiKey: config.get("apiKey") });

  // add
  if ("add" in program) {
    if(!config.getLocal("devices")) {
      console.log("ERROR: `devices` key missing from .impconfig");
      return;
    }

    if (typeof program.add != "string") {
      console.log("ERROR: Invalid or missing device_id")
      console.log("   imp devices -a [device_id]")
      return;
    }
    imp.assignDevice(program.add, config.get("modelId"), function(err,data) {
      if (err) {
        console.log("ERROR: " + err.message_short);
        return;
      }
      // check if it's in config.devices already
      var found = false;
      var devices = config.get("devices");
      for(var i = 0; i < devices.length; i++) {
        if (devices[i] == program.add) {
          found = true;
        }
      }
      if (!found) {
        devices.push(program.add);
        config.saveLocalConfig(function(err) {
          if (err) {
            console.log("ERROR: " + err);
            return;
          }
          console.log("Success!");
        });
      } else {
        console.log("Success!");
      }
    });
    return;
  }

  // remove
  if ("remove" in program) {
    if(!config.get("devices")) {
      console.log("ERROR: `devices` key missing from .impconfig");
      return;
    }

    if (typeof program.remove != "string") {
      console.log("ERROR: Invalid or missing device_id")
      console.log("   imp devices -r [device_id]")
      return;
    }
    // check if it's in config.devices already
    var index = null;
    var devices = config.get("devices");
    for(var i = 0; i < devices.length; i++) {
      if (devices[i] == program.remove) {
        index = i;
        break;
      }
    }

    if (index == null) {
      console.log("INFO: " + program.remove + " is not assigned to the active model.");
      return;
    }

    imp.assignDevice(program.remove, null, function(err,data) {
      if (err) {
        console.log("ERROR: " + err.message_short);
        return;
      }

      devices.splice(index,1);
      config.saveLocalConfig(function(err) {
        if (err) {
          console.log("ERROR: " + err);
          return;
        }
        console.log("Success!");
      });
    });

    return;
  }

  // list
  if ("unassigned" in program && "assigned" in program) {
    console.log("ERROR: You cannot specify --assigned AND --unassigned");
    return;
  }
  if ("online" in program && "offline" in program) {
    console.log("ERROR: You cannot specify --offline AND --online");
    return;
  }

  imp.getDevices(null, function(err, data) {
    if (err) {
      console.log("ERROR: " + err.message_short);
      return;
    }

    var filteredDevices = [];
    var powerState = null;
    var assignedState = null;

    if ("online" in program) powerState = "online";
    if ("offline" in program) powerState = "offline";

    if ("assigned" in program) assignedState = true;
    if ("unassigned" in program) assignedState = false;

    data.devices.forEach(function(device) {
      if ((powerState == null || device.powerstate == powerState) && (assignedState == null || (device.model_id != null) == assignedState)) {
        filteredDevices.push(device);
      }
    });


    var table = new Table({
        head: ['device_id', 'device_name', 'model_id', 'state']
      , colWidths: [20, 30, 14, 10]
    });

    filteredDevices.forEach(function(device) {
      table.push([device.id, device.name, device.model_id, device.powerstate]);
    })

    console.log(table.toString());
  });

});
