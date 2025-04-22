/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@google/generative-ai/dist/index.js":
/*!**********************************************************!*\
  !*** ./node_modules/@google/generative-ai/dist/index.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports) => {



/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */
exports.SchemaType = void 0;
(function (SchemaType) {
    /** String type. */
    SchemaType["STRING"] = "string";
    /** Number type. */
    SchemaType["NUMBER"] = "number";
    /** Integer type. */
    SchemaType["INTEGER"] = "integer";
    /** Boolean type. */
    SchemaType["BOOLEAN"] = "boolean";
    /** Array type. */
    SchemaType["ARRAY"] = "array";
    /** Object type. */
    SchemaType["OBJECT"] = "object";
})(exports.SchemaType || (exports.SchemaType = {}));

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @public
 */
exports.ExecutableCodeLanguage = void 0;
(function (ExecutableCodeLanguage) {
    ExecutableCodeLanguage["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
    ExecutableCodeLanguage["PYTHON"] = "python";
})(exports.ExecutableCodeLanguage || (exports.ExecutableCodeLanguage = {}));
/**
 * Possible outcomes of code execution.
 * @public
 */
exports.Outcome = void 0;
(function (Outcome) {
    /**
     * Unspecified status. This value should not be used.
     */
    Outcome["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
    /**
     * Code execution completed successfully.
     */
    Outcome["OUTCOME_OK"] = "outcome_ok";
    /**
     * Code execution finished but with a failure. `stderr` should contain the
     * reason.
     */
    Outcome["OUTCOME_FAILED"] = "outcome_failed";
    /**
     * Code execution ran for too long, and was cancelled. There may or may not
     * be a partial output present.
     */
    Outcome["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
})(exports.Outcome || (exports.Outcome = {}));

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Possible roles.
 * @public
 */
const POSSIBLE_ROLES = ["user", "model", "function", "system"];
/**
 * Harm categories that would cause prompts or candidates to be blocked.
 * @public
 */
exports.HarmCategory = void 0;
(function (HarmCategory) {
    HarmCategory["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
    HarmCategory["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
    HarmCategory["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
    HarmCategory["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
    HarmCategory["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
})(exports.HarmCategory || (exports.HarmCategory = {}));
/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
exports.HarmBlockThreshold = void 0;
(function (HarmBlockThreshold) {
    // Threshold is unspecified.
    HarmBlockThreshold["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
    // Content with NEGLIGIBLE will be allowed.
    HarmBlockThreshold["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
    // Content with NEGLIGIBLE and LOW will be allowed.
    HarmBlockThreshold["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
    // Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed.
    HarmBlockThreshold["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
    // All content will be allowed.
    HarmBlockThreshold["BLOCK_NONE"] = "BLOCK_NONE";
})(exports.HarmBlockThreshold || (exports.HarmBlockThreshold = {}));
/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */
exports.HarmProbability = void 0;
(function (HarmProbability) {
    // Probability is unspecified.
    HarmProbability["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
    // Content has a negligible chance of being unsafe.
    HarmProbability["NEGLIGIBLE"] = "NEGLIGIBLE";
    // Content has a low chance of being unsafe.
    HarmProbability["LOW"] = "LOW";
    // Content has a medium chance of being unsafe.
    HarmProbability["MEDIUM"] = "MEDIUM";
    // Content has a high chance of being unsafe.
    HarmProbability["HIGH"] = "HIGH";
})(exports.HarmProbability || (exports.HarmProbability = {}));
/**
 * Reason that a prompt was blocked.
 * @public
 */
exports.BlockReason = void 0;
(function (BlockReason) {
    // A blocked reason was not specified.
    BlockReason["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
    // Content was blocked by safety settings.
    BlockReason["SAFETY"] = "SAFETY";
    // Content was blocked, but the reason is uncategorized.
    BlockReason["OTHER"] = "OTHER";
})(exports.BlockReason || (exports.BlockReason = {}));
/**
 * Reason that a candidate finished.
 * @public
 */
exports.FinishReason = void 0;
(function (FinishReason) {
    // Default value. This value is unused.
    FinishReason["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
    // Natural stop point of the model or provided stop sequence.
    FinishReason["STOP"] = "STOP";
    // The maximum number of tokens as specified in the request was reached.
    FinishReason["MAX_TOKENS"] = "MAX_TOKENS";
    // The candidate content was flagged for safety reasons.
    FinishReason["SAFETY"] = "SAFETY";
    // The candidate content was flagged for recitation reasons.
    FinishReason["RECITATION"] = "RECITATION";
    // The candidate content was flagged for using an unsupported language.
    FinishReason["LANGUAGE"] = "LANGUAGE";
    // Unknown reason.
    FinishReason["OTHER"] = "OTHER";
})(exports.FinishReason || (exports.FinishReason = {}));
/**
 * Task type for embedding content.
 * @public
 */
exports.TaskType = void 0;
(function (TaskType) {
    TaskType["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
    TaskType["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
    TaskType["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
    TaskType["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
    TaskType["CLASSIFICATION"] = "CLASSIFICATION";
    TaskType["CLUSTERING"] = "CLUSTERING";
})(exports.TaskType || (exports.TaskType = {}));
/**
 * @public
 */
exports.FunctionCallingMode = void 0;
(function (FunctionCallingMode) {
    // Unspecified function calling mode. This value should not be used.
    FunctionCallingMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    // Default model behavior, model decides to predict either a function call
    // or a natural language repspose.
    FunctionCallingMode["AUTO"] = "AUTO";
    // Model is constrained to always predicting a function call only.
    // If "allowed_function_names" are set, the predicted function call will be
    // limited to any one of "allowed_function_names", else the predicted
    // function call will be any one of the provided "function_declarations".
    FunctionCallingMode["ANY"] = "ANY";
    // Model will not predict any function call. Model behavior is same as when
    // not passing any function declarations.
    FunctionCallingMode["NONE"] = "NONE";
})(exports.FunctionCallingMode || (exports.FunctionCallingMode = {}));
/**
 * The mode of the predictor to be used in dynamic retrieval.
 * @public
 */
exports.DynamicRetrievalMode = void 0;
(function (DynamicRetrievalMode) {
    // Unspecified function calling mode. This value should not be used.
    DynamicRetrievalMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    // Run retrieval only when system decides it is necessary.
    DynamicRetrievalMode["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(exports.DynamicRetrievalMode || (exports.DynamicRetrievalMode = {}));

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Basic error type for this SDK.
 * @public
 */
class GoogleGenerativeAIError extends Error {
    constructor(message) {
        super(`[GoogleGenerativeAI Error]: ${message}`);
    }
}
/**
 * Errors in the contents of a response from the model. This includes parsing
 * errors, or responses including a safety block reason.
 * @public
 */
class GoogleGenerativeAIResponseError extends GoogleGenerativeAIError {
    constructor(message, response) {
        super(message);
        this.response = response;
    }
}
/**
 * Error class covering HTTP errors when calling the server. Includes HTTP
 * status, statusText, and optional details, if provided in the server response.
 * @public
 */
class GoogleGenerativeAIFetchError extends GoogleGenerativeAIError {
    constructor(message, status, statusText, errorDetails) {
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.errorDetails = errorDetails;
    }
}
/**
 * Errors in the contents of a request originating from user input.
 * @public
 */
class GoogleGenerativeAIRequestInputError extends GoogleGenerativeAIError {
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_API_VERSION = "v1beta";
/**
 * We can't `require` package.json if this runs on web. We will use rollup to
 * swap in the version number here at build time.
 */
const PACKAGE_VERSION = "0.21.0";
const PACKAGE_LOG_HEADER = "genai-js";
var Task;
(function (Task) {
    Task["GENERATE_CONTENT"] = "generateContent";
    Task["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
    Task["COUNT_TOKENS"] = "countTokens";
    Task["EMBED_CONTENT"] = "embedContent";
    Task["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
})(Task || (Task = {}));
class RequestUrl {
    constructor(model, task, apiKey, stream, requestOptions) {
        this.model = model;
        this.task = task;
        this.apiKey = apiKey;
        this.stream = stream;
        this.requestOptions = requestOptions;
    }
    toString() {
        var _a, _b;
        const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
        const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
        let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
        if (this.stream) {
            url += "?alt=sse";
        }
        return url;
    }
}
/**
 * Simple, but may become more complex if we add more versions to log.
 */
function getClientHeaders(requestOptions) {
    const clientHeaders = [];
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
        clientHeaders.push(requestOptions.apiClient);
    }
    clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
    return clientHeaders.join(" ");
}
async function getHeaders(url) {
    var _a;
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
    headers.append("x-goog-api-key", url.apiKey);
    let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
    if (customHeaders) {
        if (!(customHeaders instanceof Headers)) {
            try {
                customHeaders = new Headers(customHeaders);
            }
            catch (e) {
                throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
            }
        }
        for (const [headerName, headerValue] of customHeaders.entries()) {
            if (headerName === "x-goog-api-key") {
                throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
            }
            else if (headerName === "x-goog-api-client") {
                throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
            }
            headers.append(headerName, headerValue);
        }
    }
    return headers;
}
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
    const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
    return {
        url: url.toString(),
        fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), { method: "POST", headers: await getHeaders(url), body }),
    };
}
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, 
// Allows this to be stubbed for tests
fetchFn = fetch) {
    const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
    return makeRequest(url, fetchOptions, fetchFn);
}
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
    let response;
    try {
        response = await fetchFn(url, fetchOptions);
    }
    catch (e) {
        handleResponseError(e, url);
    }
    if (!response.ok) {
        await handleResponseNotOk(response, url);
    }
    return response;
}
function handleResponseError(e, url) {
    let err = e;
    if (!(e instanceof GoogleGenerativeAIFetchError ||
        e instanceof GoogleGenerativeAIRequestInputError)) {
        err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
        err.stack = e.stack;
    }
    throw err;
}
async function handleResponseNotOk(response, url) {
    let message = "";
    let errorDetails;
    try {
        const json = await response.json();
        message = json.error.message;
        if (json.error.details) {
            message += ` ${JSON.stringify(json.error.details)}`;
            errorDetails = json.error.details;
        }
    }
    catch (e) {
        // ignored
    }
    throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
/**
 * Generates the request options to be passed to the fetch API.
 * @param requestOptions - The user-defined request options.
 * @returns The generated request options.
 */
function buildFetchOptions(requestOptions) {
    const fetchOptions = {};
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== undefined || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
        const controller = new AbortController();
        if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
            setTimeout(() => controller.abort(), requestOptions.timeout);
        }
        if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
            requestOptions.signal.addEventListener("abort", () => {
                controller.abort();
            });
        }
        fetchOptions.signal = controller.signal;
    }
    return fetchOptions;
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Adds convenience helper methods to a response object, including stream
 * chunks (as long as each chunk is a complete GenerateContentResponse JSON).
 */
function addHelpers(response) {
    response.text = () => {
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` +
                    `candidates. Returning text from the first candidate only. ` +
                    `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            return getText(response);
        }
        else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return "";
    };
    /**
     * TODO: remove at next major version
     */
    response.functionCall = () => {
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` +
                    `candidates. Returning function calls from the first candidate only. ` +
                    `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            console.warn(`response.functionCall() is deprecated. ` +
                `Use response.functionCalls() instead.`);
            return getFunctionCalls(response)[0];
        }
        else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return undefined;
    };
    response.functionCalls = () => {
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` +
                    `candidates. Returning function calls from the first candidate only. ` +
                    `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            return getFunctionCalls(response);
        }
        else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return undefined;
    };
    return response;
}
/**
 * Returns all text found in all parts of first candidate.
 */
function getText(response) {
    var _a, _b, _c, _d;
    const textStrings = [];
    if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
        for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
            if (part.text) {
                textStrings.push(part.text);
            }
            if (part.executableCode) {
                textStrings.push("\n```" +
                    part.executableCode.language +
                    "\n" +
                    part.executableCode.code +
                    "\n```\n");
            }
            if (part.codeExecutionResult) {
                textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
            }
        }
    }
    if (textStrings.length > 0) {
        return textStrings.join("");
    }
    else {
        return "";
    }
}
/**
 * Returns functionCall of first candidate.
 */
function getFunctionCalls(response) {
    var _a, _b, _c, _d;
    const functionCalls = [];
    if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
        for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts) {
            if (part.functionCall) {
                functionCalls.push(part.functionCall);
            }
        }
    }
    if (functionCalls.length > 0) {
        return functionCalls;
    }
    else {
        return undefined;
    }
}
const badFinishReasons = [
    exports.FinishReason.RECITATION,
    exports.FinishReason.SAFETY,
    exports.FinishReason.LANGUAGE,
];
function hadBadFinishReason(candidate) {
    return (!!candidate.finishReason &&
        badFinishReasons.includes(candidate.finishReason));
}
function formatBlockErrorMessage(response) {
    var _a, _b, _c;
    let message = "";
    if ((!response.candidates || response.candidates.length === 0) &&
        response.promptFeedback) {
        message += "Response was blocked";
        if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
            message += ` due to ${response.promptFeedback.blockReason}`;
        }
        if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
            message += `: ${response.promptFeedback.blockReasonMessage}`;
        }
    }
    else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
        const firstCandidate = response.candidates[0];
        if (hadBadFinishReason(firstCandidate)) {
            message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
            if (firstCandidate.finishMessage) {
                message += `: ${firstCandidate.finishMessage}`;
            }
        }
    }
    return message;
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
/**
 * Process a response.body stream from the backend and return an
 * iterator that provides one complete GenerateContentResponse at a time
 * and a promise that resolves with a single aggregated
 * GenerateContentResponse.
 *
 * @param response - Response from a fetch call
 */
function processStream(response) {
    const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", { fatal: true }));
    const responseStream = getResponseStream(inputStream);
    const [stream1, stream2] = responseStream.tee();
    return {
        stream: generateResponseSequence(stream1),
        response: getResponsePromise(stream2),
    };
}
async function getResponsePromise(stream) {
    const allResponses = [];
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            return addHelpers(aggregateResponses(allResponses));
        }
        allResponses.push(value);
    }
}
function generateResponseSequence(stream) {
    return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
        const reader = stream.getReader();
        while (true) {
            const { value, done } = yield __await(reader.read());
            if (done) {
                break;
            }
            yield yield __await(addHelpers(value));
        }
    });
}
/**
 * Reads a raw stream from the fetch response and join incomplete
 * chunks, returning a new stream that provides a single complete
 * GenerateContentResponse in each iteration.
 */
function getResponseStream(inputStream) {
    const reader = inputStream.getReader();
    const stream = new ReadableStream({
        start(controller) {
            let currentText = "";
            return pump();
            function pump() {
                return reader.read().then(({ value, done }) => {
                    if (done) {
                        if (currentText.trim()) {
                            controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
                            return;
                        }
                        controller.close();
                        return;
                    }
                    currentText += value;
                    let match = currentText.match(responseLineRE);
                    let parsedResponse;
                    while (match) {
                        try {
                            parsedResponse = JSON.parse(match[1]);
                        }
                        catch (e) {
                            controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
                            return;
                        }
                        controller.enqueue(parsedResponse);
                        currentText = currentText.substring(match[0].length);
                        match = currentText.match(responseLineRE);
                    }
                    return pump();
                });
            }
        },
    });
    return stream;
}
/**
 * Aggregates an array of `GenerateContentResponse`s into a single
 * GenerateContentResponse.
 */
function aggregateResponses(responses) {
    const lastResponse = responses[responses.length - 1];
    const aggregatedResponse = {
        promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback,
    };
    for (const response of responses) {
        if (response.candidates) {
            for (const candidate of response.candidates) {
                const i = candidate.index;
                if (!aggregatedResponse.candidates) {
                    aggregatedResponse.candidates = [];
                }
                if (!aggregatedResponse.candidates[i]) {
                    aggregatedResponse.candidates[i] = {
                        index: candidate.index,
                    };
                }
                // Keep overwriting, the last one will be final
                aggregatedResponse.candidates[i].citationMetadata =
                    candidate.citationMetadata;
                aggregatedResponse.candidates[i].groundingMetadata =
                    candidate.groundingMetadata;
                aggregatedResponse.candidates[i].finishReason = candidate.finishReason;
                aggregatedResponse.candidates[i].finishMessage =
                    candidate.finishMessage;
                aggregatedResponse.candidates[i].safetyRatings =
                    candidate.safetyRatings;
                /**
                 * Candidates should always have content and parts, but this handles
                 * possible malformed responses.
                 */
                if (candidate.content && candidate.content.parts) {
                    if (!aggregatedResponse.candidates[i].content) {
                        aggregatedResponse.candidates[i].content = {
                            role: candidate.content.role || "user",
                            parts: [],
                        };
                    }
                    const newPart = {};
                    for (const part of candidate.content.parts) {
                        if (part.text) {
                            newPart.text = part.text;
                        }
                        if (part.functionCall) {
                            newPart.functionCall = part.functionCall;
                        }
                        if (part.executableCode) {
                            newPart.executableCode = part.executableCode;
                        }
                        if (part.codeExecutionResult) {
                            newPart.codeExecutionResult = part.codeExecutionResult;
                        }
                        if (Object.keys(newPart).length === 0) {
                            newPart.text = "";
                        }
                        aggregatedResponse.candidates[i].content.parts.push(newPart);
                    }
                }
            }
        }
        if (response.usageMetadata) {
            aggregatedResponse.usageMetadata = response.usageMetadata;
        }
    }
    return aggregatedResponse;
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function generateContentStream(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.STREAM_GENERATE_CONTENT, apiKey, 
    /* stream */ true, JSON.stringify(params), requestOptions);
    return processStream(response);
}
async function generateContent(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.GENERATE_CONTENT, apiKey, 
    /* stream */ false, JSON.stringify(params), requestOptions);
    const responseJson = await response.json();
    const enhancedResponse = addHelpers(responseJson);
    return {
        response: enhancedResponse,
    };
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function formatSystemInstruction(input) {
    // null or undefined
    if (input == null) {
        return undefined;
    }
    else if (typeof input === "string") {
        return { role: "system", parts: [{ text: input }] };
    }
    else if (input.text) {
        return { role: "system", parts: [input] };
    }
    else if (input.parts) {
        if (!input.role) {
            return { role: "system", parts: input.parts };
        }
        else {
            return input;
        }
    }
}
function formatNewContent(request) {
    let newParts = [];
    if (typeof request === "string") {
        newParts = [{ text: request }];
    }
    else {
        for (const partOrString of request) {
            if (typeof partOrString === "string") {
                newParts.push({ text: partOrString });
            }
            else {
                newParts.push(partOrString);
            }
        }
    }
    return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
/**
 * When multiple Part types (i.e. FunctionResponsePart and TextPart) are
 * passed in a single Part array, we may need to assign different roles to each
 * part. Currently only FunctionResponsePart requires a role other than 'user'.
 * @private
 * @param parts Array of parts to pass to the model
 * @returns Array of content items
 */
function assignRoleToPartsAndValidateSendMessageRequest(parts) {
    const userContent = { role: "user", parts: [] };
    const functionContent = { role: "function", parts: [] };
    let hasUserContent = false;
    let hasFunctionContent = false;
    for (const part of parts) {
        if ("functionResponse" in part) {
            functionContent.parts.push(part);
            hasFunctionContent = true;
        }
        else {
            userContent.parts.push(part);
            hasUserContent = true;
        }
    }
    if (hasUserContent && hasFunctionContent) {
        throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
    }
    if (!hasUserContent && !hasFunctionContent) {
        throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
    }
    if (hasUserContent) {
        return userContent;
    }
    return functionContent;
}
function formatCountTokensInput(params, modelParams) {
    var _a;
    let formattedGenerateContentRequest = {
        model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
        generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
        safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
        tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
        toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
        systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
        cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
        contents: [],
    };
    const containsGenerateContentRequest = params.generateContentRequest != null;
    if (params.contents) {
        if (containsGenerateContentRequest) {
            throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
        }
        formattedGenerateContentRequest.contents = params.contents;
    }
    else if (containsGenerateContentRequest) {
        formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
    }
    else {
        // Array or string
        const content = formatNewContent(params);
        formattedGenerateContentRequest.contents = [content];
    }
    return { generateContentRequest: formattedGenerateContentRequest };
}
function formatGenerateContentInput(params) {
    let formattedRequest;
    if (params.contents) {
        formattedRequest = params;
    }
    else {
        // Array or string
        const content = formatNewContent(params);
        formattedRequest = { contents: [content] };
    }
    if (params.systemInstruction) {
        formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
    }
    return formattedRequest;
}
function formatEmbedContentInput(params) {
    if (typeof params === "string" || Array.isArray(params)) {
        const content = formatNewContent(params);
        return { content };
    }
    return params;
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// https://ai.google.dev/api/rest/v1beta/Content#part
const VALID_PART_FIELDS = [
    "text",
    "inlineData",
    "functionCall",
    "functionResponse",
    "executableCode",
    "codeExecutionResult",
];
const VALID_PARTS_PER_ROLE = {
    user: ["text", "inlineData"],
    function: ["functionResponse"],
    model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
    // System instructions shouldn't be in history anyway.
    system: ["text"],
};
function validateChatHistory(history) {
    let prevContent = false;
    for (const currContent of history) {
        const { role, parts } = currContent;
        if (!prevContent && role !== "user") {
            throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
        }
        if (!POSSIBLE_ROLES.includes(role)) {
            throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
        }
        if (!Array.isArray(parts)) {
            throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
        }
        if (parts.length === 0) {
            throw new GoogleGenerativeAIError("Each Content should have at least one part");
        }
        const countFields = {
            text: 0,
            inlineData: 0,
            functionCall: 0,
            functionResponse: 0,
            fileData: 0,
            executableCode: 0,
            codeExecutionResult: 0,
        };
        for (const part of parts) {
            for (const key of VALID_PART_FIELDS) {
                if (key in part) {
                    countFields[key] += 1;
                }
            }
        }
        const validParts = VALID_PARTS_PER_ROLE[role];
        for (const key of VALID_PART_FIELDS) {
            if (!validParts.includes(key) && countFields[key] > 0) {
                throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
            }
        }
        prevContent = true;
    }
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Do not log a message for this error.
 */
const SILENT_ERROR = "SILENT_ERROR";
/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far.
 *
 * @public
 */
class ChatSession {
    constructor(apiKey, model, params, _requestOptions = {}) {
        this.model = model;
        this.params = params;
        this._requestOptions = _requestOptions;
        this._history = [];
        this._sendPromise = Promise.resolve();
        this._apiKey = apiKey;
        if (params === null || params === void 0 ? void 0 : params.history) {
            validateChatHistory(params.history);
            this._history = params.history;
        }
    }
    /**
     * Gets the chat history so far. Blocked prompts are not added to history.
     * Blocked candidates are not added to history, nor are the prompts that
     * generated them.
     */
    async getHistory() {
        await this._sendPromise;
        return this._history;
    }
    /**
     * Sends a chat message and receives a non-streaming
     * {@link GenerateContentResult}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async sendMessage(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
            safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
            generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
            tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
            toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
            systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
            cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
            contents: [...this._history, newContent],
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        let finalResult;
        // Add onto the chain.
        this._sendPromise = this._sendPromise
            .then(() => generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions))
            .then((result) => {
            var _a;
            if (result.response.candidates &&
                result.response.candidates.length > 0) {
                this._history.push(newContent);
                const responseContent = Object.assign({ parts: [], 
                    // Response seems to come back without a role set.
                    role: "model" }, (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0].content);
                this._history.push(responseContent);
            }
            else {
                const blockErrorMessage = formatBlockErrorMessage(result.response);
                if (blockErrorMessage) {
                    console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
                }
            }
            finalResult = result;
        });
        await this._sendPromise;
        return finalResult;
    }
    /**
     * Sends a chat message and receives the response as a
     * {@link GenerateContentStreamResult} containing an iterable stream
     * and a response promise.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async sendMessageStream(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
            safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
            generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
            tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
            toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
            systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
            cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
            contents: [...this._history, newContent],
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
        // Add onto the chain.
        this._sendPromise = this._sendPromise
            .then(() => streamPromise)
            // This must be handled to avoid unhandled rejection, but jump
            // to the final catch block with a label to not log this error.
            .catch((_ignored) => {
            throw new Error(SILENT_ERROR);
        })
            .then((streamResult) => streamResult.response)
            .then((response) => {
            if (response.candidates && response.candidates.length > 0) {
                this._history.push(newContent);
                const responseContent = Object.assign({}, response.candidates[0].content);
                // Response seems to come back without a role set.
                if (!responseContent.role) {
                    responseContent.role = "model";
                }
                this._history.push(responseContent);
            }
            else {
                const blockErrorMessage = formatBlockErrorMessage(response);
                if (blockErrorMessage) {
                    console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
                }
            }
        })
            .catch((e) => {
            // Errors in streamPromise are already catchable by the user as
            // streamPromise is returned.
            // Avoid duplicating the error message in logs.
            if (e.message !== SILENT_ERROR) {
                // Users do not have access to _sendPromise to catch errors
                // downstream from streamPromise, so they should not throw.
                console.error(e);
            }
        });
        return streamPromise;
    }
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function countTokens(apiKey, model, params, singleRequestOptions) {
    const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
    return response.json();
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
async function embedContent(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
    return response.json();
}
async function batchEmbedContents(apiKey, model, params, requestOptions) {
    const requestsWithModel = params.requests.map((request) => {
        return Object.assign(Object.assign({}, request), { model });
    });
    const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({ requests: requestsWithModel }), requestOptions);
    return response.json();
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Class for generative model APIs.
 * @public
 */
class GenerativeModel {
    constructor(apiKey, modelParams, _requestOptions = {}) {
        this.apiKey = apiKey;
        this._requestOptions = _requestOptions;
        if (modelParams.model.includes("/")) {
            // Models may be named "models/model-name" or "tunedModels/model-name"
            this.model = modelParams.model;
        }
        else {
            // If path is not included, assume it's a non-tuned model.
            this.model = `models/${modelParams.model}`;
        }
        this.generationConfig = modelParams.generationConfig || {};
        this.safetySettings = modelParams.safetySettings || [];
        this.tools = modelParams.tools;
        this.toolConfig = modelParams.toolConfig;
        this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
        this.cachedContent = modelParams.cachedContent;
    }
    /**
     * Makes a single non-streaming call to the model
     * and returns an object containing a single {@link GenerateContentResponse}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async generateContent(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContent(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
    }
    /**
     * Makes a single streaming call to the model and returns an object
     * containing an iterable stream that iterates over all chunks in the
     * streaming response as well as a promise that returns the final
     * aggregated response.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async generateContentStream(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContentStream(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, formattedParams), generativeModelRequestOptions);
    }
    /**
     * Gets a new {@link ChatSession} instance which can be used for
     * multi-turn chats.
     */
    startChat(startChatParams) {
        var _a;
        return new ChatSession(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name }, startChatParams), this._requestOptions);
    }
    /**
     * Counts the tokens in the provided request.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async countTokens(request, requestOptions = {}) {
        const formattedParams = formatCountTokensInput(request, {
            model: this.model,
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
            tools: this.tools,
            toolConfig: this.toolConfig,
            systemInstruction: this.systemInstruction,
            cachedContent: this.cachedContent,
        });
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
    }
    /**
     * Embeds the provided content.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async embedContent(request, requestOptions = {}) {
        const formattedParams = formatEmbedContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
    }
    /**
     * Embeds an array of {@link EmbedContentRequest}s.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
    }
}

/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Top-level class for this SDK
 * @public
 */
class GoogleGenerativeAI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Gets a {@link GenerativeModel} instance for the provided model name.
     */
    getGenerativeModel(modelParams, requestOptions) {
        if (!modelParams.model) {
            throw new GoogleGenerativeAIError(`Must provide a model name. ` +
                `Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
        }
        return new GenerativeModel(this.apiKey, modelParams, requestOptions);
    }
    /**
     * Creates a {@link GenerativeModel} instance from provided content cache.
     */
    getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
        if (!cachedContent.name) {
            throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
        }
        if (!cachedContent.model) {
            throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
        }
        /**
         * Not checking tools and toolConfig for now as it would require a deep
         * equality comparison and isn't likely to be a common case.
         */
        const disallowedDuplicates = ["model", "systemInstruction"];
        for (const key of disallowedDuplicates) {
            if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) &&
                cachedContent[key] &&
                (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
                if (key === "model") {
                    const modelParamsComp = modelParams.model.startsWith("models/")
                        ? modelParams.model.replace("models/", "")
                        : modelParams.model;
                    const cachedContentComp = cachedContent.model.startsWith("models/")
                        ? cachedContent.model.replace("models/", "")
                        : cachedContent.model;
                    if (modelParamsComp === cachedContentComp) {
                        continue;
                    }
                }
                throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams` +
                    ` (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
            }
        }
        const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), { model: cachedContent.model, tools: cachedContent.tools, toolConfig: cachedContent.toolConfig, systemInstruction: cachedContent.systemInstruction, cachedContent });
        return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
    }
}

exports.ChatSession = ChatSession;
exports.GenerativeModel = GenerativeModel;
exports.GoogleGenerativeAI = GoogleGenerativeAI;
exports.GoogleGenerativeAIError = GoogleGenerativeAIError;
exports.GoogleGenerativeAIFetchError = GoogleGenerativeAIFetchError;
exports.GoogleGenerativeAIRequestInputError = GoogleGenerativeAIRequestInputError;
exports.GoogleGenerativeAIResponseError = GoogleGenerativeAIResponseError;
exports.POSSIBLE_ROLES = POSSIBLE_ROLES;
//# sourceMappingURL=index.js.map


/***/ }),

/***/ "./src/agents/factory/agentFactory.ts":
/*!********************************************!*\
  !*** ./src/agents/factory/agentFactory.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgentFactory = void 0;
const memoryAgent_1 = __webpack_require__(/*! ../memory/memoryAgent */ "./src/agents/memory/memoryAgent.ts");
const modelAgent_1 = __webpack_require__(/*! ../model/modelAgent */ "./src/agents/model/modelAgent.ts");
/**
 * Fábrica responsable de crear e inicializar todos los agentes del sistema
 */
class AgentFactory {
    constructor(context) {
        this.context = context;
        this.agents = {};
    }
    /**
     * Crea e inicializa todos los agentes del sistema
     * @returns Promesa que se resuelve cuando todos los agentes están inicializados
     */
    async createAndInitializeAgents() {
        // Crear agentes
        await this.createMemoryAgent();
        await this.createModelAgent();
        // Verificar que todos los agentes requeridos existen
        this.validateAgentRegistry();
        return this.agents;
    }
    /**
     * Crea e inicializa el agente de memoria
     */
    async createMemoryAgent() {
        console.log('Creando MemoryAgent...');
        const memoryAgent = new memoryAgent_1.MemoryAgent(this.context);
        // Inicializar el agente de memoria
        await memoryAgent.initialize();
        this.agents.memoryAgent = memoryAgent;
    }
    /**
     * Crea e inicializa el agente de modelo
     */
    async createModelAgent() {
        console.log('Creando ModelAgent...');
        const modelAgent = new modelAgent_1.ModelAgent();
        await modelAgent.initialize(this.context);
        this.agents.modelAgent = modelAgent;
    }
    /**
     * Valida que todos los agentes requeridos existan
     */
    validateAgentRegistry() {
        if (!this.agents.memoryAgent) {
            throw new Error('MemoryAgent no inicializado');
        }
        if (!this.agents.modelAgent) {
            throw new Error('ModelAgent no inicializado');
        }
        // Añadir validaciones para nuevos agentes aquí
    }
    /**
     * Libera todos los recursos de los agentes
     */
    dispose() {
        console.log('Liberando recursos de todos los agentes...');
        // Liberar recursos de cada agente
        Object.values(this.agents).forEach(agent => {
            if (agent && typeof agent.dispose === 'function') {
                agent.dispose();
            }
        });
        // Limpiar referencias
        this.agents = {};
    }
}
exports.AgentFactory = AgentFactory;


/***/ }),

/***/ "./src/agents/factory/index.ts":
/*!*************************************!*\
  !*** ./src/agents/factory/index.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AgentFactory = void 0;
var agentFactory_1 = __webpack_require__(/*! ./agentFactory */ "./src/agents/factory/agentFactory.ts");
Object.defineProperty(exports, "AgentFactory", ({ enumerable: true, get: function () { return agentFactory_1.AgentFactory; } }));


/***/ }),

/***/ "./src/agents/memory/memoryAgent.ts":
/*!******************************************!*\
  !*** ./src/agents/memory/memoryAgent.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MemoryAgent = void 0;
const SQLiteStorage_1 = __webpack_require__(/*! ../../db/SQLiteStorage */ "./src/db/SQLiteStorage.ts");
const eventBus_1 = __webpack_require__(/*! ../../utils/eventBus */ "./src/utils/eventBus.ts");
const events_1 = __webpack_require__(/*! ../../utils/events */ "./src/utils/events.ts");
const tools_1 = __webpack_require__(/*! ./tools */ "./src/agents/memory/tools/index.ts");
/**
 * MemoryAgent es responsable de gestionar toda la memoria de la extensión.
 * Maneja tanto la memoria persistente (proyecto y chat) como la memoria temporal
 * que solo dura durante un intercambio de mensajes.
 */
class MemoryAgent {
    constructor(context) {
        // Estado actual
        this.currentChatId = null;
        this.messages = [];
        this.chatList = [];
        // Disposables para limpiar suscripciones
        this.disposables = [];
        const storage = new SQLiteStorage_1.SQLiteStorage(context);
        // Inicializar herramientas de memoria
        this.temporaryMemory = new tools_1.TemporaryMemory();
        this.chatMemory = new tools_1.ChatMemory(storage);
        this.projectMemory = new tools_1.ProjectMemory(storage);
        // Configurar listeners de eventos
        this.setupEventListeners();
    }
    /**
     * Configura los listeners de eventos para responder a acciones del sistema
     */
    setupEventListeners() {
        // Escuchar cuando se solicita un nuevo chat
        const newChatUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.UI.NEW_CHAT_REQUESTED, async () => {
            await this.createNewChat();
        });
        // Escuchar cuando se solicita cargar un chat
        const loadChatUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.UI.LOAD_CHAT_REQUESTED, async (data) => {
            await this.loadChat(data.chatId);
        });
        // Guardar las funciones para cancelar suscripciones
        this.disposables.push({ dispose: newChatUnsubscribe }, { dispose: loadChatUnsubscribe });
    }
    /**
     * Almacena una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave bajo la cual almacenar la memoria
     * @param content El contenido a almacenar
     */
    async storeProjectMemory(projectPath, key, content) {
        return this.projectMemory.storeProjectMemory(projectPath, key, content);
    }
    /**
     * Recupera una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave para recuperar la memoria
     */
    async getProjectMemory(projectPath, key) {
        return this.projectMemory.getProjectMemory(projectPath, key);
    }
    /**
     * Almacena una memoria temporal para el intercambio de mensajes actual
     * @param key La clave bajo la cual almacenar la memoria
     * @param content El contenido a almacenar
     */
    storeTemporaryMemory(key, content) {
        this.temporaryMemory.store(key, content);
    }
    /**
     * Recupera una memoria temporal
     * @param key La clave para recuperar la memoria
     */
    getTemporaryMemory(key) {
        return this.temporaryMemory.get(key);
    }
    /**
     * Limpia todas las memorias temporales
     * Debe llamarse después de completar cada intercambio de mensajes
     */
    clearTemporaryMemory() {
        this.temporaryMemory.clear();
    }
    /**
     * Crea un nuevo chat y retorna su ID
     * Si hay un chat actual con mensajes, lo guarda automáticamente
     * @returns El ID del nuevo chat
     */
    async createNewChat() {
        // Guardar el chat actual si tiene mensajes
        await this.saveCurrentChatIfNeeded();
        // Generar un ID único para el nuevo chat
        const chatId = this.chatMemory.generateChatId();
        this.currentChatId = chatId;
        this.messages = [];
        // Publicar evento de nuevo chat creado
        eventBus_1.EventBus.publish(events_1.Events.MEMORY.NEW_CHAT_CREATED, { chatId });
        console.log('Nuevo chat creado:', chatId);
        return chatId;
    }
    /**
     * Añade un mensaje al chat actual
     * @param message El mensaje a añadir
     */
    async addMessage(message) {
        // Asegurar que tenemos un chat actual
        if (!this.currentChatId) {
            await this.createNewChat();
        }
        // Completar los campos faltantes del mensaje
        const completeMessage = {
            role: message.role || 'user',
            text: message.text || '',
            timestamp: message.timestamp || new Date().toISOString()
        };
        // Añadir el mensaje a la lista
        this.messages.push(completeMessage);
    }
    /**
     * Procesa un par de mensajes (usuario y asistente) y los añade al chat actual
     * @param userText El texto del mensaje del usuario
     * @param assistantText El texto de la respuesta del asistente
     * @returns Un objeto con el mensaje del usuario y la respuesta del asistente
     */
    async processMessagePair(userText, assistantText) {
        // Añadir mensaje del usuario
        const userMessage = {
            role: 'user',
            text: userText,
            timestamp: new Date().toISOString()
        };
        await this.addMessage(userMessage);
        // Añadir mensaje del asistente
        const assistantMessage = {
            role: 'assistant',
            text: assistantText,
            timestamp: new Date().toISOString()
        };
        await this.addMessage(assistantMessage);
        return { userMessage, assistantMessage };
    }
    /**
     * Obtiene todos los mensajes del chat actual
     * @returns Array con los mensajes del chat actual
     */
    getMessages() {
        return [...this.messages];
    }
    /**
     * Guarda el chat actual con sus mensajes si es necesario
     * @returns Promise que se resuelve cuando se guarda el chat
     */
    async saveCurrentChatIfNeeded() {
        // Verificar que tenemos un ID de chat y al menos un mensaje
        if (!this.currentChatId) {
            console.log('No hay chat actual para guardar');
            return;
        }
        // Solo guardar si hay mensajes
        if (this.messages.length === 0) {
            console.log('No hay mensajes para guardar en el chat:', this.currentChatId);
            return;
        }
        console.log('Guardando chat actual:', this.currentChatId, 'con', this.messages.length, 'mensajes');
        // Generar un título a partir del primer mensaje del usuario
        const firstUserMessage = this.messages.find(m => m.role === 'user');
        const title = firstUserMessage
            ? firstUserMessage.text.substring(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '')
            : `Chat ${new Date().toLocaleString()}`;
        // Crear un objeto de chat con metadatos
        const chat = {
            id: this.currentChatId,
            title,
            timestamp: new Date().toISOString(),
            messages: this.messages,
            preview: firstUserMessage ? firstUserMessage.text.substring(0, 50) : ''
        };
        try {
            // Almacenar el chat en la base de datos
            await this.chatMemory.saveChat(this.currentChatId, chat);
            // Actualizar la lista de chats
            const updatedList = await this.chatMemory.updateChatList(chat);
            // Actualizar la lista local
            this.chatList = updatedList;
            // Publicar evento de lista de chats actualizada
            eventBus_1.EventBus.publish(events_1.Events.MEMORY.CHAT_LIST_UPDATED, updatedList);
            console.log('Chat guardado correctamente:', this.currentChatId);
        }
        catch (error) {
            console.error('Error al guardar el chat:', error);
            throw error; // Propagar el error para manejarlo en niveles superiores
        }
    }
    /**
     * Carga la lista de todos los chats
     * @returns Promise que se resuelve con la lista de chats
     */
    async loadChatList() {
        try {
            this.chatList = await this.chatMemory.getChatList();
            // Publicar evento de lista de chats actualizada
            eventBus_1.EventBus.publish(events_1.Events.MEMORY.CHAT_LIST_UPDATED, this.chatList);
            return this.chatList;
        }
        catch (error) {
            console.error('Error al obtener la lista de chats:', error);
            return [];
        }
    }
    /**
     * Carga un chat por su ID
     * @param chatId El ID del chat a cargar
     * @returns Promise que se resuelve con los datos del chat
     */
    async loadChat(chatId) {
        try {
            // Guardar el chat actual antes de cargar uno nuevo
            await this.saveCurrentChatIfNeeded();
            const chat = await this.chatMemory.loadChat(chatId);
            if (chat) {
                this.currentChatId = chatId;
                this.messages = chat.messages || [];
                // Publicar evento de chat cargado
                eventBus_1.EventBus.publish(events_1.Events.MEMORY.CHAT_LOADED, chat);
                return chat;
            }
            return null;
        }
        catch (error) {
            console.error('Error al cargar el chat:', error);
            return null;
        }
    }
    /**
     * Inicializa el agente de memoria
     * Carga la lista de chats al inicio y asegura que haya un chat actual
     */
    async initialize() {
        console.log('MemoryAgent inicializado');
        await this.loadChatList();
        // Asegurar que siempre haya un chat actual válido
        if (!this.currentChatId) {
            // Generar un ID único para el nuevo chat
            this.currentChatId = this.chatMemory.generateChatId();
            this.messages = [];
            console.log('Nuevo chat creado al inicializar:', this.currentChatId);
        }
    }
    /**
     * Limpia los recursos cuando se desactiva la extensión
     */
    dispose() {
        console.log('MemoryAgent eliminado');
        // Guardar cualquier estado pendiente
        this.saveCurrentChatIfNeeded().catch(err => {
            console.error('Error al guardar el chat durante la desactivación:', err);
        });
        // Cancelar todas las suscripciones a eventos
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
exports.MemoryAgent = MemoryAgent;


/***/ }),

/***/ "./src/agents/memory/tools/chatMemory.ts":
/*!***********************************************!*\
  !*** ./src/agents/memory/tools/chatMemory.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatMemory = void 0;
/**
 * Herramienta para gestionar la memoria de chats
 */
class ChatMemory {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Guarda un chat en la base de datos
     * @param chatId ID del chat
     * @param chat Objeto de chat a guardar
     */
    async saveChat(chatId, chat) {
        try {
            await this.storage.storeChatMemory(chatId, 'chat_data', JSON.stringify(chat));
            console.log('Chat guardado correctamente:', chatId);
        }
        catch (error) {
            console.error('Error al guardar el chat:', error);
            throw error;
        }
    }
    /**
     * Carga un chat desde la base de datos
     * @param chatId ID del chat a cargar
     * @returns El chat cargado o null si no existe
     */
    async loadChat(chatId) {
        try {
            const chatData = await this.storage.getChatMemory(chatId, 'chat_data');
            if (chatData && chatData.content) {
                return JSON.parse(chatData.content);
            }
            return null;
        }
        catch (error) {
            console.error('Error al cargar el chat:', error);
            return null;
        }
    }
    /**
     * Actualiza la lista de chats
     * @param newChat El nuevo chat a añadir a la lista
     * @returns La lista actualizada de chats
     */
    async updateChatList(newChat) {
        try {
            // Obtener la lista actual de chats
            const chatList = await this.getChatList();
            // Crear una versión simplificada del chat para la lista
            const chatSummary = {
                id: newChat.id,
                title: newChat.title,
                timestamp: newChat.timestamp,
                preview: newChat.preview
            };
            // Comprobar si este chat ya existe en la lista
            const existingIndex = chatList.findIndex((chat) => chat.id === chatSummary.id);
            if (existingIndex >= 0) {
                // Actualizar chat existente
                chatList[existingIndex] = chatSummary;
            }
            else {
                // Añadir nuevo chat
                chatList.push(chatSummary);
            }
            // Guardar la lista actualizada
            await this.storage.storeChatMemory('global', 'chat_list', JSON.stringify(chatList));
            return chatList;
        }
        catch (error) {
            console.error('Error al actualizar la lista de chats:', error);
            return [];
        }
    }
    /**
     * Obtiene la lista de todos los chats
     * @returns La lista de chats
     */
    async getChatList() {
        try {
            const chatListData = await this.storage.getChatMemory('global', 'chat_list');
            if (chatListData && chatListData.content) {
                return JSON.parse(chatListData.content);
            }
            return [];
        }
        catch (error) {
            console.error('Error al obtener la lista de chats:', error);
            return [];
        }
    }
    /**
     * Genera un ID único para un nuevo chat
     * @returns ID único para el chat
     */
    generateChatId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.ChatMemory = ChatMemory;


/***/ }),

/***/ "./src/agents/memory/tools/index.ts":
/*!******************************************!*\
  !*** ./src/agents/memory/tools/index.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(/*! ./temporaryMemory */ "./src/agents/memory/tools/temporaryMemory.ts"), exports);
__exportStar(__webpack_require__(/*! ./chatMemory */ "./src/agents/memory/tools/chatMemory.ts"), exports);
__exportStar(__webpack_require__(/*! ./projectMemory */ "./src/agents/memory/tools/projectMemory.ts"), exports);
__exportStar(__webpack_require__(/*! ./types */ "./src/agents/memory/tools/types.ts"), exports);


/***/ }),

/***/ "./src/agents/memory/tools/projectMemory.ts":
/*!**************************************************!*\
  !*** ./src/agents/memory/tools/projectMemory.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProjectMemory = void 0;
/**
 * Herramienta para gestionar la memoria de proyectos
 */
class ProjectMemory {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Almacena una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave bajo la cual almacenar la memoria
     * @param content El contenido a almacenar
     */
    async storeProjectMemory(projectPath, key, content) {
        return this.storage.storeProjectMemory(projectPath, key, content);
    }
    /**
     * Recupera una memoria para un proyecto específico
     * @param projectPath La ruta del proyecto como identificador
     * @param key La clave para recuperar la memoria
     */
    async getProjectMemory(projectPath, key) {
        return this.storage.getProjectMemory(projectPath, key);
    }
}
exports.ProjectMemory = ProjectMemory;


/***/ }),

/***/ "./src/agents/memory/tools/temporaryMemory.ts":
/*!****************************************************!*\
  !*** ./src/agents/memory/tools/temporaryMemory.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TemporaryMemory = void 0;
/**
 * Herramienta para gestionar la memoria temporal durante un intercambio de mensajes
 */
class TemporaryMemory {
    constructor() {
        this.memoryMap = new Map();
    }
    /**
     * Almacena un valor en la memoria temporal
     * @param key La clave bajo la cual almacenar el valor
     * @param content El contenido a almacenar
     */
    store(key, content) {
        this.memoryMap.set(key, content);
    }
    /**
     * Recupera un valor de la memoria temporal
     * @param key La clave para recuperar el valor
     */
    get(key) {
        return this.memoryMap.get(key);
    }
    /**
     * Limpia toda la memoria temporal
     * Debe llamarse después de completar cada intercambio de mensajes
     */
    clear() {
        this.memoryMap.clear();
    }
}
exports.TemporaryMemory = TemporaryMemory;


/***/ }),

/***/ "./src/agents/memory/tools/types.ts":
/*!******************************************!*\
  !*** ./src/agents/memory/tools/types.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports) => {


/**
 * Tipos utilizados en el sistema de memoria
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ "./src/agents/model/modelAgent.ts":
/*!****************************************!*\
  !*** ./src/agents/model/modelAgent.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModelAgent = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const baseAPI_1 = __webpack_require__(/*! ../../models/baseAPI */ "./src/models/baseAPI.ts");
const eventBus_1 = __webpack_require__(/*! ../../utils/eventBus */ "./src/utils/eventBus.ts");
const events_1 = __webpack_require__(/*! ../../utils/events */ "./src/utils/events.ts");
/**
 * ModelAgent es responsable de gestionar la interacción con los modelos de lenguaje.
 * Encapsula la lógica de selección de modelo, generación de respuestas y gestión de solicitudes.
 */
class ModelAgent {
    constructor() {
        this.disposables = [];
        // Inicializar con el modelo predeterminado
        this.modelAPI = new baseAPI_1.BaseAPI("gemini");
        // Configurar listeners de eventos
        this.setupEventListeners();
    }
    /**
     * Configura los listeners de eventos para responder a acciones del sistema
     */
    setupEventListeners() {
        // No hay eventos específicos a los que el ModelAgent necesite suscribirse inicialmente
        // Los eventos se manejan a través de métodos públicos que son llamados por el OrchestratorAgent
    }
    /**
     * Inicializa el agente de modelo
     * @param context El contexto de la extensión
     */
    async initialize(context) {
        console.log('ModelAgent inicializado');
        // Configurar el modelo predeterminado desde la configuración
        const config = vscode.workspace.getConfiguration('extensionAssistant');
        const modelType = config.get('modelType') || 'gemini';
        this.setModel(modelType);
    }
    /**
     * Cambia el modelo de lenguaje utilizado
     * @param modelType El tipo de modelo a utilizar ('ollama' o 'gemini')
     */
    setModel(modelType) {
        this.modelAPI.setModel(modelType);
        console.log(`Modelo cambiado a: ${modelType}`);
        // Publicar evento de cambio de modelo
        eventBus_1.EventBus.publish(events_1.Events.MODEL.MODEL_CHANGED, { modelType });
    }
    /**
     * Genera una respuesta utilizando el modelo actual
     * @param prompt El prompt para generar la respuesta
     * @returns La respuesta generada por el modelo
     */
    async generateResponse(prompt) {
        try {
            return await this.modelAPI.generateResponse(prompt);
        }
        catch (error) {
            console.error('Error al generar respuesta con el modelo:', error);
            throw new Error(`Error al generar respuesta: ${error.message || 'Desconocido'}`);
        }
    }
    /**
     * Cancela cualquier solicitud en curso al modelo
     */
    abortRequest() {
        this.modelAPI.abortRequest();
    }
    /**
     * Limpia los recursos cuando la extensión es desactivada
     */
    dispose() {
        console.log('ModelAgent eliminado');
        this.abortRequest();
        // Cancelar todas las suscripciones a eventos
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
exports.ModelAgent = ModelAgent;


/***/ }),

/***/ "./src/agents/orchestratorAgent.ts":
/*!*****************************************!*\
  !*** ./src/agents/orchestratorAgent.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrchestratorAgent = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const eventBus_1 = __webpack_require__(/*! ../utils/eventBus */ "./src/utils/eventBus.ts");
const events_1 = __webpack_require__(/*! ../utils/events */ "./src/utils/events.ts");
/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento de mensajes
 * entre los diferentes agentes especializados utilizando un sistema de eventos.
 */
class OrchestratorAgent {
    constructor(memoryAgent, modelAgent) {
        this.memoryAgent = memoryAgent;
        this.modelAgent = modelAgent;
        this.disposables = [];
        console.log('OrchestratorAgent inicializado');
        this.setupEventListeners();
    }
    /**
     * Configura los listeners de eventos para responder a acciones del sistema
     */
    setupEventListeners() {
        // Suscribirse al evento de mensaje enviado desde la UI
        const messageSentUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.UI.MESSAGE_SENT, (data) => this.processUserMessage(data.message));
        // Suscribirse al evento de cambio de modelo
        const modelChangeUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.UI.MODEL_CHANGE_REQUESTED, (data) => this.modelAgent.setModel(data.modelType));
        // Guardar las funciones para cancelar suscripciones
        this.disposables.push({ dispose: messageSentUnsubscribe }, { dispose: modelChangeUnsubscribe });
    }
    /**
     * Procesa un mensaje del usuario
     * @param message El texto del mensaje del usuario
     */
    async processUserMessage(message) {
        console.log(`OrchestratorAgent procesando mensaje: ${message}`);
        // Notificar que se inició el procesamiento
        eventBus_1.EventBus.publish(events_1.Events.ORCHESTRATOR.PROCESSING_STARTED, { message });
        // Mostrar una notificación en VS Code (opcional, para depuración)
        vscode.window.showInformationMessage(`Procesando: ${message}`);
        try {
            // 1. Obtener respuesta del modelo
            const assistantResponse = await this.modelAgent.generateResponse(message);
            // 2. Guardar el par mensaje-respuesta en la memoria
            const messagePair = await this.memoryAgent.processMessagePair(message, assistantResponse);
            // 3. Notificar que se completó el procesamiento
            eventBus_1.EventBus.publish(events_1.Events.ORCHESTRATOR.PROCESSING_COMPLETED, {
                userMessage: messagePair.userMessage,
                assistantMessage: messagePair.assistantMessage
            });
        }
        catch (error) {
            console.error('Error al procesar mensaje:', error);
            // Notificar error
            eventBus_1.EventBus.publish(events_1.Events.ORCHESTRATOR.PROCESSING_ERROR, {
                message,
                error: error.message || 'Error desconocido'
            });
        }
    }
    /**
     * Libera los recursos utilizados por el agente orquestador
     */
    dispose() {
        console.log('Liberando recursos del OrchestratorAgent');
        // Cancelar todas las suscripciones a eventos
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
exports.OrchestratorAgent = OrchestratorAgent;


/***/ }),

/***/ "./src/db/SQLiteStorage.ts":
/*!*********************************!*\
  !*** ./src/db/SQLiteStorage.ts ***!
  \*********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SQLiteStorage = void 0;
const sqlite3 = __importStar(__webpack_require__(/*! sqlite3 */ "sqlite3"));
const path = __importStar(__webpack_require__(/*! path */ "path"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
class SQLiteStorage {
    constructor(context) {
        const dbPath = path.join(context.globalStorageUri.fsPath, 'memory_agent.db');
        // Asegurar que el directorio existe
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('[SQLiteStorage] Error al abrir la base de datos:', err.message);
                throw err;
            }
            // Inicializar la base de datos de forma síncrona para asegurar que las tablas existan
            this.initializeDatabaseSync();
        });
    }
    async initializeDatabase() {
        // Check and create global_memory table
        const globalTableExists = await this.checkTableExists("global_memory");
        if (!globalTableExists) {
            await this.db.run(`
        CREATE TABLE global_memory (
          projectPath TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (projectPath, key)
        )
      `);
        }
        // Check and create chat_memory table
        const chatTableExists = await this.checkTableExists("chat_memory");
        if (!chatTableExists) {
            await this.db.run(`
        CREATE TABLE chat_memory (
          chatId TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (chatId, key)
        )
      `);
        }
    }
    initializeDatabaseSync() {
        // Versión síncrona de initializeDatabase para usar en el constructor
        this.db.serialize(() => {
            // Crear tabla global_memory si no existe
            this.db.run(`
        CREATE TABLE IF NOT EXISTS global_memory (
          projectPath TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (projectPath, key)
        )
      `);
            // Crear tabla chat_memory si no existe
            this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_memory (
          chatId TEXT,
          key TEXT,
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (chatId, key)
        )
      `);
            console.log('[SQLiteStorage] Tablas inicializadas correctamente');
        });
    }
    async checkTableExists(tableName) {
        const result = await this.db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
        return !!result;
    }
    async getProjectMemory(projectPath, key) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM global_memory WHERE projectPath = ? AND key = ?`, [projectPath, key], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    async getChatMemory(chatId, key) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM chat_memory WHERE chatId = ? AND key = ?`, [chatId, key], (err, row) => {
                if (err) {
                    console.error('[SQLiteStorage] Error al obtener memoria por chat:', err.message);
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('[SQLiteStorage] Error al cerrar la base de datos:', err.message);
            }
        });
    }
    async storeMemory(tableName, keyFields, values) {
        return new Promise((resolve, reject) => {
            const fields = keyFields.join(', ');
            const placeholders = keyFields.map(() => '?').join(', ');
            this.db.run(`INSERT OR REPLACE INTO ${tableName} (${fields}) VALUES (${placeholders})`, values, function (err) {
                if (err) {
                    console.error(`[SQLiteStorage] Error al insertar en ${tableName}:`, err.message);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async storeProjectMemory(projectPath, key, content) {
        return this.storeMemory('global_memory', ['projectPath', 'key', 'content'], [projectPath, key, content]);
    }
    async storeChatMemory(chatId, key, content) {
        return this.storeMemory('chat_memory', ['chatId', 'key', 'content'], [chatId, key, content]);
    }
}
exports.SQLiteStorage = SQLiteStorage;


/***/ }),

/***/ "./src/extension.ts":
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const webviewManager_1 = __webpack_require__(/*! ./vscode_integration/webviewManager */ "./src/vscode_integration/webviewManager.ts");
const orchestratorAgent_1 = __webpack_require__(/*! ./agents/orchestratorAgent */ "./src/agents/orchestratorAgent.ts");
const factory_1 = __webpack_require__(/*! ./agents/factory */ "./src/agents/factory/index.ts");
const eventBus_1 = __webpack_require__(/*! ./utils/eventBus */ "./src/utils/eventBus.ts");
async function activate(context) {
    console.log('Extension "extensionAssistant" is now active!');
    // Crear la fábrica de agentes
    const agentFactory = new factory_1.AgentFactory(context);
    // Inicializar todos los agentes
    const agents = await agentFactory.createAndInitializeAgents();
    // Crear el orquestrador con los agentes ya inicializados
    const orchestratorAgent = new orchestratorAgent_1.OrchestratorAgent(agents.memoryAgent, agents.modelAgent);
    // Crear e inicializar el WebViewManager
    const webViewManager = new webviewManager_1.WebViewManager(context.extensionUri);
    // Registrar el WebViewManager como proveedor de vista
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(webviewManager_1.WebViewManager.viewType, webViewManager));
    // Registrar un comando para abrir la vista de chat
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    }));
    // Registrar un comando para enviar un mensaje de prueba
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.sendTestMessage', async () => {
        await orchestratorAgent.processUserMessage('Mensaje de prueba desde comando');
    }));
    // Registrar recursos para limpieza durante la desactivación
    context.subscriptions.push({
        dispose: () => {
            orchestratorAgent.dispose();
            webViewManager.dispose();
            agentFactory.dispose();
            eventBus_1.EventBus.dispose(); // Limpiar todos los eventos al desactivar la extensión
        }
    });
}
function deactivate() {
    // Limpiar recursos cuando se desactive la extensión
    console.log('Extension "extensionAssistant" is now deactivated!');
}


/***/ }),

