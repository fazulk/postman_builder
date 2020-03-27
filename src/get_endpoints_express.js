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
    for (const layer of route.stack) {
        if (
            layer.handle &&
            layer.handle.name &&
            layer.handle.name.toLowerCase() === `routemeta`
        ) {
            return layer.handle(null, null, null, true)
        }
    }
}

/**
 * Returns true if found regexp related with express params
 */
const hasParams = function(pathRegexp) {
    return regexpExpressParam.test(pathRegexp)
}

/**
 * @param {Object} route Express route object to be parsed
 * @param {string} basePath The basePath the route is on
 * @return {Object} Endpoint info
 */
const parseExpressRoute = function(route, basePath) {
    return Object.assign(
        {
            path: basePath + (basePath && route.path === `/` ? `` : route.path)
        },
        getRouteMethods(route),
        getRouteMetaData(route)
    )
}

const parseExpressPath = function(expressPathRegexp, params) {
    let parsedPath = regexpExpressRegexp.exec(expressPathRegexp)
    let parsedRegexp = expressPathRegexp
    let paramIdx = 0

    while (hasParams(parsedRegexp)) {
        const paramId = `:` + params[paramIdx].name

        parsedRegexp = parsedRegexp
            .toString()
            .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/, paramId)

        paramIdx++
    }

    if (parsedRegexp !== expressPathRegexp) {
        parsedPath = regexpExpressRegexp.exec(parsedRegexp)
    }

    parsedPath = parsedPath[1].replace(/\\\//g, `/`)

    return parsedPath
}

const parseEndpoints = function(app, basePath, endpoints) {
    const stack = app.stack || (app._router && app._router.stack)

    endpoints = endpoints || []
    basePath = basePath || ``

    stack.forEach(function(stackItem) {
        if (stackItem.route) {
            const endpoint = parseExpressRoute(stackItem.route, basePath)

            endpoints = addEndpoint(endpoints, endpoint)
        } else if (
            stackItem.name === `router` ||
            stackItem.name === `bound dispatch`
        ) {
            if (regexpExpressRegexp.test(stackItem.regexp)) {
                const parsedPath = parseExpressPath(
                    stackItem.regexp,
                    stackItem.keys
                )

                parseEndpoints(
                    stackItem.handle,
                    basePath + `/` + parsedPath,
                    endpoints
                )
            } else {
                parseEndpoints(stackItem.handle, basePath, endpoints)
            }
        }
    })

    return endpoints
}

/**
 * Ensures the path of the new endpoint isn't yet in the array.
 * If the path is already in the array merges the endpoint with the existing
 * one, if not, it adds it to the array.
 *
 * @param {Array} endpoints Array of current endpoints
 * @param {Object} newEndpoint New endpoint to be added to the array
 * @returns {Array} Updated endpoints array
 */
const addEndpoint = function(endpoints, newEndpoint) {
    endpoints.push(newEndpoint)
    return endpoints
}

/**
 * Returns an array of strings with all the detected endpoints
 * @param {Object} app the express/route instance to get the endpoints from
 */
const getEndpoints = function(app) {
    const endpoints = parseEndpoints(app)

    return endpoints
}

module.exports = getEndpoints
