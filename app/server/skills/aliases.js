/**
 * aliases.js — the fork's skill vocabulary, layered over upstream's.
 *
 * Upstream's `skill-extract.mjs` owns the base list (`SKILL_TOKENS`) and an
 * exact-alias map (`CANONICAL`: k8s → Kubernetes). It is upstream-mergeable and
 * never edited, so everything this console recognizes beyond it lives here:
 *
 *   - `ALIASES`: more spellings of the same skill (PROJECT_PLAN.md §6 step 1,
 *     "JS → JavaScript; grow it over time"). Same rule as upstream's map: every
 *     entry names the SAME skill, never an umbrella ("cloud" is not AWS).
 *   - `CATEGORIES`: a category per canonical name, for the page's filters.
 *     Names not listed are `other`; the LLM pass supplies categories for those.
 *
 * Both are keyed by the lowercased canonical form. `canonicalSkill()` is the
 * one function the rest of the layer calls: upstream's canonicalize first, then
 * this map, then a display form; `skillId()` turns that into a URL-safe key.
 */

import { canonicalize } from '../../../skill-extract.mjs';

export const CATEGORY_IDS = Object.freeze([
  'language',
  'framework',
  'cloud-infra',
  'data',
  'ai-ml',
  'practice',
  'tool',
  'certification',
  'domain',
  'soft',
  'other',
]);

/** lowercase spelling → canonical display name. Upstream's CANONICAL runs first, so only what it lacks is here. */
export const ALIASES = Object.freeze({
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  node: 'Node.js',
  'node js': 'Node.js',
  reactjs: 'React',
  'react.js': 'React',
  'react js': 'React',
  vue: 'Vue.js',
  angularjs: 'Angular',
  nextjs: 'Next.js',
  express: 'Express',
  'express.js': 'Express',
  expressjs: 'Express',
  nest: 'NestJS',
  nestjs: 'NestJS',
  'nest.js': 'NestJS',
  'spring boot': 'Spring Boot',
  springboot: 'Spring Boot',
  'asp.net': 'ASP.NET',
  'asp.net core': 'ASP.NET',
  'aspnet': 'ASP.NET',
  dotnet: '.NET',
  'dot net': '.NET',
  '.net core': '.NET',
  'net core': '.NET',
  'c sharp': 'C#',
  csharp: 'C#',
  'entity framework': 'Entity Framework',
  'ef core': 'Entity Framework',
  'sql server': 'SQL Server',
  mssql: 'SQL Server',
  'ms sql': 'SQL Server',
  'microsoft sql server': 'SQL Server',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'amazon web services': 'AWS',
  'microsoft azure': 'Azure',
  'azure devops': 'Azure DevOps',
  'ci cd': 'CI/CD',
  'ci-cd': 'CI/CD',
  'continuous integration': 'CI/CD',
  'continuous delivery': 'CI/CD',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  restful: 'REST APIs',
  'restful apis': 'REST APIs',
  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',
  // Bare 'AI' is deliberately absent: 'AI-native', 'AI tools', 'AI company' name a
  // climate, not a skill anyone can go and learn. The learnable forms are below.
  'generative ai': 'Generative AI',
  genai: 'Generative AI',
  'gen ai': 'Generative AI',
  'large language models': 'LLMs',
  'large language model': 'LLMs',
  'vector database': 'Vector Databases',
  'vector databases': 'Vector Databases',
  'vector db': 'Vector Databases',
  'agentic ai': 'AI Agents',
  'ai agents': 'AI Agents',
  'model context protocol': 'MCP',
  openai: 'OpenAI API',
  'openai api': 'OpenAI API',
  'unreal engine': 'Unreal Engine',
  unreal: 'Unreal Engine',
  'unity3d': 'Unity',
  'unity 3d': 'Unity',
  'object-oriented programming': 'OOP',
  'object oriented programming': 'OOP',
  oop: 'OOP',
  'system design': 'System Design',
  'distributed systems': 'Distributed Systems',
  microservices: 'Microservices',
  microservice: 'Microservices',
  'event-driven architecture': 'Event-Driven Architecture',
  'event driven architecture': 'Event-Driven Architecture',
  tdd: 'TDD',
  'test-driven development': 'TDD',
  'test driven development': 'TDD',
  'unit testing': 'Unit Testing',
  'unit tests': 'Unit Testing',
  devops: 'DevOps',
  agile: 'Agile',
  scrum: 'Scrum',
  kanban: 'Kanban',
  linux: 'Linux',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  jira: 'Jira',
  html: 'HTML',
  html5: 'HTML',
  css: 'CSS',
  css3: 'CSS',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  redux: 'Redux',
  webpack: 'Webpack',
  vite: 'Vite',
  jest: 'Jest',
  cypress: 'Cypress',
  playwright: 'Playwright',
  selenium: 'Selenium',
  nginx: 'Nginx',
  rabbitmq: 'RabbitMQ',
  sqs: 'SQS',
  'aws lambda': 'AWS Lambda',
  s3: 'S3',
  ec2: 'EC2',
  'sql databases': 'SQL',
  nosql: 'NoSQL',
  oracle: 'Oracle',
  sqlite: 'SQLite',
  firebase: 'Firebase',
  websockets: 'WebSockets',
  websocket: 'WebSockets',
  oauth: 'OAuth',
  oauth2: 'OAuth',
  'oauth 2.0': 'OAuth',
  jwt: 'JWT',
  openapi: 'OpenAPI',
  swagger: 'OpenAPI',
  blazor: 'Blazor',
  wpf: 'WPF',
  xamarin: 'Xamarin',
  maui: '.NET MAUI',
  '.net maui': '.NET MAUI',
  flutter: 'Flutter',
  dart: 'Dart',
  ios: 'iOS',
  android: 'Android',
  'c/c++': 'C++',
  'bash': 'Bash',
  'powershell': 'PowerShell',
  'observability': 'Observability',
  'opentelemetry': 'OpenTelemetry',
  'fintech': 'Fintech',
  'payments': 'Payments',
  'banking': 'Banking',
  'e-commerce': 'E-commerce',
  ecommerce: 'E-commerce',
  'english': 'English',
  'spanish': 'Spanish',
  'portuguese': 'Portuguese',
  'german': 'German',
});

