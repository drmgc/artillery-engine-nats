# artillery-engine-nats

[NATS](https://nats.io/) engine for [Artillery.io](https://www.artillery.io/)

## Usage

The `artillery-engine-nats` is based on artillery's default HTTP engine.

### Config

First of all, you need to set `target` to your NATS server and enabled `nats` engine:

```yaml
config:
  target: 'nats://localhost:14222'
  engines:
    nats: {}
```

### Scenario

Then, you can write your first NATS scenario:

```yaml
scenarios:
  - name: 'Auth scenario'
    engine: 'nats'
    flow:
      - log: 'starting'
      - request:
          subject: 'ping'
      - request:
          subject: auth'
          json:
            login: 'user'
            password: 'foo'
          capture:
            - json: '$.token'
              as: 'token'
      - log: 'authorized'
      - request:
          subject: 'get-profile'
          json:
            token: '{{ token }}'
      - log: 'done'
```

Also `loop`, `think`, and `function` are supported.

For a complete example you can look at [`test.yaml`](./test-yaml)

## Contributing

### Running test scenario

```bash
# First of all, you should start NATS
$ npm run docker -- up -d

# Run test replier
$ NATS_SERVER=nats://localhost:14222 node ./nats-replier.js

# Then start test itself
$ npm run test
```
Please note, that during running the test `NODE_PATH` will be set to `..`!