/***/ "./src/models/baseAPI.ts":
/*!*******************************!*\
  !*** ./src/models/baseAPI.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseAPI = void 0;
class BaseAPI {
    constructor(modelType) {
        this.abortController = null;
        this.modelInstance = null;
        this.currentModel = modelType;
    }
    // Método para cambiar el modelo en tiempo de ejecución
    setModel(modelType) {
        if (this.currentModel !== modelType) {
            this.currentModel = modelType;
            this.modelInstance = null; // Forzar recreación de la instancia
        }
    }
    // Método para obtener la instancia del modelo actual
    getModelInstance() {
        if (!this.modelInstance) {
            // Importaciones dinámicas para evitar dependencias circulares
            const { OllamaAPI } = __webpack_require__(/*! ./ollama */ "./src/models/ollama.ts");
            const { GeminiAPI } = __webpack_require__(/*! ./gemini */ "./src/models/gemini.ts");
            if (this.currentModel === "ollama") {
                this.modelInstance = new OllamaAPI();
            }
            else if (this.currentModel === "gemini") {
                this.modelInstance = new GeminiAPI("AIzaSyBXGZbSj099c4bUOpLxbXKJgysGKKF3sR0");
            }
            else {
                throw new Error(`Modelo no soportado: ${this.currentModel}`);
            }
        }
        // Asegurarnos de que nunca devolvemos null
        if (!this.modelInstance) {
            throw new Error(`No se pudo crear una instancia para el modelo: ${this.currentModel}`);
        }
        return this.modelInstance;
    }
    // Implementación de los métodos que delegan a la instancia específica
    async generateResponse(prompt) {
        try {
            // Log del prompt enviado al modelo
            console.log(`[BaseAPI][${this.currentModel}] PROMPT::: `, prompt);
            console.log(`[BaseAPI] Generando respuesta con modelo: ${this.currentModel}`);
            const response = await this.getModelInstance().generateResponse(prompt);
            // Log de la respuesta recibida
            console.log(`[BaseAPI][${this.currentModel}] RESPONSE::: `, response);
            // Procesamiento común para ambos modelos
            return this.normalizeResponse(response);
        }
        catch (error) {
            console.error(`[BaseAPI] Error generando respuesta con ${this.currentModel}:`, error);
            throw error;
        }
    }
    abortRequest() {
        if (this.modelInstance) {
            this.modelInstance.abortRequest();
        }
    }
    // Método para normalizar respuestas de diferentes modelos
    normalizeResponse(response) {
        if (!response)
            return "";
        // Normalización específica por modelo
        if (this.currentModel === "ollama") {
            // Procesamiento específico para Ollama si es necesario
            return response.trim();
        }
        else if (this.currentModel === "gemini") {
            // Procesamiento específico para Gemini si es necesario
            return response.trim();
        }
        return response.trim();
    }
}
exports.BaseAPI = BaseAPI;