/** lowercased canonical name → category. */
export const CATEGORIES = Object.freeze({
  // languages
  javascript: 'language', typescript: 'language', python: 'language', ruby: 'language', java: 'language',
  go: 'language', rust: 'language', php: 'language', kotlin: 'language', swift: 'language', scala: 'language',
  elixir: 'language', 'c++': 'language', 'c#': 'language', c: 'language', sql: 'language', dart: 'language',
  bash: 'language', powershell: 'language', 'shell scripting': 'language', html: 'language', css: 'language',
  // frameworks & runtimes
  '.net': 'framework', 'asp.net': 'framework', 'entity framework': 'framework', blazor: 'framework', wpf: 'framework',
  xamarin: 'framework', '.net maui': 'framework', react: 'framework', 'react native': 'framework', angular: 'framework',
  'vue.js': 'framework', svelte: 'framework', 'next.js': 'framework', 'node.js': 'framework', express: 'framework',
  nestjs: 'framework', django: 'framework', flask: 'framework', fastapi: 'framework', rails: 'framework',
  laravel: 'framework', symfony: 'framework', spring: 'framework', 'spring boot': 'framework', flutter: 'framework',
  'tailwind css': 'framework', redux: 'framework', unity: 'framework', 'unreal engine': 'framework', ios: 'framework',
  android: 'framework', graphql: 'framework', grpc: 'framework', 'rest apis': 'framework', websockets: 'framework',
  openapi: 'framework', oauth: 'framework', jwt: 'framework',
  // cloud & infra
  aws: 'cloud-infra', gcp: 'cloud-infra', azure: 'cloud-infra', docker: 'cloud-infra', kubernetes: 'cloud-infra',
  terraform: 'cloud-infra', ansible: 'cloud-infra', helm: 'cloud-infra', jenkins: 'cloud-infra',
  'github actions': 'cloud-infra', 'gitlab ci': 'cloud-infra', 'ci/cd': 'cloud-infra', 'azure devops': 'cloud-infra',
  prometheus: 'cloud-infra', grafana: 'cloud-infra', datadog: 'cloud-infra', supabase: 'cloud-infra',
  firebase: 'cloud-infra', nginx: 'cloud-infra', 'aws lambda': 'cloud-infra', s3: 'cloud-infra', ec2: 'cloud-infra',
  sqs: 'cloud-infra', linux: 'cloud-infra', devops: 'cloud-infra', observability: 'cloud-infra',
  opentelemetry: 'cloud-infra', microservices: 'cloud-infra', 'distributed systems': 'cloud-infra',
  'event-driven architecture': 'cloud-infra',
  // data
  mongodb: 'data', mysql: 'data', postgresql: 'data', redis: 'data', elasticsearch: 'data', snowflake: 'data',
  bigquery: 'data', databricks: 'data', dynamodb: 'data', cassandra: 'data', kafka: 'data', rabbitmq: 'data',
  'sql server': 'data', oracle: 'data', sqlite: 'data', nosql: 'data', spark: 'data', airflow: 'data', dbt: 'data',
  pandas: 'data', numpy: 'data', tableau: 'data', 'power bi': 'data', looker: 'data', 'vector databases': 'data',
  // ai / ml
  pytorch: 'ai-ml', tensorflow: 'ai-ml', 'scikit-learn': 'ai-ml', mlops: 'ai-ml', mlflow: 'ai-ml', langchain: 'ai-ml',
  llamaindex: 'ai-ml', 'hugging face': 'ai-ml', rag: 'ai-ml', llms: 'ai-ml', 'prompt engineering': 'ai-ml',
  'fine-tuning': 'ai-ml', 'computer vision': 'ai-ml', nlp: 'ai-ml', 'machine learning': 'ai-ml',
  'generative ai': 'ai-ml', 'ai agents': 'ai-ml', mcp: 'ai-ml', 'openai api': 'ai-ml',
  // practices
  oop: 'practice', 'system design': 'practice', tdd: 'practice', 'unit testing': 'practice', agile: 'practice',
  scrum: 'practice', kanban: 'practice',
  // tools
  git: 'tool', github: 'tool', gitlab: 'tool', jira: 'tool', webpack: 'tool', vite: 'tool', jest: 'tool',
  cypress: 'tool', playwright: 'tool', selenium: 'tool', salesforce: 'tool', sap: 'tool',
  // certifications
  pmp: 'certification', 'pmi-acp': 'certification', pgmp: 'certification', capm: 'certification',
  pmbok: 'certification', prince2: 'certification', cspo: 'certification', 'certified scrummaster': 'certification',
  itil: 'certification', cobit: 'certification', togaf: 'certification', 'lean six sigma': 'certification',
  'six sigma': 'certification', cissp: 'certification', cism: 'certification', cipp: 'certification',
  safe: 'certification',
  // domains & languages spoken
  fintech: 'domain', payments: 'domain', banking: 'domain', 'e-commerce': 'domain',
  english: 'soft', spanish: 'soft', portuguese: 'soft', german: 'soft',
});

