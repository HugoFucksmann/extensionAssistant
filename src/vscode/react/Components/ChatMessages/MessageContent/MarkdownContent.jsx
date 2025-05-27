import React from 'react';
import Markdown from 'markdown-to-jsx';
import './MarkdownContent.css';

const MarkdownContent = ({ content }) => {
  return (
    <div className="markdown-content">
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default MarkdownContent;
