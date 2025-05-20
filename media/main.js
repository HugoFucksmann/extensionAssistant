// Código JavaScript para la interfaz de usuario del webview
(function() {
  // Obtener referencias a elementos del DOM
  const vscode = acquireVsCodeApi();
  const messagesContainer = document.getElementById('messages');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const processingContainer = document.getElementById('processingContainer');
  const toolsList = document.getElementById('toolsList');
  
  // Almacenar estado
  let activeTools = new Map();
  let currentPhase = '';
  
  // Inicializar
  init();
  
  /**
   * Inicializa la interfaz de usuario
   */
  function init() {
    // Configurar eventos
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', handleInputKeydown);
    
    // Configurar receptor de mensajes desde la extensión
    window.addEventListener('message', handleMessageFromExtension);
    
    // Solicitar lista de chats al cargar
    vscode.postMessage({ type: 'getChats' });
  }
  
  /**
   * Maneja el envío de un mensaje
   */
  function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    // Añadir mensaje a la UI
    addMessage('user', text);
    
    // Enviar mensaje a la extensión
    vscode.postMessage({
      type: 'sendMessage',
      payload: { text }
    });
    
    // Limpiar input
    userInput.value = '';
    
    // Mostrar indicador de procesamiento
    showProcessingIndicator();
  }
  
  /**
   * Maneja eventos de teclado en el input
   */
  function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }
  
  /**
   * Maneja mensajes recibidos desde la extensión
   */
  function handleMessageFromExtension(event) {
    const message = event.data;
    
    switch (message.type) {
      case 'messageAdded':
        addMessage(message.payload.sender, message.payload.content, message.payload.metadata);
        hideProcessingIndicator();
        break;
        
      case 'processingUpdate':
        updateProcessingStatus(message.payload);
        break;
        
      case 'toolExecutionUpdate':
        updateToolExecution(message.payload);
        break;
        
      case 'processingFinished':
        hideProcessingIndicator();
        break;
        
      case 'error':
        showError(message.payload.message);
        hideProcessingIndicator();
        break;
        
      case 'chatsLoaded':
        // Implementar cuando tengamos la funcionalidad de múltiples chats
        break;
        
      case 'conversationStarted':
        // Limpiar el historial de mensajes al iniciar una nueva conversación
        if (message.payload.newChat) {
          messagesContainer.innerHTML = '';
        }
        break;
    }
  }
  
  /**
   * Añade un mensaje al contenedor de mensajes
   */
  function addMessage(sender, content, metadata = {}) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    
    // Formatear el contenido con Markdown si es del asistente
    if (sender === 'assistant') {
      // Implementación simple - en una versión real usaríamos una librería de Markdown
      content = formatMarkdown(content);
    }
    
    messageElement.innerHTML = content;
    messagesContainer.appendChild(messageElement);
    
    // Hacer scroll hasta el final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Formatea texto con sintaxis Markdown básica
   */
  function formatMarkdown(text) {
    // Implementación simple de formato Markdown
    // Código en línea
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bloques de código
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, language, code) {
      return `<pre><code class="language-${language}">${code}</code></pre>`;
    });
    
    // Negritas
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Cursivas
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Enlaces
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Párrafos
    text = text.split('\n\n').map(p => `<p>${p}</p>`).join('');
    
    return text;
  }
  
  /**
   * Muestra el indicador de procesamiento
   */
  function showProcessingIndicator() {
    processingContainer.classList.remove('hidden');
    
    // Resetear estado
    document.querySelectorAll('.phase').forEach(phase => {
      phase.classList.remove('active', 'completed');
      phase.querySelector('.phase-status').textContent = '';
    });
    
    toolsList.innerHTML = '';
    activeTools.clear();
    currentPhase = '';
  }
  
  /**
   * Oculta el indicador de procesamiento
   */
  function hideProcessingIndicator() {
    // No ocultamos inmediatamente para que el usuario pueda ver el estado final
    setTimeout(() => {
      processingContainer.classList.add('hidden');
    }, 2000);
  }
  
  /**
   * Actualiza el estado de procesamiento
   */
  function updateProcessingStatus(data) {
    // Actualizar la fase actual
    if (data.phase) {
      currentPhase = data.phase;
      
      // Actualizar UI de fases
      const phaseElement = document.querySelector(`.phase[data-phase="${data.phase}"]`);
      if (phaseElement) {
        document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
        
        if (data.status === 'started') {
          phaseElement.classList.add('active');
          phaseElement.classList.remove('completed');
        } else if (data.status === 'completed') {
          phaseElement.classList.remove('active');
          phaseElement.classList.add('completed');
        }
        
        // Actualizar detalles si existen
        if (data.details) {
          phaseElement.querySelector('.phase-status').textContent = data.details;
        }
      }
    }
  }
  
  /**
   * Actualiza la información de ejecución de herramientas
   */
  function updateToolExecution(data) {
    if (!data.tool) return;
    
    const toolId = `tool-${data.tool}-${Date.now()}`;
    
    if (data.status === 'started') {
      // Crear nuevo elemento para la herramienta
      const toolElement = document.createElement('div');
      toolElement.className = 'tool-item';
      toolElement.id = toolId;
      toolElement.innerHTML = `
        <div class="tool-info">
          <div class="tool-name">${data.tool}</div>
          <div class="tool-status">Ejecutando...</div>
        </div>
        <div class="tool-spinner"></div>
      `;
      
      // Añadir parámetros si existen
      if (data.parameters) {
        const detailsElement = document.createElement('div');
        detailsElement.className = 'tool-details';
        detailsElement.textContent = JSON.stringify(data.parameters, null, 2);
        toolElement.appendChild(detailsElement);
      }
      
      toolsList.appendChild(toolElement);
      activeTools.set(data.tool, toolId);
      
    } else if (data.status === 'completed' || data.status === 'error') {
      // Buscar elemento de la herramienta
      const toolId = activeTools.get(data.tool);
      const toolElement = toolId ? document.getElementById(toolId) : null;
      
      if (toolElement) {
        // Actualizar estado
        toolElement.classList.add(data.status);
        const statusElement = toolElement.querySelector('.tool-status');
        
        if (statusElement) {
          if (data.status === 'completed') {
            statusElement.textContent = data.duration ? 
              `Completado en ${Math.round(data.duration)}ms` : 
              'Completado';
          } else {
            statusElement.textContent = 'Error';
          }
        }
        
        // Eliminar spinner
        const spinner = toolElement.querySelector('.tool-spinner');
        if (spinner) spinner.remove();
        
        // Añadir resultado si existe
        if (data.result) {
          let resultElement = toolElement.querySelector('.tool-details');
          
          if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.className = 'tool-details';
            toolElement.appendChild(resultElement);
          }
          
          resultElement.textContent = typeof data.result === 'object' ? 
            JSON.stringify(data.result, null, 2) : 
            String(data.result);
        }
        
        // Añadir error si existe
        if (data.error) {
          const errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.textContent = data.error;
          toolElement.appendChild(errorElement);
        }
        
        // Eliminar de herramientas activas
        activeTools.delete(data.tool);
      }
    }
  }
  
  /**
   * Muestra un mensaje de error
   */
  function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    messagesContainer.appendChild(errorElement);
    
    // Hacer scroll hasta el final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
})();
