const axios = require(`axios`)

module.exports = async (
    postmanKey,
    app,
    collectionName,
    workspaceId,
    envVar
) => {
    const updateExistingCollection = async (colInfo, updatedData) => {
        return axios({
            method: `put`,
            url: `https://api.getpostman.com/collections/${colInfo.uid}`,
            headers: {
                'X-Api-Key': postmanKey
            },
            data: {
                collection: {
                    info: {
                        name: colInfo.name,
                        schema: `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`
                    },
                    item: updatedData
                }
            }
        })
    }

    const getCollectionInfo = async () => {
        const postMan = await axios({
            url: `https://api.getpostman.com/collections`,
            headers: {
                'X-Api-Key': postmanKey
            }
        })

        const existingCollections = postMan.data.collections
        let existingCollection = existingCollections.find(
            c => c.name === collectionName
        )
        if (!existingCollection || !existingCollection.uid) {
            try {
                existingCollection = await axios({
                    method: `POST`,
                    url: `https://api.getpostman.com/collections?workspace=${workspaceId}`,
                    headers: {
                        'X-Api-Key': postmanKey
                    },
                    data: {
                        collection: {
                            info: {
                                name: collectionName,
                                description: `Auto Generated Postman routes`,
                                schema: `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`
                            },
                            item: []
                        }
                    }
                })
                return existingCollection.data.collection
            } catch (error) {}
        } else return existingCollection
    }

    const getExistingPostManRoutes = async uid => {
        const postMan = await axios({
            url: `https://api.getpostman.com/collections/${uid}`,
            headers: {
                'X-Api-Key': postmanKey
            }
        })

        return postMan.data.collection.item
    }

    const description = (expressObject, postmanDescription) => {
        if (expressObject && (expressObject.desc || expressObject.description))
            return expressObject.desc || expressObject.description

        if (postmanDescription) return postmanDescription
        return expressObject.name
    }

    const body = (expressObject, postmanBody) => {
        if (
            expressObject &&
            (expressObject.body || expressObject.sampleRequest)
        )
            return {
                mode: `raw`,
                raw:
                    JSON.stringify(expressObject.body) ||
                    JSON.stringify(expressObject.sampleRequest),
                options: { raw: { language: `json` } }
            }
        return postmanBody
    }

    const header = (expressObject, postmanHeader) => {
        const defaultHeader = [
            {
                key: `Content-Type`,
                name: `Content-Type`,
                value: `application/json`,
                type: `text`
            }
        ]
        if (expressObject && expressObject.header) return expressObject.header
        if (expressObject && expressObject.body) return defaultHeader
        if (postmanHeader) return postmanHeader
        return defaultHeader
    }

    const tests = (expressObject, postmanEvent) => {
        if (expressObject && (expressObject.tests || expressObject.test))
            return {
                event: [
                    {
                        listen: `test`,
                        script: {
                            exec: expressObject.tests || expressObject.test,
                            type: `text/javascript`
                        }
                    }
                ]
            }
        if (postmanEvent && postmanEvent.length)
            return {
                event: postmanEvent
            }
        return {}
    }

    const getExistingPostmanRoute = (
        expressRoute,
        expressMethod,
        postmanRoutes
    ) => {
        let foundRoute
        const findRoute = routes => {
            routes.forEach(pr => {
                if (pr.item) {
                    findRoute(pr.item)
                } else {
                    if (
                        pr.request.url.raw === expressRoute &&
                        pr.request.method === expressMethod
                    )
                        foundRoute = pr
                }
            })
        }
        findRoute(postmanRoutes)

        return { data: foundRoute }
    }

    const postManId = postmanObject => {
        if (
            postmanObject &&
            postmanObject.data &&
            postmanObject.data._postman_id
        ) {
            return {
                _postman_id: postmanObject.data._postman_id
            }
        }
        return {}
    }

    const buildFolder = (expressRoute, existingPostManRoutes) => {
        const folderName = expressRoute.folder
        const postManFolderId = postmanRoutes => {
            let postmanId

            const findFolder = arr => {
                arr.forEach(routeObject => {
                    if (
                        routeObject.name &&
                        routeObject.name === folderName &&
                        !routeObject.request
                    ) {
                        postmanId = routeObject._postman_id
                    }
                })
            }
            findFolder(postmanRoutes)

            if (postmanId) {
                return {
                    _postman_id: postmanId
                }
            }

            return {}
        }
        return Object.assign(
            {
                name: folderName
            },
            postManFolderId(existingPostManRoutes)
        )
    }

    const buildPostManRoute = (expressRoute, existingPostManRoute) => {
        // console.log(existingPostManRoute)
        return Object.assign(
            postManId(existingPostManRoute),
            {
                name: description(
                    expressRoute,
                    existingPostManRoute.data ? existingPostManRoute.name : null
                ),
                request: Object.assign({
                    url: expressRoute.url,
                    method: expressRoute.method,
                    body: body(
                        expressRoute,
                        existingPostManRoute.data &&
                            existingPostManRoute.data.request.body
                            ? existingPostManRoute.data.request.body
                            : null
                    ),
                    header: header(
                        expressRoute,
                        existingPostManRoute.data &&
                            existingPostManRoute.data.request.header
                            ? existingPostManRoute.data.request.header
                            : null
                    )
                })
            },
            tests(
                expressRoute,
                existingPostManRoute.data
                    ? existingPostManRoute.data.event
                    : null
            )
        )
    }

    const syncronizeRoutes = (expressRoutes, postmanRoutes) => {
        const url = envVar ? envVar : `{{env}}`
        const apiRoutes = []

        for (const expressRoute of expressRoutes) {
            expressRoute.name = expressRoute.path
            expressRoute.url = url + expressRoute.path

            const existingPostManRoute = getExistingPostmanRoute(
                expressRoute.url,
                expressRoute.method,
                postmanRoutes
            )

            const route = buildPostManRoute(expressRoute, existingPostManRoute)

            if (expressRoute.folder) {
                const exists = apiRoutes.find(
                    fName => fName.name === expressRoute.folder
                )

                if (!exists) {
                    const folder = buildFolder(expressRoute, postmanRoutes)
                    folder.item = [route]
                    apiRoutes.push(folder)
                } else {
                    exists.item.push(route)
                }
            } else {
                apiRoutes.push(route)
            }
        }
        return apiRoutes
    }

    try {
        const existingCollectionInfo = await getCollectionInfo()
        const postmanRoutes = await getExistingPostManRoutes(
            existingCollectionInfo.uid
        )
        const syncedRoutes = syncronizeRoutes(app, postmanRoutes)
        await updateExistingCollection(existingCollectionInfo, syncedRoutes)
        console.log('Routes Built! Postman updated!')
    } catch (error) {
        console.error('Error building postman routes')
        // console.error(error);
    }
}
