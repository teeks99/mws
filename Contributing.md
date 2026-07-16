# Contributing

Thank you for your interest in contributing to My Weather Service (MWS)!

## Updating Python Dependencies

The backend uses `pip-tools` to manage Python dependencies and lock them to specific versions for reproducible builds. 

We separate our top-level dependencies from our fully locked dependency tree:
- `backend/requirements.in`: Contains the loose, top-level dependencies.
- `backend/requirements.txt`: The compiled lockfile containing exact versions of all direct and transitive dependencies.

### How to add or update a dependency:

1. **Edit the `requirements.in` file**
   Navigate to the `backend/` directory and add or modify your package in the `requirements.in` file.

2. **Compile the new lockfile**
   Ensure you have a virtual environment active, and that `pip-tools` is installed (`pip install pip-tools`). Then run:
   ```bash
   pip-compile requirements.in -o requirements.txt
   ```
   This command will resolve the dependency tree and regenerate the `requirements.txt` file.

3. **Install the dependencies**
   Once the lockfile is generated, you can install the exact dependencies locally by running:
   ```bash
   pip install -r requirements.txt
   ```

4. **Commit the changes**
   Be sure to commit both `requirements.in` and the generated `requirements.txt` to version control.

## Updating Node.js Dependencies

The frontend uses standard `npm` commands and automatically maintains a `package-lock.json` file to lock dependency versions.

### How to add or update a dependency:

1. **Install or Update via NPM**
   Navigate to the `frontend/` directory and use the `npm install` command. 
   - To add a new dependency: `npm install <package-name>`
   - To update an existing dependency: `npm install <package-name>@latest` (or a specific version)

   Running this command will automatically update your `package.json` and perfectly sync your `package-lock.json`.

2. **Auditing and Outdated Packages**
   You can check if any of your locked packages have updates by running:
   ```bash
   npm outdated
   ```
   To check for and fix known vulnerabilities, run:
   ```bash
   npm audit fix
   ```

3. **Commit the changes**
   Be sure to commit both `package.json` and the updated `package-lock.json` to version control.
