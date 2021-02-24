import { meros } from 'meros';
import { InvariantError } from 'ts-invariant';
import { ApolloQueryResult, IncrementalDeliveryPayload } from '../../core';
import { Operation } from '../core';
import { isAsyncIterable } from '../utils/isAsyncIterable';
import { decorateError, serverParseError } from './errors';

const headersToString = (headers:Record<string, string>) => Object.entries(headers).map(([key, val]) => `${key}: ${val}`).join('\n');

export type ServerParseError = Error & {
  response: Response;
  statusCode: number;
  bodyText: string;
};

export function parseAndCheckHttpResponse(
  operations: Operation | Operation[],
) {
  const checkErrors = decorateError(operations);
  return <T>(response: Response) => meros<IncrementalDeliveryPayload<T>>(response)
    .then(async function*(maybeParts) {
      if (isAsyncIterable(maybeParts)) {
        for await (const part of maybeParts) {
          if (!part.json) throw serverParseError(new InvariantError(`Expected json part, but received:\nHeaders:\n${headersToString(part.headers)}`), part.body.toString('utf8'), response);
          checkErrors(response, part.body);
          yield part.body;
        }
      } else {
        const bodyText = await maybeParts.text();
        let result: ApolloQueryResult<T>;
        try {
          result = JSON.parse(bodyText);
        } catch (err) {
          throw serverParseError(err, bodyText, response);
        }

        checkErrors(response, result);
        yield result;
      }
    })
}
