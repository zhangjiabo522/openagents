import chalk from 'chalk';

/** 去掉 HTML 标签 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 检测是否主要是 HTML */
function isHtml(text: string): boolean {
  const tags = text.match(/<[a-z][^>]*>/gi);
  return tags !== null && tags.length > 2;
}

/** 手动渲染 markdown → chalk 终端输出 */
export function renderMarkdown(text: string): string {
  // 先去掉 HTML
  if (isHtml(text)) {
    text = stripHtml(text);
  }

  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 代码块
    if (line.trimStart().startsWith('```')) {
      if (inCodeBlock) {
        result.push(chalk.gray('  └' + '─'.repeat(40)));
        inCodeBlock = false;
      } else {
        result.push(chalk.gray('  ┌' + '─'.repeat(40)));
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      result.push(chalk.gray('  │ ') + chalk.white(line));
      continue;
    }

    // 标题
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#{1,6})/)?.[1].length || 1;
      const text = line.replace(/^#{1,6}\s+/, '');
      if (level === 1) {
        result.push(chalk.bold.cyan.underline(text));
      } else if (level === 2) {
        result.push(chalk.bold.cyan(text));
      } else {
        result.push(chalk.bold(text));
      }
      result.push('');
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s/.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const content = line.replace(/^\s*[-*+]\s+/, '');
      result.push(indent + chalk.white('• ') + inlineFormat(content));
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s/.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const num = line.match(/^\s*(\d+)\./)?.[1] || '1';
      const content = line.replace(/^\s*\d+\.\s+/, '');
      result.push(indent + chalk.white(`${num}. `) + inlineFormat(content));
      continue;
    }

    // 引用
    if (/^>\s/.test(line)) {
      result.push(chalk.gray('  │ ') + chalk.gray.italic(line.replace(/^>\s*/, '')));
      continue;
    }

    // 分割线
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      result.push(chalk.gray('─'.repeat(44)));
      continue;
    }

    // 普通行
    result.push('  ' + inlineFormat(line));
  }

  return result.join('\n');
}

/** 行内格式：粗体、斜体、行内代码、链接 */
function inlineFormat(text: string): string {
  // 行内代码 `code`
  text = text.replace(/`([^`]+)`/g, (_, code) => chalk.gray(`\`${code}\``));
  // 粗体 **text** 或 __text__
  text = text.replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t));
  text = text.replace(/__(.+?)__/g, (_, t) => chalk.bold(t));
  // 斜体 *text* 或 _text_
  text = text.replace(/\*(.+?)\*/g, (_, t) => chalk.italic(t));
  text = text.replace(/_(.+?)_/g, (_, t) => chalk.italic(t));
  // 删除线 ~~text~~
  text = text.replace(/~~(.+?)~~/g, (_, t) => chalk.strikethrough(t));
  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => chalk.blue.underline(label) + chalk.gray(` (${url})`));
  return text;
}
