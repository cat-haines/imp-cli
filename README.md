# imp-cli

The **imp-cli** allows you to manage your Electric Imp development from a command line through Electric Imp's [Build API](http://electricimp.com/docs/buildapi).

# Installation

```
npm install -g imp-cli
```

## Usage
After installation, the `imp` program will be available from your command prompt. From there you should be able to use all of the tools (which are self documented as shown below).

```
imp [command] [options]

Commands:

    devices     List and manage devices
    init        Create an empty imp project, or reinitialize an existing one
    log         Display logs from the specified device
    login       Sets your global API-Key
    migrate     Migrates a model from one account to another
    models      List and manage models
    pull        Fetch latest build from the server
    push        Update the build, and push code to developer devices
    help        Display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

# License
The imp-cli is licensed under the [MIT License](./LICENSE).
