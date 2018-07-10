const Hoek = require('hoek');
const Moment = require('moment');
const Stream = require('stream');
const SafeStringify = require('json-stringify-safe');

const internals = {
  defaults: {
    format: 'YYMMDD/HHmmss.SSS',
    utc: true
  }
};

internals.utility = {
  formatOutput (event, settings) {
    let timestamp = Moment(parseInt(event.timestamp, 10));

    if (settings.utc) {
      timestamp = timestamp.utc();
    }

    timestamp = timestamp.format(settings.format);
    const strTags = event.tags.map(elem => `"${elem}"`);

    const tags = ` [${strTags}] `;

    // add event id information if available, typically for 'request' events
    const id = event.id ? ` (${event.id})` : '';

    const output = `{"time": "${timestamp}", "eventId": "${id}", "tags": ${tags}, "data": ${event.data}}`;
    return `${output}\n`;
  },
  formatResponse (event, tags, settings) {
    const query = event.query ? SafeStringify(event.query) : '';
    const statusCode = event.statusCode || '';

    // event, timestamp, id, instance, labels, method, path, query, responseTime,
    // statusCode, pid, httpVersion, source, remoteAddress, userAgent, referer, log
    // method, pid, error
    const output = `{"instance": "${event.instance}", "method": "${event.method}", "path": "${event.path}", "query": "${query}", "statusCode": "${statusCode}". "responseTime": "${event.responseTime}ms"}`;

    const response = {
      id: event.id,
      timestamp: event.timestamp,
      tags,
      data: output
    };

    return internals.utility.formatOutput(response, settings);
  },

  formatOps (event, tags, settings) {
    const memory = Math.round(event.proc.mem.rss / (1024 * 1024));
    const output = `{"memory": "${memory}Mb", "uptime": "${event.proc.uptime}", "load": "[${event.os.load}]"}`;

    const ops = {
      timestamp: event.timestamp,
      tags,
      data: output
    };

    return internals.utility.formatOutput(ops, settings);
  },

  formatError (event, tags, settings) {
    const output = `{"message": "${event.error.message}", "stack": "${event.error.stack}"}`;

    const error = {
      id: event.id,
      timestamp: event.timestamp,
      tags,
      data: output
    };

    return internals.utility.formatOutput(error, settings);
  },

  formatDefault (event, tags, settings) {
    const defaults = {
      timestamp: event.timestamp,
      id: event.id,
      tags,
      data: SafeStringify(event.data) || '{"message": null}'
    };

    return internals.utility.formatOutput(defaults, settings);
  }
};

class LogzBridge extends Stream.Transform {
  constructor (config) {
    super({ objectMode: true });
    this._settings = Hoek.applyToDefaults(internals.defaults, config || {});
  }

  _transform (data, enc, next) {
    const eventName = data.event;
    let tags = data.tags;

    if (!Array.isArray(tags)) {
      tags = [tags];
    }

    tags.unshift(eventName);

    if (eventName === 'error' || data.error instanceof Error) {
      return next(null, internals.utility.formatError(data, tags, this._settings));
    }

    if (eventName === 'ops') {
      return next(null, internals.utility.formatOps(data, tags, this._settings));
    }

    if (eventName === 'response') {
      return next(null, internals.utility.formatResponse(data, tags, this._settings));
    }

    return next(null, internals.utility.formatDefault(data, tags, this._settings));
  }
}

module.exports = LogzBridge;
