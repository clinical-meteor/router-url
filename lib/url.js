/**
 * Class for taking a path and compiling it into a regular expression.
 *
 * Also has a params method for getting an array of params given a path, and
 * convenience methods for working with the regexp like test and exec.
 *
 * XXX where is resolve?
 *
 */
Url = function (url, options) {
  options = options || {};
  this.options = options;
  this.keys = [];
  this.regexp = compilePath(url, this.keys, options); 
  _.extend(this, Url.parse(url));
};

/**
 * Given a relative or absolute path return
 * a relative path with a leading forward slash and
 * no search string or hash fragment
 *
 * @param {String} path
 * @return {String}
 */
Url.normalize = function (url) {
  if (!url)
    return url;

  var parts = Url.parse(url);
  var pathname = parts.pathname;

  if (pathname.charAt(0) !== '/')
    pathname = '/' + pathname;

  if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === '/') {
    pathname = pathname.slice(0, pathname.length - 1);
  }

  return pathname;
};

/**
 * Given a query string return an object of key value pairs.
 *
 * "?p1=value1&p2=value2 => {p1: value1, p2: value2}
 */
Url.fromQueryString = function (query) {
  if (!query)
    return {};

  if (typeof query !== 'string')
    throw new Error("expected string");

  // get rid of the leading question mark
  if (query.charAt(0) === '?')
    query = query.slice(1);

  var keyValuePairs = query.split('&');
  var result = {};
  var parts;

  _.each(keyValuePairs, function (pair) {
    parts = pair.split('=');
    result[parts[0]] = decodeURIComponent(parts[1]);
  });

  return result;
};

/**
 * Given a query object return a query string.
 */
Url.toQueryString = function (queryObject) {
  var result = [];

  if (typeof queryObject !== 'object')
    throw new Error("expected object");

  _.each(queryObject, function (value, key) {
    result.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  });

  // no sense in adding a pointless question mark
  if (result.length > 0)
    return '?' + result.join('&');
  else
    return '';
};

/**
 * Given a string url return an object with all of the url parts.
 */
Url.parse = function (url) {
  if (!url) return {};

  //http://tools.ietf.org/html/rfc3986#page-50
  //http://www.rfc-editor.org/errata_search.php?rfc=3986
  var re = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/; 

  var match = url.match(re);

  var protocol = match[1] ? match[1].toLowerCase() : undefined;
  var hostWithSlashes = match[3];
  var slashes = !!hostWithSlashes;
  var hostWithAuth= match[4] ? match[4].toLowerCase() : undefined;
  var hostWithAuthParts = hostWithAuth ? hostWithAuth.split('@') : [];

  var host, auth;

  if (hostWithAuthParts.length == 2) {
    auth = hostWithAuthParts[0];
    host = hostWithAuthParts[1];
  } else if (hostWithAuthParts.length == 1) {
    host = hostWithAuthParts[0];
    auth = undefined;
  } else {
    host = undefined;
    auth = undefined;
  }

  var hostWithPortParts = (host && host.split(':')) || [];
  var hostname = hostWithPortParts[0];
  var port = hostWithPortParts[1];
  var origin = (protocol && host) ? protocol + '//' + host : undefined;
  var pathname = match[5];
  var path = pathname + (search || '');
  var hash = match[8];
  var originalUrl = url;

  var search = match[6];

  var query;
  var indexOfSearch = (hash && hash.indexOf('?')) || -1;

  // if we found a search string in the hash and there is no explicit search
  // string
  if (~indexOfSearch && !search) {
    search = hash.slice(indexOfSearch);
    hash = hash.substr(0, indexOfSearch);
    // get rid of the ? character
    query = search.slice(1);
  } else {
    query = match[7];
  }

  var queryObject = Url.fromQueryString(query);

  var rootUrl = [
    protocol || '',
    slashes ? '//' : '',
    hostWithAuth || ''
  ].join('');

  var href = [
    protocol || '',
    slashes ? '//' : '',
    hostWithAuth || '',
    path || '',
    search || '',
    hash || ''
  ].join('');

  return {
    rootUrl: rootUrl || '',
    originalUrl: url || '',
    href: href || '',
    protocol: protocol || '',
    auth: auth || '',
    host: host || '',
    hostname: hostname || '',
    port: port || '',
    origin: origin || '',
    path: path || '',
    pathname: pathname || '',
    search: search || '',
    query: query || '',
    queryObject: queryObject || '',
    hash: hash || '',
    slashes: slashes
  };
};

/**
 * Returns true if the path matches and false otherwise.
 *
 * @param {String} path
 * @return {Boolean}
 */
Url.prototype.test = function (path) {
  return this.regexp.test(Url.normalize(path));
};

/**
 * Returns the result of calling exec on the compiled path with
 * the given path.
 *
 * @param {String} path
 * @return {Array}
 */
Url.prototype.exec = function (path) {
  return this.regexp.exec(Url.normalize(path));
};

/**
 * Returns an array of parameters given a path. The array may have named
 * properties in addition to indexed values.
 *
 * @param {String} path
 * @return {Array}
 */
Url.prototype.params = function (path) {
  if (!path)
    return [];

  var params = [];
  var m = this.exec(path);
  var queryString;
  var keys = this.keys;
  var key;
  var value;

  if (!m)
    throw new Error('The route named "' + this.name + '" does not match the path "' + path + '"');

  for (var i = 1, len = m.length; i < len; ++i) {
    key = keys[i - 1];
    value = typeof m[i] == 'string' ? decodeURIComponent(m[i]) : m[i];
    if (key) {
      params[key.name] = params[key.name] !== undefined ?
        params[key.name] : value;
    } else
      params.push(value);
  }

  path = decodeURI(path);

  queryString = path.split('?')[1];
  if (queryString)
    queryString = queryString.split('#')[0];

  params.hash = path.split('#')[1];

  if (queryString) {
    _.each(queryString.split('&'), function (paramString) {
      paramParts = paramString.split('=');
      params[paramParts[0]] = decodeURIComponent(paramParts[1]);
    });
  }

  return params;
};

Iron = Iron || {};
Iron.Url = Url;