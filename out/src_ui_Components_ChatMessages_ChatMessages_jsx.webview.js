"use strict";
(self["webpackChunkextensionassistant"] = self["webpackChunkextensionassistant"] || []).push([["src_ui_Components_ChatMessages_ChatMessages_jsx"],{

/***/ "./src/ui/Components/ChatMessages/AttachedFiles.jsx":
/*!**********************************************************!*\
  !*** ./src/ui/Components/ChatMessages/AttachedFiles.jsx ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./styles */ "./src/ui/Components/ChatMessages/styles.js");


function getFileName(filePath) {
  return filePath.split("/").pop().split("\\").pop();
}
var AttachedFiles = function AttachedFiles(_ref) {
  var files = _ref.files;
  if (!(files !== null && files !== void 0 && files.length)) return null;
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.attachedFiles
  }, files.map(function (file, i) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
      key: i,
      style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.fileTag
    }, getFileName(file.path));
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (AttachedFiles);

/***/ }),

/***/ "./src/ui/Components/ChatMessages/ChatMessages.jsx":
/*!*********************************************************!*\
  !*** ./src/ui/Components/ChatMessages/ChatMessages.jsx ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./styles */ "./src/ui/Components/ChatMessages/styles.js");
/* harmony import */ var _Message_UserMessage__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Message/UserMessage */ "./src/ui/Components/ChatMessages/Message/UserMessage.jsx");
/* harmony import */ var _Message_AIMessage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Message/AIMessage */ "./src/ui/Components/ChatMessages/Message/AIMessage.jsx");
/* harmony import */ var _Message_AgentMessage__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Message/AgentMessage */ "./src/ui/Components/ChatMessages/Message/AgentMessage.jsx");
/* harmony import */ var _context_AppContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../context/AppContext */ "./src/ui/context/AppContext.jsx");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }






var Message = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(function (_ref) {
  var message = _ref.message,
    messageIndex = _ref.messageIndex,
    onEdit = _ref.onEdit;
  var formattedMessage = _objectSpread(_objectSpread({}, message), {}, {
    role: message.role || (message.isUser ? "user" : message.isAgent ? "agent" : "assistant"),
    text: message.text || message.content || message.message,
    files: Array.isArray(message.files) ? message.files.map(function (file) {
      return typeof file === 'string' ? {
        path: file,
        content: undefined
      } : file;
    }) : [],
    agente: message.agente || null,
    acción: message.acción || null
  });
  if (formattedMessage.role === "user") {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_Message_UserMessage__WEBPACK_IMPORTED_MODULE_2__.UserMessage, {
      message: formattedMessage,
      messageIndex: messageIndex,
      onEdit: onEdit
    });
  } else if (formattedMessage.role === "agent") {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_Message_AgentMessage__WEBPACK_IMPORTED_MODULE_4__.AgentMessage, {
      message: formattedMessage
    });
  } else {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_Message_AIMessage__WEBPACK_IMPORTED_MODULE_3__.AIMessage, {
      message: formattedMessage
    });
  }
});

