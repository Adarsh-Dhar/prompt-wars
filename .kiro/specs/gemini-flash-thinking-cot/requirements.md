# Requirements Document

## Introduction

This feature enables Gemini 2.0 Flash Thinking Chain-of-Thought (CoT) functionality in the Degen agent, replacing prompt-based "think step-by-step" heuristics with native high-fidelity chain-of-thought reasoning. The system will extract thought parts from Gemini responses, persist them to encrypted premium logs, and stream thought events to clients as distinct "thinking" updates before emitting final answers.

## Glossary

- **Degen_Agent**: The trading analysis agent that provides cryptocurrency investment recommendations
- **Flash_Thinking**: Gemini 2.0's native chain-of-thought capability that separates reasoning from final output
- **ThoughtPart**: Individual reasoning step extracted from Gemini response with thought flag
- **Premium_Logs**: Encrypted, payment-gated storage for detailed analysis including chain-of-thought
- **Chain_Of_Thought**: Ordered sequence of reasoning steps leading to final decision
- **Google_Gen_AI_SDK**: Official Google Generative AI SDK for accessing Gemini models
- **Thinking_Config**: SDK configuration parameter to enable thought extraction

## Requirements

### Requirement 1

**User Story:** As a premium subscriber, I want to see the detailed reasoning process behind trading recommendations, so that I can understand the agent's decision-making logic and make more informed investment choices.

#### Acceptance Criteria

1. WHEN GEMINI_ENABLE_THOUGHTS is true and the configured model supports Flash Thinking, THE Degen_Agent SHALL use Google_Gen_AI_SDK with thinking_config.include_thoughts = true
2. WHEN Gemini responds with mixed thought and non-thought parts, THE Degen_Agent SHALL collect all parts with part.thought === true as ordered Chain_Of_Thought entries
3. WHEN processing Gemini response parts, THE Degen_Agent SHALL concatenate non-thought parts to form the final answer
4. WHEN persisting analysis results, THE Premium_Logs SHALL store both finalAnswer string and chainOfThought array with text, order, timestamp, and tokenCount fields
5. WHEN a premium user requests analysis, THE Degen_Agent SHALL return both final answer and complete Chain_Of_Thought after payment verification

### Requirement 2

**User Story:** As a user interacting with the agent, I want to see real-time thinking updates during analysis, so that I can follow the reasoning process as it develops and understand the agent is actively working.

#### Acceptance Criteria

1. WHEN streaming analysis to clients, THE Degen_Agent SHALL emit "thinking" events for each ThoughtPart as it arrives
2. WHEN streaming analysis to clients, THE Degen_Agent SHALL emit "final" events for non-thought parts with partial streaming allowed
3. WHEN thought parts are received during streaming, THE Degen_Agent SHALL maintain correct order through sequential indexing
4. WHEN streaming completes, THE Degen_Agent SHALL emit a final event containing the complete answer
5. WHEN WebSocket or SSE connections are active, THE Degen_Agent SHALL use backpressure-friendly patterns to prevent memory growth

### Requirement 3

**User Story:** As a non-premium user, I want to receive useful analysis summaries without full reasoning details, so that I can still benefit from the agent while understanding the value of premium features.

#### Acceptance Criteria

1. WHEN a non-premium user requests analysis, THE Degen_Agent SHALL return only publicSummary and final answer without Chain_Of_Thought
2. WHEN premium content is requested without payment, THE Degen_Agent SHALL return HTTP 402 with teaser content
3. WHEN generating responses for non-premium users, THE Degen_Agent SHALL create concise publicSummary teasers from analysis results
4. WHEN payment verification fails, THE Degen_Agent SHALL NOT expose any Chain_Of_Thought data in error responses
5. WHEN public endpoints are accessed, THE Degen_Agent SHALL maintain functional UX with limited but valuable content

### Requirement 4

**User Story:** As a system administrator, I want to control Flash Thinking functionality and monitor token usage, so that I can manage costs and feature rollout effectively.

#### Acceptance Criteria

1. WHEN GEMINI_ENABLE_THOUGHTS environment variable is set to false, THE Degen_Agent SHALL use standard generation without thinking_config
2. WHEN Flash Thinking is enabled, THE Degen_Agent SHALL use GEMINI_FLASH_MODEL environment variable for model selection
3. WHEN COST_CONTROL_MAX_TOKENS is configured, THE Degen_Agent SHALL truncate very long thoughts to limit token usage
4. WHEN generating with thoughts, THE Degen_Agent SHALL log token usage metrics for thoughts versus final text
5. WHEN temperature is specified via GEMINI_THOUGHTS_TEMPERATURE, THE Degen_Agent SHALL apply it to thinking_config

### Requirement 5

**User Story:** As a developer, I want comprehensive parsing and streaming validation, so that I can ensure the Flash Thinking integration works correctly across different scenarios.

#### Acceptance Criteria

1. WHEN unit tests run, THE test suite SHALL validate parsing of mixed thought and non-thought parts from mocked SDK responses
2. WHEN streaming tests execute, THE test suite SHALL verify correct emission order of thinking events followed by final events
3. WHEN integration tests run, THE test suite SHALL validate premium log persistence with encrypted Chain_Of_Thought data
4. WHEN security tests execute, THE test suite SHALL verify non-premium users cannot access Chain_Of_Thought content
5. WHEN performance tests run, THE test suite SHALL validate streaming behavior under backpressure conditions

### Requirement 6

**User Story:** As a security-conscious operator, I want Chain-of-Thought data properly encrypted and access-controlled, so that premium content remains protected and payment verification is enforced.

#### Acceptance Criteria

1. WHEN storing Chain_Of_Thought data, THE content_encryption module SHALL encrypt thoughts using existing encryption approach
2. WHEN premium logs are persisted, THE Degen_Agent SHALL ensure chainOfThought field uses same encryption as other premium content
3. WHEN payment verification is required, THE payment_verification module SHALL gate access to full Chain_Of_Thought data
4. WHEN encryption keys are rotated, THE Chain_Of_Thought data SHALL remain accessible through existing key management
5. WHEN audit logs are generated, THE Degen_Agent SHALL record access attempts to Chain_Of_Thought data without exposing content