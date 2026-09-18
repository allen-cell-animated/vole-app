# Developing

## Local Development

Run the following commands to install the project dependencies and start a local
instance of Vol-E.

```cmd
npm install
npm run start
```

### Configuration

Vol-E reads environment configuration from the `.env` file, or
`.env.development` when in development mode.

You can override the default environment configurations by creating a
`.env.local` file when building for production, or a `.env.development.local`
file when in development mode.

### Installing the local package within another app

Build the `vole-app` package by running the following command.

```cmd
npm run build
```

Navigate to your other project repository. Run the following command to install
the local `vole-app` package.

```cmd
npm install {path-to-vole-app-repo}
```

Import components from `vole-app` as normal. If you make changes in `vole-app`,
rerun the build command to update the local package.

To reinstall the latest version of `vole-app`, run the following command in your
other project repository.

```cmd
npm install @aics/vole-app
```

### Static build

To make a static build of the Vol-E viewer for deployment on a web server (S3,
Apache, etc.), run the following command:

```cmd
npm run s3-build
```

Built files will be placed in the `imageviewer/` directory.
