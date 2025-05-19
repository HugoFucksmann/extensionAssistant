import React, { memo, useState, useEffect, useMemo } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup"; 
import { styles } from "../styles";
import { useVSCodeContext } from "../../../context/VSCodeContext";
import { IconApply, IconCopy, IconTick } from "../../../IconstApp";

const PrismConfig = memo(() => {
  useEffect(() => {
    // Initialize Prism languages
    Prism.languages = {
      ...Prism.languages,
      javascript: Prism.languages.javascript,
      jsx: Prism.languages.jsx,
      typescript: Prism.languages.typescript,
      python: Prism.languages.python,
      json: Prism.languages.json,
      css: Prism.languages.css,
      markdown: Prism.languages.markdown,
      html: Prism.languages.markup, 
      htm: Prism.languages.markup,  
    };
  }, []);

  return null;
});

const CodeBlockHeader = memo(({ filename, onCopy, onApply }) => {
  const [copyState, setCopyState] = useState({ copied: false, timer: null });
  const [applyState, setApplyState] = useState({ applied: false, timer: null });

  const handleStateChange = async (action, state, setState) => {
    if (state.timer) clearTimeout(state.timer);
    
    await action();
    setState(prev => ({

      [action === onCopy ? "copied" : "applied"]: true,
      timer: setTimeout(() => {
        setState(prev => ({ [action === onCopy ? "copied" : "applied"]: false, timer: null }));
      }, 2000),
    }));
  };

  return (
    <div style={styles.codeBlockHeader}>
      {filename && <span style={styles.filename}>{filename}</span>}
      <div style={styles.buttonContainer}>
        <button
          onClick={() => handleStateChange(onCopy, copyState, setCopyState)}
          style={styles.button}
          title="Copy code"
        >
          {copyState.copied ? <IconTick /> : <IconCopy />}
        </button>
        <button
          onClick={() => handleStateChange(onApply, applyState, setApplyState)}
          style={styles.button}
          title="Apply changes"
        >
          {applyState.applied ? <IconTick /> : <IconApply />}
        </button>
      </div>
    </div>
  );
});

const CodeBlock = ({ language = "javascript", content, filename }) => {
  const { postMessage } = useVSCodeContext();
  const [copied, setCopied] = useState(false);

  // Normalizar el lenguaje
  const normalizedLanguage = useMemo(() => {
    const lang = language?.toLowerCase() || "javascript";
    // Mapear extensiones comunes a sus lenguajes correspondientes
    const languageMap = {
      'html': 'markup',
      'htm': 'markup',
      'xml': 'markup',
      'svg': 'markup',
    };
    return languageMap[lang] || lang;
  }, [language]);
  
  // Sanitizar el contenido si es necesario
  const sanitizedContent = useMemo(() => {
    if (!content) return "";
    // Escapar caracteres especiales si el contenido es HTML/markup
    if (['markup', 'html', 'htm', 'xml'].includes(normalizedLanguage)) {
      return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return content;
  }, [content, normalizedLanguage]);

  useEffect(() => {
    // Asegurarse de que el lenguaje esté soportado
    if (!Prism.languages[normalizedLanguage]) {
      console.warn(`Language ${normalizedLanguage} not supported, falling back to text`);
    }
    Prism.highlightAll();
  }, [sanitizedContent, normalizedLanguage]);

  const handleCopy = async () => {
    try {
      // Copiar el contenido original, no el sanitizado
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err) {
      console.error("Failed to copy text:", err);
      return false;
    }
  };

  const handleApply = async () => {
    try {
      postMessage('command', { 
        command: 'applyCodeChanges', 
        code: content,
        filename
      });
      return true;
    } catch (err) {
      console.error("Failed to apply changes:", err);
      return false;
    }
  };

  // No renderizar si no hay contenido
  if (!sanitizedContent?.trim()) return null;

  return (
    <div style={styles.codeBlockContainer}>
      <PrismConfig />
      <CodeBlockHeader
        filename={filename}
        onCopy={handleCopy}
        onApply={handleApply}
      />
      <pre style={{
        ...styles.pre,
        backgroundColor: 'transparent',
        margin: 0,
        padding: '1em',
        borderRadius: '0 0 4px 4px',
        overflow: 'auto',
      }}>
        <code 
          className={`language-${normalizedLanguage}`} 
          style={{
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            tabSize: 2,
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </pre>
    </div>
  );
};

export default memo(CodeBlock);
