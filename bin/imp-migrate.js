#! /usr/bin/env node

var program = require("commander");
var prompt = require("cli-prompt");
var Table = require("cli-table");
var fs = require("fs");

var ImpConfig = require("../lib/impConfig.js");
var config = new ImpConfig();

program
  .option("-v, --revision [revision]", "pulls the specified revision from development account")

program.parse(process.argv);

function apiKeyPrompt(env, apiKey, next){
  var promptText = env+" Account Api-Key";
  if (apiKey) {
    promptText += " (" + apiKey + "): ";
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val){

    if (apiKey && val === "next") val = apiKey;
    else if (!apiKey && val === "next"){
      apiKeyPrompt(env, apiKey, next);
      return;
    }

    if (apiKey && !val) val = apiKey;
    config.setLocal("apiKey", val);
    config.setLocal(env+"apiKey", val);

    imp = config.createImpWithConfig();
    imp.getDevices({ "device_id" : "garbage" }, function(err, data) {
      if (err) {
        // clear API Key, and try again
        imp[env+"apiKey"] = null;
        console.log("ERROR: Invalid Api-Key..");
        apiKeyPrompt(env, apiKey, next);
        return;
      }

      next();
    });
  })
}

function modelPrompt(env, next) {
  var promptText = env+" Model Id or Name";
  var modelName = config.getLocal("modelName");
  if (modelName){
    promptText += " ("+modelName+"): "
  } else {
    promptText += ": ";
  }

  prompt(promptText, function(val) {
    if (!val) {
      modelPrompt(env, next);
      return;
    }

    if (modelName && val === "next") val = modelName;
    else if (!modelName && val === "next"){
      modelPrompt(env, next);
      return;
    }

    // try to get model by id
    imp.getModel(val, function(err, data) {
      if (!err) {
        prompt("Found a matching model '" + data.model.name + "', use this (y): ", function(confirm) {
          if (confirm && confirm.toLowerCase()[0] != "y") {
            modelPrompt(env, next);
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
                modelPrompt(env, next);
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
                modelPrompt(env, next);
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

function fileNamePrompt(next) {
  var modelName = config.getLocal("modelName");

  var baseFileName = modelName.split(" ").join("_").toLowerCase();

  var defaultDeviceFileName = config.getLocal("deviceFile") || (baseFileName + ".device.nut");
  var defaultAgentFileName = config.getLocal("agentFile") || (baseFileName + ".agent.nut");

  prompt.multi([
    {
      label: "Device code file ("+defaultDeviceFileName+")",
      key: "deviceFile",
    },
    {
      label: "Agent code file ("+defaultAgentFileName+")",
      key: "agentFile",
    }
  ], function(data){

    if (data.deviceFile === "next") data.deviceFile = defaultDeviceFileName;
    if (data.agentFile === "next") data.agentFile = defaultAgentFileName;

    config.setLocal("deviceFile", data.deviceFile || defaultDeviceFileName);
    config.setLocal("agentFile", data.agentFile || defaultAgentFileName);
    next();
  });

}

function pull(next){

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
    next();
  }

  if ("revision" in program){
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

function deploy(next){

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

  imp.createModelRevision(config.get("modelId"), model, function(err, data) {
    if (err) {
      if (err.code != "CompileFailed") {
        console.log(colors.red("ERROR: " + err.message_short));
        return;
      }

      if (err.details.agent_errors) {
        for(var i = 0; i < err.details.agent_errors.length; i ++) {
          var thisErr = err.details.agent_errors[i]
          console.log(colors.red("ERROR: " + thisErr.error));
          console.log("   at: " + config.get("agentFile") +":" + thisErr.row + " (col "+thisErr.column+")");
        }
      }

      if (err.details.device_errors) {
        for(var i = 0; i < err.details.device_errors.length; i ++) {
          var thisErr = err.details.device_errors[i]
          console.log(colors.red("ERROR: " + thisErr.error));
          console.log("   at: " + config.get("deviceFile") +":" + thisErr.row + " (col "+thisErr.column+")");
        }
      }

      return;
    }

    imp.restartModel(config.get("modelId"), function(err, restartData) {
      if (err) {
        console.log("Warning: Could not restart model");
      }

      console.log("Successfully created revision " + data.revision.version);
      next();
    });
  });
}

function finalize(){
  console.log("");
  console.log("=================================================================")
  console.log("Migration complete! Saving local configuration...");
  config.saveLocalConfig(function(err) {
    if (err) {
      console.log("ERROR: Problem saving local configuration: " + err);
      console.log("=================================================================")
      return;
    }

    console.log("Configuration saved!")
    console.log("FYI - next time, you can type 'next' to use the default values!");
    console.log("=================================================================")
  });
}

config.init(null, function(){
  apiKeyPrompt("Development", config.get("DevelopmentapiKey"), function(){
    modelPrompt("Development", function(){
      fileNamePrompt(function(){
        pull(function(){
          apiKeyPrompt("Production", config.get("ProductionapiKey"), function(){
            modelPrompt("Production", function(){
              deploy(function(){
                finalize();
              })
            })
          })
        })
      })
    })
  })
}.bind(config));
