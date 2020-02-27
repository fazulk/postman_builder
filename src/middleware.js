/**
 * @params {
 *  folder: <String> folder Postman folder to reside in,
 *  desc: <String> custom description of route,
 *  test: <Array> JS code to be placed in tests,
 *  sampleRequest: {Object} Sample request to be passed in
 * }
 * @return Buildout Postman Route
 */
module.exports = data => {
  return function routemeta(req, res, next, getMeta) {
    if (getMeta && data) return data;
    next();
  };
};
