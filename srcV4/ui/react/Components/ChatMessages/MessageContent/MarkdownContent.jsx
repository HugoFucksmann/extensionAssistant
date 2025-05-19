import React from 'react';
import Markdown from 'markdown-to-jsx';
import { styles } from '../styles';

const MarkdownContent = ({ content }) => {
  return (
    <div style={styles.markdownContent}>
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default MarkdownContent;
