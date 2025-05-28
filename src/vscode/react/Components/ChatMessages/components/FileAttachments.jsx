// src/vscode/react/Components/ChatMessages/FileAttachments.jsx
import React, { memo } from "react";

const FileAttachments = memo(({ files }) => {
  if (!files?.length) return null;

  return (
    <div className="file-attachments">
      {files.map((file, index) => (
        <div key={index} className="file-attachment">
          <span className="file-icon">📎</span>
          <span className="file-name">
            {typeof file === 'string' ? file : (file.name || file.path)}
          </span>
        </div>
      ))}
    </div>
  );
});

export default FileAttachments;