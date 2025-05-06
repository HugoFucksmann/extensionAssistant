import React from "react";
import { styles } from "./styles";

function getFileName(filePath) {
  return filePath.split("/").pop().split("\\").pop();
}

const AttachedFiles = ({ files }) => {
  if (!files?.length) return null;

  return (
    <div style={styles.attachedFiles}>
      {files.map((file, i) => (
        <span key={i} style={styles.fileTag}>
          {getFileName(file.path)}
        </span>
      ))}
    </div>
  );
};

export default AttachedFiles;
