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

export function renderMarkdown(text: string): string {
  try {
    const result = marked.parse(text);
    if (typeof result === 'string') return result;
    return text;
  } catch {
    return text;
  }
}