/***/ }),

/***/ "./src/models/gemini.ts":
/*!******************************!*\
  !*** ./src/models/gemini.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GeminiAPI = void 0;
// GeminiAPI.ts
const generative_ai_1 = __webpack_require__(/*! @google/generative-ai */ "./node_modules/@google/generative-ai/dist/index.js");
class GeminiAPI {
    constructor(apiKey) {
        this.abortController = null;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 2048,
            },
        });
    }
    async generateResponse(prompt) {
        this.abortRequest();
        this.abortController = new AbortController();
        try {
            const result = await this.model.generateContent(prompt, {
                signal: this.abortController.signal,
            });
            if (!result.response) {
                throw new Error("Empty response from Gemini.");
            }
            return result.response.candidates[0].content.parts[0].text;
        }
        catch (error) {
            console.error("Error in Gemini API:", error);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer YOUR_HUGGING_FACE_API_KEY",
                },
                body: JSON.stringify({
                    inputs: text,
                }),
            });
            if (!response.ok) {
                throw new Error(`Error in response: ${response.statusText}`);
            }
            const data = (await response.json());
            return data;
        }
        catch (error) {
            console.error("Error generating Hugging Face embedding:", error);
            throw error;
        }
    }
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
exports.GeminiAPI = GeminiAPI;


