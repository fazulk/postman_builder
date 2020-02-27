#!/usr/bin/env node

const makeUploadToPostman = require(`../src/upload_to_postman`);
const getEndpoints = require(`../src/get_endpoints`);
const findUp = require("find-up");

(async () => {
  const configFile = await findUp("postmanbuild.config.js");

  if (!configFile) {
    console.log("NO config file found, please place at root of project");
    process.exit(0);
  }
  const config = require(configFile);

  const { app, collection, workspaceId, postmanKey } = config;

  async function uploadToPostman() {
    //   if (process.env.ENV !== `production`) {
    const endPoints = getEndpoints(app);
    await makeUploadToPostman(postmanKey, endPoints, collection, workspaceId);

    process.exit(0);
    //   }
  }
  uploadToPostman();
})();
