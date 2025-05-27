// src/vscode/react/Components/Permissions/PermissionManager.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import PermissionDialog from './PermissionDialog';

/**
 * Componente que gestiona las solicitudes de permisos y muestra los diálogos correspondientes
 */
const PermissionManager = () => {
  const { postMessage } = useApp();
  const [permissionRequests, setPermissionRequests] = useState([]);

  // Escuchar eventos de solicitud de permisos
  useEffect(() => {
    // Esta función se ejecutará cuando se reciba un mensaje del backend
    const handlePermissionRequest = (event) => {
      const { type, payload } = event.data;
      
      // Solo procesar mensajes de tipo 'permissionRequest'
      if (type === 'permissionRequest') {
        setPermissionRequests(prev => [...prev, payload]);
      }
    };

    // Registrar el listener
    window.addEventListener('message', handlePermissionRequest);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('message', handlePermissionRequest);
    };
  }, []);

  // Manejar la acción de permitir un permiso
  const handleAllow = (operationId, permission) => {
    // Enviar respuesta al backend
    postMessage('permissionResponse', {
      operationId,
      permission,
      allowed: true
    });
    
    // Eliminar la solicitud de la lista
    setPermissionRequests(prev => 
      prev.filter(req => !(req.operationId === operationId && req.permission === permission))
    );
  };

  // Manejar la acción de denegar un permiso
  const handleDeny = (operationId, permission) => {
    // Enviar respuesta al backend
    postMessage('permissionResponse', {
      operationId,
      permission,
      allowed: false
    });
    
    // Eliminar la solicitud de la lista
    setPermissionRequests(prev => 
      prev.filter(req => !(req.operationId === operationId && req.permission === permission))
    );
  };

  // Si no hay solicitudes, no renderizar nada
  if (permissionRequests.length === 0) {
    return null;
  }

  return (
    <div>
      {permissionRequests.map((request) => (
        <PermissionDialog
          key={`${request.operationId}-${request.permission}`}
          toolName={request.toolName}
          permission={request.permission}
          description={request.description}
          params={request.params}
          operationId={request.operationId}
          onAllow={handleAllow}
          onDeny={handleDeny}
        />
      ))}
    </div>
  );
};

export default PermissionManager;