/***/ }),

/***/ "./src/models/ollama.ts":
/*!******************************!*\
  !*** ./src/models/ollama.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OllamaAPI = void 0;
class OllamaAPI {
    constructor() {
        this.abortController = null;
    }
    async generateResponse(prompt) {
        this.abortRequest();
        this.abortController = new AbortController();
        let buffer = "";
        try {
            const response = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "qwen2.5-coder:7b",
                    prompt,
                    stream: true,
                    temperature: 0.2,
                }),
                signal: this.abortController.signal,
            });
            if (!response.ok || !response.body) {
                throw new Error(`Error in response: ${response.statusText}`);
            }
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        buffer += data.response;
                    }
                    catch (error) {
                        console.error("Error parsing JSON:", error);
                    }
                }
            }
            return buffer;
        }
        catch (error) {
            console.error("Error in OllamaAPI:", error);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    async generateEmbedding(text) {
        try {
            const response = await fetch("http://localhost:11434/api/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "nomic-embed-text",
                    prompt: text,
                }),
            });
            if (!response.ok) {
                throw new Error(`Error in response: ${response.statusText}`);
            }
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            console.error("Error generating embedding:", error);
            throw error;
        }
    }
    abortRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
exports.OllamaAPI = OllamaAPI;


/***/ }),