// Componente para virtualizar la lista de mensajes
var VirtualizedMessages = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(function (_ref2) {
  var messages = _ref2.messages,
    _ref2$visibleCount = _ref2.visibleCount,
    visibleCount = _ref2$visibleCount === void 0 ? 10 : _ref2$visibleCount,
    onEdit = _ref2.onEdit;
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(Math.max(0, messages.length - visibleCount)),
    _useState2 = _slicedToArray(_useState, 2),
    startIndex = _useState2[0],
    setStartIndex = _useState2[1];

  // Ajustar el índice de inicio cuando cambia la cantidad de mensajes
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    if (messages.length > visibleCount) {
      setStartIndex(Math.max(0, messages.length - visibleCount));
    } else {
      setStartIndex(0);
    }
  }, [messages.length, visibleCount]);

  // Mostrar solo los mensajes visibles
  var visibleMessages = messages.slice(startIndex, startIndex + visibleCount);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, startIndex > 0 && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.loadMoreContainer
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.loadMoreButton,
    onClick: function onClick() {
      return setStartIndex(Math.max(0, startIndex - 5));
    }
  }, "Cargar mensajes anteriores")), visibleMessages.map(function (message, index) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Message, {
      key: "".concat(startIndex + index, "-").concat(message.text),
      message: message,
      messageIndex: startIndex + index,
      onEdit: onEdit
    });
  }));
});
var ChatMessages = function ChatMessages(_ref3) {
  var children = _ref3.children;
  var _useAppContext = (0,_context_AppContext__WEBPACK_IMPORTED_MODULE_5__.useAppContext)(),
    messages = _useAppContext.messages,
    isLoading = _useAppContext.isLoading,
    currentMessage = _useAppContext.currentMessage,
    handleSendMessage = _useAppContext.handleSendMessage;
  var messagesEndRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages, currentMessage]);
  var handleEditMessage = function handleEditMessage(messageIndex, newText, files) {
    var filePaths = (files === null || files === void 0 ? void 0 : files.map(function (file) {
      return typeof file === 'string' ? file : file.path;
    })) || [];
    handleSendMessage(newText, filePaths);
  };

  // Determinar si debemos usar virtualización basado en la cantidad de mensajes
  var useVirtualization = messages.length > 20;
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.container
  }, useVirtualization ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(VirtualizedMessages, {
    messages: messages,
    visibleCount: 20,
    onEdit: function onEdit(index, newText, files) {
      return handleEditMessage(index, newText, files);
    }
  }) : messages.map(function (message, index) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Message, {
      key: "".concat(index, "-").concat(message.text),
      message: message,
      messageIndex: index,
      onEdit: function onEdit(newText, files) {
        return handleEditMessage(index, newText, files);
      }
    });
  }), isLoading && currentMessage && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(Message, {
    message: {
      text: currentMessage,
      role: "assistant",
      files: []
    }
  }), messages.length === 0 && !isLoading && children, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    ref: messagesEndRef
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(ChatMessages));

/***/ }),

/***/ "./src/ui/Components/ChatMessages/Message/AIMessage.jsx":
/*!**************************************************************!*\
  !*** ./src/ui/Components/ChatMessages/Message/AIMessage.jsx ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AIMessage: () => (/* binding */ AIMessage)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _MessageContent_CodeBlock__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../MessageContent/CodeBlock */ "./src/ui/Components/ChatMessages/MessageContent/CodeBlock.jsx");
/* harmony import */ var _MessageContent_MarkdownContent__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../MessageContent/MarkdownContent */ "./src/ui/Components/ChatMessages/MessageContent/MarkdownContent.jsx");
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../styles */ "./src/ui/Components/ChatMessages/styles.js");
/* harmony import */ var _AttachedFiles__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../AttachedFiles */ "./src/ui/Components/ChatMessages/AttachedFiles.jsx");
/* harmony import */ var _context_AppContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../context/AppContext */ "./src/ui/context/AppContext.jsx");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }






var parseMessage = function parseMessage(message) {
  if (!message) return [{
    type: "markdown",
    content: ""
  }];
  var parts = [];
  var codeRegex = /```([\w:\/\\.-]+)?\s*([\s\S]*?)```/g;
  var lastIndex = 0;
  var match;
  while ((match = codeRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "markdown",
        content: message.slice(lastIndex, match.index)
      });
    }
    var _split = (match[1] || "javascript").split(":"),
      _split2 = _slicedToArray(_split, 2),
      language = _split2[0],
      filename = _split2[1];
    parts.push({
      type: "code",
      language: language,
      filename: filename || undefined,
      content: match[2].trim()
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < message.length) {
    parts.push({
      type: "markdown",
      content: message.slice(lastIndex)
    });
  }
  return parts;
};

