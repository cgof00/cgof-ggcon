/// <reference types="@cloudflare/workers-types" />

export type PagesFunction = (context: {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
  env: any;
}) => Response | Promise<Response>;
