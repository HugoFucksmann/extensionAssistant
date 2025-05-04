$files = @(
    ".\srcV2\tools\core\toolRegistry.ts",
    ".\srcV2\tools\core\toolBase.ts",
    ".\srcV2\orchestrator\workflowManager.ts",
    ".\srcV2\orchestrator\toolSelector.ts",
    ".\srcV2\orchestrator\resultEvaluator.ts",
    ".\srcV2\orchestrator\planningEngine.ts",
    ".\srcV2\orchestrator\orchestratorService.ts",
    ".\srcV2\orchestrator\feedbackManager.ts",
    ".\srcV2\orchestrator\directActionRouter.ts",
    ".\srcV2\modules\projectSearch\projectSearchPlanner.ts",
    ".\srcV2\modules\projectSearch\projectSearchModule.ts",
    ".\srcV2\modules\projectManagement\projectPlanner.ts",
    ".\srcV2\modules\projectManagement\projectModule.ts",
    ".\srcV2\modules\communication\communicationPlanner.ts",
    ".\srcV2\modules\communication\communicationModule.ts",
    ".\srcV2\modules\codeExamination\examinationPlanner.ts",
    ".\srcV2\modules\codeExamination\examinationModule.ts",
    ".\srcV2\modules\codeEditing\editingPlanner.ts",
    ".\srcV2\modules\codeEditing\editingModule.ts"
)

foreach ($file in $files) {
    Write-Host "Updating $file..."
    
    # Leer el contenido del archivo
    $content = Get-Content -Path $file -Raw
    
    # Reemplazar la importación
    $updatedContent = $content -replace "import \{ Logger \}", "import { LoggerService }"
    
    # Reemplazar el tipo en el constructor y propiedades
    $updatedContent = $updatedContent -replace "logger: Logger", "logger: LoggerService"
    $updatedContent = $updatedContent -replace "private logger: Logger", "private logger: LoggerService"
    
    # Escribir el contenido actualizado
    Set-Content -Path $file -Value $updatedContent
}

Write-Host "Logger update completed!"