// Estilos para los botones de confirmación
var confirmationStyles = {
  buttonsContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    border: 'none',
    transition: 'background-color 0.2s'
  },
  applyButton: {
    backgroundColor: '#28a745',
    color: 'white'
  },
  rejectButton: {
    backgroundColor: '#dc3545',
    color: 'white'
  }
};
var AIMessage = function AIMessage(_ref) {
  var message = _ref.message;
  var _useAppContext = (0,_context_AppContext__WEBPACK_IMPORTED_MODULE_5__.useAppContext)(),
    vscode = _useAppContext.vscode;
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState2 = _slicedToArray(_useState, 2),
    showConfirmButtons = _useState2[0],
    setShowConfirmButtons = _useState2[1];
  var parts = parseMessage(message === null || message === void 0 ? void 0 : message.text);
  var files = (message === null || message === void 0 ? void 0 : message.files) || [];

  // Detectar si el mensaje contiene una solicitud de confirmación para aplicar cambios
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    if (message !== null && message !== void 0 && message.text) {
      var hasConfirmationRequest = message.text.includes("¿Deseas aplicar estos cambios?") || message.text.includes("Responde con 'sí' para aplicar o 'no' para cancelar");
      setShowConfirmButtons(hasConfirmationRequest);
    }
  }, [message === null || message === void 0 ? void 0 : message.text]);
  if (!(message !== null && message !== void 0 && message.text)) {
    return null;
  }

  // Manejar la confirmación o rechazo de cambios
  var handleConfirmation = function handleConfirmation(confirmed) {
    if (vscode) {
      vscode.postMessage({
        type: "sendMessage",
        text: confirmed ? "sí" : "no",
        files: []
      });
    }
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _objectSpread(_objectSpread({}, _styles__WEBPACK_IMPORTED_MODULE_3__.styles.message), _styles__WEBPACK_IMPORTED_MODULE_3__.styles.aiMessage)
  }, files.length > 0 && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_AttachedFiles__WEBPACK_IMPORTED_MODULE_4__["default"], {
    files: files
  }), parts.map(function (part, i) {
    return part.type === "code" ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_MessageContent_CodeBlock__WEBPACK_IMPORTED_MODULE_1__["default"], {
      key: i,
      language: part.language,
      filename: part.filename,
      content: part.content
    }) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_MessageContent_MarkdownContent__WEBPACK_IMPORTED_MODULE_2__["default"], {
      key: i,
      content: part.content
    });
  }), showConfirmButtons && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: confirmationStyles.buttonsContainer
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    style: _objectSpread(_objectSpread({}, confirmationStyles.button), confirmationStyles.applyButton),
    onClick: function onClick() {
      return handleConfirmation(true);
    }
  }, "Aplicar cambios"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    style: _objectSpread(_objectSpread({}, confirmationStyles.button), confirmationStyles.rejectButton),
    onClick: function onClick() {
      return handleConfirmation(false);
    }
  }, "Rechazar cambios")));
};

/***/ }),

/***/ "./src/ui/Components/ChatMessages/Message/AgentMessage.jsx":
/*!*****************************************************************!*\
  !*** ./src/ui/Components/ChatMessages/Message/AgentMessage.jsx ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AgentMessage: () => (/* binding */ AgentMessage)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }

var AgentMessage = function AgentMessage(_ref) {
  var message = _ref.message;
  var agente = message.agente,
    acción = message.acción;
  if (!agente || !acción) {
    return null;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _objectSpread(_objectSpread({}, styles.message), styles.agentMessage)
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.agentMessageContent
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("strong", null, agente, ":"), " ", acción));
};
var styles = {
  agentMessage: {
    backgroundColor: 'var(--vscode-editor-background)',
    borderLeft: '4px solid var(--vscode-activityBarBadge-background)',
    padding: '10px',
    margin: '10px 0',
    borderRadius: '4px'
  },
  agentMessageContent: {
    color: 'var(--vscode-foreground)',
    fontSize: '14px'
  }
};

/***/ }),

/***/ "./src/ui/Components/ChatMessages/Message/UserMessage.jsx":
/*!****************************************************************!*\
  !*** ./src/ui/Components/ChatMessages/Message/UserMessage.jsx ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   UserMessage: () => (/* binding */ UserMessage)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles */ "./src/ui/Components/ChatMessages/styles.js");
/* harmony import */ var _AttachedFiles__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../AttachedFiles */ "./src/ui/Components/ChatMessages/AttachedFiles.jsx");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }



