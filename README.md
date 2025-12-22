# MOOCChain API

RESTful API backend for MOOCChain blockchain MOOC platform, built with Express.js and TypeScript.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.9
- **Development**: Nodemon (hot-reload), ts-node
- **Build**: TypeScript Compiler

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Server runs on `http://localhost:6700` with hot-reload enabled.

### Production

```bash
npm run build
npm start
```

## API Endpoints

- `GET /` - Health check
- `GET /api/health` - API status

## License

MIT

