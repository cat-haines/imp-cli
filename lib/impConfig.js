var Imp = require("imp-api");

function ImpConfig(options) {
  this.osenv = require('osenv')
  this.fs = require("fs");

  // default config files
  this.globalConfigFile = this.osenv.home() + "/.impconfig"
  this.localConfigFile = ".impconfig";

  // config information
  this._localConfig = null;
  this._globalConfig = null;

  if (options) {
    if ("localFile" in options) this.localConfigFile = options.localFile;
    if ("globalFile" in options) this.globalConfigFile = options.globalFile;
  }
};

ImpConfig.prototype.init = function(requiredKeys, cb) {
  // load local config data
  if (this.fs.existsSync(this.localConfigFile)) {
    try {
      this._localConfig = JSON.parse(this.fs.readFileSync(this.localConfigFile, "utf8"));
    } catch (ex) {
      // invoke callback with error
      cb("Config file " + this.localConfigFile + " contains invalid JSON", false);
      return;
    }
  }

  // load global config data
  if (this.fs.existsSync(this.globalConfigFile)) {
    try {
      this._globalConfig = JSON.parse(this.fs.readFileSync(this.globalConfigFile, "utf8"));
    } catch (ex) {
      // invoke callback with error
      cb("Config file " + this.globalConfigFile + " contains invalid JSON", false);
      return;
    }
  } else {
      cb("global doesn't exist", false);
      return;
  }

  // Make sure we have all the required keys
  if (requiredKeys) {
    for(var k = 0; k < requiredKeys.length; k++) {
      if (!(this._localConfig && requiredKeys[k] in this._localConfig || this._globalConfig && requiredKeys[k] in this._globalConfig)) {
        // invoke callback with error
        cb("Missing key '" + requiredKeys[k] + "' in config file", false);
        return;
      }
    }
  }

  // Everything worked, and expected keys exist
  return cb(null, true);
}

ImpConfig.prototype.getGlobalConfig = function() {
  return this._globalConfig;
}

ImpConfig.prototype.getLocalConfig = function() {
  return this._localConfig;
}

ImpConfig.prototype.get = function(key, preferGlobal) {
  if(preferGlobal === undefined) preferGlobal = false;

  if (this._globalConfig && preferGlobal) {
    if (key in this._globalConfig) return this._globalConfig[key];
    else if (this._localConfig && key in this._localConfig) return this._localConfig[key];
  } else {
    if (this._localConfig && key in this._localConfig) return this._localConfig[key];
    else if (this._globalConfig && key in this._globalConfig) return this._globalConfig[key];
  }

  return null;
}

ImpConfig.prototype.getLocal = function(key) {
  if (this._localConfig && key in this._localConfig) return this._localConfig[key];
  return null;
}

ImpConfig.prototype.getGlobal = function(key) {
  if (this._globalConfig && key in this._globalConfig) return this._globalConfig[key];
  return null;
}

ImpConfig.prototype.setLocal = function(key, val) {
  if (!this._localConfig) this._localConfig = {};
  this._localConfig[key] = val;
}

ImpConfig.prototype.setGlobal = function(key, val) {
  if (!this._globalConfig) this._globalConfig = {};
  this._globalConfig[key] = val;
}

ImpConfig.prototype.saveLocalConfig = function(cb) {
  this.fs.writeFile(this.localConfigFile, JSON.stringify(this._localConfig, null, "\t"), cb);
}

ImpConfig.prototype.saveGlobalConfig = function(cb) {
  this.fs.writeFile(this.globalConfigFile, JSON.stringify(this._globalConfig, null, "\t"), cb);
}

ImpConfig.prototype.createImpWithConfig = function() {
  // Try to get the apiKey and apiBase (if they exist)
  var apiKey = this.get("apiKey");
  var apiBase = this.get("apiBase");

  // Create the options table
  var options = {};
  if (apiKey != null) options.apiKey = apiKey;
  if (apiBase != null) options.apiBase = apiBase;

  // Create and return the configured imp object
  return new Imp(options);
}

module.exports = ImpConfig;
