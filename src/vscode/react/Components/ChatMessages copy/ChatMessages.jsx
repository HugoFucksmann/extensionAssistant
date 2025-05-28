// src/vscode/react/Components/ChatMessages/ChatMessages.jsx
import React, { useRef, useLayoutEffect, memo, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import ConversationGroup from "./ConversationGroup";
import "./ChatMessages.css"; // Tu CSS existente

const ChatMessages = () => {
  const { messages, activeFeedbackOperationId } = useApp(); // activeFeedbackOperationId puede ser útil luego
  const messagesEndRef = useRef(null);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const conversationGroups = useMemo(() => {
    console.log("Recalculating conversationGroups, raw messages:", messages);
    const groups = [];
    let currentGroup = null;

    messages.forEach((message) => {
      if (message.sender === "user") {
        currentGroup = {
          userMessage: message,
          operationMessages: [],
          finalResponse: null,
          operationId: null,
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // Asignar operationId al grupo si aún no lo tiene y el mensaje lo provee
        if (message.metadata?.operationId && !currentGroup.operationId) {
          currentGroup.operationId = message.metadata.operationId;
        }
        // Si el mensaje pertenece a la operación actual del grupo
        if (message.metadata?.operationId === currentGroup.operationId || !message.metadata?.operationId /* para assistant sin opId explícito */) {
          // Identificar respuesta final del asistente
          // ASUNCIÓN: Un mensaje de 'assistant' es final si tiene metadata.isFinalToolResponse = true
          // O si es el único tipo de mensaje que viene por 'assistantResponse' en AppContext
          const isFinalAssistantResponse = message.sender === "assistant" &&
                                        (message.metadata?.isFinalToolResponse === true ||
                                         message.metadata?.status === 'completed'); // O alguna otra heurística

          if (isFinalAssistantResponse) {
            currentGroup.finalResponse = message;
            // Opcional: podrías querer que este mensaje no aparezca también en operationMessages
          } else {
            // Mensajes de system (tool_executing, success, error) y assistant intermedios
            currentGroup.operationMessages.push(message);
          }
        } else if (message.metadata?.operationId && message.metadata.operationId !== currentGroup.operationId) {
          // Este mensaje pertenece a una operación diferente a la del userMessage actual.
          // Esto podría indicar un problema en el flujo de datos o necesitar una lógica de agrupación más compleja.
          // Por ahora, lo ignoramos para este grupo o creamos un nuevo grupo "huérfano".
          console.warn("Message with different operationId found, might be orphaned:", message, "Current group OpId:", currentGroup.operationId);
        }

      } else if (message.sender !== 'user' && groups.length === 0) {
        // Mensajes de sistema/asistente al inicio (ej. bienvenida, error de carga inicial)
        // Crear un grupo sin userMessage para estos
        groups.push({
            userMessage: null,
            operationMessages: [message],
            finalResponse: message.sender === 'assistant' ? message : null, // Si es assistant, podría ser final
            operationId: message.metadata?.operationId || null,
        });
      }
    });
    console.log("Generated conversationGroups:", groups);
    return groups;
  }, [messages]);

  // Renderizado Actualizado:
  return (
    <div className="chat-messages-container">
      <div className="chat-scrollbar chat-messages-scrollable">
        {conversationGroups.map((group, index) => (
          <ConversationGroup
            key={group.userMessage?.id || group.operationMessages[0]?.id || `group-${index}`}
            group={group}
          />
        ))}
        {/* Ya no necesitas el FeedbackRenderer aquí si está integrado en ProcessingFlow */}
        {/* <FeedbackRenderer operationId={activeFeedbackOperationId} isActive={true} /> */}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>
      {/* children se elimina si ChatMessages ya no es un contenedor genérico */}
    </div>
  );
};

export default memo(ChatMessages);