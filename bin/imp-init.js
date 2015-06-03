#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var impConfig = new ImpConfig();

var imp;

program.parse(process.argv);

// The config settings we'll eventually write
var config = {
  apiKey: null,
  modelId: null,
  modelName: null,
  deviceFile: null,
  agentFile: null,
  devices: []
}

function apiKeyPrompt(apiKey, next) {
  var promptText = "Dev Tools Api-Key";
  if (apiKey) {
    promptText += " (" + apiKey + "): ";
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val) {
    if (apiKey && !val) val = apiKey;
    impConfig.setLocal("apiKey", val);

    imp = impConfig.createImpWithConfig();
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(apiKey, next);
        return;
      }

      // set API Key, and move on to next
      config.apiKey = val;
      next();
    });
  });
}

function modelPrompt(next) {
  prompt("Model Id or Name: ", function(val) {
    if (!val) {
      modelPrompt(next);
      return;
    }

    // try to get model by id
    imp.getModel(val, function(err, data) {
      if (!err) {
        prompt("Found a matching model '" + data.model.name + "', use this (y): ", function(confirm) {
          if (confirm && confirm.toLowerCase()[0] != "y") {
            modelPrompt(next);
            return;
          }

          config.modelId = data.model.id;
          config.modelName = data.model.name;
          next();
          return;
        });
      } else {

        // an error means no model_id match was found
        imp.getModels({ "name": val }, function(err, data) {
          if (err) {
            console.log("Something went horribly wrong!");
            return;
          }

          // see if we found a matching result
          var foundMatch = false;
          for(var i = 0; i < data.models.length; i++) {
            if(data.models[i].name.toLowerCase() == val.toLowerCase()) {
              foundMatch = true;
              break;
            }
          }
          if (foundMatch) {
            prompt("Found a matching model '" + data.models[i].name + "', use this (y): ", function(confirm){
              if (confirm && confirm.toLowerCase()[0] != "y") {
                modelPrompt(next);
                return;
              }

              config.modelId = data.models[i].id;
              config.modelName = data.models[i].name;
              next();
              return;
            });
          } else {
            prompt("Create new model '" + val + "' (y): ", function(confirm) {
              if (confirm && confirm.toLowerCase()[0] != "y") {
                modelPrompt(next);
                return;
              }

              config.modelName = val;
              next();
              return;
            });
          }
        });
      }
    });
  });
}

function getDevices(next) {
  if (config.modelId == null) {
    next();
    return;
  }

  imp.getDevices({ "model_id": config.modelId }, function(err, data) {
    if (err) {
      console.log("Warning: Could not fetch devices assigned to '" + config.modelName + "'..");
      next();
    }

    for(var i = 0; i < data.devices.length; i++) {
      if (data.devices[i].model_id == config.modelId) {
        config.devices.push(data.devices[i].id);
      }
    }

    var devices = config.devices.length == 1 ? "device" : "devices"
    console.log("Info: Found " + config.devices.length + " " + devices + " associated with '" + config.modelName + "'");
    next();
  });
}

function fileNamePrompt(next) {
  var baseFileName = config.modelName.split(" ").join("_").toLowerCase();
  var defaultDeviceFileName = baseFileName + ".device.nut";
  var defaultAgentFileName = baseFileName + ".agent.nut";

  prompt("Device code file (" + defaultDeviceFileName + "): ", function(deviceFile) {
    if (!deviceFile) deviceFile = defaultDeviceFileName;
    config.deviceFile = deviceFile;
    prompt("Agent code file (" + defaultAgentFileName + "): ", function(agentFile) {
      if (!agentFile) agentFile = defaultAgentFileName;
      config.agentFile = agentFile;

      next();
    });
  });
}

function finalize() {
  var deviceCode = "";
  var agentCode = "";

  if (config.modelId != null) {
    imp.getModelRevisions(config.modelId, null, function(err, data) {
      if (err) {
        console.log("ERROR: Could not fetch code revisions");
        return;
      }

      if (data.revisions.length > 0) {
        imp.getModelRevision(config.modelId, data.revisions[0].version, function(err, data) {
          if (err) {
            console.log("ERROR: Could not fetch code revisions");
            return;
          }

          deviceCode = data.revision.device_code;
          agentCode = data.revision.agent_code;

         fs.writeFile(config.deviceFile, deviceCode);
         fs.writeFile(config.agentFile, agentCode);

          for (var idx in config) {
            impConfig.setLocal(idx, config[idx]);
          }
          impConfig.saveLocalConfig(function(err) {
            if (err) {
              console.log("ERROR: " + err);
              return;
            }

            console.log("Success! To add devices run:");
            console.log("   imp devices -a <deviceId>");
          });
        });
      }
    });
  } else {
    imp.createModel(config.modelName, function(err, data) {
      if (err) {
        console.log("ERROR: Could not create model");
        return;
      }

      config.modelId = data.model.id;

      fs.writeFile(config.deviceFile, deviceCode);
      fs.writeFile(config.agentFile, agentCode);

      impConfig.saveLocalConfig(function(err) {
        if (err) {
          console.log("ERROR: " + err);
          return;
        }

        console.log("Success! To add devices run:");
        console.log("   imp devices -a <deviceId>");
      });
    });
  }
}

impConfig.init(null, function() {
  // Make sure this folder doesn't already have a config file
  if (this.getLocalConfig()) {
    console.log("ERROR: .impconfig already exists.");
    return;
  }

  apiKeyPrompt(this.get("apiKey"), function() {
    modelPrompt(function() {
      getDevices(function() {
        fileNamePrompt(function() {
          finalize();
        });
      });
    });
  });
}.bind(impConfig));
