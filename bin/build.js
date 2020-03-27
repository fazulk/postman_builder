#!/usr/bin/env node

const makeUploadToPostman = require(`../src/upload_to_postman`)
const getEndpointsExpress = require(`../src/get_endpoints_express`)
const getEndpointsKoa = require(`../src/get_endpoints_koa`)
const findUp = require('find-up')

;(async () => {
    const configFile = await findUp('postmanbuild.config.js')

    if (!configFile) {
        console.log('NO config file found, please place at root of project')
        process.exit(0)
    }
    const config = require(configFile)

    let {
        app,
        collection,
        workspaceId,
        postmanKey,
        framework,
        envVariable
    } = config

    framework = framework ? framework.toLowerCase() : null

    const getFramework = async (app, framework) => {
        switch (framework) {
            case 'koa':
                return await getEndpointsKoa(app)

            default:
                return getEndpointsExpress(app)
        }
    }

    async function uploadToPostman() {
        if (process.env.ENV !== `production`) {
            const endPoints = await getFramework(app, framework)
            await makeUploadToPostman(
                postmanKey,
                endPoints,
                collection,
                workspaceId,
                envVariable
            )
        }
        process.exit(0)
    }
    uploadToPostman()
})()