/***/ "./src/utils/eventBus.ts":
/*!*******************************!*\
  !*** ./src/utils/eventBus.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EventBus = void 0;
class EventBus {
    /**
     * Suscribe una función callback a un evento específico
     * @param event Nombre del evento
     * @param callback Función a ejecutar cuando ocurra el evento
     * @returns Función para cancelar la suscripción
     */
    static subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        // Retornar función para cancelar la suscripción
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
    /**
     * Publica un evento con datos opcionales
     * @param event Nombre del evento
     * @param data Datos opcionales para pasar a los suscriptores
     */
    static publish(event, data) {
        if (this.listeners.has(event)) {
            // Crear una copia del array para evitar problemas si un suscriptor
            // se da de baja durante la ejecución
            const callbacks = [...this.listeners.get(event)];
            callbacks.forEach(callback => callback(data));
        }
    }
    /**
     * Elimina todas las suscripciones a un evento específico
     * @param event Nombre del evento
     */
    static clear(event) {
        this.listeners.delete(event);
    }
    /**
     * Elimina todas las suscripciones
     */
    static clearAll() {
        this.listeners.clear();
    }
    /**
     * Libera todos los recursos y limpia todas las suscripciones
     * Debe llamarse cuando la extensión se desactiva
     */
    static dispose() {
        console.log('Liberando recursos del EventBus');
        this.clearAll();
    }
}
exports.EventBus = EventBus;
EventBus.listeners = new Map();


