import { proxyActivities } from '@temporalio/workflow';
import type { CreditActivity } from '../activities/credit.activity';
import type { GenericLlmActivity } from '../activities/ai/generic-llm.activity';

const { checkPreflightCredits, deductExactCredits, refundCredits } = proxyActivities<CreditActivity>({
  startToCloseTimeout: '1 minute',
  retry: {
      maximumAttempts: 3,
  }
});

/**
 * We mock an LLM Activity here where output provides usage stats.
 */
const { executePrompt } = proxyActivities<any>({
  startToCloseTimeout: '5 minutes',
});

/**
 * Example workflow demonstrating the Omni secure credit Saga pattern
 */
export async function SecureAIGenerationWorkflow(userId: string, prompt: string, modelId: string): Promise<string> {
    // 1. PRE-FLIGHT RESERVE
    // Fast activity ensuring wallet contains at least standard 0.01
    await checkPreflightCredits(userId, 0.01);

    let llmResult;
    try {
        // 2. RUN EXPENSIVE LLM / TOOL CODE
        llmResult = await executePrompt(prompt, modelId);
        
        // 3. SECURE TRUE-UP DEDUCTION
        await deductExactCredits(
            userId, 
            llmResult.usage.prompt_tokens, 
            llmResult.usage.completion_tokens, 
            modelId, 
            'WORKFLOW_TX_ID' // Normally workflowInfo().workflowId
        );
        
        return llmResult.text;
    } catch (err) {
        // 4. COMPENSATION (SAGA REFUND IF REQUIRED)
        // If the workflow failed and deducted credits pre-maturely, we rollback here.
        if (err.type !== 'INSUFFICIENT_FUNDS') {
            await refundCredits(userId, 0.01, 'WORKFLOW_TX_ID');
        }
        
        throw err;
    }
}
