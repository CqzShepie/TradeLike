import { fileURLToPath } from "node:url";

const clientModules = fileURLToPath(new URL("../client/node_modules/", import.meta.url));

export default {
  resolve: {
    alias: [
      { find: "react/jsx-runtime", replacement: `${clientModules}react/jsx-runtime.js` },
      { find: "react-dom/client", replacement: `${clientModules}react-dom/client.js` },
      { find: /^react$/, replacement: `${clientModules}react/index.js` },
    ],
  },
  server: {
    port: 5174,
  },
};
