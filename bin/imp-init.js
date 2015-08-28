#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

var imp;

program
  .option("-f, --force", "overwrites existing .impconfig file")
  .option("-k, --keep [options]", "prevents code files from being overwriten during init")
  .option("-g, --global", "uses global api-key and prevents api-key from being writen to .impconfig")

  .on("--help", function() {
    console.log("  Usage:");
    console.log("");
    console.log("    imp init -k\t\tagent & device code files will not be overwriten");
    console.log("    imp init -k device\tdevice code file will not be overwriten");
    console.log("    imp init -k agent\tagent code file will not be overwriten");
  });

program.parse(process.argv);

function apiKeyPrompt(apiKey, next) {
  if ("global" in program) {
    // if apiKey isn't set in global config, log error and return
    if (!config.getGlobal("apiKey")) {
      console.log("Global API Key is not set - run `imp login` then try again.");
      return;
    }

    imp = config.createImpWithConfig();
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(apiKey, next);
        return;
      }
      next();
    });

    return;
  }

  var promptText = "Build Api-Key";
  if (apiKey) {
    promptText += " (" + apiKey + "): ";
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val) {
    if (apiKey && !val) val = apiKey;
    config.setLocal("apiKey", val);

    imp = config.createImpWithConfig();
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(apiKey, next);
        return;
      }

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

          config.setLocal("modelId", data.model.id);
          config.setLocal("modelName", data.model.name);
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

              config.setLocal("modelId", data.models[i].id);
              config.setLocal("modelName", data.models[i].name);
              next();
              return;
            });
          } else {
            prompt("Create new model '" + val + "' (y): ", function(confirm) {
              if (confirm && confirm.toLowerCase()[0] != "y") {
                modelPrompt(next);
                return;
              }

              imp.createModel(val, function(err, data) {
                if (err) {
                  console.log("ERROR: Could not create model");
                  return;
                }

                config.setLocal("modelName", data.model.name);
                config.setLocal("modelId", data.model.id);
                next();
              });
              return;
            });
          }
        });
      }
    });
  });
}

function getDevices(next) {
  var modelId = config.getLocal("modelId");
  var modelName = config.getLocal("modelName");
  if (modelId == null) {
    next();
    return;
  }

  imp.getDevices({ "model_id": modelId }, function(err, data) {
    if (err) {
      console.log("Warning: Could not fetch devices assigned to '" + modelName + "'..");
      next();
    }

    var devices = [];
    for(var i = 0; i < data.devices.length; i++) {
      if (data.devices[i].model_id == modelId) {
        devices.push(data.devices[i].id);
      }
    }

    config.setLocal("devices", devices);

    var devicesText = devices.length == 1 ? "device" : "devices"
    console.log("Info: Found " + devices.length + " " + devicesText + " associated with '" + modelName + "'");
    next();
  });
}

function fileNamePrompt(next) {
  var modelName = config.getLocal("modelName");

  var baseFileName = modelName.split(" ").join("_").toLowerCase();

  var defaultDeviceFileName = config.getLocal("deviceFile") || (baseFileName + ".device.nut");
  var defaultAgentFileName = config.getLocal("agentFile") || (baseFileName + ".agent.nut");

  prompt.multi([
    {
      label: "Device code file ("+defaultDeviceFileName+")",
      key: "deviceFile"
    },
    {
      label: "Agent code file ("+defaultAgentFileName+")",
      key: "agentFile"
    }
  ], function(data){
    config.setLocal("deviceFile", data.deviceFile || defaultDeviceFileName);
    config.setLocal("agentFile", data.agentFile || defaultAgentFileName);
    next();
  });
}

function finalize() {
  var deviceCode = "";
  var agentCode = "";

  var modelId = config.getLocal("modelId");
  var modelName = config.getLocal("modelName");
  var agentFile = config.getLocal("agentFile");
  var deviceFile = config.getLocal("deviceFile");

  if (modelId != null) {
    imp.getModelRevisions(modelId, null, function(err, data) {
      if (err) {
        console.log("ERROR: Could not fetch code revisions");
        return;
      }

      if (data.revisions.length == 0) {
        config.saveLocalConfig(function(err) {
          if (err) {
            console.log("ERROR: " + err);
            return;
          }

          console.log("Success! To add devices run:");
          console.log("   imp devices -a <deviceId>");
        });

        return;
      }

      imp.getModelRevision(modelId, data.revisions[0].version, function(err, data) {
        if (err) {
          console.log("ERROR: Could not fetch code revisions");
          return;
        }

        deviceCode = data.revision.device_code;
        agentCode = data.revision.agent_code;

        if ("keep" in program && keep === true) {
          // don't overwrite any saved code
        } else if ("keep" in program && program.keep == "device") {
          // only overwrite the agent code
          fs.writeFile(agentFile, agentCode);
        } else if ("keep" in program && program.keep == "agent") {
          // only overwrite the device code
          fs.writeFile(deviceFile, deviceCode);
        } else {
          // overwrite both
          fs.writeFile(deviceFile, deviceCode);
          fs.writeFile(agentFile, agentCode);
        }

        config.saveLocalConfig(function(err) {
          if (err) {
            console.log("ERROR: " + err);
            return;
          }

          console.log("Success! To add devices run:");
          console.log("   imp devices -a <deviceId>");
        });
      });
    });
  } else {
    imp.createModel(modelName, function(err, data) {
      if (err) {
        console.log("ERROR: Could not create model");
        return;
      }

      config.setLocal("modelId", data.model.id);

      fs.writeFile(deviceFile, deviceCode);
      fs.writeFile(agentFile, agentCode);

      config.saveLocalConfig(function(err) {
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

config.init(null, function() {
  // Make sure this folder doesn't already have a config file
  if (this.getLocalConfig() && !("force" in program)) {
    console.log("ERROR: .impconfig already exists. Specify '-f' to create new configuration.");
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
}.bind(config));
