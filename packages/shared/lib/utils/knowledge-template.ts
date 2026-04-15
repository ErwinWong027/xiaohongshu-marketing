/** 知识库模版格式化工具
 *
 * 将附件一 JSON 格式的知识库模版自动整理为 AI 仿写的输入文本。
 * 生成的文本作为 callAIRewrite() 的 content 参数传入。
 */

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface ComponentDef {
  description: string;
  capabilities: string[];
  supported_platforms?: string[];
}

interface KnowledgeBaseTemplate {
  define_objective: {
    primary_goal: string;
    mission: string;
    success_metrics: string[];
  };
  agent_config: {
    agent_name: string;
    agent_role: string;
    target_users: string[];
    behavior_style: string;
  };
  system_instructions: {
    core_principles: string[];
    interaction_mode?: string;
    example_command?: string;
  };
  components: Record<string, ComponentDef>;
  logic_mapping_engine?: {
    decision_rules: string[];
  };
  output_schema?: Record<string, unknown>;
  integrate_and_render?: {
    execution_flow: string[];
  };
}

// ─── 内置默认模版（附件一） ────────────────────────────────────────────────────

export const DEFAULT_KNOWLEDGE_TEMPLATE: KnowledgeBaseTemplate = {
  define_objective: {
    primary_goal: '构建一个面向应届生与高频求职者的AI求职自动化Agent',
    mission: '通过跨平台自动填写、智能匹配与进度追踪，实现求职流程全链路自动化与效率提升',
    success_metrics: ['减少90%以上重复填写时间', '提升投递效率最高60倍', '提高面试转化率'],
  },
  agent_config: {
    agent_name: '简职职业智能Agent',
    agent_role: '求职流程自动化执行者 + 职业决策辅助系统',
    target_users: ['应届毕业生', '高频投递求职者', '职场转型者'],
    behavior_style: '高精度执行 + 风险提示 + 数据驱动建议',
  },
  system_instructions: {
    core_principles: [
      '不得虚构用户经历',
      '所有匹配建议必须基于JD文本',
      '执行自动填写前必须确认字段映射准确',
      '对低匹配岗位给出风险提示',
    ],
    interaction_mode: '自然语言驱动任务执行',
    example_command: '找上海React/TS前端岗并自动投递',
  },
  components: {
    auto_apply_engine: {
      description: '跨平台ATS自动填写系统',
      capabilities: ['字段语义识别', '动态表单解析', '隐藏字段处理', '多平台登录状态管理'],
      supported_platforms: ['企业官网ATS', 'Workday类系统', 'Greenhouse类系统'],
    },
    jd_parsing_module: {
      description: '岗位JD语义解析模块',
      capabilities: ['关键词抽取', '技能权重识别', '硬性条件识别'],
    },
    resume_optimization_module: {
      description: '基于JD的简历智能优化',
      capabilities: ['表达重构', 'ATS关键词强化', '行业风格适配'],
    },
    application_tracking_module: {
      description: '投递进度自动追踪系统',
      capabilities: ['状态抓取', '流程节点更新', '面试提醒'],
    },
    career_profile_engine: {
      description: '职业数字分身构建系统',
      capabilities: ['技能画像建模', '投递行为学习', '结果反馈闭环优化'],
    },
  },
  logic_mapping_engine: {
    decision_rules: [
      '匹配度低于60%时提示优化建议',
      '缺少核心技能时标记为高风险岗位',
      '投递超过30个岗位未面试时触发策略调整建议',
    ],
  },
  integrate_and_render: {
    execution_flow: ['解析用户目标', '筛选岗位', '计算匹配度', '优化简历', '执行自动填写', '提交申请', '更新进度看板'],
  },
};

// ─── 格式化函数 ───────────────────────────────────────────────────────────────

/**
 * 将知识库模版 JSON 整理为小红书 AI 仿写的输入文本。
 * 生成结构化的中文描述，供 AI 仿写时作为内容参考。
 */
export const formatKnowledgeTemplate = (template: KnowledgeBaseTemplate): string => {
  const lines: string[] = [];

  // 主题和目标
  lines.push(`## 产品/服务主题`);
  lines.push(template.define_objective.primary_goal);
  lines.push('');

  lines.push(`## 核心价值主张`);
  lines.push(template.define_objective.mission);
  lines.push('');

  // 目标用户
  lines.push(`## 目标用户群体`);
  lines.push(template.agent_config.target_users.join('、'));
  lines.push('');

  // 核心功能亮点（取前4个模块，每个取前2个能力）
  lines.push(`## 核心功能亮点`);
  const components = Object.values(template.components).slice(0, 4);
  for (const comp of components) {
    const caps = comp.capabilities.slice(0, 2).join('，');
    lines.push(`- **${comp.description}**：${caps}`);
  }
  lines.push('');

  // 成功指标（数字化呈现，适合小红书"硬核数据"风格）
  lines.push(`## 效果数据（可在笔记中引用）`);
  for (const metric of template.define_objective.success_metrics) {
    lines.push(`✅ ${metric}`);
  }
  lines.push('');

  // 工作流（如果存在）
  if (template.integrate_and_render?.execution_flow) {
    lines.push(`## 使用流程`);
    template.integrate_and_render.execution_flow.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push('');
  }

  // 仿写指令
  lines.push(`## 仿写要求`);
  lines.push(
    '请参考以上产品信息，创作一篇小红书风格的种草/推广笔记。' +
      '语言要亲切自然，符合小红书用户表达习惯，' +
      '突出产品解决的核心痛点和具体效果数据，' +
      '结尾加入互动引导，适合目标用户群体阅读。',
  );

  return lines.join('\n');
};

/**
 * 使用默认知识库模版生成仿写输入文本（快捷方式）。
 */
export const getDefaultTemplateText = (): string => formatKnowledgeTemplate(DEFAULT_KNOWLEDGE_TEMPLATE);
