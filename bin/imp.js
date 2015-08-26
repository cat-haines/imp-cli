#! /usr/bin/env node

var program = require("commander");

program
  .version("0.1.0")

  .command("devices [options]", "lists devices, or adds/removes devices from project")
  .command("deploy [options]", "deploys the project")
  .command("init", "creates a new imp project")
  .command("log [options]", "logs messages from specified device")
  .command("login [options]", "sets your global API-Key")
  .command("models [options]", "lists models, or sets the project's model")
  .command("pull [options]", "fetches the most recent code from the imp server")
  .command("migrate [options]", "migrates model from one Electric Imp account to another")

program.parse(process.argv);
