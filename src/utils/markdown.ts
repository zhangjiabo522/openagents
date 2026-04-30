import { Marked } from 'marked';
import markedTerminal from 'marked-terminal';
import chalk from 'chalk';

const marked = new Marked();
marked.setOptions({
  ...markedTerminal,
  codespan: chalk.gray,
  code: chalk.gray,
  blockquote: chalk.gray.italic,
  heading: chalk.bold.cyan,
  firstHeading: chalk.bold.cyan.underline,
  link: chalk.blue.underline,
  href: chalk.blue.underline,
  strong: chalk.bold,
  em: chalk.italic,
  del: chalk.strikethrough,
  listitem: chalk.white,
} as any);

/** 去掉 HTML 标签，保留纯文本 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
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

export function renderMarkdown(text: string): string {
  try {
    // 如果内容主要是 HTML，先去掉标签
    if (/<[a-z][\s\S]*>/i.test(text) && !text.includes('```')) {
      text = stripHtml(text);
    }
    const result = marked.parse(text);
    if (typeof result === 'string') return result;
    return text;
  } catch {
    return text;
  }
}