/***/ }),

/***/ "./src/utils/events.ts":
/*!*****************************!*\
  !*** ./src/utils/events.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


/**
 * Definición de eventos de la aplicación
 * Centraliza todos los nombres de eventos para evitar errores de tipeo
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Events = void 0;
exports.Events = {
    // Eventos de UI
    UI: {
        MESSAGE_SENT: 'ui:message:sent',
        NEW_CHAT_REQUESTED: 'ui:chat:new',
        LOAD_CHAT_REQUESTED: 'ui:chat:load',
        MODEL_CHANGE_REQUESTED: 'ui:model:change'
    },
    // Eventos del orquestador
    ORCHESTRATOR: {
        PROCESSING_STARTED: 'orchestrator:processing:started',
        PROCESSING_COMPLETED: 'orchestrator:processing:completed',
        PROCESSING_ERROR: 'orchestrator:processing:error'
    },
    // Eventos de memoria
    MEMORY: {
        CHAT_LIST_UPDATED: 'memory:chat:list:updated',
        CHAT_LOADED: 'memory:chat:loaded',
        CHAT_SAVED: 'memory:chat:saved',
        NEW_CHAT_CREATED: 'memory:chat:new:created'
    },
    // Eventos de modelo
    MODEL: {
        RESPONSE_GENERATED: 'model:response:generated',
        MODEL_CHANGED: 'model:changed'
    }
};


/***/ }),