var IconEdit = function IconEdit() {
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
  }));
};
var UserMessage = function UserMessage(_ref) {
  var message = _ref.message,
    onEdit = _ref.onEdit,
    messageIndex = _ref.messageIndex;
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState2 = _slicedToArray(_useState, 2),
    isEditing = _useState2[0],
    setIsEditing = _useState2[1];
  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(message.text),
    _useState4 = _slicedToArray(_useState3, 2),
    editedText = _useState4[0],
    setEditedText = _useState4[1];
  var textareaRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var handleEdit = function handleEdit() {
    setIsEditing(true);
  };
  var handleKeyPress = function handleKeyPress(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editedText.trim() !== "") {
        // Mantener los archivos en su formato original
        onEdit(messageIndex, editedText, message.files);
        setIsEditing(false);
      }
    }
  };
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    var textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = "".concat(Math.min(textarea.scrollHeight, 200), "px"); // Limita la altura máxima a 200px
    }
  }, [editedText]);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _objectSpread(_objectSpread({}, _styles__WEBPACK_IMPORTED_MODULE_1__.styles.message), _styles__WEBPACK_IMPORTED_MODULE_1__.styles.userMessage)
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.userMessageHeader
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_AttachedFiles__WEBPACK_IMPORTED_MODULE_2__["default"], {
    files: message.files || []
  }), !isEditing && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    onClick: handleEdit,
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.editButton,
    title: "Editar mensaje"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(IconEdit, null))), isEditing ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("textarea", {
    ref: textareaRef,
    value: editedText,
    onChange: function onChange(e) {
      return setEditedText(e.target.value);
    },
    onKeyDown: handleKeyPress,
    style: _objectSpread(_objectSpread({}, _styles__WEBPACK_IMPORTED_MODULE_1__.styles.editInput), {}, {
      minHeight: "20px",
      maxHeight: "100px",
      width: "100%",
      backgroundColor: "var(--vscode-input-background)",
      color: "var(--vscode-input-foreground)",
      border: "1px solid var(--vscode-input-border)",
      borderRadius: "4px",
      padding: "8px",
      resize: "none",
      fontFamily: "inherit",
      fontSize: "inherit",
      overflow: "auto"
    }),
    autoFocus: true,
    placeholder: "Presiona Enter para enviar"
  }) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", null, message.text));
};

/***/ }),

/***/ "./src/ui/Components/ChatMessages/MessageContent/CodeBlock.jsx":
/*!*********************************************************************!*\
  !*** ./src/ui/Components/ChatMessages/MessageContent/CodeBlock.jsx ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var prismjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! prismjs */ "./node_modules/prismjs/prism.js");
/* harmony import */ var prismjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(prismjs__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var prismjs_themes_prism_tomorrow_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! prismjs/themes/prism-tomorrow.css */ "./node_modules/prismjs/themes/prism-tomorrow.css");
/* harmony import */ var prismjs_components_prism_javascript__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! prismjs/components/prism-javascript */ "./node_modules/prismjs/components/prism-javascript.js");
/* harmony import */ var prismjs_components_prism_javascript__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_javascript__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var prismjs_components_prism_jsx__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! prismjs/components/prism-jsx */ "./node_modules/prismjs/components/prism-jsx.js");
/* harmony import */ var prismjs_components_prism_jsx__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_jsx__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var prismjs_components_prism_typescript__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! prismjs/components/prism-typescript */ "./node_modules/prismjs/components/prism-typescript.js");
/* harmony import */ var prismjs_components_prism_typescript__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_typescript__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var prismjs_components_prism_python__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! prismjs/components/prism-python */ "./node_modules/prismjs/components/prism-python.js");
/* harmony import */ var prismjs_components_prism_python__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_python__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var prismjs_components_prism_json__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! prismjs/components/prism-json */ "./node_modules/prismjs/components/prism-json.js");
/* harmony import */ var prismjs_components_prism_json__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_json__WEBPACK_IMPORTED_MODULE_7__);
/* harmony import */ var prismjs_components_prism_css__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! prismjs/components/prism-css */ "./node_modules/prismjs/components/prism-css.js");
/* harmony import */ var prismjs_components_prism_css__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_css__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var prismjs_components_prism_markdown__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! prismjs/components/prism-markdown */ "./node_modules/prismjs/components/prism-markdown.js");
/* harmony import */ var prismjs_components_prism_markdown__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_markdown__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var prismjs_components_prism_markup__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! prismjs/components/prism-markup */ "./node_modules/prismjs/components/prism-markup.js");
/* harmony import */ var prismjs_components_prism_markup__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(prismjs_components_prism_markup__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../styles */ "./src/ui/Components/ChatMessages/styles.js");
/* harmony import */ var _context_AppContext__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../../../context/AppContext */ "./src/ui/context/AppContext.jsx");
/* harmony import */ var _IconstApp__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../../../IconstApp */ "./src/ui/IconstApp.jsx");
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }














