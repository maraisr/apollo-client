import type { Operation } from '../core';
import { throwServerError } from '../utils';

const { hasOwnProperty } = Object.prototype;

export type ServerParseError = Error & {
	response: Response;
	statusCode: number;
	bodyText: string;
};

export function serverParseError(err:Error, bodyText:string, response: Response) {
	const parseError = err as ServerParseError;
	parseError.name = 'ServerParseError';
	parseError.response = response;
	parseError.statusCode = response.status;
	parseError.bodyText = bodyText;
	return parseError;
}

export function decorateError(operations: Operation | Operation[]) {
	return (response: Response, result:any) => {
		if (response.status >= 300) {
			// Network error
			throwServerError(
				response,
				result,
				`Response not successful: Received status code ${response.status}`,
			);
		}

		if (
			!Array.isArray(result) &&
			!hasOwnProperty.call(result, 'data') &&
			!hasOwnProperty.call(result, 'errors')
		) {
			// Data error
			throwServerError(
				response,
				result,
				`Server response was missing for query '${
					Array.isArray(operations)
						? operations.map(op => op.operationName)
						: operations.operationName
				}'.`,
			);
		}
	}
}
