#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var Imp = require("imp-api");
var fs = require("fs");

program.parse(process.argv);

if (fs.existsSync("./.impconfig")) {
  console.log("ERROR: .impconfig already exists.");
  return;
}

var imp = new Imp();

var config = {
  apiKey: null,
  modelId: null,
  modelName: null,
  deviceFile: null,
  agentFile: null,
  devices: []
}

function apiKeyPrompt(next) {
  prompt("Dev Tools Api-Key: ", function(val) {
    imp.apiKey = val;
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp.apiKey = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(next);
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
        prompt("Found a matching model '" + data.model.name + "', use this (y/n): ", function(confirm) {
          if (!confirm || confirm.toLowerCase()[0] != "y") {
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
            prompt("Found a matching model '" + data.models[i].name + "', use this (y/n): ", function(confirm){
              if (!confirm || confirm.toLowerCase()[0] != "y") {
                modelPrompt(next);
                return;
              }

              config.modelId = data.models[i].id;
              config.modelName = data.models[i].name;
              next();
              return;
            });
          } else {
            prompt("Create new model '" + val + "' (y/n): ", function(confirm) {
              if (!confirm || confirm.toLowerCase()[0] != "y") {
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

function fileNamePrompt(next) {
  prompt("Device code file (" + config.modelName + ".device.nut): ", function(deviceFile) {
    if (!deviceFile) deviceFile = config.modelName + ".device.nut";
    config.deviceFile = deviceFile;
    prompt("Agent code file (" + config.modelName + ".agent.nut): ", function(agentFile) {
      if (!agentFile) agentFile = config.modelName + ".agent.nut";
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
          fs.writeFile("./.impconfig", JSON.stringify(config, null, "\t"), function(err) {
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
      fs.writeFile("./.impconfig", JSON.stringify(config, null, "\t"), function(err) {
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

apiKeyPrompt(function() {
  modelPrompt(function() {
    fileNamePrompt(function() {
      finalize();
    });
  });
});