var PrismConfig = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(function () {
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    // Initialize Prism languages
    (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages) = _objectSpread(_objectSpread({}, (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages)), {}, {
      javascript: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).javascript,
      jsx: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).jsx,
      typescript: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).typescript,
      python: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).python,
      json: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).json,
      css: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).css,
      markdown: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).markdown,
      html: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).markup,
      htm: (prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages).markup
    });
  }, []);
  return null;
});
var CodeBlockHeader = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(function (_ref) {
  var filename = _ref.filename,
    onCopy = _ref.onCopy,
    onApply = _ref.onApply;
  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
      copied: false,
      timer: null
    }),
    _useState2 = _slicedToArray(_useState, 2),
    copyState = _useState2[0],
    setCopyState = _useState2[1];
  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)({
      applied: false,
      timer: null
    }),
    _useState4 = _slicedToArray(_useState3, 2),
    applyState = _useState4[0],
    setApplyState = _useState4[1];
  var handleStateChange = /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee(action, state, setState) {
      return _regeneratorRuntime().wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            if (state.timer) clearTimeout(state.timer);
            _context.next = 3;
            return action();
          case 3:
            setState(function (prev) {
              return _defineProperty(_defineProperty({}, action === onCopy ? "copied" : "applied", true), "timer", setTimeout(function () {
                setState(function (prev) {
                  return _defineProperty(_defineProperty({}, action === onCopy ? "copied" : "applied", false), "timer", null);
                });
              }, 2000));
            });
          case 4:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function handleStateChange(_x, _x2, _x3) {
      return _ref2.apply(this, arguments);
    };
  }();
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.codeBlockHeader
  }, filename && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.filename
  }, filename), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.buttonContainer
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    onClick: function onClick() {
      return handleStateChange(onCopy, copyState, setCopyState);
    },
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.button,
    title: "Copy code"
  }, copyState.copied ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_IconstApp__WEBPACK_IMPORTED_MODULE_13__.IconTick, null) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_IconstApp__WEBPACK_IMPORTED_MODULE_13__.IconCopy, null)), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    onClick: function onClick() {
      return handleStateChange(onApply, applyState, setApplyState);
    },
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.button,
    title: "Apply changes"
  }, applyState.applied ? /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_IconstApp__WEBPACK_IMPORTED_MODULE_13__.IconTick, null) : /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_IconstApp__WEBPACK_IMPORTED_MODULE_13__.IconApply, null))));
});
var CodeBlock = function CodeBlock(_ref5) {
  var _ref5$language = _ref5.language,
    language = _ref5$language === void 0 ? "javascript" : _ref5$language,
    content = _ref5.content,
    filename = _ref5.filename;
  var _useAppContext = (0,_context_AppContext__WEBPACK_IMPORTED_MODULE_12__.useAppContext)(),
    vscode = _useAppContext.vscode;
  var _useState5 = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false),
    _useState6 = _slicedToArray(_useState5, 2),
    copied = _useState6[0],
    setCopied = _useState6[1];

  // Normalizar el lenguaje
  var normalizedLanguage = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(function () {
    var lang = (language === null || language === void 0 ? void 0 : language.toLowerCase()) || "javascript";
    // Mapear extensiones comunes a sus lenguajes correspondientes
    var languageMap = {
      'html': 'markup',
      'htm': 'markup',
      'xml': 'markup',
      'svg': 'markup'
    };
    return languageMap[lang] || lang;
  }, [language]);

  // Sanitizar el contenido si es necesario
  var sanitizedContent = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(function () {
    if (!content) return "";
    // Escapar caracteres especiales si el contenido es HTML/markup
    if (['markup', 'html', 'htm', 'xml'].includes(normalizedLanguage)) {
      return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return content;
  }, [content, normalizedLanguage]);
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    // Asegurarse de que el lenguaje esté soportado
    if (!(prismjs__WEBPACK_IMPORTED_MODULE_1___default().languages)[normalizedLanguage]) {
      console.warn("Language ".concat(normalizedLanguage, " not supported, falling back to text"));
    }
    prismjs__WEBPACK_IMPORTED_MODULE_1___default().highlightAll();
  }, [sanitizedContent, normalizedLanguage]);
  var handleCopy = /*#__PURE__*/function () {
    var _ref6 = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
      return _regeneratorRuntime().wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return navigator.clipboard.writeText(content);
          case 3:
            return _context2.abrupt("return", true);
          case 6:
            _context2.prev = 6;
            _context2.t0 = _context2["catch"](0);
            console.error("Failed to copy text:", _context2.t0);
            return _context2.abrupt("return", false);
          case 10:
          case "end":
            return _context2.stop();
        }
      }, _callee2, null, [[0, 6]]);
    }));
    return function handleCopy() {
      return _ref6.apply(this, arguments);
    };
  }();
  var handleApply = /*#__PURE__*/function () {
    var _ref7 = _asyncToGenerator(/*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
      return _regeneratorRuntime().wrap(function _callee3$(_context3) {
        while (1) switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 7;
            break;
          case 3:
            _context3.prev = 3;
            _context3.t0 = _context3["catch"](0);
            console.error("Failed to apply changes:", _context3.t0);
            return _context3.abrupt("return", false);
          case 7:
          case "end":
            return _context3.stop();
        }
      }, _callee3, null, [[0, 3]]);
    }));
    return function handleApply() {
      return _ref7.apply(this, arguments);
    };
  }();

  // No renderizar si no hay contenido
  if (!(sanitizedContent !== null && sanitizedContent !== void 0 && sanitizedContent.trim())) return null;
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_11__.styles.codeBlockContainer
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PrismConfig, null), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(CodeBlockHeader, {
    filename: filename,
    onCopy: handleCopy,
    onApply: handleApply
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("pre", {
    style: _objectSpread(_objectSpread({}, _styles__WEBPACK_IMPORTED_MODULE_11__.styles.pre), {}, {
      backgroundColor: 'transparent',
      margin: 0,
      padding: '1em',
      borderRadius: '0 0 4px 4px',
      overflow: 'auto'
    })
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("code", {
    className: "language-".concat(normalizedLanguage),
    style: {
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      fontSize: '14px',
      lineHeight: '1.5',
      tabSize: 2
    },
    dangerouslySetInnerHTML: {
      __html: sanitizedContent
    }
  })));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.memo)(CodeBlock));

/***/ }),

