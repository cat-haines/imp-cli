#! /usr/bin/env node

var program = require("commander");

program
  .version("0.0.1")
  .command("init [options]", "Creates a new imp project")
  .command("devices [options]", "Lists devices, or adds/removes devices from project")
  .command("models [options]", "Lists models, or sets the project's model")
  .command("deploy [options]", "Deploys the project")
  .command("pull [options]", "Fetches the most recent code from the imp server")

program.parse(process.argv);
