/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

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
const uiProvider_1 = __webpack_require__(/*! ./vscode_integration/uiProvider */ "./src/vscode_integration/uiProvider.ts");
function activate(context) {
    console.log('Extension "extensionAssistant" is now active!');
    // Registrar el proveedor de webview para la vista de chat
    const chatViewProvider = new uiProvider_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(uiProvider_1.ChatViewProvider.viewType, chatViewProvider));
    // Registrar un comando para abrir la vista de chat
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
    }));
    // Registrar un comando para enviar un mensaje de prueba
    context.subscriptions.push(vscode.commands.registerCommand('extensionAssistant.sendTestMessage', () => {
        chatViewProvider.sendMessageToWebview({
            command: 'receiveMessage',
            text: 'Este es un mensaje de prueba desde la extensión',
            isUser: false
        });
    }));
}
function deactivate() {
    // Limpiar recursos cuando se desactive la extensión
    console.log('Extension "extensionAssistant" is now deactivated!');
}


/***/ }),

/***/ "./src/vscode_integration/uiProvider.ts":
/*!**********************************************!*\
  !*** ./src/vscode_integration/uiProvider.ts ***!
  \**********************************************/
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
exports.ChatViewProvider = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
class ChatViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log('Resolviendo webview view...');
        this._view = webviewView;
        webviewView.webview.options = {
            // Habilitar JavaScript en el webview
            enableScripts: true,
            // Restringir el webview a cargar solo contenido de nuestro directorio de extensión
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'out'),
                vscode.Uri.joinPath(this._extensionUri, 'resources'),
                this._extensionUri
            ]
        };
        console.log('Configurando HTML del webview...');
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('HTML configurado.');
        // Manejar mensajes desde el webview
        webviewView.webview.onDidReceiveMessage(message => {
            console.log('Mensaje recibido del webview:', message);
            switch (message.command) {
                case 'sendMessage':
                    this._handleSendMessage(message.text);
                    return;
            }
        });
    }
    // Enviar un mensaje al webview
    sendMessageToWebview(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    _handleSendMessage(text) {
        // Aquí implementarías la lógica para procesar el mensaje del usuario
        // Por ejemplo, enviarlo a un modelo de IA y devolver la respuesta
        vscode.window.showInformationMessage(`Mensaje recibido: ${text}`);
        // Simular una respuesta para probar
        setTimeout(() => {
            this.sendMessageToWebview({
                command: 'receiveMessage',
                text: `Respuesta a: ${text}`,
                isUser: false
            });
        }, 1000);
    }
    _getHtmlForWebview(webview) {
        // Obtener la ruta al archivo webview.js generado por webpack
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js'));
        // Usar nonce para solo permitir scripts específicos
        const nonce = getNonce();
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
}
exports.ChatViewProvider = ChatViewProvider;
ChatViewProvider.viewType = 'aiChat.chatView';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


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