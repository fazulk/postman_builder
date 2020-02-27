# postman_builder

Generate postman routes automatically based upon express routes

Place postmanbuilder.config.js at root of your project with the following options:

module.exports = {
app: require(`./server/app`), // whatever your route file is
collection: `colleciton name`, // what you want to name this in postman
workspaceId: '', // workspace id generated by postman,
postmanKey: '' // private api key provided by postman
}

This is ALPHA and extreme WIP
