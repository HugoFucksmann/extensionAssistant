"use strict";
(self["webpackChunkextensionassistant"] = self["webpackChunkextensionassistant"] || []).push([["src_ui_historical_ChatHistory_jsx"],{

/***/ "./src/ui/historical/ChatHistory.jsx":
/*!*******************************************!*\
  !*** ./src/ui/historical/ChatHistory.jsx ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _context_AppContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../context/AppContext */ "./src/ui/context/AppContext.jsx");
/* harmony import */ var _ChatList__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ChatList */ "./src/ui/historical/ChatList.jsx");



var styles = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--vscode-sideBar-background)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column"
  },
  header: {
    padding: "10px",
    borderBottom: "1px solid var(--vscode-sideBar-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  button: {
    backgroundColor: "var(--vscode-button-background)",
    color: "var(--vscode-button-foreground)",
    border: "none",
    padding: "4px 8px",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px"
  }
};
var ChatHistory = function ChatHistory() {
  var _useAppContext = (0,_context_AppContext__WEBPACK_IMPORTED_MODULE_1__.useAppContext)(),
    vscode = _useAppContext.vscode,
    history = _useAppContext.history,
    handleLoadChat = _useAppContext.handleLoadChat,
    showHistory = _useAppContext.showHistory,
    setShowHistory = _useAppContext.setShowHistory;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    vscode.postMessage({
      type: "loadHistory"
    });
  }, [vscode]);
  if (!showHistory) return null;
  var handleClose = function handleClose() {
    setShowHistory(false);
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.container
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.header
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("h2", null, "Historial de Chats"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    style: styles.button,
    onClick: handleClose
  }, "Cerrar")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_ChatList__WEBPACK_IMPORTED_MODULE_2__["default"], {
    chats: history,
    onChatClick: handleLoadChat
  }), history.length === 0 && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: {
      padding: "10px",
      textAlign: "center"
    }
  }, "No hay chats guardados"));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChatHistory);

/***/ }),

/***/ "./src/ui/historical/ChatList.jsx":
/*!****************************************!*\
  !*** ./src/ui/historical/ChatList.jsx ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");

var styles = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  chatItem: {
    padding: "15px",
    borderRadius: "5px",
    backgroundColor: "var(--vscode-button-background)",
    cursor: "pointer",
    transition: "background-color 0.2s"
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "5px"
  },
  chatTitle: {
    fontWeight: "bold",
    color: "var(--vscode-button-foreground)"
  },
  timestamp: {
    fontSize: "0.8em",
    color: "var(--vscode-descriptionForeground)"
  },
  preview: {
    fontSize: "0.9em",
    color: "var(--vscode-descriptionForeground)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }
};
var ChatList = function ChatList(_ref) {
  var chats = _ref.chats,
    onChatClick = _ref.onChatClick;
  var formatTimestamp = function formatTimestamp(timestamp) {
    var date = new Date(timestamp);
    return date.toLocaleString();
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.list
  }, chats.map(function (chat) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
      key: chat.id,
      onClick: function onClick() {
        return onChatClick(chat.id);
      },
      style: styles.chatItem
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
      style: styles.chatHeader
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
      style: styles.chatTitle
    }, chat.title), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", {
      style: styles.timestamp
    }, formatTimestamp(chat.timestamp))), chat.preview && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
      style: styles.preview
    }, chat.preview));
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ChatList);

/***/ })

}]);
//# sourceMappingURL=src_ui_historical_ChatHistory_jsx.webview.js.map