# Lasagna.js

Lasagna.js is the official client of the Lasagna web service. Lasagna is a real-time "layer" in between serverside properties and web/mobile clients, functioning as a lightweight message bus.

This client provides:

- ⏩ Websocket Connectivity: keepin' it real(time).
- 🧬 Multiplexing: one tube, myriad of topics.
- 🗝️ JWT Auth Management: we reach out to you, you sign, we send.
- 📘 TypeScript Types: to tell thee truth to thy terminal.

## Getting Started

1. `npm install @automattic/lasagna`
2. `import Lasagna from '@automattic/lasagna`
3. `const lasagna = new Lasagna( myJwtFetcherCallback )`;

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss the change.

Please attach tests when appropriate. Use judgement.

## Additional Tips

To run unit tests:

```
npm test
```

To run type-checking manually:

```
npm run lint
```
