/** AI 仿写输出解析工具 */

interface ParsedXhsContent {
  /** 笔记标题（第一行） */
  title: string;
  /** 正文内容（去除标题行和标签行） */
  content: string;
  /** 话题标签列表，已去掉 # 前缀 */
  tags: string[];
}

/** 判断一行是否为纯标签行（所有非空 token 都以 # 开头） */
const isTagLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every(t => t.startsWith('#'));
};

/** 从文本中提取所有 #标签，返回去掉 # 的标签数组 */
const extractTags = (text: string): string[] => {
  const matches = text.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) ?? [];
  return matches.map(t => t.slice(1));
};

/**
 * 解析 AI 仿写输出文本，返回结构化的发布内容。
 * 对空输入返回空字段，不抛异常。
 */
const parseAIOutput = (text: string): ParsedXhsContent => {
  if (!text.trim()) {
    return { title: '', content: '', tags: [] };
  }

  const lines = text.trim().split('\n');
  const title = lines[0].trim();

  const tagLineSet = new Set<number>();
  for (let i = lines.length - 1; i >= 1; i--) {
    if (isTagLine(lines[i])) {
      tagLineSet.add(i);
    } else if (lines[i].trim() !== '') {
      break;
    }
  }

  const tagText = lines.filter((_, i) => tagLineSet.has(i)).join(' ');
  const tags = extractTags(tagText);

  const contentLines = lines.slice(1).filter((_, i) => !tagLineSet.has(i + 1));
  const content = contentLines.join('\n').trim();

  return { title, content, tags };
};

export type { ParsedXhsContent };
export { parseAIOutput };
