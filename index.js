'use strict';
const A = require('async');
const _ = require('lodash');
const debug = require('debug')('engine:nats');
const engineUtil = require('artillery/core/lib/engine_util.js');
const nats = require('nats');

class ArtilleryEngineNats {
  constructor(script, events, helpers) {
    debug('setting up', { script, events, helpers });

    this.script = script;
    this.events = events;
    this.helpers = helpers;

    const config = this.config = script.config.engines.nats || {};
    this.greeting = config.greeting || 'hello, world';

    debug('target is:', script.config.target);

    script.config.processor = script.config.processor || {};
  }

  createScenario(spec, events) {
    const tasks = spec.flow.map(rs => this.step(rs, events));

    return this.compile(tasks, spec.flow, events);
  }

  step(rspec, events) {
    debug('stepping', rspec);

    if (typeof rspec.think !== 'undefined') {
      return engineUtil.createThink(requestSpec, self.config.defaults.think);
    }

    if (rspec.loop) {
      const steps = rspec.loop.map(step => this.step(step, events));

      return this.helpers.createLoopWithCount(
        rspec.count || -1, steps, {},
      );
    }

    if (typeof rspec.log !== 'undefined') {
      return (context, callback) => {
        console.log(engineUtil.template(rspec.log, context));
        return process.nextTick(() => {
          callback(null, context);
        });
      };
    }

    if (rspec.function) {
      return (context, callback) => {
        let processFunc = self.config.processor[rspec.function];
        if (processFunc) {
          return processFunc(
            context,
            ee,
            (hookErr) => callback(hookErr, context),
          );
        } else {
          debug(`Function "${rspec.function}" not defined`);
          debug('processor: %o', self.config.processor);

          events.emit('error', `Undefined function "${rspec.function}"`);

          return process.nextTick(() => callback(null, context));
        }
      };
    }

    if (rspec.request) {
      return async (context) => {
        const { subject, string, json, opts } = rspec.request;

        if (!subject || typeof subject !== 'string') {
          throw new Error(`Invalid subject: ${subject}`);
        }

        if (string && json) {
          throw new Error(`"string" and "json" fields are not allowed simultaneously`);
        }

        let data = undefined;

        if (string) data = context.stringCodec.encode(string);
        if (json) data = context.stringCodec.encode(JSON.stringify(json));

        debug('a request to ', subject);

        if (!context.nats) throw new Error(`NATS instance is missing in the context`);

        try {
          const res = await context.nats.request(subject, data, opts);
          debug('received', context.stringCodec.decode(res.data));
        } catch (e) {
          events.emit('error', 'NATS request failed: ' + e);
        }

        // TODO

        return context;
      }
    }

    return (ctx, cb) => cb(null, ctx);
  }

  compile(tasks, scenarioSpec, events) {
    return (initialContext, cb) => {
      const init = async () => {

        const { servers } = this.config;

        debug('connecting to NATS server(s): ', servers);

        initialContext.nats = await nats.connect({
          servers,
        }).catch((err) => {
          events.emit('error', `Error occured while connecting to NATS server: ${err}`);
        });

        initialContext.stringCodec = new nats.StringCodec();

        events.emit('started');
        return initialContext;
      };

      // TODO: deinit: disconnect NATS

      const steps = [init, ...tasks];

      A.waterfall(steps, (err, ctx) => {
        if (err) debug(err);

        return cb(err, ctx);
      })
    };
  }

  clenup(done) {
    debug('cleaning up');

    done(null);
  }
}

module.exports = ArtilleryEngineNats;
