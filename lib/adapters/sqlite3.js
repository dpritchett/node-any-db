module.exports = SQLite3

try { sqlite3 = require('sqlite3') } catch (__e) { /* gulp */ }

url = require('url')
inherits = require('util').inherits

Adapter = require('../adapter')

inherits(SQLite3, Adapter)

function SQLite3 (dbUrl) {
	if (!sqlite3) {
		throw new Exception("sqlite3 driver failed to load, please `npm install sqlite3`")
	}
	Adapter.call(this, dbUrl)
	this.methodMapping.query = 'each'
}

SQLite3.prototype._createConnection = function (callback) {
	var params = url.parse(this.connectString, true)
		, filename = params.hostname + params.pathname
		, mode = 0

	if (!filename && this.connectString === 'sqlite://:memory:') {
		filename = ':memory:'
	}

	for (var flag in Object.keys(params.query)) {
		if (sqlite3[flag] != null) mode = mode & sqlite3[flag]
	}

	mode = mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)

	return new sqlite3.Database(filename, mode, callback)
}

SQLite3.prototype.prepareQueryArgs = function (query) {
	var args = [query._statement, query._params],
			callback = query._callback

	var res = []
	args.push(
		function handleRow (err, row) {
			if (err) return handleError(err)
			if (callback) res.push(row)
			else query.emit('row', row)
		},
		function onComplete (err, count) {
			if (err) return handleError(err)
			if (callback) {
				Object.defineProperty(res, 'rowCount', {value: count, enumerable: false})
				callback(null, res)
			} else {
				query.emit('end', {rowCount: count})
			}
		})

	function handleError (err) {
		if (callback) callback(err)
		else query.emit('error', err)
	}

	return args
}

SQLite3.prototype.end = function (callback) {
	if (callback) this._connection.on('close', callback)
	this._connection.close()
}