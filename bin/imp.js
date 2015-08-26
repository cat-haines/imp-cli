#! /usr/bin/env node

var program = require("commander");

program
  .version("0.1.0")

  .command("devices [options]", "Lists devices, or adds/removes devices from project")
  .command("deploy [options]", "Deploys the project")
  .command("init", "Creates a new imp project")
  .command("log [options]", "Logs messages from specified device")
  .command("login [options]", "Sets your global API-Key")
  .command("models [options]", "Lists models, or sets the project's model")
  .command("pull [options]", "Fetches the most recent code from the imp server")
  .command("migrate [options]", "Migrates model from one Electric Imp account to another")

program.parse(process.argv);
