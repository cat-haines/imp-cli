#! /usr/bin/env node

var program = require("commander");
var pkg = require("../package.json");

program
  .version(pkg.version)

  .command("devices [options]", "list and manage devices")
  .command("init", "create an empty imp project, or reinitialize an existing one")
  .command("log [options]", "display logs from a specified device")
  .command("login [options]", "sets your global API-Key")
  .command("migrate [options]", "migrates a model from one account to another")
  .command("models [options]", "list and manage models")
  .command("pull [options]", "fetch latest build from the server")
  .command("push [options]", "update the build, and push code to developer devices")

program.parse(process.argv);