/**
 * The canonical display name for any spelling of a skill.
 * Upstream's exact aliases first, then the fork's, else the token unchanged.
 */
export function canonicalSkill(token) {
  const trimmed = String(token ?? '').trim();
  if (!trimmed) return '';
  const upstream = canonicalize(trimmed);
  const lower = upstream.toLowerCase();
  return ALIASES[lower] ?? ALIASES[trimmed.toLowerCase()] ?? upstream;
}

/** A URL- and object-key-safe id for a canonical name: `Node.js` → `node-js`, `C#` → `csharp`. */
export function skillId(canonical) {
  return String(canonical)
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/^\./, 'dot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Category of a canonical name; `other` when the vocabulary does not know it. */
export function categoryOf(canonical) {
  return CATEGORIES[String(canonical).toLowerCase()] ?? 'other';
}

const KNOWN = new Set([...Object.keys(CATEGORIES), ...Object.values(ALIASES).map((v) => v.toLowerCase())]);

/** Whether the fork vocabulary recognizes this canonical name (upstream's tokens are all categorized above). */
export function isKnownSkill(canonical) {
  return KNOWN.has(String(canonical).toLowerCase());
}

/**
 * Alias keys that are everyday words when lowercased ("express interest",
 * "team unity", a "nest" of problems). Upstream keeps "Go" out of its
 * case-insensitive list for the same reason; these match only as written here.
 */
export const CASE_SENSITIVE_ALIASES = Object.freeze({
  Express: 'Express',
  Nest: 'NestJS',
  Unity: 'Unity',
  Git: 'Git',
  Vite: 'Vite',
  Jest: 'Jest',
  Dart: 'Dart',
  Oracle: 'Oracle',
  Maui: '.NET MAUI',
  MAUI: '.NET MAUI',
  S3: 'S3',
  EC2: 'EC2',
  SQS: 'SQS',
  ML: 'Machine Learning',
  Agile: 'Agile',
  Scrum: 'Scrum',
  Kanban: 'Kanban',
  Linux: 'Linux',
  Redux: 'Redux',
  Payments: 'Payments',
  Banking: 'Banking',
  English: 'English',
  Spanish: 'Spanish',
  Portuguese: 'Portuguese',
  German: 'German',
});

/** The ALIASES keys excluded from case-insensitive matching because they are listed above. */
export const AMBIGUOUS_ALIASES = new Set(Object.keys(CASE_SENSITIVE_ALIASES).map((k) => k.toLowerCase()));
