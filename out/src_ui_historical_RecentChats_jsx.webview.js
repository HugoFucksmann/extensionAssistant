"use strict";
(self["webpackChunkextensionassistant"] = self["webpackChunkextensionassistant"] || []).push([["src_ui_historical_RecentChats_jsx"],{

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

/***/ }),

/***/ "./src/ui/historical/RecentChats.jsx":
/*!*******************************************!*\
  !*** ./src/ui/historical/RecentChats.jsx ***!
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
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto"
  },
  title: {
    fontSize: "1.5em",
    marginBottom: "15px",
    color: "var(--vscode-foreground)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  viewMoreButton: {
    backgroundColor: "var(--vscode-button-background)",
    color: "var(--vscode-button-foreground)",
    border: "none",
    padding: "5px 10px",
    fontSize: "1em",
    cursor: "pointer"
  }
};
var RecentChats = function RecentChats() {
  var _useAppContext = (0,_context_AppContext__WEBPACK_IMPORTED_MODULE_1__.useAppContext)(),
    vscode = _useAppContext.vscode,
    history = _useAppContext.history,
    handleLoadChat = _useAppContext.handleLoadChat,
    handleShowHistory = _useAppContext.handleShowHistory;
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
    vscode.postMessage({
      type: "loadHistory"
    });
  }, [vscode]);
  if (!history || history.length === 0) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("p", null, "No hay chats guardados");
  }
  var recentChats = history.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  }).slice(0, 4);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.container
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", {
    style: styles.header
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("h2", {
    style: styles.title
  }, "Recent Chats"), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", {
    style: styles.viewMoreButton,
    onClick: handleShowHistory
  }, "Ver m\xE1s")), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_ChatList__WEBPACK_IMPORTED_MODULE_2__["default"], {
    chats: recentChats,
    onChatClick: handleLoadChat
  }));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (RecentChats);

/***/ })

}]);
//# sourceMappingURL=src_ui_historical_RecentChats_jsx.webview.js.map