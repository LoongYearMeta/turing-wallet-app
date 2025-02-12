import process from "process";
if (typeof global.process === "undefined") {
  global.process = process;
}
global.process.version = "v16.0.0";
global.process.env = global.process.env || {};

if (typeof __dirname === "undefined") global.__dirname = "/";
if (typeof __filename === "undefined") global.__filename = "";

import { Buffer } from "@craftzdog/react-native-buffer";
global.Buffer = global.Buffer || Buffer;
if (!global.Buffer.TYPED_ARRAY_SUPPORT) {
  global.Buffer.TYPED_ARRAY_SUPPORT = true;
}
