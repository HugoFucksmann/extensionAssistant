// src/vscode/react/Components/ChatMessages/ConversationGroup.jsx (Actualizado)
import React, { memo } from 'react';
import MessageRenderer from '../MessageRenderer';   // Tu MessageRenderer adaptado
import ProcessingFlow from './ProcessingFlow';     // Aún esqueleto o semi-implementado
// import FinalResponse from './FinalResponse'; // FinalResponse ahora se renderiza DENTRO de ProcessingFlow

const ConversationGroup = memo(({ group }) => {
  if (!group) return null; // Seguridad

  return (
    // No necesitas un div contenedor extra aquí si los componentes hijos manejan su propio margen/padding
    // Puedes usar React.Fragment si no hay necesidad de un div
    <React.Fragment>
      {group.userMessage && <MessageRenderer message={group.userMessage} />}

      {/* ProcessingFlow se encargará de renderizar los pasos Y la respuesta final */}
      {(group.operationMessages.length > 0 || group.finalResponse) && (
        <ProcessingFlow
          operationMessages={group.operationMessages}
          finalResponse={group.finalResponse} // Pasar finalResponse a ProcessingFlow
          operationId={group.operationId}
          // onActionClick podría pasarse aquí si es necesario para acciones en FinalResponse
        />
      )}
    </React.Fragment>
  );
});

ConversationGroup.displayName = "ConversationGroup";
export default ConversationGroup;