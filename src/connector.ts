import net from 'net';
import dns, { LookupAddress } from 'dns';

import * as punycode from 'punycode';
import { AbortSignal } from 'node-abort-controller';
import AbortError from './errors/abort-error';
import { once } from 'events';

type LookupFunction = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;

export async function connectInParallel(options: { host: string, port: number, localAddress?: string | undefined }, lookup: LookupFunction, signal: AbortSignal) {
  const addresses = await lookupAllAddresses(options.host, lookup, signal);

  return new Promise<net.Socket>((resolve, reject) => {
    if (signal.aborted) {
      return reject(new AbortError());
    }

    const sockets = new Array(addresses.length);

    let errorCount = 0;
    function onError(this: net.Socket, _err: Error) {
      errorCount += 1;

      this.removeListener('error', onError);
      this.removeListener('connect', onConnect);

      this.destroy();

      if (errorCount === addresses.length) {
        signal.removeEventListener('abort', onAbort);

        reject(new Error('Could not connect (parallel)'));
      }
    }

    function onConnect(this: net.Socket) {
      signal.removeEventListener('abort', onAbort);

      for (let j = 0; j < sockets.length; j++) {
        const socket = sockets[j];

        if (this === socket) {
          continue;
        }

        socket.removeListener('error', onError);
        socket.removeListener('connect', onConnect);
        socket.destroy();
      }

      resolve(this);
    }

    const onAbort = () => {
      for (let j = 0; j < sockets.length; j++) {
        const socket = sockets[j];

        socket.removeListener('error', onError);
        socket.removeListener('connect', onConnect);

        socket.destroy();
      }

      reject(new AbortError());
    };

    for (let i = 0, len = addresses.length; i < len; i++) {
      const socket = sockets[i] = net.connect({
        ...options,
        host: addresses[i].address,
        family: addresses[i].family
      });

      socket.on('error', onError);
      socket.on('connect', onConnect);
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function connectInSequence(options: { host: string, port: number, localAddress?: string | undefined }, lookup: LookupFunction, signal: AbortSignal) {
  const addresses = await lookupAllAddresses(options.host, lookup, signal);

  for (const address of addresses) {
    try {
      return await new Promise<net.Socket>((resolve, reject) => {
        const socket = net.connect({
          ...options,
          host: address.address,
          family: address.family
        });

        const onAbort = () => {
          socket.removeListener('error', onError);
          socket.removeListener('connect', onConnect);

          socket.destroy();

          reject(new AbortError());
        };

        const onError = (err: Error) => {
          signal.removeEventListener('abort', onAbort);

          socket.removeListener('error', onError);
          socket.removeListener('connect', onConnect);

          socket.destroy();

          reject(err);
        };

        const onConnect = () => {
          signal.removeEventListener('abort', onAbort);

          socket.removeListener('error', onError);
          socket.removeListener('connect', onConnect);

          resolve(socket);
        };

        signal.addEventListener('abort', onAbort, { once: true });

        socket.on('error', onError);
        socket.on('connect', onConnect);
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }

      continue;
    }
  }

  throw new Error('Could not connect (sequence)');
}

/**
 * Look up all addresses for the given hostname.
 */
export async function lookupAllAddresses(host: string, lookup: LookupFunction, signal: AbortSignal): Promise<dns.LookupAddress[]> {
  if (signal.aborted) {
    throw new AbortError();
  }

  if (net.isIPv6(host)) {
    return [{ address: host, family: 6 }];
  } else if (net.isIPv4(host)) {
    return [{ address: host, family: 4 }];
  } else {
    // dns.lookup does not have support for AbortSignal yet
    return Promise.race([
      new Promise<LookupAddress[]>((resolve, reject) => {
        lookup(punycode.toASCII(host), { all: true }, (err, addresses) => {
          err ? reject(err) : resolve(addresses);
        });
      }),

      once(signal, 'abort').then(() => {
        throw new AbortError();
      })
    ]);
  }
}
