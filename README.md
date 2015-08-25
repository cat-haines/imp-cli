# imp-cli

This Command Line Interface wraps the [imp-api npm package](https://github.com/matt-haines/imp-api) which is itself a wrapper for the [Electric Imp Build API](http://electricimp.com/docs/buildapi).

# Installation
First download or `git clone` this repository and cd into the folder from your favorite command prompt.  Then install globally with npm.

```
npm install -g
```

# Usage
After installation, the `imp` program will be available from your command prompt.

Use `imp login` to set your Build API key.  From there you should be able to use all of the tools (which are self documented as shown below).

```
imp [options] [command]

Commands:

    devices [options]  Lists devices, or adds/removes devices from project
    deploy [options]   Deploys the project
    init               Creates a new imp project
    log [options]      Logs messages from specified device
    login [options]    Sets your global API-Key
    models [options]   Lists models, or sets the project's model
    pull [options]     Fetches the most recent code from the imp server
    migrate [options]  Migrates model from one imp account to another (useful for commercial customers with dev accounts and limited access production accounts)
    help [cmd]         display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```