/***/ "./src/vscode_integration/webviewManager.ts":
/*!**************************************************!*\
  !*** ./src/vscode_integration/webviewManager.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WebViewManager = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const eventBus_1 = __webpack_require__(/*! ../utils/eventBus */ "./src/utils/eventBus.ts");
const events_1 = __webpack_require__(/*! ../utils/events */ "./src/utils/events.ts");
/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
class WebViewManager {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
        this.disposables = [];
        // Configurar los listeners de eventos
        this.setupEventListeners();
    }
    /**
     * Configura los listeners de eventos para responder a eventos del sistema
     */
    setupEventListeners() {
        // Escuchar cuando se completa el procesamiento de un mensaje
        const processingCompletedUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.ORCHESTRATOR.PROCESSING_COMPLETED, (data) => {
            this.sendMessageToWebview({
                type: 'receiveMessage',
                message: data.assistantMessage.text,
                isUser: false
            });
        });
        // Escuchar cuando hay un error en el procesamiento
        const processingErrorUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.ORCHESTRATOR.PROCESSING_ERROR, (data) => {
            this.sendMessageToWebview({
                type: 'receiveMessage',
                message: `Error al procesar la solicitud: ${data.error}`,
                isUser: false,
                isError: true
            });
        });
        // Escuchar cuando se actualiza la lista de chats
        const chatListUpdatedUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.MEMORY.CHAT_LIST_UPDATED, (chats) => {
            this.sendMessageToWebview({
                type: 'historyLoaded',
                history: chats
            });
        });
        // Escuchar cuando se carga un chat
        const chatLoadedUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.MEMORY.CHAT_LOADED, (chat) => {
            this.sendMessageToWebview({
                type: 'chatLoaded',
                chat
            });
        });
        // Escuchar cuando se crea un nuevo chat
        const newChatCreatedUnsubscribe = eventBus_1.EventBus.subscribe(events_1.Events.MEMORY.NEW_CHAT_CREATED, () => {
            // Enviar mensaje para limpiar el chat actual en la UI
            this.sendMessageToWebview({
                type: 'clearChat'
            });
        });
        // Guardar las funciones para cancelar suscripciones
        this.disposables.push({ dispose: processingCompletedUnsubscribe }, { dispose: processingErrorUnsubscribe }, { dispose: chatListUpdatedUnsubscribe }, { dispose: chatLoadedUnsubscribe }, { dispose: newChatCreatedUnsubscribe });
    }
    /**
     * Método requerido por la interfaz WebviewViewProvider
     * Se llama cuando VS Code necesita crear o restaurar la vista del webview
     */
    resolveWebviewView(webviewView, context, _token) {
        console.log('Resolviendo webview view...');
        this._view = webviewView;
        // Configurar opciones del webview
        this.configureWebviewOptions(webviewView);
        // Establecer el contenido HTML
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        // Configurar los manejadores de mensajes
        this.setupMessageHandlers(webviewView);
    }
    /**
     * Configura las opciones del webview
     */
    configureWebviewOptions(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'out'),
                vscode.Uri.joinPath(this._extensionUri, 'resources'),
                this._extensionUri
            ]
        };
    }
    /**
     * Configura los manejadores de mensajes desde el webview
     */
    setupMessageHandlers(webviewView) {
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('Mensaje recibido del webview:', message);
            try {
                switch (message.type) {
                    case 'sendMessage':
                        // Mostrar el mensaje del usuario en la UI inmediatamente
                        this.sendMessageToWebview({
                            type: 'receiveMessage',
                            message: message.message,
                            isUser: true
                        });
                        // Publicar evento de mensaje enviado para procesamiento
                        eventBus_1.EventBus.publish(events_1.Events.UI.MESSAGE_SENT, {
                            message: message.message
                        });
                        break;
                    case 'newChat':
                        // Publicar evento de nuevo chat solicitado
                        eventBus_1.EventBus.publish(events_1.Events.UI.NEW_CHAT_REQUESTED);
                        break;
                    case 'loadChat':
                        // Publicar evento de carga de chat solicitada
                        eventBus_1.EventBus.publish(events_1.Events.UI.LOAD_CHAT_REQUESTED, {
                            chatId: message.chatId
                        });
                        break;
                    case 'setModel':
                        // Publicar evento de cambio de modelo solicitado
                        if (message.modelType === 'ollama' || message.modelType === 'gemini') {
                            eventBus_1.EventBus.publish(events_1.Events.UI.MODEL_CHANGE_REQUESTED, {
                                modelType: message.modelType
                            });
                        }
                        else {
                            throw new Error(`Modelo no soportado: ${message.modelType}`);
                        }
                        break;
                    default:
                        console.warn('Tipo de mensaje no reconocido:', message.type);
                }
            }
            catch (error) {
                console.error('Error al procesar mensaje:', error);
                this.sendMessageToWebview({
                    type: 'error',
                    message: `Error: ${error.message || 'Desconocido'}`
                });
            }
        });
    }
    /**
     * Envía un mensaje al webview
     */
    sendMessageToWebview(message) {
        if (this._view) {
            console.log('Enviando mensaje al webview:', message);
            this._view.webview.postMessage(message);
        }
        else {
            console.warn('No se puede enviar mensaje: webview no inicializado');
        }
    }
    /**
     * Genera el contenido HTML para el webview
     */
    getHtmlContent(webview) {
        // Obtener la ruta al archivo webview.js generado por webpack
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'));
        // Usar nonce para solo permitir scripts específicos
        const nonce = this.generateNonce();
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; connect-src https:;">
      <title>AI Chat</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
    }
    /**
     * Genera un nonce aleatorio para la política de seguridad de contenido
     */
    generateNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    /**
     * Libera los recursos utilizados por el WebViewManager
     */
    dispose() {
        console.log('Liberando recursos del WebViewManager');
        // Cancelar todas las suscripciones a eventos
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
    }
}
exports.WebViewManager = WebViewManager;
WebViewManager.viewType = 'aiChat.chatView';


/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "sqlite3":
/*!**************************!*\
  !*** external "sqlite3" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("sqlite3");

/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/extension.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map