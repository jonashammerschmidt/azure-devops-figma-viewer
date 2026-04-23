# Azure DevOps Figma

Azure DevOps Figma is an extension that lets teams integrate Figma designs into Azure DevOps. Designers can share designs with the development team, and those designs show directly on Azure DevOps work items. Adding designs is as simple as adding a Figma link into the work item description.

## Running Locally for Development

### Prerequisites

Download and install the following tools

1. [Visual Studio Code](https://code.visualstudio.com/download)
1. [Firefox](https://www.mozilla.org/firefox/) (because the VS Code Debugger for Chrome extension [doesn't support iframes](https://github.com/microsoft/vscode-chrome-debug/issues/786) yet)
1. The [Debugger for Firefox](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-firefox-debug) VS Code extension
1. The [tfx-cli](https://www.npmjs.com/package/tfx-cli) npm package
1. The [webpack](https://www.npmjs.com/package/webpack) npm package
1. The [webpack-dev-server](https://www.npmjs.com/package/webpack-dev-server) npm package

> If you would prefer not to install the npm packages globally, you can add them to devDependencies in your `package.json` file and invoke them with scripts. You can use the [package.json](./package.json) in this repo as a template for scripts and to ensure you have the correct versions of packages in your extension.

Before we deploy the extension, we need to install its dependencies and compile the code using the following commands:

```shell
npm install
webpack --mode development
```

You will need to deploy your extension to the marketplace at least once using the following command:

```shell
tfx extension publish --manifest-globs vss-extension-dev.json --token [token]
```

> The `[token]` here is an Azure DevOps PAT (personal access token) with the **Marketplace (Publish)** scope and access set to **All accessible organizations**. For more information, see [Authenticate access with personal access tokens](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate).

After the extension is published, share it with your Azure DevOps organization and install it. Navigate to a project and you will find a new hub called "Hello World!" When you click it, you will notice that the hub won't load correctly. It isn't loading because the extension is configured to load all its resources (html, images, etc.) from `localhost:3000`, but the dev server isn't running yet.

Start the webpack-dev-server with:

```shell
webpack-dev-server --mode development
```

Now if you go to `localhost:3000` in your browser, you should get an untrusted certificate error page. Select **Advanced** and then select **Accept the Risk and Continue**.

Go back to Azure DevOps and reload. Your extension should now load correctly and any changes to the source code will cause webpack to recompile and reload the extension automatically.

Although most code changes will be reflected immediately, you may still need to occasionally update your extension in the marketplace. The dev extension loads all its resources from the webpack-dev-server, but the manifest itself is being loaded from the published code. Therefore, any changes to the manifest file will not be properly reflected in Azure DevOps until the extension has been republished.
