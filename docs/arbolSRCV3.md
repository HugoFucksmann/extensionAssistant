srcV3/
├── config/
│   └── ConfigurationManager.ts
├── extension.ts
├── models/
│   ├── config/
│   ├── promptSystem.ts
│   ├── prompts/
│   │   ├── intentions/
│   │   │   ├── prompt.conversation.ts
│   │   │   ├── prompt.explainCode.ts
│   │   │   └── prompt.fixCode.ts
│   │   ├── prompt.codeValidator.ts
│   │   ├── prompt.communication.ts
│   │   ├── prompt.editing.ts
│   │   ├── prompt.examination.ts
│   │   ├── prompt.inputAnalyzer.ts
│   │   ├── prompt.planningEngine.ts
│   │   ├── prompt.projectManagement.ts
│   │   ├── prompt.projectSearch.ts
│   │   └── prompt.resultEvaluator.ts
│   └── providers/
├── modules/
│   └── getProjectInfo.ts
├── orchestrator/
│   ├── context/
│   │   └── interactionContext.ts
│   ├── execution/
│   │   ├── ExecutorRegistry.ts
│   │   ├── PromptExecutor.ts
│   │   ├── ToolExecutor.ts
│   │   ├── executorFactory.ts
│   │   ├── stepExecutor.ts
│   │   └── types.ts
│   ├── handlers/
│   │   ├── baseHandler.ts
│   │   ├── conversationHandler.ts
│   │   ├── explainCodeHandler.ts
│   │   ├── fixCodeHandler.ts
│   │   └── index.ts
│   ├── index.ts
│   └── orchestrator.ts
├── services/
│   ├── chatService.ts
│   ├── fileSystemService.ts
│   ├── orchestratorService.ts
│   └── toolRunner.ts
├── storage/
│   ├── database/
│   │   └── DatabaseManager.ts
│   ├── interfaces/
│   │   ├── IChatRepository.ts
│   │   └── IRepository.ts
│   ├── models/
│   └── repositories/
│       └── chatRepository.ts
└── tools/
    └── filesystemTools/
        ├── core.ts
        ├── getFileContents.ts
        ├── getPackageDependencies.ts
        └── getWorkspaceFiles.ts