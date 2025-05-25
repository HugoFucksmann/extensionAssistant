import React from 'react';

import { styles } from '../styles';
import Markdown from 'markdown-to-jsx';

const MarkdownContent = ({ content }) => {
  return (
    <div style={styles.markdownContent}>
      <Markdown>{content}</Markdown>
    </div>
  );
};

export default MarkdownContent;