/***/ "./src/ui/Components/ChatMessages/MessageContent/MarkdownContent.jsx":
/*!***************************************************************************!*\
  !*** ./src/ui/Components/ChatMessages/MessageContent/MarkdownContent.jsx ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var markdown_to_jsx__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! markdown-to-jsx */ "./node_modules/markdown-to-jsx/dist/index.modern.js");
/* harmony import */ var _styles__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles */ "./src/ui/Components/ChatMessages/styles.js");



var MarkdownContent = function MarkdownContent(_ref) {
  var content = _ref.content;
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: _styles__WEBPACK_IMPORTED_MODULE_1__.styles.markdownContent
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(markdown_to_jsx__WEBPACK_IMPORTED_MODULE_2__["default"], null, content));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (MarkdownContent);

/***/ }),

/***/ "./src/ui/Components/ChatMessages/styles.js":
/*!**************************************************!*\
  !*** ./src/ui/Components/ChatMessages/styles.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   styles: () => (/* binding */ styles)
/* harmony export */ });
// ui/Components/ChatMessages/styles.js
var styles = {
  container: {
    flexDirection: "column",
    height: "100%",
    padding: "10px"
  },
  chatContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  emptyContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%"
  },
  message: {
    marginBottom: "10px",
    padding: "8px",
    borderRadius: "4px",
    maxWidth: "100%",
    wordWrap: "break-word"
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "var(--vscode-editor-background)",
    color: "var(--vscode-button-foreground)",
    border: "1px solid var(--vscode-input-border)"
  },
  aiMessage: {
    alignSelf: "flex-start"
  },
  codeBlockContainer: {
    margin: '1em 0',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: 'var(--vscode-input-background)',
    border: '1px solid var(--vscode-input-border)'
  },
  codeBlockHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--vscode-input-border)'
  },
  filename: {
    fontFamily: 'Consolas, Monaco, monospace',
    marginRight: 'auto',
    color: 'var(--vscode-foreground)'
  },
  buttonContainer: {
    display: 'flex',
    gap: '8px'
  },
  button: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--vscode-foreground)',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'var(--vscode-toolbar-hoverBackground)'
    }
  },
  pre: {
    margin: 0,
    padding: '1em',
    overflow: 'auto',
    fontSize: '14px',
    lineHeight: '1.5',
    color: 'var(--vscode-foreground)',
    '&::WebkitScrollbar': {
      width: '8px',
      height: '8px'
    },
    '&::WebkitScrollbarTrack': {
      background: 'transparent'
    },
    '&::WebkitScrollbarThumb': {
      background: 'var(--vscode-scrollbarSlider-background)',
      borderRadius: '4px',
      '&:hover': {
        background: 'var(--vscode-scrollbarSlider-hoverBackground)'
      }
    }
  },
  attachedFiles: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    marginBottom: "8px"
  },
  fileTag: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "var(--vscode-button-secondaryBackground)",
    color: "var(--vscode-button-secondaryForeground)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px"
  },
  copyButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--vscode-button-foreground)",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "12px",
    borderRadius: "2px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "opacity 0.2s",
    "&:hover": {
      opacity: 0.8
    }
  },
  userMessageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "4px"
  },
  editButton: {
    backgroundColor: "transparent",
    border: "none",
    padding: "2px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    opacity: 0.7,
    color: "var(--vscode-button-foreground)",
    "&:hover": {
      opacity: 1
    }
  },
  editInput: {
    minHeight: "60px",
    width: "100%",
    backgroundColor: "var(--vscode-input-background)",
    color: "var(--vscode-input-foreground)",
    border: "1px solid var(--vscode-input-border)",
    borderRadius: "4px",
    padding: "8px",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "inherit"
  },
  markdownContent: {
    padding: '8px',
    lineHeight: '1.5',
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: '16px',
      marginBottom: '8px',
      fontWeight: 'bold'
    },
    '& p': {
      marginBottom: '8px'
    },
    '& ul, & ol': {
      paddingLeft: '20px',
      marginBottom: '8px'
    },
    '& strong': {
      fontWeight: 'bold'
    },
    '& em': {
      fontStyle: 'italic'
    }
  }
};

/***/ }),

/***/ "./src/ui/IconstApp.jsx":
/*!******************************!*\
  !*** ./src/ui/IconstApp.jsx ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   IconApply: () => (/* binding */ IconApply),
/* harmony export */   IconCopy: () => (/* binding */ IconCopy),
/* harmony export */   IconTick: () => (/* binding */ IconTick)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");

var IconTick = function IconTick() {
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }));
};
var IconCopy = function IconCopy() {
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  }));
};
var IconApply = function IconApply() {
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("path", {
    d: "M5 13l4 4L19 7"
  }));
};

/***/ })

}]);
//# sourceMappingURL=src_ui_Components_ChatMessages_ChatMessages_jsx.webview.js.map