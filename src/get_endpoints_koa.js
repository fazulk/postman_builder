// let debug = require('debug')('express-list-endpoints')
const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
const regexpExpressParam = /\(\?:\(\[\^\\\/]\+\?\)\)/g

/**
 * Returns all the verbs detected for the passed route
 */
const getRouteMethods = function(route) {
    const methods = {}

    for (const method in route.methods) {
        if (method === `_all`) continue
        methods.method = method.toUpperCase()
    }

    return methods
}

/**
 *
 * @param {route} route gets any route meta data
 */
const getRouteMetaData = function(route) {
    for (const fn of route.stack) {
        if (fn && fn.name && fn.name.toLowerCase() === `routemeta`) {
            return fn(null, null, true)
        } else return {}
    }
}

const getMethod = (methods = []) => {
    if (!methods.length) return null
    if (methods.length > 2) return null
    return methods.map(m => m.toUpperCase()).filter(m => m !== 'HEAD')[0]
}

const parseEndpoints = async function(app, basePath, endpoints) {
    let a = await app

    const f = a.router.stack
        .map(i => {
            const base = {
                path: i.path,
                method: getMethod(i.methods)
            }

            if (!base.method) return null

            const options = getRouteMetaData(i)

            return Object.assign({}, base, options)
        })
        .filter(path => path !== !path)

    return f
}

/**
 * Returns an array of strings with all the detected endpoints
 * @param {Object} app the express/route instance to get the endpoints from
 */
const getEndpoints = async function(app) {
    return await parseEndpoints(app)
}

module.exports = getEndpoints
