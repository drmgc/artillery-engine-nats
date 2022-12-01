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

    this.config = script.config;
    this.newConnectionForEachScenario = this.config?.engine?.nats?.newConnectionForEachScenario ?? true;

    debug('target', this.config.target);

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
        const { subject, string, json, opts, capture } = rspec.request;

        if (!subject || typeof subject !== 'string') {
          throw new Error(`Invalid subject: ${subject}`);
        }

        if (string && json) {
          throw new Error(`"string" and "json" fields are not allowed simultaneously`);
        }

        if (capture && !Array.isArray(capture)) {
          throw new Error(`"capture" expected to be an array`);
        }

        let rawData = undefined;

        if (string) rawData = string;
        if (json) rawData = JSON.stringify(json);

        if (rawData) rawData = engineUtil.template(rawData, context);

        const encodedData = context.stringCodec.encode(rawData);

        if (!context.nats) throw new Error(`NATS instance is missing in the context`);

        const formattedSubject = engineUtil.template(subject, context);

        debug('request', { subject, formattedSubject, rawData });

        try {
          events.emit('counter', 'nats.requests', 1);
          events.emit('rate', 'nats.request_rate');

          const start = new Date();
          const response = await context.nats.request(
            formattedSubject,
            encodedData,
            opts,
          );

          const stop = new Date();

          events.emit('counter', 'nats.responses', 1);
          events.emit('rate', 'nats.response_rate');
          events.emit('histogram', 'nats.response_time', stop.getTime() - start.getTime());

          const decoded = context.stringCodec.decode(response.data);

          let responseObject;

          try {
            responseObject = JSON.parse(decoded);
          } catch {}

          debug('received', { raw: decoded, obj: responseObject });

          // capturing

          if (capture) {
            const newVars = {};

            for (const cap of capture) {
              const { json, as } = cap;

              if (typeof json !== 'string') throw new Error('"json" expected to be a string');
              if (!json.startsWith('$.')) throw new Error('"json" expected to be in format "$.foo.bar"');
              if (typeof as !== 'string') throw new Error('"as" expected to be a string');

              const path = json.substring(2);

              const value = newVars[as] = _.get(responseObject, path);

              debug({ as, path, value });
            }

            context.vars = { ...context.vars, ...newVars };
          }
        } catch (e) {
          debug(e);
          events.emit('error', 'NATS request failed: ' + e);
        }

        return context;
      }
    }

    return (ctx, cb) => cb(null, ctx);
  }

  compile(tasks, scenarioSpec, events) {
    return (initialContext, cb) => {
      const init = async () => {

        // debug('connecting to NATS server: ', this.config.target);

        if (!this.newConnectionForEachScenario) {
          initialContext.nats = this.defaultNats;
        }

        if (!initialContext.nats) {
          const nats = await this.connectToNats()
            .catch((err) => {
              events.emit('error', err);
            });

          initialContext.nats = nats;
          if (!this.defaultNats) this.defaultNats = nats;

          debug('got nats', nats);
        }

        initialContext.stringCodec = new nats.StringCodec();

        events.emit('started');
        return initialContext;
      };

      const deinit = async (ctx) => {
        await ctx.nats.close();
      };

      const steps = [init, ...tasks, deinit];

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

  async connectToNats(servers = this.config.target) {
    debug('connecting to NATS server: ', this.config.target);
    return nats.connect({
      servers,
    });
  }
}

module.exports = ArtilleryEngineNats;
