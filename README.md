# artillery-engine-nats

(NATS)[https://nats.io/] engine for (Artillery)(https://www.artillery.io/)

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
